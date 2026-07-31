import prisma from '../config/database';
import logger from '../config/logger';
import { Subcontractor, Contract, MatchStatus } from '@prisma/client';

interface MatchCriteria {
  naicsAlignment: number;
  capabilityMatch: number;
  pastPerformance: number;
  geographic: number;
  certifications: number;
  availability: number;
}

interface SubcontractorMatchResult {
  subcontractor: Subcontractor;
  overallScore: number;
  criteriaScores: MatchCriteria;
  matchRationale: string;
  risks: string[];
  recommendations: string[];
}

export class SubcontractorMatchingService {
  private readonly weights = {
    naicsAlignment: 0.30,
    capabilityMatch: 0.25,
    pastPerformance: 0.20,
    geographic: 0.10,
    certifications: 0.10,
    availability: 0.05,
  };

  async matchSubcontractorsToContract(contractId: string): Promise<SubcontractorMatchResult[]> {
    try {
      const contract = await prisma.contract.findUnique({
        where: { id: contractId },
        include: { awardee: true },
      });

      if (!contract) {
        throw new Error('Contract not found');
      }

      const subcontractors = await this.findPotentialSubcontractors(contract);
      const matches = await this.scoreAndRankSubcontractors(subcontractors, contract);

      await this.saveMatches(matches, contractId);

      logger.info(`Generated ${matches.length} matches for contract ${contractId}`);
      return matches;
    } catch (error) {
      logger.error('Error matching subcontractors', { contractId, error });
      throw error;
    }
  }

  private async findPotentialSubcontractors(contract: any): Promise<Subcontractor[]> {
    const filters: any = {};

    if (contract.naicsCode) {
      filters.naicsCodes = {
        has: contract.naicsCode,
      };
    }

    return prisma.subcontractor.findMany({
      where: filters,
      take: 100,
    });
  }

  private async scoreAndRankSubcontractors(
    subcontractors: Subcontractor[],
    contract: any
  ): Promise<SubcontractorMatchResult[]> {
    const matches = subcontractors.map(subcontractor => {
      const criteriaScores = this.calculateCriteriaScores(subcontractor, contract);
      const overallScore = this.calculateOverallScore(criteriaScores);
      const matchRationale = this.generateMatchRationale(criteriaScores, subcontractor, contract);
      const risks = this.identifyRisks(subcontractor, contract);
      const recommendations = this.generateRecommendations(subcontractor, contract);

      return {
        subcontractor,
        overallScore,
        criteriaScores,
        matchRationale,
        risks,
        recommendations,
      };
    });

    return matches
      .filter(match => match.overallScore >= 50)
      .sort((a, b) => b.overallScore - a.overallScore)
      .slice(0, 20);
  }

  private calculateCriteriaScores(subcontractor: Subcontractor, contract: any): MatchCriteria {
    return {
      naicsAlignment: this.scoreNaicsAlignment(subcontractor, contract),
      capabilityMatch: this.scoreCapabilityMatch(subcontractor, contract),
      pastPerformance: this.scorePastPerformance(subcontractor),
      geographic: this.scoreGeographic(subcontractor, contract),
      certifications: this.scoreCertifications(subcontractor, contract),
      availability: this.scoreAvailability(subcontractor),
    };
  }

  private scoreNaicsAlignment(subcontractor: Subcontractor, contract: any): number {
    if (!contract.naicsCode) return 50;

    const naicsCodes = subcontractor.naicsCodes || [];
    if (naicsCodes.includes(contract.naicsCode)) {
      return 100;
    }

    const parentCode = contract.naicsCode.substring(0, 4);
    if (naicsCodes.some(code => code.startsWith(parentCode))) {
      return 75;
    }

    const sectorCode = contract.naicsCode.substring(0, 2);
    if (naicsCodes.some(code => code.startsWith(sectorCode))) {
      return 50;
    }

    return 0;
  }

  private scoreCapabilityMatch(subcontractor: Subcontractor, contract: any): number {
    const contractKeywords = this.extractKeywords(contract.title + ' ' + (contract.description || ''));
    const subcontractorCapabilities = subcontractor.capabilities || [];

    const matches = contractKeywords.filter(keyword =>
      subcontractorCapabilities.some(cap =>
        cap.toLowerCase().includes(keyword.toLowerCase())
      )
    );

    return Math.min(100, (matches.length / Math.max(contractKeywords.length, 1)) * 100);
  }

  private scorePastPerformance(subcontractor: Subcontractor): number {
    const pastPerformance = subcontractor.pastPerformance;
    if (!pastPerformance) return 25;

    if (pastPerformance.includes('excellent')) return 100;
    if (pastPerformance.includes('good')) return 75;
    if (pastPerformance.includes('satisfactory')) return 50;
    return 25;
  }

  private scoreGeographic(subcontractor: Subcontractor, contract: any): number {
    if (!contract.placeOfPerformance || !subcontractor.location) return 50;

    const contractLocation = contract.placeOfPerformance.toLowerCase();
    const subLocation = subcontractor.location.toLowerCase();

    if (contractLocation === subLocation) return 100;
    if (contractLocation.includes(subLocation.split(',')[1]?.trim())) return 75;
    return 25;
  }

  private scoreCertifications(subcontractor: Subcontractor, contract: any): number {
    const certifications = subcontractor.certifications || [];

    if (contract.setAsideType) {
      const requiredCert = this.mapSetAsideToCertification(contract.setAsideType);
      if (requiredCert && certifications.includes(requiredCert)) {
        return 100;
      }
    }

    if (certifications.length > 3) return 70;
    if (certifications.length > 0) return 40;
    return 0;
  }

  private scoreAvailability(subcontractor: Subcontractor): number {
    const capacity = subcontractor.capacity;
    if (!capacity) return 50;

    if (capacity === 'high') return 100;
    if (capacity === 'medium') return 70;
    if (capacity === 'low') return 30;
    return 50;
  }

  private calculateOverallScore(criteriaScores: MatchCriteria): number {
    let totalScore = 0;

    for (const [criterion, score] of Object.entries(criteriaScores)) {
      totalScore += score * this.weights[criterion as keyof MatchCriteria];
    }

    return Math.round(totalScore);
  }

  private generateMatchRationale(
    scores: MatchCriteria,
    subcontractor: Subcontractor,
    contract: any
  ): string {
    const strengths: string[] = [];

    if (scores.naicsAlignment >= 75) {
      strengths.push('Strong NAICS code alignment');
    }
    if (scores.capabilityMatch >= 70) {
      strengths.push('Excellent capability match');
    }
    if (scores.pastPerformance >= 75) {
      strengths.push('Proven past performance');
    }
    if (scores.geographic >= 75) {
      strengths.push('Ideal geographic location');
    }

    return strengths.join('; ') || 'Potential match based on available criteria';
  }

  private identifyRisks(subcontractor: Subcontractor, contract: any): string[] {
    const risks: string[] = [];

    if (!subcontractor.pastPerformance) {
      risks.push('No past performance data available');
    }

    if (subcontractor.capacity === 'low') {
      risks.push('Limited capacity may affect performance');
    }

    if (!subcontractor.certifications?.length && contract.setAsideType) {
      risks.push('Missing required certifications for set-aside');
    }

    return risks;
  }

  private generateRecommendations(subcontractor: Subcontractor, contract: any): string[] {
    const recommendations: string[] = [];

    recommendations.push('Verify current capacity and availability');

    if (!subcontractor.clearanceLevel && contract.description?.toLowerCase().includes('security')) {
      recommendations.push('Confirm security clearance requirements');
    }

    recommendations.push('Request recent past performance references');

    return recommendations;
  }

  private async saveMatches(matches: SubcontractorMatchResult[], contractId: string): Promise<void> {
    for (const match of matches) {
      await prisma.subcontractorMatch.create({
        data: {
          contractId,
          subcontractorId: match.subcontractor.id,
          matchScore: match.overallScore,
          matchReason: match.matchRationale,
          status: MatchStatus.POTENTIAL,
        },
      });
    }
  }

  private extractKeywords(text: string): string[] {
    const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for'];
    return text
      .toLowerCase()
      .split(/\W+/)
      .filter(word => word.length > 3 && !stopWords.includes(word))
      .slice(0, 10);
  }

  private mapSetAsideToCertification(setAsideType: string): string | null {
    const mapping: Record<string, string> = {
      'SB': 'Small Business',
      'SDVOSB': 'SDVOSB',
      'WOSB': 'WOSB',
      'HUBZone': 'HUBZone',
      '8(a)': '8(a)',
    };

    return mapping[setAsideType] || null;
  }

  async getMatchesByContract(contractId: string): Promise<any[]> {
    return prisma.subcontractorMatch.findMany({
      where: { contractId },
      include: {
        subcontractor: true,
      },
      orderBy: {
        matchScore: 'desc',
      },
    });
  }

  async updateMatchStatus(matchId: string, status: MatchStatus): Promise<void> {
    await prisma.subcontractorMatch.update({
      where: { id: matchId },
      data: { status },
    });
  }
}
import prisma from '../config/database';
import logger from '../config/logger';
import { MatchStatus } from '@prisma/client';

interface DealTerms {
  contractId: string;
  subcontractorId: string;
  subcontractValue: number;
  commissionModel: 'FLAT_FEE' | 'PERCENTAGE' | 'MILESTONE' | 'HYBRID';
  commissionRate: number;
  paymentSchedule: PaymentMilestone[];
}

interface PaymentMilestone {
  description: string;
  amount: number;
  dueDate: Date;
  percentage?: number;
}

interface CommissionCalculation {
  contractValue: number;
  subcontractValue: number;
  commissionRate: number;
  commissionAmount: number;
  paymentSchedule: PaymentMilestone[];
}

export class DealStructuringService {
  private readonly commissionTiers = [
    { min: 0, max: 100000, rate: 7 },
    { min: 100001, max: 500000, rate: 5 },
    { min: 500001, max: 1000000, rate: 4 },
    { min: 1000001, max: 5000000, rate: 3 },
    { min: 5000001, max: Infinity, rate: 2 },
  ];

  async createDeal(dealTerms: DealTerms): Promise<any> {
    try {
      const contract = await prisma.contract.findUnique({
        where: { id: dealTerms.contractId },
      });

      if (!contract) {
        throw new Error('Contract not found');
      }

      const commission = this.calculateCommission(
        contract.awardAmount,
        dealTerms.subcontractValue,
        dealTerms.commissionRate
      );

      const existingMatch = await prisma.subcontractorMatch.findFirst({
        where: {
          contractId: dealTerms.contractId,
          subcontractorId: dealTerms.subcontractorId,
        },
      });

      if (!existingMatch) {
        throw new Error('No existing match found for this contract and subcontractor');
      }

      const updatedMatch = await prisma.subcontractorMatch.update({
        where: { id: existingMatch.id },
        data: {
          status: MatchStatus.IN_DISCUSSION,
          proposedCommission: commission.commissionAmount,
          notes: `Deal initiated on ${new Date().toISOString()}. Commission model: ${dealTerms.commissionModel}`,
        },
      });

      logger.info('Deal created successfully', {
        matchId: updatedMatch.id,
        commission: commission.commissionAmount,
      });

      return {
        match: updatedMatch,
        commission,
        agreementDraft: this.generateAgreementDraft(contract, dealTerms, commission),
      };
    } catch (error) {
      logger.error('Error creating deal', { error });
      throw error;
    }
  }

  calculateCommission(
    contractValue: number,
    subcontractValue: number,
    customRate?: number
  ): CommissionCalculation {
    const effectiveValue = subcontractValue || contractValue;
    const commissionRate = customRate || this.getDefaultCommissionRate(effectiveValue);
    const commissionAmount = (effectiveValue * commissionRate) / 100;

    const paymentSchedule = this.generatePaymentSchedule(
      commissionAmount,
      effectiveValue
    );

    return {
      contractValue,
      subcontractValue: effectiveValue,
      commissionRate,
      commissionAmount,
      paymentSchedule,
    };
  }

  private getDefaultCommissionRate(value: number): number {
    const tier = this.commissionTiers.find(
      t => value >= t.min && value <= t.max
    );
    return tier ? tier.rate : this.commissionTiers[this.commissionTiers.length - 1].rate;
  }

  private generatePaymentSchedule(
    totalCommission: number,
    contractValue: number
  ): PaymentMilestone[] {
    const schedule: PaymentMilestone[] = [];

    if (totalCommission <= 10000) {
      schedule.push({
        description: 'Full payment upon contract execution',
        amount: totalCommission,
        dueDate: new Date(),
        percentage: 100,
      });
    } else if (totalCommission <= 50000) {
      schedule.push({
        description: 'Initial payment upon contract execution',
        amount: totalCommission * 0.5,
        dueDate: new Date(),
        percentage: 50,
      });
      schedule.push({
        description: 'Final payment at 50% completion',
        amount: totalCommission * 0.5,
        dueDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        percentage: 50,
      });
    } else {
      schedule.push({
        description: 'Initial payment upon contract execution',
        amount: totalCommission * 0.25,
        dueDate: new Date(),
        percentage: 25,
      });
      schedule.push({
        description: 'Second payment at 25% completion',
        amount: totalCommission * 0.25,
        dueDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        percentage: 25,
      });
      schedule.push({
        description: 'Third payment at 50% completion',
        amount: totalCommission * 0.25,
        dueDate: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000),
        percentage: 25,
      });
      schedule.push({
        description: 'Final payment upon contract completion',
        amount: totalCommission * 0.25,
        dueDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
        percentage: 25,
      });
    }

    return schedule;
  }

  private generateAgreementDraft(
    contract: any,
    dealTerms: DealTerms,
    commission: CommissionCalculation
  ): string {
    const today = new Date().toLocaleDateString();

    return `
TEAMING AGREEMENT

This Teaming Agreement ("Agreement") is entered into as of ${today} between:

PRIME CONTRACTOR: [Awardee Name]
SUBCONTRACTOR: [Subcontractor Name]
BROKER: ${process.env.COMPANY_NAME || 'Gov Contract Broker'}

RECITALS

WHEREAS, Prime Contractor has been awarded Contract ${contract.awardId} ("Prime Contract") by ${contract.awardingAgency};

WHEREAS, Subcontractor possesses specialized expertise and capabilities required for the performance of the Prime Contract;

WHEREAS, Broker has facilitated the partnership between Prime Contractor and Subcontractor;

NOW, THEREFORE, the parties agree as follows:

1. SCOPE OF WORK
Subcontractor shall provide the following services:
- [Detailed scope to be defined]
- Performance location: ${contract.placeOfPerformance || 'TBD'}
- Period of Performance: ${contract.periodOfPerformanceStart?.toLocaleDateString() || 'TBD'} to ${contract.periodOfPerformanceEnd?.toLocaleDateString() || 'TBD'}

2. SUBCONTRACT VALUE
The total value of the subcontract shall be $${commission.subcontractValue.toLocaleString()}.

3. BROKER COMMISSION
a. Commission Rate: ${commission.commissionRate}%
b. Total Commission: $${commission.commissionAmount.toLocaleString()}
c. Payment Schedule:
${commission.paymentSchedule.map(p => `   - ${p.description}: $${p.amount.toLocaleString()}`).join('\n')}

4. RESPONSIBILITIES
4.1 Prime Contractor shall:
- Provide overall contract management
- Ensure compliance with Prime Contract terms
- Process payments within 30 days of invoice

4.2 Subcontractor shall:
- Perform work in accordance with specifications
- Maintain required certifications and clearances
- Submit timely progress reports

4.3 Broker shall:
- Facilitate initial partnership setup
- Provide ongoing liaison services as needed
- Support dispute resolution if required

5. PAYMENT TERMS
Prime Contractor shall pay Subcontractor within 30 days of receipt of payment from the Government.
Broker commission shall be paid according to the schedule in Section 3.c.

6. CONFIDENTIALITY
All parties agree to maintain confidentiality of proprietary information.

7. COMPLIANCE
All parties shall comply with applicable Federal Acquisition Regulations (FAR) and Defense Federal Acquisition Regulation Supplement (DFARS) provisions.

8. TERM AND TERMINATION
This Agreement shall remain in effect for the duration of the Prime Contract unless terminated earlier by mutual agreement or for cause.

9. DISPUTE RESOLUTION
Disputes shall be resolved through good faith negotiation, and if necessary, binding arbitration.

10. ENTIRE AGREEMENT
This Agreement constitutes the entire agreement between the parties.

SIGNATURES:

_______________________     Date: ________
Prime Contractor

_______________________     Date: ________
Subcontractor

_______________________     Date: ________
Broker
    `.trim();
  }

  async updateDealStatus(matchId: string, status: MatchStatus, agreedCommission?: number): Promise<void> {
    try {
      const updateData: any = { status };

      if (agreedCommission !== undefined) {
        updateData.agreedCommission = agreedCommission;
      }

      if (status === MatchStatus.AGREEMENT_SIGNED) {
        updateData.teamingAgreement = `Agreement signed on ${new Date().toISOString()}`;
      }

      await prisma.subcontractorMatch.update({
        where: { id: matchId },
        data: updateData,
      });

      logger.info('Deal status updated', { matchId, status });
    } catch (error) {
      logger.error('Error updating deal status', { matchId, error });
      throw error;
    }
  }

  async getDealPipeline(): Promise<any> {
    const pipeline = await prisma.subcontractorMatch.groupBy({
      by: ['status'],
      _count: {
        id: true,
      },
      _sum: {
        proposedCommission: true,
        agreedCommission: true,
      },
    });

    const stages = Object.values(MatchStatus).map(status => {
      const stage = pipeline.find(p => p.status === status) || {
        _count: { id: 0 },
        _sum: { proposedCommission: 0, agreedCommission: 0 },
      };

      return {
        status,
        count: stage._count.id,
        proposedValue: stage._sum.proposedCommission || 0,
        agreedValue: stage._sum.agreedCommission || 0,
      };
    });

    return {
      stages,
      totals: {
        deals: pipeline.reduce((sum, p) => sum + p._count.id, 0),
        proposedCommission: pipeline.reduce((sum, p) => sum + (p._sum.proposedCommission || 0), 0),
        agreedCommission: pipeline.reduce((sum, p) => sum + (p._sum.agreedCommission || 0), 0),
      },
    };
  }

  async getCommissionForecast(months: number = 6): Promise<any> {
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + months);

    const activeDeals = await prisma.subcontractorMatch.findMany({
      where: {
        status: {
          in: [MatchStatus.AGREEMENT_SIGNED, MatchStatus.ACTIVE],
        },
        contract: {
          periodOfPerformanceEnd: {
            gte: startDate,
            lte: endDate,
          },
        },
      },
      include: {
        contract: true,
      },
    });

    const forecast = activeDeals.map(deal => ({
      contractId: deal.contractId,
      expectedCommission: deal.agreedCommission || deal.proposedCommission || 0,
      expectedDate: deal.contract.periodOfPerformanceEnd,
    }));

    const monthlyForecast: Record<string, number> = {};

    forecast.forEach(item => {
      if (item.expectedDate) {
        const monthKey = `${item.expectedDate.getFullYear()}-${String(item.expectedDate.getMonth() + 1).padStart(2, '0')}`;
        monthlyForecast[monthKey] = (monthlyForecast[monthKey] || 0) + (item.expectedCommission || 0);
      }
    });

    return {
      totalExpectedCommission: forecast.reduce((sum, f) => sum + (f.expectedCommission || 0), 0),
      monthlyForecast,
      dealCount: forecast.length,
    };
  }

  async generateInvoice(matchId: string): Promise<string> {
    const match = await prisma.subcontractorMatch.findUnique({
      where: { id: matchId },
      include: {
        contract: {
          include: {
            awardee: true,
          },
        },
        subcontractor: true,
      },
    });

    if (!match) {
      throw new Error('Match not found');
    }

    const invoiceNumber = `INV-${Date.now()}`;
    const commission = match.agreedCommission || match.proposedCommission || 0;

    return `
INVOICE

Invoice Number: ${invoiceNumber}
Date: ${new Date().toLocaleDateString()}

FROM:
${process.env.COMPANY_NAME || 'Gov Contract Broker'}
${process.env.COMPANY_ADDRESS || '123 Business St, City, ST 12345'}
${process.env.COMPANY_EMAIL || 'billing@example.com'}

TO:
${match.contract.awardee?.name || 'Prime Contractor'}
${match.contract.awardee?.addressLine1 || ''}
${match.contract.awardee?.city || ''}, ${match.contract.awardee?.state || ''} ${match.contract.awardee?.zipCode || ''}

DESCRIPTION:
Brokerage Services - Subcontractor Partnership Facilitation
Contract: ${match.contract.awardId}
Subcontractor: ${match.subcontractor.name}

Commission Rate: ${this.getDefaultCommissionRate(match.contract.awardAmount)}%
Contract Value: $${match.contract.awardAmount.toLocaleString()}
Commission Amount: $${commission.toLocaleString()}

PAYMENT TERMS:
Net 30 days

PAYMENT INSTRUCTIONS:
[Bank wire or ACH details]

Thank you for your business!
    `.trim();
  }
}
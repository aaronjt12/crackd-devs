import axios, { AxiosInstance } from 'axios';
import logger from '../config/logger';
import { TARGET_NAICS_CODES, SYNC_CONFIG } from '../config/constants';

interface USASpendingAward {
  Award: {
    AwardID: string;
    AwardDescription: string;
    AwardAmount: number;
    AwardDate: string;
    ModificationDate: string;
    ContractType: string;
    SetAsideType: string;
  };
  Recipient: {
    RecipientName: string;
    RecipientUEI: string;
    RecipientAddress: {
      AddressLine1: string;
      AddressLine2: string;
      City: string;
      State: string;
      ZipCode: string;
      Country: string;
    };
  };
  Agency: {
    AgencyName: string;
    OfficeName: string;
  };
  PlaceOfPerformance: {
    City: string;
    State: string;
    Country: string;
  };
  NAICS: {
    Code: string;
    Description: string;
  };
  PeriodOfPerformance: {
    StartDate: string;
    EndDate: string;
  };
}

export class USASpendingService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: process.env.USASPENDING_API_BASE_URL || 'https://api.usaspending.gov/api/v2',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (process.env.USASPENDING_API_KEY) {
      this.client.defaults.headers.common['X-API-Key'] = process.env.USASPENDING_API_KEY;
    }
  }

  async searchAwards(params: {
    naicsCodes?: string[];
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }) {
    try {
      const { naicsCodes = TARGET_NAICS_CODES, startDate, endDate, limit = 100, offset = 0 } = params;

      const searchParams = {
        filters: {
          naics_codes: naicsCodes,
          time_period: [
            {
              start_date: startDate?.toISOString().split('T')[0] || this.getDefaultStartDate(),
              end_date: endDate?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
            },
          ],
          award_type_codes: ['A', 'B', 'C', 'D'],
        },
        limit,
        offset,
        sort: 'Award Date',
        order: 'desc',
      };

      logger.info('Searching USAspending awards', { params: searchParams });

      const response = await this.client.post('/awards/search/', searchParams);

      return {
        awards: response.data.results || [],
        total: response.data.total || 0,
        hasMore: response.data.hasNext || false,
      };
    } catch (error) {
      logger.error('Error searching USAspending awards', { error });
      throw new Error(`Failed to search awards: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getAwardDetails(awardId: string) {
    try {
      logger.info('Fetching award details', { awardId });

      const response = await this.client.get(`/awards/${awardId}/`);
      return response.data;
    } catch (error) {
      logger.error('Error fetching award details', { awardId, error });
      throw new Error(`Failed to fetch award details: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getRecipientProfile(recipientId: string) {
    try {
      logger.info('Fetching recipient profile', { recipientId });

      const response = await this.client.get(`/recipient/duns/${recipientId}/`);
      return response.data;
    } catch (error) {
      logger.error('Error fetching recipient profile', { recipientId, error });
      throw new Error(`Failed to fetch recipient profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getSpendingByNAICS(naicsCode: string, fiscalYear?: number) {
    try {
      const params = {
        filters: {
          naics_codes: [naicsCode],
          fiscal_year: fiscalYear || new Date().getFullYear(),
        },
      };

      logger.info('Fetching spending by NAICS', { naicsCode, fiscalYear });

      const response = await this.client.post('/spending/', params);
      return response.data;
    } catch (error) {
      logger.error('Error fetching spending by NAICS', { naicsCode, error });
      throw new Error(`Failed to fetch spending data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private getDefaultStartDate(): string {
    const date = new Date();
    date.setDate(date.getDate() - SYNC_CONFIG.DAYS_BACK);
    return date.toISOString().split('T')[0];
  }

  transformAwardData(rawAward: any) {
    return {
      awardId: rawAward.generated_internal_id || rawAward.award_id,
      title: rawAward.description || 'N/A',
      description: rawAward.description,
      awardAmount: parseFloat(rawAward.total_obligation || rawAward.award_amount || 0),
      awardDate: new Date(rawAward.action_date || rawAward.award_date),
      awardingAgency: rawAward.awarding_agency?.toptier_agency?.name || 'Unknown',
      awardingOffice: rawAward.awarding_agency?.subtier_agency?.name,
      naicsCode: rawAward.naics_code,
      naicsDescription: rawAward.naics_description,
      placeOfPerformance: `${rawAward.place_of_performance?.city_name || ''}, ${rawAward.place_of_performance?.state_code || ''}`.trim(),
      periodOfPerformanceStart: rawAward.period_of_performance_start_date ? new Date(rawAward.period_of_performance_start_date) : null,
      periodOfPerformanceEnd: rawAward.period_of_performance_current_end_date ? new Date(rawAward.period_of_performance_current_end_date) : null,
      contractType: rawAward.type_description,
      setAsideType: rawAward.type_of_set_aside,
      lastModified: rawAward.last_modified_date ? new Date(rawAward.last_modified_date) : null,
      awardee: {
        uei: rawAward.recipient?.uei,
        name: rawAward.recipient?.recipient_name || 'Unknown',
        addressLine1: rawAward.recipient?.location?.address_line1,
        addressLine2: rawAward.recipient?.location?.address_line2,
        city: rawAward.recipient?.location?.city_name,
        state: rawAward.recipient?.location?.state_code,
        zipCode: rawAward.recipient?.location?.zip5,
        country: rawAward.recipient?.location?.country_code || 'USA',
        businessSize: rawAward.recipient?.business_types_description,
      },
    };
  }
}
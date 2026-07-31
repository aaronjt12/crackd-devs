import { Request, Response } from 'express';
import axios from 'axios';
import logger from '../config/logger';

const USASPENDING_API = 'https://api.usaspending.gov/api/v2';

export class SearchController {
  /**
   * Advanced search endpoint for frontend
   * Supports all USAspending filters
   */
  async searchContracts(req: Request, res: Response) {
    try {
      const {
        keywords,
        agencies,
        naicsCodes,
        setAsides,
        states,
        startDate,
        endDate,
        minAmount,
        maxAmount,
        recipientName,
        page = 1,
        limit = 20,
        sortBy = 'Award Amount',
        orderBy = 'desc'
      } = req.body;

      // Build filters object
      const filters: any = {};

      // Time period filter
      if (startDate || endDate) {
        filters.time_period = [{
          start_date: startDate || '2024-01-01',
          end_date: endDate || new Date().toISOString().split('T')[0]
        }];
      }

      // Award types (contracts only)
      filters.award_type_codes = ['A', 'B', 'C', 'D'];

      // Agency filter
      if (agencies && agencies.length > 0) {
        filters.agencies = agencies.map((agency: string) => ({
          type: 'awarding',
          tier: 'toptier',
          name: agency
        }));
      }

      // NAICS codes filter
      if (naicsCodes && naicsCodes.length > 0) {
        filters.naics_codes = naicsCodes;
      }

      // Set-aside types
      if (setAsides && setAsides.length > 0) {
        filters.type_of_set_asides = setAsides;
      }

      // Place of performance
      if (states && states.length > 0) {
        filters.place_of_performance_locations = states.map((state: string) => ({
          state
        }));
      }

      // Award amounts
      if (minAmount || maxAmount) {
        filters.award_amounts = [{
          lower_bound: minAmount || 0,
          upper_bound: maxAmount || 999999999999
        }];
      }

      // Recipient search
      if (recipientName) {
        filters.recipient_search_text = [recipientName];
      }

      // Keyword search
      if (keywords) {
        filters.keywords = keywords.split(' ');
      }

      // Make API request
      const response = await axios.post(`${USASPENDING_API}/search/spending_by_award/`, {
        filters,
        fields: [
          'Award ID',
          'Recipient Name',
          'recipient_id',
          'Award Amount',
          'Total Outlays',
          'Description',
          'Start Date',
          'End Date',
          'Last Modified Date',
          'Awarding Agency',
          'Awarding Sub Agency',
          'Award Type',
          'NAICS Code',
          'NAICS Description',
          'Place of Performance City',
          'Place of Performance State',
          'Place of Performance Zip',
          'Type of Set Aside',
          'Number of Offers Received',
          'Funding Agency',
          'recipient_uei',
          'prime_award_recipient_id'
        ],
        limit,
        page,
        sort: sortBy,
        order: orderBy
      });

      // Transform response for frontend
      const transformedResults = response.data.results.map((award: any) => ({
        id: award['Award ID'],
        recipient: {
          name: award['Recipient Name'],
          id: award['recipient_id'],
          uei: award['recipient_uei']
        },
        amount: award['Award Amount'],
        totalOutlays: award['Total Outlays'],
        description: award['Description'],
        dates: {
          start: award['Start Date'],
          end: award['End Date'],
          lastModified: award['Last Modified Date']
        },
        agency: {
          awarding: award['Awarding Agency'],
          subAgency: award['Awarding Sub Agency'],
          funding: award['Funding Agency']
        },
        naics: {
          code: award['NAICS Code'],
          description: award['NAICS Description']
        },
        placeOfPerformance: {
          city: award['Place of Performance City'],
          state: award['Place of Performance State'],
          zip: award['Place of Performance Zip']
        },
        setAside: award['Type of Set Aside'],
        numberOfOffers: award['Number of Offers Received'],
        awardType: award['Award Type']
      }));

      res.json({
        success: true,
        data: transformedResults,
        pagination: {
          page,
          limit,
          hasNext: response.data.hasNext,
          total: response.data.total
        },
        filters: filters
      });

    } catch (error) {
      logger.error('Search error:', error);
      res.status(500).json({
        success: false,
        error: 'Search failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get available filter options
   */
  async getFilterOptions(req: Request, res: Response) {
    try {
      // These could be dynamically fetched or cached
      const filterOptions = {
        agencies: [
          'Department of Defense',
          'Department of Health and Human Services',
          'Department of Veterans Affairs',
          'Department of Energy',
          'Department of Homeland Security',
          'Department of Transportation',
          'General Services Administration',
          'National Aeronautics and Space Administration',
          'Department of State',
          'Department of Justice'
        ],
        naicsCodes: [
          { code: '541511', description: 'Custom Computer Programming Services' },
          { code: '541512', description: 'Computer Systems Design Services' },
          { code: '541519', description: 'Other Computer Related Services' },
          { code: '541611', description: 'Administrative Management Consulting' },
          { code: '541612', description: 'Human Resources Consulting' },
          { code: '541613', description: 'Marketing Consulting Services' },
          { code: '541614', description: 'Process & Logistics Consulting' },
          { code: '541618', description: 'Other Management Consulting' },
          { code: '541219', description: 'Other Accounting Services' },
          { code: '561320', description: 'Temporary Help Services' },
          { code: '561110', description: 'Office Administrative Services' },
          { code: '488510', description: 'Freight Transportation Arrangement' }
        ],
        setAsides: [
          { code: 'NONE', description: 'No Set Aside' },
          { code: 'SBP', description: 'Small Business Set-Aside' },
          { code: '8A', description: '8(a) Set-Aside' },
          { code: 'WOSB', description: 'Women-Owned Small Business' },
          { code: 'SDVOSB', description: 'Service-Disabled Veteran-Owned' },
          { code: 'HZE', description: 'HUBZone Set-Aside' },
          { code: 'EDWOSB', description: 'Economically Disadvantaged WOSB' },
          { code: 'VSA', description: 'Veteran Set-Aside' }
        ],
        states: [
          { code: 'AL', name: 'Alabama' },
          { code: 'AK', name: 'Alaska' },
          { code: 'AZ', name: 'Arizona' },
          { code: 'AR', name: 'Arkansas' },
          { code: 'CA', name: 'California' },
          { code: 'CO', name: 'Colorado' },
          { code: 'CT', name: 'Connecticut' },
          { code: 'DE', name: 'Delaware' },
          { code: 'DC', name: 'District of Columbia' },
          { code: 'FL', name: 'Florida' },
          { code: 'GA', name: 'Georgia' },
          { code: 'HI', name: 'Hawaii' },
          { code: 'ID', name: 'Idaho' },
          { code: 'IL', name: 'Illinois' },
          { code: 'IN', name: 'Indiana' },
          { code: 'IA', name: 'Iowa' },
          { code: 'KS', name: 'Kansas' },
          { code: 'KY', name: 'Kentucky' },
          { code: 'LA', name: 'Louisiana' },
          { code: 'ME', name: 'Maine' },
          { code: 'MD', name: 'Maryland' },
          { code: 'MA', name: 'Massachusetts' },
          { code: 'MI', name: 'Michigan' },
          { code: 'MN', name: 'Minnesota' },
          { code: 'MS', name: 'Mississippi' },
          { code: 'MO', name: 'Missouri' },
          { code: 'MT', name: 'Montana' },
          { code: 'NE', name: 'Nebraska' },
          { code: 'NV', name: 'Nevada' },
          { code: 'NH', name: 'New Hampshire' },
          { code: 'NJ', name: 'New Jersey' },
          { code: 'NM', name: 'New Mexico' },
          { code: 'NY', name: 'New York' },
          { code: 'NC', name: 'North Carolina' },
          { code: 'ND', name: 'North Dakota' },
          { code: 'OH', name: 'Ohio' },
          { code: 'OK', name: 'Oklahoma' },
          { code: 'OR', name: 'Oregon' },
          { code: 'PA', name: 'Pennsylvania' },
          { code: 'RI', name: 'Rhode Island' },
          { code: 'SC', name: 'South Carolina' },
          { code: 'SD', name: 'South Dakota' },
          { code: 'TN', name: 'Tennessee' },
          { code: 'TX', name: 'Texas' },
          { code: 'UT', name: 'Utah' },
          { code: 'VT', name: 'Vermont' },
          { code: 'VA', name: 'Virginia' },
          { code: 'WA', name: 'Washington' },
          { code: 'WV', name: 'West Virginia' },
          { code: 'WI', name: 'Wisconsin' },
          { code: 'WY', name: 'Wyoming' }
        ],
        sortOptions: [
          { value: 'Award Amount', label: 'Award Amount' },
          { value: 'Start Date', label: 'Start Date' },
          { value: 'End Date', label: 'End Date' },
          { value: 'Last Modified Date', label: 'Last Modified' },
          { value: 'Recipient Name', label: 'Recipient Name' },
          { value: 'Awarding Agency', label: 'Agency' }
        ]
      };

      res.json({
        success: true,
        data: filterOptions
      });

    } catch (error) {
      logger.error('Error fetching filter options:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch filter options'
      });
    }
  }

  /**
   * Get trending contracts
   */
  async getTrending(req: Request, res: Response) {
    try {
      const { period = 7 } = req.query;

      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - Number(period));

      const response = await axios.post(`${USASPENDING_API}/search/spending_by_award/`, {
        filters: {
          time_period: [{
            start_date: startDate.toISOString().split('T')[0],
            end_date: endDate.toISOString().split('T')[0]
          }],
          award_type_codes: ['A', 'B', 'C', 'D'],
          award_amounts: [{
            lower_bound: 500000
          }]
        },
        fields: [
          'Award ID',
          'Recipient Name',
          'Award Amount',
          'Description',
          'Awarding Agency',
          'NAICS Description',
          'Start Date'
        ],
        limit: 10,
        page: 1,
        sort: 'Award Amount',
        order: 'desc'
      });

      const trending = response.data.results.map((award: any) => ({
        id: award['Award ID'],
        title: award['Description'],
        recipient: award['Recipient Name'],
        amount: award['Award Amount'],
        agency: award['Awarding Agency'],
        category: award['NAICS Description'],
        date: award['Start Date'],
        trend: 'up' // Could calculate actual trend
      }));

      res.json({
        success: true,
        data: trending,
        period
      });

    } catch (error) {
      logger.error('Error fetching trending contracts:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch trending contracts'
      });
    }
  }

  /**
   * Get contract details
   */
  async getContractDetails(req: Request, res: Response) {
    try {
      const { awardId } = req.params;

      // This would need to be implemented based on USAspending's award detail endpoint
      res.json({
        success: true,
        data: {
          message: 'Contract details endpoint - to be implemented',
          awardId
        }
      });

    } catch (error) {
      logger.error('Error fetching contract details:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch contract details'
      });
    }
  }
}
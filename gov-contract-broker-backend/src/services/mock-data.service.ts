import logger from '../config/logger';
import { TARGET_NAICS_CODES } from '../config/constants';

export class MockDataService {
  private mockContracts = [
    {
      generated_internal_id: 'MOCK-001',
      description: 'Cloud Computing Infrastructure Services',
      total_obligation: 750000,
      action_date: '2024-01-15',
      naics_code: '541512',
      naics_description: 'Computer Systems Design Services',
      awarding_agency: {
        toptier_agency: { name: 'Department of Defense' },
        subtier_agency: { name: 'Defense Information Systems Agency' }
      },
      recipient: {
        recipient_name: 'TechCorp Solutions Inc.',
        uei: 'MOCK123456789',
        location: {
          address_line1: '123 Tech Drive',
          city_name: 'Arlington',
          state_code: 'VA',
          zip5: '22201',
          country_code: 'USA'
        },
        business_types_description: 'Small Business'
      },
      place_of_performance: {
        city_name: 'Washington',
        state_code: 'DC'
      },
      period_of_performance_start_date: '2024-02-01',
      period_of_performance_current_end_date: '2025-01-31',
      type_description: 'Firm Fixed Price',
      type_of_set_aside: 'SB'
    },
    {
      generated_internal_id: 'MOCK-002',
      description: 'Management Consulting and Advisory Services',
      total_obligation: 1250000,
      action_date: '2024-01-20',
      naics_code: '541611',
      naics_description: 'Administrative Management and General Management Consulting Services',
      awarding_agency: {
        toptier_agency: { name: 'Department of Health and Human Services' },
        subtier_agency: { name: 'Centers for Disease Control and Prevention' }
      },
      recipient: {
        recipient_name: 'Strategic Advisors LLC',
        uei: 'MOCK987654321',
        location: {
          address_line1: '456 Consulting Way',
          city_name: 'Bethesda',
          state_code: 'MD',
          zip5: '20814',
          country_code: 'USA'
        },
        business_types_description: 'Woman Owned Small Business'
      },
      place_of_performance: {
        city_name: 'Atlanta',
        state_code: 'GA'
      },
      period_of_performance_start_date: '2024-03-01',
      period_of_performance_current_end_date: '2025-02-28',
      type_description: 'Time and Materials',
      type_of_set_aside: 'WOSB'
    },
    {
      generated_internal_id: 'MOCK-003',
      description: 'Custom Software Development Services',
      total_obligation: 2500000,
      action_date: '2024-01-25',
      naics_code: '541511',
      naics_description: 'Custom Computer Programming Services',
      awarding_agency: {
        toptier_agency: { name: 'Department of Veterans Affairs' },
        subtier_agency: { name: 'Veterans Health Administration' }
      },
      recipient: {
        recipient_name: 'Veterans Tech Partners Inc.',
        uei: 'MOCK111222333',
        location: {
          address_line1: '789 Development Blvd',
          city_name: 'Austin',
          state_code: 'TX',
          zip5: '78701',
          country_code: 'USA'
        },
        business_types_description: 'Service-Disabled Veteran-Owned Small Business'
      },
      place_of_performance: {
        city_name: 'Houston',
        state_code: 'TX'
      },
      period_of_performance_start_date: '2024-04-01',
      period_of_performance_current_end_date: '2026-03-31',
      type_description: 'Firm Fixed Price',
      type_of_set_aside: 'SDVOSB'
    },
    {
      generated_internal_id: 'MOCK-004',
      description: 'Accounting and Financial Management Services',
      total_obligation: 500000,
      action_date: '2024-01-10',
      naics_code: '541219',
      naics_description: 'Other Accounting Services',
      awarding_agency: {
        toptier_agency: { name: 'Department of Transportation' },
        subtier_agency: { name: 'Federal Aviation Administration' }
      },
      recipient: {
        recipient_name: 'Finance Pros & Associates',
        uei: 'MOCK444555666',
        location: {
          address_line1: '321 Numbers Lane',
          city_name: 'Chicago',
          state_code: 'IL',
          zip5: '60601',
          country_code: 'USA'
        },
        business_types_description: 'HUBZone Small Business'
      },
      place_of_performance: {
        city_name: 'Chicago',
        state_code: 'IL'
      },
      period_of_performance_start_date: '2024-02-15',
      period_of_performance_current_end_date: '2024-12-31',
      type_description: 'Cost Plus Fixed Fee',
      type_of_set_aside: 'HUBZone'
    },
    {
      generated_internal_id: 'MOCK-005',
      description: 'Temporary Professional Staffing Services',
      total_obligation: 3000000,
      action_date: '2024-01-18',
      naics_code: '561320',
      naics_description: 'Temporary Help Services',
      awarding_agency: {
        toptier_agency: { name: 'Department of Energy' },
        subtier_agency: { name: 'National Nuclear Security Administration' }
      },
      recipient: {
        recipient_name: 'ProStaff Solutions Corp',
        uei: 'MOCK777888999',
        location: {
          address_line1: '555 Staffing Street',
          city_name: 'Denver',
          state_code: 'CO',
          zip5: '80202',
          country_code: 'USA'
        },
        business_types_description: '8(a) Business Development Program'
      },
      place_of_performance: {
        city_name: 'Los Alamos',
        state_code: 'NM'
      },
      period_of_performance_start_date: '2024-03-15',
      period_of_performance_current_end_date: '2027-03-14',
      type_description: 'Indefinite Delivery/Indefinite Quantity',
      type_of_set_aside: '8(a)'
    }
  ];

  async getMockAwards(params: {
    limit?: number;
    offset?: number;
  }) {
    const { limit = 100, offset = 0 } = params;

    logger.info('Returning mock contract data', { limit, offset });

    // Simulate pagination
    const paginatedResults = this.mockContracts.slice(offset, offset + limit);

    // Add some randomization to simulate real data
    const results = paginatedResults.map((contract, index) => ({
      ...contract,
      generated_internal_id: `MOCK-${Date.now()}-${index}`,
      action_date: this.randomizeDate(contract.action_date),
      total_obligation: this.randomizeAmount(contract.total_obligation),
    }));

    return {
      awards: results,
      total: this.mockContracts.length,
      hasMore: offset + limit < this.mockContracts.length,
    };
  }

  private randomizeDate(baseDate: string): string {
    const date = new Date(baseDate);
    const daysToSubtract = Math.floor(Math.random() * 30);
    date.setDate(date.getDate() - daysToSubtract);
    return date.toISOString().split('T')[0];
  }

  private randomizeAmount(baseAmount: number): number {
    const variance = 0.2; // 20% variance
    const min = baseAmount * (1 - variance);
    const max = baseAmount * (1 + variance);
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  generateMockSubcontractor() {
    const names = [
      'Elite Tech Solutions LLC',
      'Federal Systems Integrators',
      'Cleared Professionals Inc.',
      'Agile Development Partners',
      'Strategic Staffing Solutions'
    ];

    const capabilities = [
      ['Software Development', 'Cloud Architecture', 'DevOps'],
      ['Project Management', 'Business Analysis', 'Process Improvement'],
      ['Data Analytics', 'Machine Learning', 'AI Solutions'],
      ['Cybersecurity', 'Risk Assessment', 'Compliance'],
      ['Systems Integration', 'Enterprise Architecture', 'Migration Services']
    ];

    const idx = Math.floor(Math.random() * names.length);

    return {
      name: names[idx],
      email: `contact@${names[idx].toLowerCase().replace(/\s+/g, '')}.com`,
      capabilities: capabilities[idx],
      naicsCodes: [TARGET_NAICS_CODES[Math.floor(Math.random() * TARGET_NAICS_CODES.length)]],
      certifications: ['ISO 9001', 'CMMI Level 3'],
      pastPerformance: 'Excellent - Multiple successful federal contracts',
      capacity: 'high',
      location: 'Washington, DC',
    };
  }
}
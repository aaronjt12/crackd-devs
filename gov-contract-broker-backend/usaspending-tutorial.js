/**
 * USAspending.gov API Tutorial Implementation
 * Based on: https://api.usaspending.gov/docs/intro-tutorial
 *
 * This implements the exact examples from their tutorial
 * NO API KEY REQUIRED - Completely public API!
 */

const axios = require('axios');

const API_BASE = 'https://api.usaspending.gov/api/v2';

// Helper function for pretty printing
function printResult(title, data) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(` ${title}`);
  console.log('='.repeat(60));
  console.log(JSON.stringify(data, null, 2));
}

// Tutorial Example 1: Basic Award Search
async function example1_BasicAwardSearch() {
  console.log('\n📘 Example 1: Basic Award Search');
  console.log('Finding contracts awarded by Department of Defense in 2023');

  const response = await axios.post(`${API_BASE}/search/spending_by_award/`, {
    filters: {
      agencies: [
        {
          type: "awarding",
          tier: "toptier",
          name: "Department of Defense"
        }
      ],
      time_period: [
        {
          start_date: "2023-01-01",
          end_date: "2023-12-31"
        }
      ],
      award_type_codes: ["A", "B", "C", "D"] // Contract award types
    },
    fields: [
      "Award ID",
      "Recipient Name",
      "Award Amount",
      "Description",
      "Start Date",
      "End Date",
      "Awarding Agency",
      "Awarding Sub Agency",
      "Award Type",
      "NAICS Code",
      "NAICS Description"
    ],
    limit: 5,
    page: 1,
    sort: "Award Amount",
    order: "desc"
  });

  console.log(`Found ${response.data.results.length} contracts`);
  response.data.results.forEach((award, i) => {
    console.log(`\n${i + 1}. ${award['Recipient Name']}`);
    console.log(`   Amount: $${(award['Award Amount'] || 0).toLocaleString()}`);
    console.log(`   Description: ${award['Description']}`);
    console.log(`   NAICS: ${award['NAICS Code']} - ${award['NAICS Description']}`);
  });

  return response.data;
}

// Tutorial Example 2: Advanced Filters - IT Contracts
async function example2_ITContracts() {
  console.log('\n📘 Example 2: IT Services Contracts (Using NAICS Codes)');
  console.log('Finding computer programming and systems design contracts');

  const response = await axios.post(`${API_BASE}/search/spending_by_award/`, {
    filters: {
      naics_codes: [
        "541511", // Custom Computer Programming Services
        "541512", // Computer Systems Design Services
        "518210", // Data Processing, Hosting, and Related Services
      ],
      time_period: [
        {
          start_date: "2024-01-01",
          end_date: "2024-03-31"
        }
      ],
      award_amounts: [
        {
          lower_bound: 100000,
          upper_bound: 10000000
        }
      ]
    },
    fields: [
      "Award ID",
      "Recipient Name",
      "Award Amount",
      "Description",
      "NAICS Code",
      "NAICS Description",
      "Place of Performance City",
      "Place of Performance State"
    ],
    limit: 10,
    page: 1,
    sort: "Award Amount",
    order: "desc"
  });

  console.log(`Found ${response.data.results.length} IT contracts`);

  // Group by NAICS code
  const byNAICS = {};
  response.data.results.forEach(award => {
    const naics = award['NAICS Code'];
    if (!byNAICS[naics]) {
      byNAICS[naics] = {
        description: award['NAICS Description'],
        count: 0,
        total: 0
      };
    }
    byNAICS[naics].count++;
    byNAICS[naics].total += award['Award Amount'] || 0;
  });

  console.log('\nBy NAICS Code:');
  Object.entries(byNAICS).forEach(([code, data]) => {
    console.log(`  ${code} - ${data.description}`);
    console.log(`    Count: ${data.count}, Total: $${data.total.toLocaleString()}`);
  });

  return response.data;
}

// Tutorial Example 3: Small Business Set-Asides
async function example3_SmallBusinessContracts() {
  console.log('\n📘 Example 3: Small Business Set-Aside Contracts');
  console.log('Finding contracts with small business preferences');

  const response = await axios.post(`${API_BASE}/search/spending_by_award/`, {
    filters: {
      time_period: [
        {
          start_date: "2024-01-01",
          end_date: "2024-03-31"
        }
      ],
      type_of_set_asides: [
        "SBP", // Small Business Set-Aside
        "8A", // 8(a) Set-Aside
        "WOSB", // Women-Owned Small Business
        "SDVOSB", // Service-Disabled Veteran-Owned Small Business
        "HZE" // HUBZone
      ],
      award_amounts: [
        {
          lower_bound: 25000
        }
      ]
    },
    fields: [
      "Award ID",
      "Recipient Name",
      "Award Amount",
      "Type of Set Aside",
      "Description",
      "Awarding Agency"
    ],
    limit: 10,
    page: 1
  });

  console.log(`Found ${response.data.results.length} small business contracts`);

  // Group by set-aside type
  const bySetAside = {};
  response.data.results.forEach(award => {
    const setAside = award['Type of Set Aside'] || 'None';
    if (!bySetAside[setAside]) {
      bySetAside[setAside] = {
        count: 0,
        total: 0,
        examples: []
      };
    }
    bySetAside[setAside].count++;
    bySetAside[setAside].total += award['Award Amount'] || 0;
    if (bySetAside[setAside].examples.length < 2) {
      bySetAside[setAside].examples.push(award['Recipient Name']);
    }
  });

  console.log('\nBy Set-Aside Type:');
  Object.entries(bySetAside).forEach(([type, data]) => {
    console.log(`  ${type}:`);
    console.log(`    Count: ${data.count}, Total: $${data.total.toLocaleString()}`);
    console.log(`    Examples: ${data.examples.join(', ')}`);
  });

  return response.data;
}

// Tutorial Example 4: Recent Awards by Location
async function example4_AwardsByLocation() {
  console.log('\n📘 Example 4: Awards by Place of Performance');
  console.log('Finding contracts performed in specific states');

  const response = await axios.post(`${API_BASE}/search/spending_by_award/`, {
    filters: {
      place_of_performance_locations: [
        {
          state: "VA"
        },
        {
          state: "MD"
        },
        {
          state: "DC"
        }
      ],
      time_period: [
        {
          start_date: "2024-01-01",
          end_date: "2024-03-31"
        }
      ],
      award_type_codes: ["A", "B", "C", "D"]
    },
    fields: [
      "Award ID",
      "Recipient Name",
      "Award Amount",
      "Place of Performance City",
      "Place of Performance State",
      "Description"
    ],
    limit: 10,
    page: 1,
    sort: "Award Amount",
    order: "desc"
  });

  console.log(`Found ${response.data.results.length} contracts in VA/MD/DC area`);

  // Group by state
  const byState = {};
  response.data.results.forEach(award => {
    const state = award['Place of Performance State'];
    if (!byState[state]) {
      byState[state] = {
        count: 0,
        total: 0,
        cities: new Set()
      };
    }
    byState[state].count++;
    byState[state].total += award['Award Amount'] || 0;
    byState[state].cities.add(award['Place of Performance City']);
  });

  console.log('\nBy State:');
  Object.entries(byState).forEach(([state, data]) => {
    console.log(`  ${state}:`);
    console.log(`    Contracts: ${data.count}`);
    console.log(`    Total Value: $${data.total.toLocaleString()}`);
    console.log(`    Cities: ${Array.from(data.cities).join(', ')}`);
  });

  return response.data;
}

// Tutorial Example 5: Spending Over Time
async function example5_SpendingOverTime() {
  console.log('\n📘 Example 5: Analyzing Spending Trends');
  console.log('Comparing Q1 2023 vs Q1 2024 spending');

  const periods = [
    { year: '2023', start: '2023-01-01', end: '2023-03-31' },
    { year: '2024', start: '2024-01-01', end: '2024-03-31' }
  ];

  const results = {};

  for (const period of periods) {
    const response = await axios.post(`${API_BASE}/search/spending_by_award/`, {
      filters: {
        time_period: [
          {
            start_date: period.start,
            end_date: period.end
          }
        ],
        award_type_codes: ["A", "B", "C", "D"],
        naics_codes: ["541511", "541512", "541611", "541219", "561320"] // Our target NAICS codes
      },
      fields: ["Award Amount", "NAICS Code"],
      limit: 100,
      page: 1
    });

    results[period.year] = {
      count: response.data.results.length,
      total: response.data.results.reduce((sum, award) => sum + (award['Award Amount'] || 0), 0)
    };
  }

  console.log('\nQ1 Comparison:');
  console.log(`  2023 Q1: ${results['2023'].count} contracts, $${results['2023'].total.toLocaleString()}`);
  console.log(`  2024 Q1: ${results['2024'].count} contracts, $${results['2024'].total.toLocaleString()}`);

  const growth = ((results['2024'].total - results['2023'].total) / results['2023'].total * 100).toFixed(1);
  console.log(`  Growth: ${growth}%`);

  return results;
}

// Tutorial Example 6: Get Recipient Details
async function example6_RecipientProfile() {
  console.log('\n📘 Example 6: Recipient (Vendor) Information');
  console.log('Getting details about specific contractors');

  // First, find some recipients
  const searchResponse = await axios.post(`${API_BASE}/search/spending_by_award/`, {
    filters: {
      time_period: [
        {
          start_date: "2024-01-01",
          end_date: "2024-03-31"
        }
      ],
      award_type_codes: ["A", "B", "C", "D"],
      naics_codes: ["541511", "541512"]
    },
    fields: [
      "Recipient Name",
      "recipient_id",
      "Award Amount"
    ],
    limit: 5,
    page: 1,
    sort: "Award Amount",
    order: "desc"
  });

  console.log('\nTop Recipients:');
  searchResponse.data.results.forEach((recipient, i) => {
    console.log(`${i + 1}. ${recipient['Recipient Name']}`);
    console.log(`   Total Awards: $${(recipient['Award Amount'] || 0).toLocaleString()}`);
  });

  return searchResponse.data;
}

// Main execution
async function runTutorial() {
  console.log('================================================');
  console.log(' USAspending.gov API Tutorial');
  console.log(' Based on Official Documentation');
  console.log(' NO API KEY REQUIRED!');
  console.log('================================================');

  try {
    // Run all examples
    await example1_BasicAwardSearch();
    await example2_ITContracts();
    await example3_SmallBusinessContracts();
    await example4_AwardsByLocation();
    await example5_SpendingOverTime();
    await example6_RecipientProfile();

    console.log('\n================================================');
    console.log(' Tutorial Complete!');
    console.log(' The API is working and returning real data');
    console.log('================================================\n');

    console.log('Next Steps:');
    console.log('1. Run the backend server: npm run dev');
    console.log('2. Trigger a sync: curl -X POST http://localhost:3000/api/sync/trigger');
    console.log('3. View contracts: curl http://localhost:3000/api/contracts');

  } catch (error) {
    console.error('\nError:', error.response?.data || error.message);

    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Run the tutorial
runTutorial();
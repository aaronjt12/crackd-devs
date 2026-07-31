/**
 * Test script for USAspending.gov API
 * NO API KEY REQUIRED - This API is public!
 *
 * Run this directly with: node test-real-api.js
 */

const axios = require('axios');

const USASPENDING_API = 'https://api.usaspending.gov/api/v2';

// Test 1: Direct API call to USAspending (no auth needed!)
async function testDirectAPI() {
  console.log('=== Testing Direct USAspending.gov API (No Key Required!) ===\n');

  try {
    // Search for recent IT contracts
    console.log('Searching for recent IT contracts...');
    const response = await axios.post(`${USASPENDING_API}/search/spending_by_award/`, {
      filters: {
        time_period: [
          {
            start_date: '2024-01-01',
            end_date: '2024-12-31'
          }
        ],
        award_type_codes: ['A', 'B', 'C', 'D'], // Contract types
        naics_codes: ['541511', '541512'], // IT Services NAICS codes
      },
      limit: 5,
      page: 1,
      sort: 'Award Amount',
      order: 'desc'
    });

    console.log(`✓ Found ${response.data.results.length} contracts\n`);

    // Display results
    response.data.results.forEach((award, index) => {
      console.log(`Contract ${index + 1}:`);
      console.log(`  Description: ${award.Award_Description || 'N/A'}`);
      console.log(`  Amount: $${(award.Award_Amount || 0).toLocaleString()}`);
      console.log(`  Recipient: ${award.Recipient_Name || 'N/A'}`);
      console.log(`  Agency: ${award.Awarding_Agency || 'N/A'}`);
      console.log('');
    });

    return true;
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
    return false;
  }
}

// Test 2: Test our backend server
async function testBackendServer() {
  console.log('=== Testing Our Backend Server ===\n');

  const BASE_URL = 'http://localhost:3000';

  try {
    // Check if server is running
    console.log('1. Checking server health...');
    const health = await axios.get(`${BASE_URL}/health`);
    console.log('✓ Server is healthy:', health.data);

    // Trigger a sync to get real data
    console.log('\n2. Triggering data sync from USAspending...');
    console.log('   (This will fetch real government contract data)');
    const sync = await axios.post(`${BASE_URL}/api/sync/trigger`);
    console.log('✓ Sync completed:', {
      processed: sync.data.data.processed,
      created: sync.data.data.created,
      updated: sync.data.data.updated
    });

    // Get the synced contracts
    console.log('\n3. Fetching contracts from our database...');
    const contracts = await axios.get(`${BASE_URL}/api/contracts?limit=5`);
    console.log(`✓ Retrieved ${contracts.data.data.length} contracts from database`);

    if (contracts.data.data.length > 0) {
      console.log('\nSample contract:');
      const sample = contracts.data.data[0];
      console.log(`  Title: ${sample.title}`);
      console.log(`  Amount: $${sample.awardAmount.toLocaleString()}`);
      console.log(`  Agency: ${sample.awardingAgency}`);
      console.log(`  Awardee: ${sample.awardee?.name || 'N/A'}`);
    }

    // Get statistics
    console.log('\n4. Getting statistics...');
    const stats = await axios.get(`${BASE_URL}/api/sync/stats`);
    console.log('✓ Statistics:', stats.data.data);

    return true;
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.error('❌ Server is not running. Please start it with: npm run dev');
    } else {
      console.error('❌ Error:', error.response?.data || error.message);
    }
    return false;
  }
}

// Test 3: Search for specific contracts
async function searchContracts() {
  console.log('=== Searching for Specific Contract Types ===\n');

  const searches = [
    { naics: '541511', description: 'Custom Computer Programming' },
    { naics: '541512', description: 'Computer Systems Design' },
    { naics: '541611', description: 'Management Consulting' },
  ];

  for (const search of searches) {
    console.log(`Searching for ${search.description} contracts (NAICS: ${search.naics})...`);

    try {
      const response = await axios.post(`${USASPENDING_API}/search/spending_by_award/`, {
        filters: {
          naics_codes: [search.naics],
          time_period: [{
            start_date: '2024-01-01',
            end_date: '2024-12-31'
          }]
        },
        limit: 3,
        page: 1,
        sort: 'Award Amount',
        order: 'desc'
      });

      console.log(`✓ Found ${response.data.results.length} contracts`);

      if (response.data.results.length > 0) {
        const total = response.data.results.reduce((sum, award) => sum + (award.Award_Amount || 0), 0);
        console.log(`  Total value: $${total.toLocaleString()}`);
      }
    } catch (error) {
      console.error(`  Error: ${error.message}`);
    }
    console.log('');
  }
}

// Main execution
async function main() {
  console.log('================================================');
  console.log(' USAspending.gov API Test Suite');
  console.log(' NO API KEY REQUIRED - Public Access!');
  console.log('================================================\n');

  // Test direct API access
  await testDirectAPI();

  console.log('\n' + '='.repeat(50) + '\n');

  // Test specific searches
  await searchContracts();

  console.log('\n' + '='.repeat(50) + '\n');

  // Test our backend (will fail if server not running)
  await testBackendServer();

  console.log('\n================================================');
  console.log(' Testing Complete!');
  console.log('================================================');
}

// Run tests
main().catch(console.error);
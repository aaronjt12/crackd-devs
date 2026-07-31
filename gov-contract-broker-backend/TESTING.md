# Testing Guide - Government Contract Broker API

## Quick Start (No API Key Required)

### 1. Setup Environment

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Edit `.env` with these minimal settings:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration (Use SQLite for testing)
DATABASE_URL="file:./dev.db"

# USAspending API (No key needed - API is public!)
USASPENDING_API_BASE_URL=https://api.usaspending.gov/api/v2
# API key is OPTIONAL for USAspending

# Mock Mode (for testing without real API)
USE_MOCK_DATA=true

# Other settings (use defaults for testing)
SYNC_INTERVAL_MINUTES=60
MAX_RECORDS_PER_SYNC=10
DEFAULT_COMMISSION_PERCENTAGE=5
LOG_LEVEL=info
```

### 2. Install Dependencies & Setup Database

```bash
npm install
npx prisma generate
npx prisma migrate dev --name init
```

### 3. Start the Server

```bash
npm run dev
```

## Testing Without API Keys

### Option 1: Use Real USAspending API (No Key Required!)

The USAspending.gov API is **publicly accessible without authentication**. You can test immediately:

```bash
# Test the sync endpoint
curl -X POST http://localhost:3000/api/sync/trigger

# Get contracts
curl http://localhost:3000/api/contracts

# Get sync stats
curl http://localhost:3000/api/sync/stats
```

### Option 2: Use Mock Mode

Set `USE_MOCK_DATA=true` in your `.env` file to use simulated data without hitting real APIs.

## API Endpoints to Test

### 1. Health Check
```bash
curl http://localhost:3000/health
```

### 2. Trigger Manual Sync (Real Data)
```bash
curl -X POST http://localhost:3000/api/sync/trigger
```

### 3. Get Contracts
```bash
# All contracts
curl http://localhost:3000/api/contracts

# With filters
curl "http://localhost:3000/api/contracts?naicsCode=541511&limit=10"

# Specific contract
curl http://localhost:3000/api/contracts/{id}
```

### 4. Get Statistics
```bash
# By NAICS code
curl http://localhost:3000/api/contracts/stats/naics

# By Agency
curl http://localhost:3000/api/contracts/stats/agency

# Sync statistics
curl http://localhost:3000/api/sync/stats
```

### 5. Get Sync Logs
```bash
curl http://localhost:3000/api/sync/logs?limit=10
```

## Testing with Postman/Insomnia

Import this collection to test all endpoints:

```json
{
  "name": "Gov Contract Broker",
  "requests": [
    {
      "name": "Health Check",
      "method": "GET",
      "url": "http://localhost:3000/health"
    },
    {
      "name": "Trigger Sync",
      "method": "POST",
      "url": "http://localhost:3000/api/sync/trigger"
    },
    {
      "name": "Get Contracts",
      "method": "GET",
      "url": "http://localhost:3000/api/contracts",
      "params": {
        "page": 1,
        "limit": 20,
        "naicsCode": "541511"
      }
    },
    {
      "name": "Get NAICS Stats",
      "method": "GET",
      "url": "http://localhost:3000/api/contracts/stats/naics"
    },
    {
      "name": "Get Agency Stats",
      "method": "GET",
      "url": "http://localhost:3000/api/contracts/stats/agency"
    },
    {
      "name": "Get Sync Logs",
      "method": "GET",
      "url": "http://localhost:3000/api/sync/logs"
    }
  ]
}
```

## Sample Test Script

Create `test-api.js`:

```javascript
const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testAPI() {
  try {
    // 1. Check health
    console.log('Testing health endpoint...');
    const health = await axios.get(`${BASE_URL}/health`);
    console.log('✓ Health:', health.data);

    // 2. Trigger sync
    console.log('\nTriggering sync...');
    const sync = await axios.post(`${BASE_URL}/api/sync/trigger`);
    console.log('✓ Sync result:', sync.data);

    // 3. Get contracts
    console.log('\nFetching contracts...');
    const contracts = await axios.get(`${BASE_URL}/api/contracts`);
    console.log('✓ Found contracts:', contracts.data.pagination.total);

    // 4. Get stats
    console.log('\nFetching statistics...');
    const stats = await axios.get(`${BASE_URL}/api/sync/stats`);
    console.log('✓ Stats:', stats.data);

  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testAPI();
```

Run it:
```bash
node test-api.js
```

## Expected Responses

### Successful Sync Response:
```json
{
  "success": true,
  "data": {
    "success": true,
    "processed": 10,
    "created": 8,
    "updated": 2,
    "errors": []
  }
}
```

### Contracts Response:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "awardId": "CONT-AWARD-123",
      "title": "IT Support Services",
      "awardAmount": 500000,
      "awardDate": "2024-01-15",
      "awardingAgency": "Department of Defense",
      "naicsCode": "541511",
      "awardee": {
        "name": "ABC Corporation",
        "city": "Washington",
        "state": "DC"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

## Troubleshooting

### Database Issues
```bash
# Reset database
npx prisma migrate reset

# View database
npx prisma studio
```

### Connection Issues
- Check if port 3000 is available
- Verify DATABASE_URL is correct
- Ensure PostgreSQL is running (or use SQLite)

### No Data Returned
- The USAspending API might not have recent data for your filters
- Try broader date ranges or remove NAICS filters
- Check sync logs for errors

## Notes

1. **USAspending API is FREE and PUBLIC** - No authentication required!
2. SAM.gov API requires registration at https://sam.gov/apis
3. Email features will simulate sending unless SMTP is configured
4. The sync will pull real contract data from the last 90 days
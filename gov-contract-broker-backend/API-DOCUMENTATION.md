# Government Contract Broker API Documentation

## Base URL
```
Development: http://localhost:3000
Production: https://your-api-domain.com
```

## Authentication
Currently, the API is open. Authentication middleware can be added as needed.

## CORS
The API supports CORS for all origins by default. Configure `FRONTEND_URL` in `.env` for production.

## WebSocket Support
Real-time updates available via Socket.IO at the same base URL.

---

## 🔍 Search API

### Search Contracts
**POST** `/api/search/contracts`

Search USAspending.gov contracts with advanced filters.

#### Request Body:
```json
{
  "keywords": "cloud computing",
  "agencies": ["Department of Defense"],
  "naicsCodes": ["541511", "541512"],
  "setAsides": ["SBP", "8A"],
  "states": ["VA", "MD", "DC"],
  "startDate": "2024-01-01",
  "endDate": "2024-12-31",
  "minAmount": 100000,
  "maxAmount": 5000000,
  "recipientName": "Tech Corp",
  "page": 1,
  "limit": 20,
  "sortBy": "Award Amount",
  "orderBy": "desc"
}
```

#### Response:
```json
{
  "success": true,
  "data": [
    {
      "id": "CONT-123456",
      "recipient": {
        "name": "TechCorp Solutions",
        "id": "123456789",
        "uei": "ABC123DEF456"
      },
      "amount": 750000,
      "description": "Cloud Infrastructure Services",
      "dates": {
        "start": "2024-02-01",
        "end": "2025-01-31",
        "lastModified": "2024-01-15"
      },
      "agency": {
        "awarding": "Department of Defense",
        "subAgency": "Defense Information Systems Agency",
        "funding": "Department of Defense"
      },
      "naics": {
        "code": "541512",
        "description": "Computer Systems Design Services"
      },
      "placeOfPerformance": {
        "city": "Arlington",
        "state": "VA",
        "zip": "22202"
      },
      "setAside": "Small Business",
      "numberOfOffers": 5,
      "awardType": "Firm Fixed Price"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "hasNext": true,
    "total": 450
  }
}
```

### Get Filter Options
**GET** `/api/search/filters`

Get all available filter options for the search interface.

#### Response:
```json
{
  "success": true,
  "data": {
    "agencies": [
      "Department of Defense",
      "Department of Health and Human Services",
      "Department of Veterans Affairs"
    ],
    "naicsCodes": [
      {
        "code": "541511",
        "description": "Custom Computer Programming Services"
      }
    ],
    "setAsides": [
      {
        "code": "SBP",
        "description": "Small Business Set-Aside"
      }
    ],
    "states": [
      {
        "code": "VA",
        "name": "Virginia"
      }
    ],
    "sortOptions": [
      {
        "value": "Award Amount",
        "label": "Award Amount"
      }
    ]
  }
}
```

### Get Trending Contracts
**GET** `/api/search/trending?period=7`

Get trending high-value contracts.

#### Query Parameters:
- `period`: Number of days to look back (default: 7)

#### Response:
```json
{
  "success": true,
  "data": [
    {
      "id": "CONT-789",
      "title": "Enterprise Software Development",
      "recipient": "Major Tech Inc",
      "amount": 5000000,
      "agency": "Department of Defense",
      "category": "Software Development",
      "date": "2024-03-15",
      "trend": "up"
    }
  ],
  "period": 7
}
```

---

## 📊 Dashboard API

### Get Dashboard Statistics
**GET** `/api/dashboard/stats`

Get overview statistics for the dashboard.

#### Response:
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalContracts": 156,
      "totalValue": 125000000,
      "averageValue": 801282,
      "period": "30 days"
    },
    "topAgencies": [
      {
        "name": "Department of Defense",
        "count": 45
      }
    ],
    "database": {
      "totalContracts": 1250,
      "totalAwardees": 890,
      "lastSync": "2024-03-20T14:30:00Z"
    },
    "recentActivity": [
      {
        "recipient": "Tech Solutions LLC",
        "amount": 750000,
        "agency": "DOD",
        "date": "2024-03-19"
      }
    ]
  }
}
```

### Get Chart Data
**GET** `/api/dashboard/charts?chartType=timeline`

Get data for dashboard charts.

#### Query Parameters:
- `chartType`: One of `timeline`, `naics`, `agencies`, `setasides`

#### Response:
```json
{
  "success": true,
  "data": {
    "type": "timeline",
    "labels": ["Jan 2024", "Feb 2024", "Mar 2024"],
    "datasets": [
      {
        "label": "Contract Value",
        "data": [45000000, 52000000, 38000000]
      }
    ]
  }
}
```

### Get Notifications
**GET** `/api/dashboard/notifications`

Get user notifications and alerts.

#### Response:
```json
{
  "success": true,
  "data": [
    {
      "id": "1",
      "type": "new_contract",
      "title": "New High-Value Contract",
      "message": "DOD awarded $5M IT services contract",
      "timestamp": "2024-03-20T15:00:00Z",
      "read": false
    }
  ]
}
```

---

## 📄 Contracts API (Database)

### List Contracts
**GET** `/api/contracts?page=1&limit=20&naicsCode=541511`

Get contracts from local database.

#### Query Parameters:
- `page`: Page number
- `limit`: Results per page
- `naicsCode`: Filter by NAICS code
- `awardingAgency`: Filter by agency
- `minAmount`: Minimum award amount
- `maxAmount`: Maximum award amount
- `startDate`: Contract start date
- `endDate`: Contract end date

### Get Contract Details
**GET** `/api/contracts/:id`

Get detailed information about a specific contract.

### Get NAICS Statistics
**GET** `/api/contracts/stats/naics`

Get contract statistics grouped by NAICS code.

### Get Agency Statistics
**GET** `/api/contracts/stats/agency`

Get contract statistics grouped by agency.

---

## 🔄 Sync API

### Trigger Manual Sync
**POST** `/api/sync/trigger`

Manually trigger data synchronization from USAspending.gov.

#### Response:
```json
{
  "success": true,
  "data": {
    "success": true,
    "processed": 45,
    "created": 40,
    "updated": 5,
    "errors": []
  }
}
```

### Get Sync Logs
**GET** `/api/sync/logs?limit=10`

Get synchronization history.

### Get Sync Statistics
**GET** `/api/sync/stats`

Get sync statistics and status.

---

## 🔌 WebSocket Events

### Connection
```javascript
const socket = io('http://localhost:3000');

socket.on('connect', () => {
  console.log('Connected to server');
});
```

### Subscribe to Channels
```javascript
// Subscribe to sync updates
socket.emit('subscribe', 'sync');

// Subscribe to new contracts
socket.emit('subscribe', 'contracts');

// Listen for updates
socket.on('sync:update', (data) => {
  console.log('Sync update:', data);
});

socket.on('contract:new', (data) => {
  console.log('New contract:', data);
});
```

### Events
- `sync:started` - Sync process started
- `sync:progress` - Sync progress update
- `sync:completed` - Sync completed
- `contract:new` - New contract added
- `contract:updated` - Contract updated
- `notification` - New notification

---

## 🚨 Error Responses

All endpoints return errors in this format:

```json
{
  "success": false,
  "error": "Error message",
  "message": "Detailed error description"
}
```

### HTTP Status Codes
- `200` - Success
- `400` - Bad Request
- `404` - Not Found
- `500` - Internal Server Error

---

## 💡 Frontend Integration Examples

### React/Next.js Example
```javascript
// Search for contracts
const searchContracts = async (filters) => {
  const response = await fetch('http://localhost:3000/api/search/contracts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(filters),
  });

  return response.json();
};

// Get dashboard stats
const getDashboardStats = async () => {
  const response = await fetch('http://localhost:3000/api/dashboard/stats');
  return response.json();
};

// WebSocket connection
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000');

socket.on('contract:new', (contract) => {
  // Update UI with new contract
});
```

### Vue.js Example
```javascript
export default {
  data() {
    return {
      contracts: [],
      filters: {}
    };
  },

  methods: {
    async searchContracts() {
      const response = await this.$axios.post('/api/search/contracts', this.filters);
      this.contracts = response.data.data;
    }
  },

  mounted() {
    this.$socket.on('contract:new', (contract) => {
      this.contracts.unshift(contract);
    });
  }
};
```

### Angular Example
```typescript
import { HttpClient } from '@angular/common/http';
import { io, Socket } from 'socket.io-client';

@Injectable()
export class ContractService {
  private socket: Socket;

  constructor(private http: HttpClient) {
    this.socket = io('http://localhost:3000');
  }

  searchContracts(filters: any) {
    return this.http.post('/api/search/contracts', filters);
  }

  subscribeToUpdates() {
    return new Observable(observer => {
      this.socket.on('contract:new', data => observer.next(data));
    });
  }
}
```

---

## 🔧 Environment Variables

Add these to your frontend `.env`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
REACT_APP_API_URL=http://localhost:3000
VUE_APP_API_URL=http://localhost:3000
```

---

## 📝 Notes

1. **No API Key Required**: USAspending.gov API is public and free
2. **Rate Limiting**: The API implements smart rate limiting to avoid overwhelming USAspending.gov
3. **Caching**: Responses are cached for improved performance
4. **Real-time Updates**: Use WebSocket for live updates instead of polling
5. **CORS**: Configured for frontend access, adjust `FRONTEND_URL` in production

---

## 🚀 Quick Start for Frontend Developers

1. **Start the backend**:
```bash
cd gov-contract-broker-backend
npm install
npm run dev
```

2. **Test the API**:
```bash
curl http://localhost:3000/health
```

3. **Search for contracts**:
```bash
curl -X POST http://localhost:3000/api/search/contracts \
  -H "Content-Type: application/json" \
  -d '{"naicsCodes": ["541511"], "limit": 5}'
```

4. **Connect from frontend**:
```javascript
fetch('http://localhost:3000/api/search/contracts', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ naicsCodes: ['541511'] })
})
.then(res => res.json())
.then(data => console.log(data));
```
# Quick Start Guide - Government Contract Broker Backend

## 🚀 Start Backend in 2 Minutes

### 1. Install & Configure
```bash
# Navigate to backend
cd gov-contract-broker-backend

# Install dependencies
npm install

# Copy test environment (NO API KEY NEEDED!)
cp .env.test .env
```

### 2. Setup Database
```bash
# Generate Prisma client
npx prisma generate

# Create database
npx prisma migrate dev --name init
```

### 3. Start Server
```bash
npm run dev
```

Backend will be running at: **http://localhost:3000**

## ✅ Verify It's Working

```bash
# Check health
curl http://localhost:3000/health

# Test live USAspending data
curl -X POST http://localhost:3000/api/search/contracts \
  -H "Content-Type: application/json" \
  -d '{"limit": 3}'
```

## 📱 Frontend Connection Points

The frontend being pushed should connect to these endpoints:

### Primary Endpoints
- `POST /api/search/contracts` - Search live contracts
- `GET /api/search/filters` - Get filter options
- `GET /api/search/trending` - Trending contracts
- `GET /api/dashboard/stats` - Dashboard statistics
- `GET /api/dashboard/charts` - Chart data

### WebSocket
```javascript
const socket = io('http://localhost:3000');
```

## 🔑 Important Notes

1. **NO API KEY REQUIRED** - USAspending.gov is public
2. **CORS Enabled** - Frontend can connect from any origin
3. **Real Data** - Returns live government contracts
4. **WebSocket Ready** - Real-time updates supported

## 🎯 Test Real Data

Once backend is running, you'll see real contracts like:

```json
{
  "recipient": {
    "name": "MICROSOFT CORPORATION"
  },
  "amount": 10000000,
  "agency": {
    "awarding": "Department of Defense"
  },
  "description": "CLOUD COMPUTING SERVICES"
}
```

## 🛠 Troubleshooting

### Port 3000 in use?
```bash
# Use different port
PORT=3001 npm run dev
```

### Database issues?
```bash
# Reset database
npx prisma migrate reset
```

### Need mock data?
```bash
# Set in .env
USE_MOCK_DATA=true
```

## 📚 Full Documentation

See [API-DOCUMENTATION.md](./API-DOCUMENTATION.md) for complete API reference.
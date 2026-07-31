# Government Contract Broker

An automated Node.js backend system that syncs government contracts from USAspending.gov API and facilitates partnership origination between prime contractors and subcontractors.

## Overview

This platform automates the discovery of government contract awards, identifies potential partnership opportunities, and streamlines the subcontractor matching process for a commission-based brokering service.

## Features

- **Award Discovery**: Automated scanning of USAspending.gov for recent contract awards
- **Awardee Outreach**: Automated extraction and outreach to contract winners
- **Subcontractor Matching**: Intelligent matching of qualified subcontractors with contracts
- **Deal Structuring**: Commission-based partnership agreement management
- **API Integration**: Robust data synchronization with government data sources

## Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL with Prisma ORM
- **APIs**: USAspending.gov API v2, SAM.gov API (optional)
- **Scheduling**: Node-cron for automated sync
- **Logging**: Winston

## Prerequisites

- Node.js 18+
- PostgreSQL 14+
- USAspending.gov API access (optional API key)
- SAM.gov API key (for enhanced features)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/gov-contract-broker.git
cd gov-contract-broker
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Set up the database:
```bash
npx prisma generate
npx prisma migrate dev
```

5. Run the application:
```bash
npm run dev  # Development
npm run build && npm start  # Production
```

## Configuration

Key configuration options in `.env`:

- `DATABASE_URL`: PostgreSQL connection string
- `USASPENDING_API_BASE_URL`: USAspending API endpoint
- `SYNC_INTERVAL_MINUTES`: How often to sync data
- `MAX_RECORDS_PER_SYNC`: Batch size for sync operations
- `DEFAULT_COMMISSION_PERCENTAGE`: Default broker commission

## API Endpoints

### Contracts
- `GET /api/contracts` - List contracts with filtering
- `GET /api/contracts/:id` - Get contract details
- `GET /api/contracts/stats/naics` - Statistics by NAICS code
- `GET /api/contracts/stats/agency` - Statistics by agency

### Sync
- `POST /api/sync/trigger` - Manually trigger sync
- `GET /api/sync/logs` - View sync history
- `GET /api/sync/stats` - Sync statistics

### Health
- `GET /health` - Service health check

## Target NAICS Codes

The system focuses on service-based contracts in these categories:
- 541219 - Other Accounting Services
- 541511 - Custom Computer Programming Services
- 541512 - Computer Systems Design Services
- 541611 - Administrative Management Consulting
- 561320 - Temporary Help Services
- 488510 - Freight Transportation Arrangement

## Project Structure

```
gov-contract-broker/
├── src/
│   ├── config/         # Configuration files
│   ├── controllers/    # Route controllers
│   ├── services/       # Business logic
│   ├── routes/         # API routes
│   ├── models/         # Data models
│   ├── middleware/     # Express middleware
│   ├── utils/          # Utility functions
│   └── index.ts        # Application entry point
├── prisma/
│   └── schema.prisma   # Database schema
├── docs/
│   └── PRDs/           # Product requirement documents
└── package.json
```

## Development

### Running in Development Mode
```bash
npm run dev
```

### Building for Production
```bash
npm run build
```

### Database Management
```bash
npm run prisma:generate  # Generate Prisma client
npm run prisma:migrate   # Run migrations
npm run prisma:studio    # Open Prisma Studio
```

## Product Requirements Documents

Detailed feature specifications are available in the `/docs/PRDs` directory:

- [PRD-001: Award Discovery](docs/PRDs/PRD-001-Award-Discovery.md)
- [PRD-002: Awardee Outreach](docs/PRDs/PRD-002-Awardee-Outreach.md)
- [PRD-003: Subcontractor Matching](docs/PRDs/PRD-003-Subcontractor-Matching.md)
- [PRD-004: Deal Structuring & Commission](docs/PRDs/PRD-004-Deal-Structuring-Commission.md)
- [PRD-005: API Integration & Data Sync](docs/PRDs/PRD-005-API-Integration-Data-Sync.md)

## Monitoring

The system includes comprehensive logging and monitoring:
- Sync job status and metrics
- API performance tracking
- Error logging and alerting
- Data quality validation

## Contributing

Please read the contributing guidelines before submitting pull requests.

## License

[MIT License](LICENSE)

## Support

For issues and questions, please create an issue in the GitHub repository.
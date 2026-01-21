# Quick Start Guide

## Getting Started

### 1. Install Dependencies

```bash
# Install backend dependencies
npm install

# Install frontend dependencies
cd web
npm install
cd ..
```

### 2. Configure Environment

Copy `env.example` to `.env` and fill in your configuration:

```bash
cp env.example .env
```

Edit `.env` with your settings (for development, you can use default values).

### 3. Start the Backend

```bash
npm run dev
```

The API server will start on `http://localhost:3000`

### 4. Start the Frontend (in a new terminal)

```bash
cd web
npm run dev
```

The web interface will be available at `http://localhost:5173`

## Features Overview

### Dashboard
- View agent status and balance
- Monitor earnings and reinvestments
- Track sub-agents

### Services

#### Market Analysis
- Single token analysis
- Multi-token market overview
- Technical analysis

#### Trading Strategies
- Arbitrage opportunities across DEXes
- Yield farming optimization
- Momentum signals

#### Data Aggregation
- Token metrics
- Market trends
- Protocol analytics
- Custom reports

## Testing the Agent

1. Open the web interface at `http://localhost:5173`
2. Navigate to the "Services" tab
3. Select a service (e.g., "Market Analysis")
4. Fill in parameters
5. Submit request

The agent will:
- Process payment through the facilitator
- Execute the service
- Record earnings
- Consider reinvestment if threshold is met

## Autonomous Operations

The agent automatically:
- Scans for arbitrage opportunities every minute
- Monitors balance and reinvests when threshold is reached
- Spawns sub-agents or upgrades capabilities based on earnings

## API Examples

### Get Agent Status
```bash
curl http://localhost:3000/status
```

### Request Market Analysis
```bash
curl -X POST http://localhost:3000/service \
  -H "Content-Type: application/json" \
  -d '{
    "serviceId": "market-analysis",
    "userId": "user123",
    "params": {
      "token": "So11111111111111111111111111111111111111112"
    },
    "paymentAmount": 0.01
  }'
```

### Get Earnings
```bash
curl http://localhost:3000/earnings
```

## Next Steps

1. Configure your blockchain wallet address
2. Set up facilitator address (Dexter platform)
3. Add API keys for Birdeye, Helius (for production)
4. Deploy to production environment

For more details, see [README.md](README.md)

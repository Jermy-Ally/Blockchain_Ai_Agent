# Blockchain-Native Autonomous Economic Agent

A distinctive Blockchain-Native Autonomous Economic Agent that operates in decentralized finance (DeFi) ecosystems. This agent autonomously manages its own economy—earning, spending, and investing crypto assets without human intervention.

## Features

### Core Capabilities

- **Self-Funding and Monetization**: Generates revenue by providing services (market analysis, automated trading strategies, data aggregation) and uses built-in payment rails to charge users or other agents in crypto
- **Revenue Reinvestment**: Automatically reinvests earnings to upgrade itself or spawn sub-agents
- **Decentralized Decision-Making**: Incorporates on-chain data oracles for real-time inputs (token prices, market sentiment) and uses AI models for probabilistic decisions
- **Trading Strategies**: Implements arbitrage across DEXs and yield farming optimization
- **Service Provider**: Offers three main services:
  - **Market Analysis**: Token analysis, market overviews, technical analysis
  - **Trading Strategies**: Arbitrage opportunities, yield farming optimization, momentum signals
  - **Data Aggregation**: Token metrics, market trends, protocol analytics, custom reports

### Technology Stack

- **Backend**: Node.js, TypeScript, Express
- **Frontend**: React, TypeScript, Vite
- **Blockchain**: Solana & Base integration (via Dexter SDK)
- **DeFi**: Jupiter (swaps), Birdeye (analytics), Helius (on-chain data)
- **AI**: Custom probabilistic decision-making engine

## Project Structure

```
Blockchain_ai_agent/
├── src/
│   ├── agent/
│   │   ├── autonomous-agent.ts    # Main agent orchestrator
│   │   └── revenue-manager.ts     # Earnings and reinvestment management
│   ├── ai/
│   │   └── ai-engine.ts           # AI decision-making engine
│   ├── services/
│   │   ├── blockchain.service.ts  # Blockchain interactions
│   │   ├── oracle.service.ts      # Price feeds and sentiment
│   │   ├── market-analysis.service.ts
│   │   ├── trading-strategy.service.ts
│   │   └── data-aggregation.service.ts
│   ├── types/
│   │   └── index.ts               # TypeScript interfaces
│   └── index.ts                   # API server entry point
├── web/
│   ├── src/
│   │   ├── App.tsx                # React web interface
│   │   ├── App.css
│   │   ├── main.tsx
│   │   └── index.css
│   ├── index.html
│   └── vite.config.ts
├── package.json
├── tsconfig.json
└── README.md
```

## Setup

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Solana/Base wallet (optional, for production)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd Blockchain_ai_agent
```

2. Install backend dependencies:
```bash
npm install
```

3. Install frontend dependencies:
```bash
cd web
npm install
cd ..
```

4. Create `.env` file in the root directory:
```env
# Blockchain Configuration
NETWORK=solana
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
BASE_RPC_URL=https://mainnet.base.org

# Agent Configuration
AGENT_WALLET_ADDRESS=your_agent_wallet_address
FACILITATOR_ADDRESS=your_facilitator_address

# API Keys (optional, for production)
BIRDEYE_API_KEY=your_birdeye_api_key
HELIUS_API_KEY=your_helius_api_key

# Server Configuration
PORT=3000
```

5. Build the project:
```bash
npm run build
```

## Usage

### Running the Agent

Start the backend API server:
```bash
npm run dev
```

In another terminal, start the web interface:
```bash
cd web
npm run dev
```

The agent will:
- Start on `http://localhost:3000` (API server)
- Web interface on `http://localhost:5173`
- Begin autonomous operations (arbitrage scanning, reinvestment checks)

### API Endpoints

- `GET /health` - Health check
- `GET /status` - Get agent status and balance
- `GET /services` - List available services
- `POST /service` - Request a service
- `GET /earnings` - Get earnings breakdown
- `GET /sub-agents` - List spawned sub-agents

### Using Services

#### Market Analysis
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

#### Trading Strategy (Arbitrage)
```bash
curl -X POST http://localhost:3000/service \
  -H "Content-Type: application/json" \
  -d '{
    "serviceId": "trading-strategy",
    "userId": "user123",
    "params": {
      "strategy": "arbitrage",
      "tokens": ["So11111111111111111111111111111111111111112"]
    },
    "paymentAmount": 0.05
  }'
```

#### Data Aggregation
```bash
curl -X POST http://localhost:3000/service \
  -H "Content-Type: application/json" \
  -d '{
    "serviceId": "data-aggregation",
    "userId": "user123",
    "params": {
      "tokens": ["token1", "token2"],
      "report": true,
      "reportType": "daily"
    },
    "paymentAmount": 0.02
  }'
```

## How It Works

### Autonomous Operations

The agent runs continuous cycles that:
1. **Scan for Arbitrage**: Monitors multiple DEXes for price differences
2. **Optimize Yield**: Evaluates yield farming opportunities
3. **Monitor Earnings**: Tracks revenue from services
4. **Reinvest**: Spawns sub-agents or upgrades capabilities when threshold is met

### Revenue Model

- **Service Fees**: Each service has a fixed price (SOL/BASE)
- **Payment Processing**: Uses Dexter facilitator for trustless payments
- **Automatic Reinvestment**: When available balance > threshold, agent decides to:
  - Spawn sub-agents (cost: 0.3 SOL/BASE)
  - Upgrade capabilities (cost: 0.5 SOL/BASE)

### AI Decision-Making

The AI engine uses weighted probabilistic models considering:
- Price momentum (30%)
- Trading volume (25%)
- Market sentiment (20%)
- Momentum indicators (15%)
- Liquidity (10%)

## Web Interface

The web interface provides:
- **Dashboard**: Real-time balance, earnings, and agent status
- **Services**: Request and use agent services
- **Earnings**: Detailed breakdown of revenue
- **Sub-Agents**: Monitor spawned sub-agents

## Development

### Building

```bash
# Build backend
npm run build

# Build frontend
cd web
npm run build
```

### Testing

```bash
npm test
```

## Configuration

Edit `src/index.ts` to customize:
- Agent name and ID
- Service prices
- Reinvestment thresholds
- Minimum balance requirements
- Network (Solana/Base)

## Production Deployment

For production:
1. Set up proper RPC endpoints (use paid RPC for reliability)
2. Configure facilitator address for Dexter platform
3. Add API keys for Birdeye, Helius, etc.
4. Set up monitoring and logging
5. Configure wallet security (use hardware wallet for facilitator)

## Security Considerations

- Never expose private keys
- Use facilitator model (no direct wallet access needed for developers)
- Validate all inputs
- Implement rate limiting
- Monitor for unusual activity

## Future Enhancements

- [ ] Cross-chain support via deBridge
- [ ] Integration with more DEXes
- [ ] Advanced AI models (GPT integration)
- [ ] Sub-agent communication protocols
- [ ] On-chain governance
- [ ] Zero-knowledge proofs for privacy

## License

MIT

## Contributing

Contributions welcome! Please read the contributing guidelines first.

## Support

For issues and questions, please open an issue on GitHub.

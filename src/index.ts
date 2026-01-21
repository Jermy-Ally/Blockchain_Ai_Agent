import dotenv from 'dotenv';
import express from 'express';
import { AutonomousAgent } from './agent/autonomous-agent';
import { AgentConfig } from './types';

dotenv.config();

const app = express();
app.use(express.json());

// Enable CORS for frontend
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:5173');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Default agent configuration
const defaultConfig: AgentConfig = {
  id: 'agent-001',
  name: 'Blockchain AI Agent',
  network: 'solana',
  facilitatorAddress: process.env.FACILITATOR_ADDRESS,
  minBalance: 0.1,
  reinvestmentThreshold: 1.0,
  services: [
    {
      id: 'market-analysis',
      name: 'Market Analysis',
      type: 'market-analysis',
      price: 0.01, // 0.01 SOL/BASE
      enabled: true,
    },
    {
      id: 'trading-strategy',
      name: 'Trading Strategy',
      type: 'trading-strategy',
      price: 0.05,
      enabled: true,
    },
    {
      id: 'data-aggregation',
      name: 'Data Aggregation',
      type: 'data-aggregation',
      price: 0.02,
      enabled: true,
    },
  ],
};

const agent = new AutonomousAgent(defaultConfig);

// Initialize agent
agent.initialize().then(() => {
  console.log('Agent initialized successfully');
  
  // Start autonomous operations
  agent.startAutonomousOperations();
}).catch(error => {
  console.error('Failed to initialize agent:', error);
});

// API Routes
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.get('/status', async (req, res) => {
  try {
    const status = agent.getStatus();
    const balance = await agent.getRevenueManager().getBalance();
    res.json({
      ...status,
      balance,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get status' });
  }
});

app.post('/service', async (req, res) => {
  try {
    const result = await agent.handleServiceRequest(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/services', (req, res) => {
  const status = agent.getStatus();
  res.json({
    services: status.services,
  });
});

app.get('/earnings', (req, res) => {
  const earnings = agent.getRevenueManager().getEarnings();
  res.json(earnings);
});

app.get('/sub-agents', (req, res) => {
  const subAgents = agent.getRevenueManager().getSubAgents();
  res.json(subAgents);
});

app.get('/transactions', async (req, res) => {
  try {
    const agentAddress = process.env.AGENT_WALLET_ADDRESS || '';
    if (!agentAddress) {
      return res.status(400).json({ error: 'Agent wallet address not configured' });
    }
    const limit = parseInt(req.query.limit as string) || 10;
    const transactions = await agent.getRevenueManager().getBlockchainService().getTransactionHistory(agentAddress, limit);
    res.json({ transactions, count: transactions.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/payment-mode', (req, res) => {
  try {
    const paymentMode = agent.getRevenueManager().getBlockchainService().getPaymentMode();
    res.json({ paymentMode, network: process.env.NETWORK || 'solana' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Agent API server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Status: http://localhost:${PORT}/status`);
});

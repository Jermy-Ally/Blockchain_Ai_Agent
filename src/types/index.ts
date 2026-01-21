export interface AgentConfig {
  id: string;
  name: string;
  network: 'solana' | 'base';
  facilitatorAddress?: string;
  minBalance: number;
  reinvestmentThreshold: number;
  services: ServiceConfig[];
}

export interface ServiceConfig {
  id: string;
  name: string;
  type: 'market-analysis' | 'trading-strategy' | 'data-aggregation';
  price: number; // in SOL or BASE
  enabled: boolean;
}

export interface MarketData {
  token: string;
  price: number;
  volume24h: number;
  priceChange24h: number;
  liquidity: number;
  timestamp: number;
}

export interface TradingSignal {
  action: 'buy' | 'sell' | 'hold';
  token: string;
  confidence: number;
  price: number;
  reasoning: string;
}

export interface ArbitrageOpportunity {
  token: string;
  dexA: string;
  dexB: string;
  priceDiff: number;
  profitEstimate: number;
  risk: number;
}

export interface YieldFarmingOpportunity {
  protocol: string;
  token: string;
  apy: number;
  tvl: number;
  risk: number;
  estimatedReturn: number;
}

export interface ServiceRequest {
  serviceId: string;
  userId: string;
  params: Record<string, any>;
  paymentAmount: number;
}

export interface AgentEarnings {
  total: number;
  byService: Record<string, number>;
  reinvested: number;
  available: number;
}

export interface SubAgent {
  id: string;
  parentId: string;
  role: string;
  balance: number;
  status: 'active' | 'inactive' | 'upgrading';
  createdAt: number;
  walletAddress?: string;
  fundingTxHash?: string;
}

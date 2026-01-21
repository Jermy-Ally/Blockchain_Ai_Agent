import { AgentConfig, ServiceRequest, MarketData, TradingSignal, ArbitrageOpportunity, YieldFarmingOpportunity } from '../types';
import { BlockchainService } from '../services/blockchain.service';
import { OracleService } from '../services/oracle.service';
import { MarketAnalysisService } from '../services/market-analysis.service';
import { TradingStrategyService } from '../services/trading-strategy.service';
import { DataAggregationService } from '../services/data-aggregation.service';
import { AIEngine } from '../ai/ai-engine';
import { RevenueManager } from './revenue-manager';

export class AutonomousAgent {
  private config: AgentConfig;
  private blockchainService: BlockchainService;
  private oracleService: OracleService;
  private marketAnalysisService: MarketAnalysisService;
  private tradingStrategyService: TradingStrategyService;
  private dataAggregationService: DataAggregationService;
  private aiEngine: AIEngine;
  private revenueManager: RevenueManager;
  private isRunning: boolean = false;

  constructor(config: AgentConfig) {
    this.config = config;
    
    // Initialize services
    this.blockchainService = new BlockchainService(config.network, undefined, config.facilitatorAddress);
    this.oracleService = new OracleService();
    this.aiEngine = new AIEngine();
    
    this.marketAnalysisService = new MarketAnalysisService(this.oracleService, this.aiEngine);
    this.tradingStrategyService = new TradingStrategyService(this.oracleService, this.aiEngine);
    this.dataAggregationService = new DataAggregationService(this.oracleService, this.blockchainService);
    
    this.revenueManager = new RevenueManager(
      this.blockchainService,
      config.services,
      config.reinvestmentThreshold
    );
  }

  async initialize(): Promise<void> {
    console.log(`Initializing Autonomous Agent: ${this.config.name}`);
    console.log(`Network: ${this.config.network}`);
    console.log(`Services: ${this.config.services.length}`);
    
    // Check balance
    const balance = await this.revenueManager.getBalance();
    console.log(`Current balance: ${balance} ${this.config.network === 'solana' ? 'SOL' : 'BASE'}`);
    
    if (balance < this.config.minBalance) {
      console.warn(`Warning: Balance below minimum threshold (${this.config.minBalance})`);
    }
  }

  async handleServiceRequest(request: ServiceRequest): Promise<any> {
    const service = this.config.services.find(s => s.id === request.serviceId);
    
    if (!service || !service.enabled) {
      throw new Error(`Service ${request.serviceId} not found or disabled`);
    }

    // Validate payment amount matches service price
    if (request.paymentAmount !== service.price) {
      throw new Error(`Payment amount mismatch. Expected: ${service.price}, Received: ${request.paymentAmount}`);
    }

    // Process payment
    let txHash: string;
    try {
      txHash = await this.blockchainService.chargeForService(
        request.serviceId,
        request.userId,
        service.price
      );
      console.log(`Payment processed: ${txHash} for service ${request.serviceId}`);
    } catch (error: any) {
      console.error('Payment processing failed:', error);
      throw new Error(`Payment failed: ${error.message}`);
    }

    // Verify transaction (if on-chain mode)
    const paymentMode = (this.blockchainService as any).getPaymentMode?.();
    if (paymentMode === 'onchain' && !txHash.startsWith('sim_') && !txHash.startsWith('facilitator_')) {
      // Wait a moment for transaction to be confirmed
      await new Promise(resolve => setTimeout(resolve, 2000));
      const verified = await (this.blockchainService as any).verifyTransaction?.(txHash);
      if (!verified) {
        console.warn(`Transaction ${txHash} verification pending or failed`);
      }
    }

    // Record payment
    await this.revenueManager.recordPayment(request.serviceId, service.price);

    // Execute service
    let result: any;
    
    try {
      switch (service.type) {
        case 'market-analysis':
          result = await this.handleMarketAnalysis(request.params);
          break;
        
        case 'trading-strategy':
          result = await this.handleTradingStrategy(request.params);
          break;
        
        case 'data-aggregation':
          result = await this.handleDataAggregation(request.params);
          break;
        
        default:
          throw new Error(`Unknown service type: ${service.type}`);
      }
    } catch (error: any) {
      console.error('Service execution failed:', error);
      // Payment already processed, but service failed - log this
      throw new Error(`Service execution failed: ${error.message}. Payment processed: ${txHash}`);
    }

    return {
      result,
      transactionHash: txHash,
      serviceId: request.serviceId,
      serviceName: service.name,
      price: service.price,
      timestamp: Date.now(),
      paymentMode,
    };
  }

  private async handleMarketAnalysis(params: Record<string, any>): Promise<any> {
    // Handle technical analysis request
    if (params.technicalAnalysis && params.token) {
      return await this.marketAnalysisService.generateTechnicalAnalysis(
        params.token,
        params.timeframe || '1d'
      );
    }
    
    // Handle single token analysis
    if (params.token && params.token.trim()) {
      return await this.marketAnalysisService.analyzeToken(
        params.token.trim(),
        this.config.network
      );
    }
    
    // Handle multi-token overview
    if (params.tokens) {
      // If tokens is a string, split it; if array, use as is
      const tokenArray = Array.isArray(params.tokens) 
        ? params.tokens 
        : typeof params.tokens === 'string' 
          ? params.tokens.split(',').map((t: string) => t.trim()).filter((t: string) => t.length > 0)
          : [];
      
      if (tokenArray.length > 0) {
        return await this.marketAnalysisService.getMarketOverview(
          tokenArray,
          this.config.network
        );
      }
    }
    
    // Default: analyze SOL if no token specified
    const defaultToken = 'So11111111111111111111111111111111111111112'; // SOL
    console.log('No token specified, analyzing default token (SOL)');
    return await this.marketAnalysisService.analyzeToken(
      defaultToken,
      this.config.network
    );
  }

  private async handleTradingStrategy(params: Record<string, any>): Promise<any> {
    const strategy = params.strategy || 'arbitrage';
    
    if (strategy === 'arbitrage') {
      const tokens = params.tokens || ['So11111111111111111111111111111111111111112']; // SOL
      return await this.tradingStrategyService.findArbitrageOpportunities(tokens);
    } else if (strategy === 'yield-farming') {
      return await this.tradingStrategyService.optimizeYieldFarming(
        params.amount || 1,
        params.riskTolerance || 'medium'
      );
    } else {
      return await this.tradingStrategyService.executeStrategy(
        strategy as any,
        params
      );
    }
  }

  private async handleDataAggregation(params: Record<string, any>): Promise<any> {
    if (params.report) {
      // Generate report
      return await this.dataAggregationService.generateReport(
        params.reportType || 'daily',
        params.tokens || []
      );
    } else {
      // Aggregate data
      return await this.dataAggregationService.aggregateTokenData(
        params.tokens || [],
        this.config.network
      );
    }
  }

  async startAutonomousOperations(): Promise<void> {
    if (this.isRunning) {
      console.log('Agent is already running');
      return;
    }

    this.isRunning = true;
    console.log('Starting autonomous operations...');

    // Start continuous monitoring and decision-making
    setInterval(async () => {
      try {
        await this.autonomousCycle();
      } catch (error) {
        console.error('Error in autonomous cycle:', error);
      }
    }, 120000); // Run every 2 minutes to reduce API calls and respect rate limits
  }

  private async autonomousCycle(): Promise<void> {
    // Autonomous decision-making cycle
    console.log('Running autonomous cycle...');

    // 1. Check for arbitrage opportunities and execute if profitable
    const arbitrageOps = await this.tradingStrategyService.findArbitrageOpportunities([
      'So11111111111111111111111111111111111111112', // SOL
    ]);

    if (arbitrageOps.length > 0) {
      const bestOpportunity = arbitrageOps[0];
      const minProfitThreshold = 0.05; // Minimum 0.05 SOL profit to execute
      
      if (bestOpportunity.profitEstimate > minProfitThreshold && bestOpportunity.risk < 0.5) {
        console.log(`Found profitable arbitrage opportunity: ${bestOpportunity.profitEstimate.toFixed(4)} SOL`);
        
        // Check if we have enough balance to execute
        const balance = await this.revenueManager.getBalance();
        const requiredAmount = 0.5; // Amount needed for arbitrage (configurable)
        
        if (balance >= this.config.minBalance + requiredAmount) {
          try {
            const result = await this.tradingStrategyService.executeArbitrage(
              bestOpportunity,
              requiredAmount
            );
            
            if (result.success) {
              console.log(`✅ Arbitrage executed successfully! Profit: ${result.actualProfit?.toFixed(4)} SOL`);
              console.log(`Transaction hashes: ${result.txHash1}, ${result.txHash2}`);
              
              // Record profit as earnings if real execution
              if (result.actualProfit && result.actualProfit > 0) {
                await this.revenueManager.recordPayment('arbitrage', result.actualProfit);
              }
            } else {
              console.warn(`Arbitrage execution failed: ${result.error}`);
            }
          } catch (error: any) {
            console.error('Error executing arbitrage:', error);
          }
        } else {
          console.log(`Insufficient balance for arbitrage. Required: ${requiredAmount}, Available: ${(balance - this.config.minBalance).toFixed(4)}`);
        }
      }
    }

    // 2. Check balance and reinvest if needed
    await this.revenueManager.considerReinvestment();

    // 3. Monitor market conditions
    const balance = await this.revenueManager.getBalance();
    if (balance > this.config.minBalance * 2) {
      // Consider deploying more sub-agents
      const earnings = this.revenueManager.getEarnings();
      if (earnings.available >= 0.3) {
        await this.revenueManager.considerReinvestment();
      }
    }
  }

  stopAutonomousOperations(): void {
    this.isRunning = false;
    console.log('Stopped autonomous operations');
  }

  getStatus(): any {
    return {
      id: this.config.id,
      name: this.config.name,
      network: this.config.network,
      isRunning: this.isRunning,
      services: this.config.services.filter(s => s.enabled),
      earnings: this.revenueManager.getEarnings(),
      subAgents: this.revenueManager.getSubAgents(),
    };
  }

  getRevenueManager(): RevenueManager {
    return this.revenueManager;
  }
}

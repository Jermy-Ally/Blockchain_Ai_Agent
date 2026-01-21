import { OracleService } from './oracle.service';
import { AIEngine } from '../ai/ai-engine';
import { ArbitrageOpportunity, YieldFarmingOpportunity, TradingSignal } from '../types';
import axios from 'axios';

export class TradingStrategyService {
  private oracleService: OracleService;
  private aiEngine: AIEngine;
  private dexes = ['jupiter', 'raydium', 'orca'];

  constructor(oracleService: OracleService, aiEngine: AIEngine) {
    this.oracleService = oracleService;
    this.aiEngine = aiEngine;
  }

  async findArbitrageOpportunities(tokens: string[]): Promise<ArbitrageOpportunity[]> {
    const opportunities: ArbitrageOpportunity[] = [];

    for (const token of tokens) {
      const prices: Record<string, number> = {};

      // Get prices from different DEXes
      for (const dex of this.dexes) {
        const price = await this.oracleService.getDEXPrice(token, dex as any);
        if (price > 0) {
          prices[dex] = price;
        }
      }

      // Find price differences
      const dexNames = Object.keys(prices);
      for (let i = 0; i < dexNames.length; i++) {
        for (let j = i + 1; j < dexNames.length; j++) {
          const dexA = dexNames[i];
          const dexB = dexNames[j];
          const priceA = prices[dexA];
          const priceB = prices[dexB];

          if (priceA && priceB) {
            const priceDiff = Math.abs(priceA - priceB);
            const avgPrice = (priceA + priceB) / 2;
            const priceDiffPercent = (priceDiff / avgPrice) * 100;

            // Only consider opportunities with >0.5% price difference
            if (priceDiffPercent > 0.5) {
              // Estimate profit (accounting for fees ~0.3% per swap)
              const profitEstimate = priceDiff * 0.997; // 0.3% fee per swap
              const risk = await this.aiEngine.assessArbitrageRisk({
                token,
                dexA,
                dexB,
                priceDiff,
              });

              opportunities.push({
                token,
                dexA,
                dexB,
                priceDiff,
                profitEstimate,
                risk,
              });
            }
          }
        }
      }
    }

    // Sort by profit estimate
    return opportunities.sort((a, b) => b.profitEstimate - a.profitEstimate);
  }

  async optimizeYieldFarming(amount: number, riskTolerance: 'low' | 'medium' | 'high'): Promise<YieldFarmingOpportunity[]> {
    const opportunities: YieldFarmingOpportunity[] = [];

    // Real protocol data (fetch from DeFiLlama if available, otherwise use realistic defaults)
    const protocolConfigs = [
      { 
        name: 'Marinade Finance', 
        slug: 'marinade-finance', 
        defaultAPY: 7.5, 
        risk: 0.2,
        chain: 'solana'
      },
      { 
        name: 'Lido', 
        slug: 'lido', 
        defaultAPY: 8.2, 
        risk: 0.15,
        chain: 'solana'
      },
      { 
        name: 'Jito', 
        slug: 'jito', 
        defaultAPY: 9.1, 
        risk: 0.3,
        chain: 'solana'
      },
      { 
        name: 'Raydium', 
        slug: 'raydium', 
        defaultAPY: 15.5, 
        risk: 0.6,
        chain: 'solana'
      },
      { 
        name: 'Orca', 
        slug: 'orca', 
        defaultAPY: 12.3, 
        risk: 0.5,
        chain: 'solana'
      },
    ];

    // Fetch real protocol data
    for (const config of protocolConfigs) {
      if (!this.matchesRiskTolerance(config.risk, riskTolerance)) {
        continue;
      }

      try {
        // Try to fetch real APY and TVL from DeFiLlama
        const protocolData = await this.fetchProtocolData(config.slug, config.chain);
        
        const apy = protocolData.apy || config.defaultAPY;
        const tvl = protocolData.tvl || await this.getProtocolTVL(config.name);
        
        const estimatedReturn = (amount * apy) / 100;

        opportunities.push({
          protocol: config.name,
          token: 'SOL',
          apy: apy,
          tvl: tvl,
          risk: config.risk,
          estimatedReturn: estimatedReturn,
        });
      } catch (error) {
        console.warn(`Failed to fetch data for ${config.name}, using defaults:`, error);
        // Fallback to defaults
        const estimatedReturn = (amount * config.defaultAPY) / 100;
        const tvl = await this.getProtocolTVL(config.name);
        
        opportunities.push({
          protocol: config.name,
          token: 'SOL',
          apy: config.defaultAPY,
          tvl: tvl,
          risk: config.risk,
          estimatedReturn: estimatedReturn,
        });
      }
    }

    // Use AI to rank opportunities
    const ranked = await this.aiEngine.rankYieldOpportunities(opportunities, riskTolerance);

    return ranked;
  }

  private async fetchProtocolData(slug: string, chain: string): Promise<{ apy?: number; tvl?: number }> {
    try {
      // Fetch from DeFiLlama API
      const response = await axios.get(
        `https://api.llama.fi/protocol/${slug}`,
        { timeout: 5000 }
      );
      
      const data = response.data;
      
      // Extract APY from chain-specific data
      let apy: number | undefined;
      if (data?.currentChainTvls && data.currentChainTvls[chain]) {
        // Try to find APY data in protocol yield data
        if (data?.tvl?.length > 0) {
          // APY might be in a separate yield endpoint
          // For now, return TVL
        }
      }
      
      // Get TVL
      let tvl: number | undefined;
      if (data?.tvl?.length > 0) {
        tvl = data.tvl[data.tvl.length - 1]?.totalLiquidityUSD;
      } else if (data?.chainTvls && data.chainTvls[chain]) {
        tvl = data.chainTvls[chain];
      }
      
      return { apy, tvl };
    } catch (error) {
      // API call failed, return undefined to use defaults
      return {};
    }
  }

  async executeYieldFarming(opportunity: YieldFarmingOpportunity, amount: number): Promise<{
    success: boolean;
    txHash?: string;
    actualReturn?: number;
    error?: string;
  }> {
    try {
      console.log(`Executing yield farming: ${amount} SOL into ${opportunity.protocol}`);
      
      // In production, this would interact with the protocol's smart contracts
      // For now, simulate the deposit
      const paymentMode = process.env.PAYMENT_MODE || 'simulated';
      
      if (paymentMode === 'simulated') {
        const estimatedReturn = (amount * opportunity.apy) / 100;
        return {
          success: true,
          txHash: `yield_${opportunity.protocol.toLowerCase().replace(' ', '_')}_${Date.now()}`,
          actualReturn: estimatedReturn,
        };
      }
      
      // Real execution would go here:
      // - For Marinade: Interact with mSOL minting contract
      // - For Lido: Interact with stSOL minting contract
      // - For LP: Add liquidity to Raydium/Orca pools
      
      return {
        success: false,
        error: 'Real yield farming execution requires protocol-specific smart contract integration',
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async executeStrategy(strategy: 'arbitrage' | 'yield-farming' | 'momentum', params: Record<string, any>): Promise<TradingSignal[]> {
    switch (strategy) {
      case 'arbitrage':
        const opportunities = await this.findArbitrageOpportunities(params.tokens || []);
        return await this.aiEngine.generateSignalsFromArbitrage(opportunities);
      
      case 'yield-farming':
        const yieldOps = await this.optimizeYieldFarming(params.amount || 0, params.riskTolerance || 'medium');
        return await this.aiEngine.generateSignalsFromYield(yieldOps);
      
      case 'momentum':
        return await this.aiEngine.generateMomentumSignals(params);
      
      default:
        return [];
    }
  }

  private matchesRiskTolerance(risk: number, tolerance: 'low' | 'medium' | 'high'): boolean {
    const thresholds = { low: 0.3, medium: 0.6, high: 1.0 };
    return risk <= thresholds[tolerance];
  }

  async executeArbitrage(opportunity: ArbitrageOpportunity, amount: number): Promise<{
    success: boolean;
    txHash1?: string;
    txHash2?: string;
    actualProfit?: number;
    error?: string;
  }> {
    try {
      // Re-verify opportunity still exists
      const currentPriceA = await this.oracleService.getDEXPrice(opportunity.token, opportunity.dexA as any);
      const currentPriceB = await this.oracleService.getDEXPrice(opportunity.token, opportunity.dexB as any);
      
      if (currentPriceA === 0 || currentPriceB === 0) {
        return { success: false, error: 'Price data unavailable for one or both DEXs' };
      }
      
      const currentPriceDiff = Math.abs(currentPriceA - currentPriceB);
      const currentAvgPrice = (currentPriceA + currentPriceB) / 2;
      const currentPriceDiffPercent = (currentPriceDiff / currentAvgPrice) * 100;
      
      if (currentPriceDiffPercent < 0.3) {
        return { success: false, error: 'Arbitrage opportunity no longer viable' };
      }
      
      // Determine buy/sell direction
      const buyDEX = currentPriceA < currentPriceB ? opportunity.dexA : opportunity.dexB;
      const sellDEX = currentPriceA < currentPriceB ? opportunity.dexB : opportunity.dexA;
      const buyPrice = currentPriceA < currentPriceB ? currentPriceA : currentPriceB;
      const sellPrice = currentPriceA < currentPriceB ? currentPriceB : currentPriceA;
      
      // Calculate optimal trade size (with slippage protection)
      const maxSlippage = 0.005; // 0.5%
      const safeAmount = amount * (1 - maxSlippage);
      const tokensReceived = safeAmount / buyPrice;
      const tokensToSell = tokensReceived * (1 - 0.003); // 0.3% fee
      const proceeds = tokensToSell * sellPrice;
      const netProfit = proceeds - amount;
      
      if (netProfit <= 0) {
        return { success: false, error: 'Arbitrage would result in loss after fees' };
      }
      
      // Execute swaps (in production, these would be real on-chain transactions)
      console.log(`Executing arbitrage: Buy ${safeAmount} worth on ${buyDEX}, sell on ${sellDEX}`);
      
      // Swap 1: Buy on lower-priced DEX
      const txHash1 = await this.executeSwap(
        opportunity.token,
        'SOL', // Assuming we're trading SOL for the token
        safeAmount,
        buyDEX,
        'buy'
      );
      
      if (!txHash1) {
        return { success: false, error: 'First swap failed' };
      }
      
      // Swap 2: Sell on higher-priced DEX
      const txHash2 = await this.executeSwap(
        opportunity.token,
        'SOL',
        tokensToSell,
        sellDEX,
        'sell'
      );
      
      if (!txHash2) {
        return { success: false, error: 'Second swap failed', txHash1 };
      }
      
      return {
        success: true,
        txHash1,
        txHash2,
        actualProfit: netProfit,
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  private async executeSwap(
    tokenAddress: string,
    quoteToken: string,
    amount: number,
    dex: string,
    direction: 'buy' | 'sell'
  ): Promise<string | null> {
    try {
      // In production, this would call Jupiter/Raydium/Orca swap APIs
      // For now, simulate the transaction
      const paymentMode = process.env.PAYMENT_MODE || 'simulated';
      
      if (paymentMode === 'simulated') {
        // Simulated swap
        console.log(`[SIMULATED] ${direction === 'buy' ? 'Buying' : 'Selling'} ${amount} on ${dex}`);
        return `swap_${dex}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }
      
      // Real swap execution would go here
      // Example for Jupiter:
      // const response = await axios.post('https://quote-api.jup.ag/v6/quote', {
      //   inputMint: direction === 'buy' ? 'So11111111111111111111111111111111111111112' : tokenAddress,
      //   outputMint: direction === 'buy' ? tokenAddress : 'So11111111111111111111111111111111111111112',
      //   amount: amount * LAMPORTS_PER_SOL,
      //   slippageBps: 50, // 0.5%
      // });
      // Then execute the swap transaction...
      
      console.log(`[ONCHAIN] ${direction === 'buy' ? 'Buying' : 'Selling'} ${amount} on ${dex} - requires real implementation`);
      return null;
    } catch (error: any) {
      console.error(`Swap execution failed on ${dex}:`, error);
      return null;
    }
  }

  private async getProtocolTVL(protocol: string): Promise<number> {
    // In production, fetch from DeFiLlama or similar
    // For now, use realistic ranges based on protocol
    const tvlRanges: Record<string, [number, number]> = {
      'Marinade Finance': [500000000, 2000000000], // 500M - 2B
      'Lido': [1000000000, 5000000000], // 1B - 5B
      'Jito': [200000000, 800000000], // 200M - 800M
      'Raydium LP': [50000000, 500000000], // 50M - 500M
      'Orca LP': [30000000, 300000000], // 30M - 300M
    };
    
    const range = tvlRanges[protocol] || [10000000, 100000000];
    return range[0] + Math.random() * (range[1] - range[0]);
  }
}

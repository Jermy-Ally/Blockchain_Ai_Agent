import { OracleService } from './oracle.service';
import { MarketData, TradingSignal } from '../types';
import { AIEngine } from '../ai/ai-engine';

export class MarketAnalysisService {
  private oracleService: OracleService;
  private aiEngine: AIEngine;

  constructor(oracleService: OracleService, aiEngine: AIEngine) {
    this.oracleService = oracleService;
    this.aiEngine = aiEngine;
  }

  async analyzeToken(tokenAddress: string, network: 'solana' | 'base'): Promise<MarketData & { signals: TradingSignal[] }> {
    const marketData = await this.oracleService.getTokenPrice(tokenAddress, network);
    const sentiment = await this.oracleService.getMarketSentiment(tokenAddress);
    const volume24h = await this.oracleService.getTradingVolume(tokenAddress, '24h');

    // Generate trading signals using AI
    const signals = await this.aiEngine.generateTradingSignals({
      price: marketData.price,
      volume24h,
      priceChange24h: marketData.priceChange24h,
      liquidity: marketData.liquidity,
      sentiment,
    });

    return {
      ...marketData,
      signals,
    };
  }

  async getMarketOverview(tokens: string[], network: 'solana' | 'base'): Promise<{
    topGainers: MarketData[];
    topLosers: MarketData[];
    highestVolume: MarketData[];
    signals: TradingSignal[];
  }> {
    const prices = await this.oracleService.getMultipleTokenPrices(tokens, network);
    
    const sortedByChange = [...prices].sort((a, b) => b.priceChange24h - a.priceChange24h);
    const sortedByVolume = [...prices].sort((a, b) => b.volume24h - a.volume24h);

    // Generate AI signals for top tokens
    const signals: TradingSignal[] = [];
    for (const token of sortedByChange.slice(0, 5)) {
      const analysis = await this.analyzeToken(token.token, network);
      signals.push(...analysis.signals);
    }

    return {
      topGainers: sortedByChange.slice(0, 10),
      topLosers: sortedByChange.slice(-10).reverse(),
      highestVolume: sortedByVolume.slice(0, 10),
      signals,
    };
  }

  async generateTechnicalAnalysis(tokenAddress: string, timeframe: string): Promise<{
    support: number;
    resistance: number;
    trend: 'bullish' | 'bearish' | 'neutral';
    recommendations: string[];
  }> {
    const marketData = await this.oracleService.getTokenPrice(tokenAddress, 'solana');
    
    // Use AI to generate technical analysis
    const analysis = await this.aiEngine.analyzeTechnicalIndicators({
      currentPrice: marketData.price,
      volume: marketData.volume24h,
      priceChange: marketData.priceChange24h,
      timeframe,
    });

    return analysis;
  }
}

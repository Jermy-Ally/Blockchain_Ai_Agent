import { TradingSignal, ArbitrageOpportunity, YieldFarmingOpportunity } from '../types';

export interface TechnicalIndicators {
  currentPrice: number;
  volume: number;
  priceChange: number;
  timeframe: string;
}

export interface TradingSignalInput {
  price: number;
  volume24h: number;
  priceChange24h: number;
  liquidity: number;
  sentiment: number;
}

export class AIEngine {
  private modelWeights: Record<string, number> = {
    price: 0.3,
    volume: 0.25,
    sentiment: 0.2,
    momentum: 0.15,
    liquidity: 0.1,
  };

  async generateTradingSignals(input: TradingSignalInput): Promise<TradingSignal[]> {
    const signals: TradingSignal[] = [];

    // AI-powered decision making using probabilistic models
    const score = this.calculateSignalScore(input);
    const action = this.determineAction(score);

    // Generate primary signal
    const primarySignal: TradingSignal = {
      action,
      token: input.price.toString(), // In real implementation, pass token address
      confidence: Math.abs(score),
      price: input.price,
      reasoning: this.generateReasoning(input, action),
    };
    signals.push(primarySignal);

    // Generate alternative signals if confidence is moderate
    if (Math.abs(score) < 0.7 && Math.abs(score) > 0.3) {
      signals.push({
        ...primarySignal,
        action: 'hold',
        confidence: 0.5,
        reasoning: 'Market conditions are unclear, holding recommended',
      });
    }

    return signals;
  }

  async analyzeTechnicalIndicators(indicators: TechnicalIndicators): Promise<{
    support: number;
    resistance: number;
    trend: 'bullish' | 'bearish' | 'neutral';
    recommendations: string[];
  }> {
    // Calculate support and resistance levels
    const support = indicators.currentPrice * (1 - Math.abs(indicators.priceChange) / 100);
    const resistance = indicators.currentPrice * (1 + Math.abs(indicators.priceChange) / 100);

    // Determine trend
    let trend: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    if (indicators.priceChange > 2 && indicators.volume > 0) {
      trend = 'bullish';
    } else if (indicators.priceChange < -2) {
      trend = 'bearish';
    }

    // Generate recommendations
    const recommendations: string[] = [];
    if (trend === 'bullish') {
      recommendations.push('Consider entry on pullbacks');
      recommendations.push('Set stop-loss below support level');
    } else if (trend === 'bearish') {
      recommendations.push('Consider exiting long positions');
      recommendations.push('Wait for confirmation before entering');
    } else {
      recommendations.push('Market is consolidating, wait for breakout');
    }

    return {
      support,
      resistance,
      trend,
      recommendations,
    };
  }

  async assessArbitrageRisk(opportunity: {
    token: string;
    dexA: string;
    dexB: string;
    priceDiff: number;
  }): Promise<number> {
    // Risk assessment (0-1 scale, lower is better)
    // Factors: liquidity, volatility, execution time
    const baseRisk = 0.3;
    
    // Higher price difference might indicate lower liquidity (higher slippage risk)
    const liquidityRisk = Math.min(opportunity.priceDiff / 10, 0.4);
    
    // Execution risk (simplified)
    const executionRisk = 0.2;

    return Math.min(baseRisk + liquidityRisk + executionRisk, 1.0);
  }

  async rankYieldOpportunities(
    opportunities: YieldFarmingOpportunity[],
    riskTolerance: 'low' | 'medium' | 'high'
  ): Promise<YieldFarmingOpportunity[]> {
    // Rank by risk-adjusted return
    const riskMultipliers = { low: 0.3, medium: 0.6, high: 1.0 };
    const multiplier = riskMultipliers[riskTolerance];

    return opportunities
      .map(opp => ({
        ...opp,
        score: (opp.apy * multiplier) - (opp.risk * 50), // Risk penalty
      }))
      .sort((a, b) => (b as any).score - (a as any).score)
      .map(({ score, ...opp }) => opp);
  }

  async generateSignalsFromArbitrage(opportunities: ArbitrageOpportunity[]): Promise<TradingSignal[]> {
    return opportunities.slice(0, 5).map(opp => ({
      action: 'buy' as const,
      token: opp.token,
      confidence: 1 - opp.risk, // Higher confidence = lower risk
      price: 0, // Would calculate based on DEX prices
      reasoning: `Arbitrage opportunity: ${opp.priceDiff.toFixed(2)}% price difference between ${opp.dexA} and ${opp.dexB}`,
    }));
  }

  async generateSignalsFromYield(opportunities: YieldFarmingOpportunity[]): Promise<TradingSignal[]> {
    return opportunities.slice(0, 3).map(opp => ({
      action: 'buy' as const,
      token: opp.token,
      confidence: opp.apy / 20, // Normalize APY to confidence
      price: 0,
      reasoning: `Yield farming: ${opp.protocol} offers ${opp.apy.toFixed(2)}% APY with estimated return of $${opp.estimatedReturn.toFixed(2)}`,
    }));
  }

  async generateMomentumSignals(params: Record<string, any>): Promise<TradingSignal[]> {
    // Momentum-based trading signals
    // Simplified implementation
    return [{
      action: 'buy' as const,
      token: params.token || '',
      confidence: 0.6,
      price: params.currentPrice || 0,
      reasoning: 'Momentum indicators suggest upward trend',
    }];
  }

  private calculateSignalScore(input: TradingSignalInput): number {
    // Weighted scoring algorithm
    let score = 0;

    // Price momentum
    const priceMomentum = input.priceChange24h / 100;
    score += priceMomentum * this.modelWeights.price;

    // Volume confirmation
    const volumeScore = Math.min(input.volume24h / 1000000, 1); // Normalize
    score += volumeScore * this.modelWeights.volume;

    // Sentiment
    score += input.sentiment * this.modelWeights.sentiment;

    // Liquidity (higher is better)
    const liquidityScore = Math.min(input.liquidity / 10000000, 1);
    score += liquidityScore * this.modelWeights.liquidity;

    return Math.max(-1, Math.min(1, score)); // Clamp to [-1, 1]
  }

  private determineAction(score: number): 'buy' | 'sell' | 'hold' {
    if (score > 0.3) return 'buy';
    if (score < -0.3) return 'sell';
    return 'hold';
  }

  private generateReasoning(input: TradingSignalInput, action: string): string {
    const factors: string[] = [];

    if (input.priceChange24h > 0) {
      factors.push(`Price up ${input.priceChange24h.toFixed(2)}%`);
    } else if (input.priceChange24h < 0) {
      factors.push(`Price down ${Math.abs(input.priceChange24h).toFixed(2)}%`);
    }

    if (input.volume24h > 1000000) {
      factors.push('High volume');
    }

    if (input.sentiment > 0.5) {
      factors.push('Positive sentiment');
    } else if (input.sentiment < -0.5) {
      factors.push('Negative sentiment');
    }

    return `${action.toUpperCase()}: ${factors.join(', ')}`;
  }
}

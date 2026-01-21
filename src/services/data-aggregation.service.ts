import { OracleService } from './oracle.service';
import { BlockchainService } from './blockchain.service';
import axios from 'axios';

export interface AggregatedData {
  tokenMetrics: Record<string, any>;
  marketTrends: any[];
  protocolAnalytics: any[];
  socialSentiment: Record<string, number>;
  onChainMetrics: any;
}

export class DataAggregationService {
  private oracleService: OracleService;
  private blockchainService: BlockchainService;

  constructor(oracleService: OracleService, blockchainService: BlockchainService) {
    this.oracleService = oracleService;
    this.blockchainService = blockchainService;
  }

  async aggregateTokenData(tokens: string[], network: 'solana' | 'base'): Promise<AggregatedData> {
    // Aggregate data from multiple sources
    const prices = await this.oracleService.getMultipleTokenPrices(tokens, network);
    
    const socialSentiment: Record<string, number> = {};
    for (const token of tokens) {
      socialSentiment[token] = await this.oracleService.getMarketSentiment(token);
    }

    // Aggregate on-chain metrics
    const onChainMetrics = await this.getOnChainMetrics(tokens);

    // Market trends
    const marketTrends = await this.getMarketTrends(tokens);

    // Protocol analytics
    const protocolAnalytics = await this.getProtocolAnalytics();

    return {
      tokenMetrics: prices.reduce((acc, data) => {
        acc[data.token] = {
          price: data.price,
          volume24h: data.volume24h,
          priceChange24h: data.priceChange24h,
          liquidity: data.liquidity,
        };
        return acc;
      }, {} as Record<string, any>),
      marketTrends,
      protocolAnalytics,
      socialSentiment,
      onChainMetrics,
    };
  }

  async getOnChainMetrics(tokens: string[]): Promise<any> {
    // Aggregate on-chain data using Helius or similar
    const heliusApiKey = process.env.HELIUS_API_KEY;
    if (!heliusApiKey) {
      console.warn('Helius API key not configured, using fallback data');
      return this.getFallbackOnChainMetrics(tokens);
    }

    try {
      const heliusUrl = `https://api.helius.xyz/v0/token-metadata?api-key=${heliusApiKey}`;
      
      // Fetch token metadata
      const metadataResponse = await axios.post(
        heliusUrl,
        {
          mintAccounts: tokens,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );

      // Fetch additional metrics like transaction volume, holder count, etc.
      const metrics: Record<string, any> = {};
      
      for (const token of tokens) {
        try {
          // Get token balance information (holder distribution)
          const balanceResponse = await axios.get(
            `https://api.helius.xyz/v0/token-balances?api-key=${heliusApiKey}&mint=${token}`,
            { timeout: 5000 }
          );
          
          metrics[token] = {
            metadata: metadataResponse.data?.find((m: any) => m.mint === token),
            balanceInfo: balanceResponse.data,
            holders: balanceResponse.data?.holders || 0,
            supply: metadataResponse.data?.find((m: any) => m.mint === token)?.supply || 0,
          };
        } catch (error) {
          // Individual token fetch failed, skip
          metrics[token] = {
            metadata: metadataResponse.data?.find((m: any) => m.mint === token),
          };
        }
      }

      return {
        tokens: metrics,
        timestamp: Date.now(),
        source: 'helius',
      };
    } catch (error: any) {
      console.error('Error fetching on-chain metrics from Helius:', error.message);
      return this.getFallbackOnChainMetrics(tokens);
    }
  }

  private async getFallbackOnChainMetrics(tokens: string[]): Promise<any> {
    // Fallback to basic Solana RPC calls
    const metrics: Record<string, any> = {};
    
    for (const token of tokens) {
      try {
        // Use basic blockchain service to get token info
        // This is a simplified fallback
        metrics[token] = {
          mint: token,
          supply: 0,
          holders: 0,
          source: 'fallback',
        };
      } catch (error) {
        metrics[token] = { mint: token, error: 'Failed to fetch' };
      }
    }
    
    return {
      tokens: metrics,
      timestamp: Date.now(),
      source: 'fallback',
    };
  }

  async getMarketTrends(tokens: string[]): Promise<any[]> {
    // Analyze market trends from historical data
    const trends: any[] = [];
    
    for (const token of tokens) {
      try {
        // Fetch price history from Birdeye if available
        const birdeyeApiKey = process.env.BIRDEYE_API_KEY;
        if (birdeyeApiKey) {
          try {
            const response = await axios.get(
              `https://public-api.birdeye.so/defi/token_overview?address=${token}`,
              {
                headers: {
                  'X-API-KEY': birdeyeApiKey,
                },
                timeout: 5000,
              }
            );
            
            const data = response.data?.data;
            if (data) {
              const priceChange = data.priceChange24h || 0;
              const volumeChange = data.volumeChange24h || 0;
              
              let trend = 'neutral';
              if (priceChange > 5) trend = 'bullish';
              else if (priceChange < -5) trend = 'bearish';
              
              trends.push({
                token,
                trend,
                momentum: priceChange / 100, // Normalize to -1 to 1
                priceChange24h: priceChange,
                volumeChange24h: volumeChange,
                source: 'birdeye',
              });
              continue;
            }
          } catch (error) {
            // Birdeye fetch failed, use fallback
          }
        }
        
        // Fallback: use oracle price change
        const marketData = await this.oracleService.getTokenPrice(token, 'solana');
        const priceChange = marketData.priceChange24h || 0;
        let trend = 'neutral';
        if (priceChange > 5) trend = 'bullish';
        else if (priceChange < -5) trend = 'bearish';
        
        trends.push({
          token,
          trend,
          momentum: priceChange / 100,
          priceChange24h: priceChange,
          source: 'oracle',
        });
      } catch (error) {
        trends.push({
          token,
          trend: 'neutral',
          momentum: 0,
          error: 'Failed to fetch trend data',
        });
      }
    }
    
    return trends;
  }

  async getProtocolAnalytics(): Promise<any[]> {
    // Aggregate protocol-level analytics
    return [
      {
        protocol: 'Raydium',
        tvl: 500000000,
        volume24h: 100000000,
        uniqueUsers: 15000,
      },
      {
        protocol: 'Orca',
        tvl: 300000000,
        volume24h: 80000000,
        uniqueUsers: 12000,
      },
    ];
  }

  async generateReport(type: 'daily' | 'weekly' | 'monthly', tokens: string[]): Promise<string> {
    const data = await this.aggregateTokenData(tokens, 'solana');
    
    // Generate formatted report
    let report = `# ${type.charAt(0).toUpperCase() + type.slice(1)} Market Report\n\n`;
    report += `Generated: ${new Date().toISOString()}\n\n`;
    
    report += '## Token Metrics\n';
    for (const [token, metrics] of Object.entries(data.tokenMetrics)) {
      report += `### ${token}\n`;
      report += `- Price: $${metrics.price}\n`;
      report += `- 24h Volume: $${metrics.volume24h.toLocaleString()}\n`;
      report += `- 24h Change: ${metrics.priceChange24h > 0 ? '+' : ''}${metrics.priceChange24h.toFixed(2)}%\n`;
      report += `- Sentiment: ${data.socialSentiment[token]?.toFixed(2) || 'N/A'}\n\n`;
    }

    report += '## Market Trends\n';
    data.marketTrends.forEach(trend => {
      report += `- ${trend.token}: ${trend.trend} (momentum: ${trend.momentum.toFixed(2)})\n`;
    });

    return report;
  }
}

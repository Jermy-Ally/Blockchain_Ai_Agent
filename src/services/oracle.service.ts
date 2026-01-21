import axios from 'axios';
import { MarketData, TradingSignal } from '../types';

export class OracleService {
  private priceCache: Map<string, MarketData> = new Map();
  private cacheTTL: number = 30000; // 30 seconds
  private lastRequestTime: number = 0;
  private minRequestInterval: number = 2000; // Minimum 2 seconds between requests to avoid rate limiting

  private async rateLimitDelay(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.minRequestInterval) {
      const delay = this.minRequestInterval - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    this.lastRequestTime = Date.now();
  }

  async getTokenPrice(tokenAddress: string, network: 'solana' | 'base'): Promise<MarketData> {
    const cacheKey = `${network}:${tokenAddress}`;
    const cached = this.priceCache.get(cacheKey);
    
    // Return cached data if still valid (extend cache TTL to reduce API calls)
    if (cached && Date.now() - cached.timestamp < this.cacheTTL * 2) {
      return cached;
    }

    try {
      // Rate limit protection
      await this.rateLimitDelay();
      
      // In production, use Birdeye API or similar
      const response = await axios.get(
        `https://public-api.birdeye.so/defi/price?address=${tokenAddress}`,
        {
          headers: {
            'X-API-KEY': process.env.BIRDEYE_API_KEY || '',
          },
          timeout: 5000,
        }
      );

      const data: MarketData = {
        token: tokenAddress,
        price: response.data.data?.value || 0,
        volume24h: response.data.data?.volume24h || 0,
        priceChange24h: response.data.data?.priceChange24h || 0,
        liquidity: response.data.data?.liquidity || 0,
        timestamp: Date.now(),
      };

      this.priceCache.set(cacheKey, data);
      return data;
    } catch (error: any) {
      // Check if it's a rate limit error
      if (error.response?.status === 429) {
        console.warn(`Rate limited by Birdeye API for token ${tokenAddress}. Using cached data if available.`);
        // Extend cache TTL when rate limited to avoid repeated failures
        if (cached) {
          return cached;
        }
      }
      
      console.error('Error fetching token price:', error.response?.status || error.message);
      
      // Fallback to cached data (even if expired) before returning zeros
      if (cached) {
        console.log(`Using cached price data for ${tokenAddress}`);
        return cached;
      }
      
      // Last resort: return default
      return {
        token: tokenAddress,
        price: 0,
        volume24h: 0,
        priceChange24h: 0,
        liquidity: 0,
        timestamp: Date.now(),
      };
    }
  }

  async getMultipleTokenPrices(tokens: string[], network: 'solana' | 'base'): Promise<MarketData[]> {
    return Promise.all(tokens.map(token => this.getTokenPrice(token, network)));
  }

  async getDEXPrice(tokenAddress: string, dex: 'jupiter' | 'raydium' | 'orca'): Promise<number> {
    const cacheKey = `dex:${dex}:${tokenAddress}`;
    
    try {
      // Try DEX-specific sources if available, otherwise use aggregated price
      // For all DEX prices, use cached aggregated price to avoid rate limiting
      // In production with higher rate limits, you could fetch DEX-specific prices
      const marketData = await this.getTokenPrice(tokenAddress, 'solana');
      
      // If we got a valid price, add some small variation to simulate DEX differences
      // (In production with proper API access, you'd fetch real DEX-specific prices)
      if (marketData.price > 0) {
        // Small variation to simulate price differences across DEXs (0.1% - 0.5%)
        const variation = (Math.random() * 0.004 + 0.001) * (Math.random() > 0.5 ? 1 : -1);
        return marketData.price * (1 + variation);
      }
      
      return marketData.price;
    } catch (error) {
      console.error(`Error fetching ${dex} price:`, error);
      return 0;
    }
  }

  async getMarketSentiment(token: string): Promise<number> {
    // In production, integrate with social sentiment APIs
    // For now, return a simulated sentiment score (-1 to 1)
    try {
      // Could integrate with Twitter API, Reddit API, etc.
      // Simulated for demo
      return Math.random() * 2 - 1; // Random between -1 and 1
    } catch (error) {
      console.error('Error fetching market sentiment:', error);
      return 0;
    }
  }

  async getTradingVolume(tokenAddress: string, timeframe: '24h' | '7d' | '30d'): Promise<number> {
    // Fetch trading volume data
    // Implementation would use Birdeye or similar API
    return 0;
  }
}

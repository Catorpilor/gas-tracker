import axios from 'axios';
import { config, ChainConfig, ChainName } from '../config';
import { getTransactionsBatch, Transaction } from './alchemy';

export interface ChainGasStats {
  chain: string;
  chainId: number;
  transactionCount: number;
  totalGasUsed: string;
  totalGasSpentNative: string;
  totalGasSpentUsd: number;
  avgGasPriceGwei: number;
}

export interface GasReport {
  address: string;
  chains: ChainGasStats[];
  totalUsd: number;
  totalTransactions: number;
  generatedAt: string;
}

// Simple in-memory cache for prices
const priceCache: Record<string, { price: number; timestamp: number }> = {};
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

async function getHistoricalPrice(coingeckoId: string, timestamp: number): Promise<number> {
  // For simplicity, use current price (historical prices require paid CoinGecko API)
  // In production, you'd want to use historical prices
  const cacheKey = coingeckoId;
  const now = Date.now();
  
  if (priceCache[cacheKey] && now - priceCache[cacheKey].timestamp < CACHE_TTL) {
    return priceCache[cacheKey].price;
  }
  
  try {
    const response = await axios.get(
      `${config.coingeckoApiUrl}/simple/price?ids=${coingeckoId}&vs_currencies=usd`,
      { timeout: 5000 }
    );
    const price = response.data[coingeckoId]?.usd || 0;
    priceCache[cacheKey] = { price, timestamp: now };
    return price;
  } catch (error) {
    console.error(`Failed to fetch price for ${coingeckoId}:`, error);
    // Return cached price if available, even if stale
    return priceCache[cacheKey]?.price || 0;
  }
}

function weiToEther(wei: string): number {
  // Handle hex strings
  const weiNum = wei.startsWith('0x') ? BigInt(wei) : BigInt(wei);
  return Number(weiNum) / 1e18;
}

function weiToGwei(wei: string): number {
  const weiNum = wei.startsWith('0x') ? BigInt(wei) : BigInt(wei);
  return Number(weiNum) / 1e9;
}

export async function calculateGasSpent(
  address: string,
  chainNames?: ChainName[]
): Promise<GasReport> {
  const chainsToQuery = chainNames || (Object.keys(config.chains) as ChainName[]);
  const chainStats: ChainGasStats[] = [];
  
  for (const chainName of chainsToQuery) {
    const chainConfig = config.chains[chainName];
    if (!chainConfig) continue;
    
    try {
      console.log(`Fetching transactions for ${chainConfig.name}...`);
      const transactions = await getTransactionsBatch(address.toLowerCase(), chainConfig);
      
      if (transactions.length === 0) {
        chainStats.push({
          chain: chainConfig.name,
          chainId: chainConfig.chainId,
          transactionCount: 0,
          totalGasUsed: '0',
          totalGasSpentNative: '0',
          totalGasSpentUsd: 0,
          avgGasPriceGwei: 0
        });
        continue;
      }
      
      // Calculate totals
      let totalGasUsed = BigInt(0);
      let totalGasSpentWei = BigInt(0);
      let totalGasPrice = BigInt(0);
      
      for (const tx of transactions) {
        const gasUsed = BigInt(tx.gasUsed);
        const gasPrice = BigInt(tx.gasPrice);
        
        totalGasUsed += gasUsed;
        totalGasSpentWei += gasUsed * gasPrice;
        totalGasPrice += gasPrice;
      }
      
      const avgGasPriceGwei = transactions.length > 0 
        ? weiToGwei(String(totalGasPrice / BigInt(transactions.length)))
        : 0;
      
      const totalGasSpentNative = weiToEther(String(totalGasSpentWei));
      
      // Get price for USD conversion
      const nativePrice = await getHistoricalPrice(chainConfig.coingeckoId, Date.now() / 1000);
      const totalGasSpentUsd = totalGasSpentNative * nativePrice;
      
      chainStats.push({
        chain: chainConfig.name,
        chainId: chainConfig.chainId,
        transactionCount: transactions.length,
        totalGasUsed: totalGasUsed.toString(),
        totalGasSpentNative: totalGasSpentNative.toFixed(6),
        totalGasSpentUsd: Math.round(totalGasSpentUsd * 100) / 100,
        avgGasPriceGwei: Math.round(avgGasPriceGwei * 100) / 100
      });
      
    } catch (error) {
      console.error(`Error processing ${chainConfig.name}:`, error);
      chainStats.push({
        chain: chainConfig.name,
        chainId: chainConfig.chainId,
        transactionCount: 0,
        totalGasUsed: '0',
        totalGasSpentNative: '0',
        totalGasSpentUsd: 0,
        avgGasPriceGwei: 0
      });
    }
  }
  
  // Calculate totals
  const totalUsd = chainStats.reduce((sum, c) => sum + c.totalGasSpentUsd, 0);
  const totalTransactions = chainStats.reduce((sum, c) => sum + c.transactionCount, 0);
  
  return {
    address,
    chains: chainStats,
    totalUsd: Math.round(totalUsd * 100) / 100,
    totalTransactions,
    generatedAt: new Date().toISOString()
  };
}

import dotenv from 'dotenv';
dotenv.config();

export interface ChainConfig {
  name: string;
  chainId: number;
  rpcUrl: string;
  nativeSymbol: string;
  coingeckoId: string;
}

export const config = {
  port: parseInt(process.env.PORT || '3000'),
  
  // Alchemy API key (used to construct chain URLs if individual URLs not provided)
  alchemyApiKey: process.env.ALCHEMY_API_KEY || '',
  
  // Individual chain RPC URLs (override defaults)
  chains: {
    ethereum: {
      name: 'Ethereum',
      chainId: 1,
      rpcUrl: process.env.ALCHEMY_ETH_URL || `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
      nativeSymbol: 'ETH',
      coingeckoId: 'ethereum'
    },
    base: {
      name: 'Base',
      chainId: 8453,
      rpcUrl: process.env.ALCHEMY_BASE_URL || `https://base-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
      nativeSymbol: 'ETH',
      coingeckoId: 'ethereum'
    },
    arbitrum: {
      name: 'Arbitrum',
      chainId: 42161,
      rpcUrl: process.env.ALCHEMY_ARB_URL || `https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
      nativeSymbol: 'ETH',
      coingeckoId: 'ethereum'
    },
    optimism: {
      name: 'Optimism',
      chainId: 10,
      rpcUrl: process.env.ALCHEMY_OPT_URL || `https://opt-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
      nativeSymbol: 'ETH',
      coingeckoId: 'ethereum'
    },
    polygon: {
      name: 'Polygon',
      chainId: 137,
      rpcUrl: process.env.ALCHEMY_POLY_URL || `https://polygon-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
      nativeSymbol: 'MATIC',
      coingeckoId: 'matic-network'
    }
  } as Record<string, ChainConfig>,
  
  // CoinGecko API for historical prices
  coingeckoApiUrl: process.env.COINGECKO_API_URL || 'https://api.coingecko.com/api/v3'
};

export type ChainName = keyof typeof config.chains;

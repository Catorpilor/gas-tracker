import { Router, Request, Response } from 'express';
import { calculateGasSpent } from '../services/gas-calculator';
import { generateVerdict, formatVerdict } from '../services/verdict';
import { ChainName, config } from '../config';

const router = Router();

interface GasSpentRequest {
  address: string;
  chains?: string[];
}

interface ChainVerdict {
  emoji: string;
  title: string;
  message: string;
}

interface ChainStats {
  chainId: number;
  transactionCount: number;
  totalGasUsed: string;
  totalGasSpentNative: string;
  totalGasSpentUsd: number;
  avgGasPriceGwei: number;
  verdict: ChainVerdict;
}

interface GasSpentResponse {
  ok: boolean;
  data?: {
    address: string;
    chains: Record<string, ChainStats>;
    summary: {
      totalUsd: number;
      totalTransactions: number;
      generatedAt: string;
    };
    verdict: {
      emoji: string;
      title: string;
      message: string;
      comparison: string;
      formatted: string;
    };
  };
  error?: string;
}

// Validate Ethereum address
function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

// POST /v1/gas-spent
router.post('/', async (req: Request<{}, GasSpentResponse, GasSpentRequest>, res: Response<GasSpentResponse>) => {
  const { address, chains } = req.body;
  
  // Validate address
  if (!address) {
    return res.status(400).json({ ok: false, error: 'Missing required field: address' });
  }
  
  if (!isValidAddress(address)) {
    return res.status(400).json({ ok: false, error: 'Invalid Ethereum address format' });
  }
  
  // Validate chains if provided
  const validChains = Object.keys(config.chains) as ChainName[];
  let requestedChains: ChainName[] | undefined;
  
  if (chains && Array.isArray(chains)) {
    const invalidChains = chains.filter(c => !validChains.includes(c as ChainName));
    if (invalidChains.length > 0) {
      return res.status(400).json({ 
        ok: false, 
        error: `Invalid chains: ${invalidChains.join(', ')}. Valid chains: ${validChains.join(', ')}` 
      });
    }
    requestedChains = chains as ChainName[];
  }
  
  try {
    // Calculate gas spent
    const report = await calculateGasSpent(address, requestedChains);
    
    // Generate verdict
    const verdict = generateVerdict(report.totalUsd, report.totalTransactions);
    const formattedVerdict = formatVerdict(verdict, report.totalUsd);
    
    // Convert chains array to object keyed by chain name, with verdict per chain
    const chainsByName: Record<string, ChainStats> = {};
    for (const chain of report.chains) {
      const chainVerdict = generateVerdict(chain.totalGasSpentUsd, chain.transactionCount);
      chainsByName[chain.chain.toLowerCase()] = {
        chainId: chain.chainId,
        transactionCount: chain.transactionCount,
        totalGasUsed: chain.totalGasUsed,
        totalGasSpentNative: chain.totalGasSpentNative,
        totalGasSpentUsd: chain.totalGasSpentUsd,
        avgGasPriceGwei: chain.avgGasPriceGwei,
        verdict: {
          emoji: chainVerdict.emoji,
          title: chainVerdict.title,
          message: chainVerdict.message,
        },
      };
    }
    
    return res.json({
      ok: true,
      data: {
        address: report.address,
        chains: chainsByName,
        summary: {
          totalUsd: report.totalUsd,
          totalTransactions: report.totalTransactions,
          generatedAt: report.generatedAt
        },
        verdict: {
          ...verdict,
          formatted: formattedVerdict
        }
      }
    });
    
  } catch (error) {
    console.error('Error calculating gas spent:', error);
    return res.status(500).json({ 
      ok: false, 
      error: 'Failed to calculate gas spent. Please try again.' 
    });
  }
});

export default router;

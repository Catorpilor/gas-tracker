import { Router, Request, Response } from 'express';
import { calculateGasSpent } from '../services/gas-calculator';
import { generateVerdict, formatVerdict } from '../services/verdict';
import { ChainName, config } from '../config';

const router = Router();

interface GasSpentRequest {
  address: string;
  chains?: string[];
}

interface GasSpentResponse {
  ok: boolean;
  data?: {
    address: string;
    chains: {
      chain: string;
      chainId: number;
      transactionCount: number;
      totalGasUsed: string;
      totalGasSpentNative: string;
      totalGasSpentUsd: number;
      avgGasPriceGwei: number;
    }[];
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
    
    return res.json({
      ok: true,
      data: {
        address: report.address,
        chains: report.chains,
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

// GET /v1/gas-spent/:address (convenience endpoint)
router.get('/:address', async (req: Request, res: Response<GasSpentResponse>) => {
  const { address } = req.params;
  const chainsParam = req.query.chains ? String(req.query.chains).split(',') : undefined;
  
  // Validate address
  if (!isValidAddress(address)) {
    return res.status(400).json({ ok: false, error: 'Invalid Ethereum address format' });
  }
  
  // Validate chains if provided
  const validChains = Object.keys(config.chains) as ChainName[];
  let requestedChains: ChainName[] | undefined;
  
  if (chainsParam) {
    const invalidChains = chainsParam.filter(c => !validChains.includes(c as ChainName));
    if (invalidChains.length > 0) {
      return res.status(400).json({ 
        ok: false, 
        error: `Invalid chains: ${invalidChains.join(', ')}. Valid chains: ${validChains.join(', ')}` 
      });
    }
    requestedChains = chainsParam as ChainName[];
  }
  
  try {
    const report = await calculateGasSpent(address, requestedChains);
    const verdict = generateVerdict(report.totalUsd, report.totalTransactions);
    const formattedVerdict = formatVerdict(verdict, report.totalUsd);
    
    return res.json({
      ok: true,
      data: {
        address: report.address,
        chains: report.chains,
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

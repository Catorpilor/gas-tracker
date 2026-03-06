import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import gasSpentRouter from './gas-spent';
import * as gasCalculator from '../services/gas-calculator';

// Mock the gas calculator
vi.mock('../services/gas-calculator', () => ({
  calculateGasSpent: vi.fn()
}));

const app = express();
app.use(express.json());
app.use('/v1/gas-spent', gasSpentRouter);

describe('POST /v1/gas-spent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 for missing address', async () => {
    const res = await request(app)
      .post('/v1/gas-spent')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(res.body.error).toContain('address');
  });

  it('returns 400 for invalid address format', async () => {
    const res = await request(app)
      .post('/v1/gas-spent')
      .send({ address: 'invalid' });

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(res.body.error).toContain('Invalid');
  });

  it('returns 400 for invalid chain', async () => {
    const res = await request(app)
      .post('/v1/gas-spent')
      .send({ 
        address: '0x1234567890123456789012345678901234567890',
        chains: ['invalid-chain']
      });

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(res.body.error).toContain('Invalid chains');
  });

  it('accepts valid address and returns gas data categorized by chain', async () => {
    vi.mocked(gasCalculator.calculateGasSpent).mockResolvedValue({
      address: '0x1234567890123456789012345678901234567890',
      chains: [
        {
          chain: 'Ethereum',
          chainId: 1,
          transactionCount: 10,
          totalGasUsed: '1000000',
          totalGasSpentNative: '0.05',
          totalGasSpentUsd: 100,
          avgGasPriceGwei: 50
        }
      ],
      totalUsd: 100,
      totalTransactions: 10,
      generatedAt: new Date().toISOString()
    });

    const res = await request(app)
      .post('/v1/gas-spent')
      .send({ address: '0x1234567890123456789012345678901234567890' });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data).toBeDefined();
    // Chains should be an object keyed by chain name
    expect(res.body.data.chains).toBeTypeOf('object');
    expect(res.body.data.chains.ethereum).toBeDefined();
    expect(res.body.data.chains.ethereum.chainId).toBe(1);
    expect(res.body.data.chains.ethereum.transactionCount).toBe(10);
    expect(res.body.data.chains.ethereum.totalGasSpentUsd).toBe(100);
    // Each chain should have its own verdict
    expect(res.body.data.chains.ethereum.verdict).toBeDefined();
    expect(res.body.data.chains.ethereum.verdict.emoji).toBeDefined();
    expect(res.body.data.chains.ethereum.verdict.title).toBeDefined();
    expect(res.body.data.summary.totalUsd).toBe(100);
    // Overall verdict still exists
    expect(res.body.data.verdict).toBeDefined();
    expect(res.body.data.verdict.emoji).toBeDefined();
    expect(res.body.data.verdict.title).toBeDefined();
  });

  it('filters by requested chains', async () => {
    vi.mocked(gasCalculator.calculateGasSpent).mockResolvedValue({
      address: '0x1234567890123456789012345678901234567890',
      chains: [
        {
          chain: 'Base',
          chainId: 8453,
          transactionCount: 5,
          totalGasUsed: '500000',
          totalGasSpentNative: '0.001',
          totalGasSpentUsd: 2,
          avgGasPriceGwei: 0.1
        }
      ],
      totalUsd: 2,
      totalTransactions: 5,
      generatedAt: new Date().toISOString()
    });

    const res = await request(app)
      .post('/v1/gas-spent')
      .send({ 
        address: '0x1234567890123456789012345678901234567890',
        chains: ['base']
      });

    expect(res.status).toBe(200);
    expect(res.body.data.chains.base).toBeDefined();
    expect(res.body.data.chains.base.chainId).toBe(8453);
  });

  it('returns multiple chains categorized by name', async () => {
    vi.mocked(gasCalculator.calculateGasSpent).mockResolvedValue({
      address: '0x1234567890123456789012345678901234567890',
      chains: [
        {
          chain: 'Ethereum',
          chainId: 1,
          transactionCount: 50,
          totalGasUsed: '5000000',
          totalGasSpentNative: '0.5',
          totalGasSpentUsd: 1000,
          avgGasPriceGwei: 50
        },
        {
          chain: 'Base',
          chainId: 8453,
          transactionCount: 100,
          totalGasUsed: '2000000',
          totalGasSpentNative: '0.002',
          totalGasSpentUsd: 5,
          avgGasPriceGwei: 0.1
        }
      ],
      totalUsd: 1005,
      totalTransactions: 150,
      generatedAt: new Date().toISOString()
    });

    const res = await request(app)
      .post('/v1/gas-spent')
      .send({ address: '0x1234567890123456789012345678901234567890' });

    expect(res.status).toBe(200);
    expect(Object.keys(res.body.data.chains)).toHaveLength(2);
    expect(res.body.data.chains.ethereum.totalGasSpentUsd).toBe(1000);
    expect(res.body.data.chains.base.totalGasSpentUsd).toBe(5);
    expect(res.body.data.summary.totalUsd).toBe(1005);
    // Each chain should have different verdicts based on their spend
    expect(res.body.data.chains.ethereum.verdict.title).toBe('Frequent Flyer'); // $1000 = Frequent Flyer (500-1000)
    expect(res.body.data.chains.base.verdict.title).toBe('Baby Degen'); // $5 = Baby Degen (1-10)
  });

  it('returns correct verdict based on total USD', async () => {
    vi.mocked(gasCalculator.calculateGasSpent).mockResolvedValue({
      address: '0x1234567890123456789012345678901234567890',
      chains: [{
        chain: 'Ethereum',
        chainId: 1,
        transactionCount: 100,
        totalGasUsed: '50000000',
        totalGasSpentNative: '5.0',
        totalGasSpentUsd: 10000,
        avgGasPriceGwei: 100
      }],
      totalUsd: 10000,
      totalTransactions: 100,
      generatedAt: new Date().toISOString()
    });

    const res = await request(app)
      .post('/v1/gas-spent')
      .send({ address: '0x1234567890123456789012345678901234567890' });

    expect(res.body.data.verdict.title).toBe('Car Payment Champion');
    expect(res.body.data.verdict.emoji).toBe('🚙');
  });
});

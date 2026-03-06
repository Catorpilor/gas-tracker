import { describe, it, expect, vi, beforeEach } from 'vitest';
import { calculateGasSpent, ChainGasStats, GasReport } from './gas-calculator';
import * as alchemy from './alchemy';

// Mock the alchemy module
vi.mock('./alchemy', () => ({
  getTransactionsBatch: vi.fn()
}));

// Mock axios for price fetching
vi.mock('axios', () => ({
  default: {
    get: vi.fn().mockResolvedValue({
      data: { ethereum: { usd: 2000 }, 'matic-network': { usd: 0.5 } }
    })
  }
}));

describe('calculateGasSpent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty chain stats when no transactions', async () => {
    vi.mocked(alchemy.getTransactionsBatch).mockResolvedValue([]);

    const report = await calculateGasSpent('0x1234567890123456789012345678901234567890', ['ethereum']);

    expect(report.address).toBe('0x1234567890123456789012345678901234567890');
    expect(report.chains).toHaveLength(1);
    expect(report.chains[0].transactionCount).toBe(0);
    expect(report.chains[0].totalGasSpentUsd).toBe(0);
    expect(report.totalUsd).toBe(0);
    expect(report.totalTransactions).toBe(0);
  });

  it('calculates gas spent correctly for single transaction', async () => {
    vi.mocked(alchemy.getTransactionsBatch).mockResolvedValue([
      {
        hash: '0xabc',
        from: '0x123',
        to: '0x456',
        value: '0x0',
        gasUsed: '0x5208', // 21000
        gasPrice: '0x3b9aca00', // 1 gwei = 1000000000
        timestamp: Date.now() / 1000,
        blockNumber: 12345678
      }
    ]);

    const report = await calculateGasSpent('0x1234567890123456789012345678901234567890', ['ethereum']);

    expect(report.chains[0].transactionCount).toBe(1);
    expect(report.chains[0].totalGasUsed).toBe('21000');
    // Gas cost = 21000 * 1 gwei = 0.000021 ETH
    expect(parseFloat(report.chains[0].totalGasSpentNative)).toBeCloseTo(0.000021, 6);
  });

  it('aggregates multiple transactions', async () => {
    vi.mocked(alchemy.getTransactionsBatch).mockResolvedValue([
      {
        hash: '0xabc',
        from: '0x123',
        to: '0x456',
        value: '0x0',
        gasUsed: '0x5208', // 21000
        gasPrice: '0x3b9aca00', // 1 gwei
        timestamp: Date.now() / 1000,
        blockNumber: 12345678
      },
      {
        hash: '0xdef',
        from: '0x123',
        to: '0x789',
        value: '0x0',
        gasUsed: '0xa410', // 42000
        gasPrice: '0x77359400', // 2 gwei
        timestamp: Date.now() / 1000,
        blockNumber: 12345679
      }
    ]);

    const report = await calculateGasSpent('0x1234567890123456789012345678901234567890', ['ethereum']);

    expect(report.chains[0].transactionCount).toBe(2);
    expect(report.chains[0].totalGasUsed).toBe('63000'); // 21000 + 42000
  });

  it('returns per-chain breakdown', async () => {
    vi.mocked(alchemy.getTransactionsBatch)
      .mockResolvedValueOnce([
        {
          hash: '0xeth',
          from: '0x123',
          to: '0x456',
          value: '0x0',
          gasUsed: '0x5208',
          gasPrice: '0x3b9aca00',
          timestamp: Date.now() / 1000,
          blockNumber: 12345678
        }
      ])
      .mockResolvedValueOnce([
        {
          hash: '0xbase',
          from: '0x123',
          to: '0x456',
          value: '0x0',
          gasUsed: '0xa410',
          gasPrice: '0x5f5e100', // 0.1 gwei
          timestamp: Date.now() / 1000,
          blockNumber: 12345678
        }
      ]);

    const report = await calculateGasSpent('0x1234567890123456789012345678901234567890', ['ethereum', 'base']);

    expect(report.chains).toHaveLength(2);
    expect(report.chains[0].chain).toBe('Ethereum');
    expect(report.chains[0].transactionCount).toBe(1);
    expect(report.chains[1].chain).toBe('Base');
    expect(report.chains[1].transactionCount).toBe(1);
    expect(report.totalTransactions).toBe(2);
  });

  it('calculates total USD across chains', async () => {
    vi.mocked(alchemy.getTransactionsBatch)
      .mockResolvedValueOnce([
        {
          hash: '0xeth',
          from: '0x123',
          to: '0x456',
          value: '0x0',
          gasUsed: '0x5208',
          gasPrice: '0xe8d4a51000', // 1000 gwei
          timestamp: Date.now() / 1000,
          blockNumber: 12345678
        }
      ])
      .mockResolvedValueOnce([
        {
          hash: '0xbase',
          from: '0x123',
          to: '0x456',
          value: '0x0',
          gasUsed: '0x5208',
          gasPrice: '0xe8d4a51000',
          timestamp: Date.now() / 1000,
          blockNumber: 12345678
        }
      ]);

    const report = await calculateGasSpent('0x1234567890123456789012345678901234567890', ['ethereum', 'base']);

    // Both chains use ETH, so totalUsd should be sum of both
    expect(report.totalUsd).toBeGreaterThan(0);
  });
});

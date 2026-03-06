import axios from 'axios';
import { config, ChainConfig } from '../config';

export interface Transaction {
  hash: string;
  from: string;
  to: string | null;
  value: string;
  gasUsed: string;
  gasPrice: string;
  timestamp: number;
  blockNumber: number;
}

export interface AssetTransfer {
  hash: string;
  from: string;
  to: string | null;
  value: number | null;
  asset: string;
  category: string;
  blockNum: string;
  metadata: {
    blockTimestamp: string;
  };
}

export async function getTransactions(
  address: string,
  chainConfig: ChainConfig
): Promise<Transaction[]> {
  const transactions: Transaction[] = [];
  
  try {
    // Use alchemy_getAssetTransfers to get all outgoing transactions
    const response = await axios.post(chainConfig.rpcUrl, {
      jsonrpc: '2.0',
      id: 1,
      method: 'alchemy_getAssetTransfers',
      params: [{
        fromAddress: address,
        category: ['external', 'internal'],
        withMetadata: true,
        maxCount: '0x3e8', // 1000 max
        order: 'desc'
      }]
    });

    if (response.data.result?.transfers) {
      const transfers: AssetTransfer[] = response.data.result.transfers;
      
      // Get unique transaction hashes
      const uniqueHashes = [...new Set(transfers.map(t => t.hash))];
      
      // Fetch receipt for each transaction to get actual gas used
      for (const hash of uniqueHashes) {
        try {
          const receipt = await getTransactionReceipt(hash, chainConfig);
          const tx = await getTransaction(hash, chainConfig);
          
          if (receipt && tx) {
            const transfer = transfers.find(t => t.hash === hash);
            const timestamp = transfer?.metadata?.blockTimestamp 
              ? new Date(transfer.metadata.blockTimestamp).getTime() / 1000 
              : 0;
            
            transactions.push({
              hash,
              from: tx.from,
              to: tx.to,
              value: tx.value,
              gasUsed: receipt.gasUsed,
              gasPrice: receipt.effectiveGasPrice || tx.gasPrice,
              timestamp,
              blockNumber: parseInt(receipt.blockNumber, 16)
            });
          }
        } catch (e) {
          // Skip failed receipts
          console.error(`Failed to get receipt for ${hash}:`, e);
        }
      }
    }
  } catch (error) {
    console.error(`Error fetching transactions for ${chainConfig.name}:`, error);
    throw error;
  }
  
  return transactions;
}

async function getTransactionReceipt(hash: string, chainConfig: ChainConfig) {
  const response = await axios.post(chainConfig.rpcUrl, {
    jsonrpc: '2.0',
    id: 1,
    method: 'eth_getTransactionReceipt',
    params: [hash]
  });
  return response.data.result;
}

async function getTransaction(hash: string, chainConfig: ChainConfig) {
  const response = await axios.post(chainConfig.rpcUrl, {
    jsonrpc: '2.0',
    id: 1,
    method: 'eth_getTransactionByHash',
    params: [hash]
  });
  return response.data.result;
}

// Batch version to reduce API calls
export async function getTransactionsBatch(
  address: string,
  chainConfig: ChainConfig
): Promise<Transaction[]> {
  const transactions: Transaction[] = [];
  
  try {
    // Get transfers
    const transferResponse = await axios.post(chainConfig.rpcUrl, {
      jsonrpc: '2.0',
      id: 1,
      method: 'alchemy_getAssetTransfers',
      params: [{
        fromAddress: address,
        category: ['external'],
        withMetadata: true,
        maxCount: '0x1f4', // 500 max for faster response
        order: 'desc'
      }]
    });

    console.log(`[${chainConfig.name}] Got ${transferResponse.data.result?.transfers?.length || 0} transfers`);

    if (!transferResponse.data.result?.transfers) {
      return [];
    }

    const transfers: AssetTransfer[] = transferResponse.data.result.transfers;
    const uniqueHashes = [...new Set(transfers.map(t => t.hash))].slice(0, 50); // Limit to 50 for faster response

    // Batch RPC calls
    const batchRequests = uniqueHashes.flatMap((hash, idx) => [
      { jsonrpc: '2.0', id: idx * 2, method: 'eth_getTransactionReceipt', params: [hash] },
      { jsonrpc: '2.0', id: idx * 2 + 1, method: 'eth_getTransactionByHash', params: [hash] }
    ]);

    // Process in batches
    const chunkSize = 25; // 25 hashes = 50 requests per batch
    for (let i = 0; i < uniqueHashes.length; i += chunkSize) {
      const hashChunk = uniqueHashes.slice(i, i + chunkSize);
      
      // Build batch requests for this chunk
      const chunk = hashChunk.flatMap((hash, idx) => [
        { jsonrpc: '2.0', id: `receipt_${hash}`, method: 'eth_getTransactionReceipt', params: [hash] },
        { jsonrpc: '2.0', id: `tx_${hash}`, method: 'eth_getTransactionByHash', params: [hash] }
      ]);
      
      console.log(`[${chainConfig.name}] Fetching batch ${Math.floor(i/chunkSize) + 1}, ${hashChunk.length} txs`);
      
      const batchResponse = await axios.post(chainConfig.rpcUrl, chunk);
      
      const results = Array.isArray(batchResponse.data) ? batchResponse.data : [batchResponse.data];
      
      // Build lookup map by id
      const resultMap: Record<string, any> = {};
      for (const r of results) {
        if (r.id) resultMap[r.id] = r.result;
      }
      
      // Process each hash
      for (const hash of hashChunk) {
        const receipt = resultMap[`receipt_${hash}`];
        const tx = resultMap[`tx_${hash}`];
        
        if (receipt && tx) {
          const transfer = transfers.find(t => t.hash === hash);
          const timestamp = transfer?.metadata?.blockTimestamp 
            ? new Date(transfer.metadata.blockTimestamp).getTime() / 1000 
            : 0;
          
          transactions.push({
            hash,
            from: tx.from,
            to: tx.to,
            value: tx.value,
            gasUsed: receipt.gasUsed,
            gasPrice: receipt.effectiveGasPrice || tx.gasPrice,
            timestamp,
            blockNumber: parseInt(receipt.blockNumber, 16)
          });
        }
      }
      
      // Small delay between chunks
      if (i + chunkSize < uniqueHashes.length) {
        await new Promise(r => setTimeout(r, 50));
      }
    }
    
    console.log(`[${chainConfig.name}] Processed ${transactions.length} transactions`);
  } catch (error) {
    console.error(`Error fetching transactions for ${chainConfig.name}:`, error);
  }
  
  return transactions;
}

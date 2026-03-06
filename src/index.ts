import express from 'express';
import cors from 'cors';
import { readFileSync } from 'fs';
import { join } from 'path';
import { paymentMiddleware, x402ResourceServer } from '@x402/express';
import { HTTPFacilitatorClient } from '@x402/core/server';
import { ExactEvmScheme } from '@x402/evm/exact/server';
import { config } from './config';
import gasSpentRouter from './routes/gas-spent';

const app = express();

// Payment configuration
const PAYMENT_CONFIG = {
  // Base mainnet (8453) via PayAI facilitator
  network: (process.env.X402_NETWORK || 'eip155:8453') as `eip155:${string}`,
  // Receiving wallet
  payTo: (process.env.X402_PAY_TO || '0x7a767604FCd33fDc6eCA1775CBe4e66fDb5c0e79') as `0x${string}`,
  // Price per request ($0.05)
  price: process.env.X402_PRICE || '$0.05',
  // Enable/disable payments
  enabled: process.env.X402_ENABLED !== 'false',
};

// Middleware
app.use(cors());
app.use(express.json());

// Health check (free)
app.get('/health', (req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

// Serve frontend HTML (free)
app.get('/', (req, res) => {
  try {
    const frontendPath = join(process.cwd(), 'frontend', 'index.html');
    const html = readFileSync(frontendPath, 'utf-8');
    res.type('html').send(html);
  } catch {
    // Fallback to JSON API info
    res.json({
      name: 'Gas Spent Tracker API',
      version: '1.0.0',
      description: 'Track wallet gas consumption across chains',
      payment: PAYMENT_CONFIG.enabled ? {
        protocol: 'x402',
        price: PAYMENT_CONFIG.price,
        network: 'Base (USDC)',
        info: 'Endpoints require payment via x402 protocol'
      } : { info: 'Payments disabled' },
      endpoints: {
        'POST /v1/gas-spent': 'Calculate total gas spent by a wallet',
        'GET /v1/gas-spent/:address': 'Convenience GET endpoint',
      },
      supportedChains: Object.keys(config.chains)
    });
  }
});

// Agent discovery endpoint (free)
app.get('/.well-known/agent.json', (req, res) => {
  res.json({
    name: 'Gas Tracker',
    version: '1.0.0',
    description: 'Track wallet gas consumption across EVM chains. Get per-chain breakdowns, USD totals, and fun verdicts on your gas spending.',
    url: 'https://demos.zeh.app/gas-tracker',
    payment: {
      network: PAYMENT_CONFIG.network,
      address: PAYMENT_CONFIG.payTo,
      facilitator: process.env.X402_FACILITATOR_URL || 'https://facilitator.payai.network',
    },
    endpoints: [
      {
        method: 'POST',
        path: '/v1/gas-spent',
        description: 'Calculate total gas spent by a wallet across chains',
        price: PAYMENT_CONFIG.price,
        input: {
          address: 'string (required) - Ethereum address',
          chains: 'array (optional) - Chain names to query (ethereum, base, arbitrum, optimism, polygon)',
        },
        output: {
          chains: 'object - Per-chain breakdown keyed by chain name, each with its own verdict',
          summary: 'object - Total USD and transaction count',
          verdict: 'object - Overall verdict based on lifetime total',
        },
      },
      {
        method: 'GET',
        path: '/health',
        description: 'Health check',
        price: 'free',
      },
    ],
    supportedChains: Object.keys(config.chains),
    tags: ['gas', 'ethereum', 'tracker', 'evm', 'x402', 'analytics'],
    author: 'Zeh',
    repository: 'https://github.com/Catorpilor/gas-tracker',
  });
});

// x402 Payment Middleware
if (PAYMENT_CONFIG.enabled) {
  const facilitatorClient = new HTTPFacilitatorClient({ 
    url: process.env.X402_FACILITATOR_URL || 'https://facilitator.payai.network' 
  });
  
  const resourceServer = new x402ResourceServer(facilitatorClient)
    .register(PAYMENT_CONFIG.network, new ExactEvmScheme());

  const paywallConfig = {
    appName: 'Gas Tracker',
    testnet: false,
  };

  app.use(
    paymentMiddleware(
      {
        'POST /v1/gas-spent': {
          accepts: {
            scheme: 'exact' as const,
            price: PAYMENT_CONFIG.price,
            network: PAYMENT_CONFIG.network,
            payTo: PAYMENT_CONFIG.payTo,
          },
          description: 'Calculate total gas spent by a wallet across chains',
          mimeType: 'application/json',
          extensions: {
            bazaar: {
              discoverable: true,
              inputSchema: {
                body: {
                  address: {
                    type: 'string',
                    description: 'Ethereum wallet address (0x...)',
                    required: true,
                  },
                  chains: {
                    type: 'array',
                    description: 'Optional list of chains to query (ethereum, base, arbitrum, optimism, polygon). Defaults to all.',
                    required: false,
                  },
                },
              },
              outputSchema: {
                type: 'object',
                properties: {
                  ok: { type: 'boolean', description: 'Request success status' },
                  data: {
                    type: 'object',
                    properties: {
                      address: { type: 'string', description: 'Normalized wallet address' },
                      chains: { 
                        type: 'object', 
                        description: 'Per-chain breakdown with gas used, USD spent, tx count, and verdict' 
                      },
                      summary: {
                        type: 'object',
                        properties: {
                          totalUsd: { type: 'number', description: 'Total USD spent on gas across all chains' },
                          totalTransactions: { type: 'number', description: 'Total transaction count' },
                        },
                      },
                      verdict: {
                        type: 'object',
                        description: 'Fun verdict based on total spend (emoji, title, message, comparison)',
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      resourceServer,
      paywallConfig,
    ),
  );
  
  console.log(`💰 x402 payments enabled: ${PAYMENT_CONFIG.price} per request`);
  console.log(`   Network: ${PAYMENT_CONFIG.network}`);
  console.log(`   Pay to: ${PAYMENT_CONFIG.payTo}`);
}

// Routes
app.use('/v1/gas-spent', gasSpentRouter);

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ ok: false, error: 'Internal server error' });
});

// Start server
app.listen(config.port, () => {
  console.log(`🔥 Gas Tracker API running on port ${config.port}`);
  console.log(`📊 Supported chains: ${Object.keys(config.chains).join(', ')}`);
  console.log(`🔗 Health: http://localhost:${config.port}/health`);
});

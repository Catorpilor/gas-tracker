import express from 'express';
import cors from 'cors';
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

// API info (free)
app.get('/', (req, res) => {
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
      'POST /v1/gas-spent': {
        description: 'Calculate total gas spent by a wallet',
        price: PAYMENT_CONFIG.price,
        body: {
          address: 'string (required) - Ethereum address',
          chains: 'string[] (optional) - Chains to query. Default: all'
        },
        example: {
          address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
          chains: ['ethereum', 'base', 'arbitrum']
        }
      },
      'GET /v1/gas-spent/:address': {
        description: 'Convenience GET endpoint',
        price: PAYMENT_CONFIG.price,
        queryParams: {
          chains: 'string (optional) - Comma-separated chain names'
        }
      }
    },
    supportedChains: Object.keys(config.chains)
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
        },
        'GET /v1/gas-spent/*': {
          accepts: {
            scheme: 'exact' as const,
            price: PAYMENT_CONFIG.price,
            network: PAYMENT_CONFIG.network,
            payTo: PAYMENT_CONFIG.payTo,
          },
          description: 'Get gas spent by a wallet',
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

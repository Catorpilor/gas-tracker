import express from 'express';
import cors from 'cors';
import { config } from './config';
import gasSpentRouter from './routes/gas-spent';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

// API info
app.get('/', (req, res) => {
  res.json({
    name: 'Gas Spent Tracker API',
    version: '1.0.0',
    description: 'Track wallet gas consumption across chains',
    endpoints: {
      'POST /v1/gas-spent': {
        description: 'Calculate total gas spent by a wallet',
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
        queryParams: {
          chains: 'string (optional) - Comma-separated chain names'
        }
      }
    },
    supportedChains: Object.keys(config.chains)
  });
});

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

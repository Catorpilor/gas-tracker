# Gas Spent Tracker - TaskMarket Submission

## Deliverables

### GitHub Repository
https://github.com/Catorpilor/gas-tracker

### Live Endpoint
https://demos.zeh.app/gas-tracker

---

## API Examples

### Health Check (Free)

```bash
curl https://demos.zeh.app/gas-tracker/health
```

Response:
```json
{"ok":true,"timestamp":"2026-03-06T09:45:49.329Z"}
```

### GET Root Info (Free)

```bash
curl https://demos.zeh.app/gas-tracker/
```

### POST /v1/gas-spent (Paid - $0.05 USDC via x402)

**Without payment (returns 402):**

```bash
curl -X POST https://demos.zeh.app/gas-tracker/v1/gas-spent \
  -H "Content-Type: application/json" \
  -d '{"address": "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"}'
```

Returns HTTP 402 with `Payment-Required` header containing x402 payment instructions.

**With x402 payment (via @x402/fetch):**

```typescript
import { wrapFetch } from '@x402/fetch';
import { x402Client, x402HTTPClient } from '@x402/core/client';
import { ExactEvmScheme } from '@x402/evm/exact/client';

const client = new x402Client()
  .register('eip155:84532', new ExactEvmScheme(wallet));

const fetch402 = wrapFetch(new x402HTTPClient(client));

const response = await fetch402('https://demos.zeh.app/gas-tracker/v1/gas-spent', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045' })
});

const data = await response.json();
console.log(data);
```

---

## Features Implemented

✅ **POST /v1/gas-spent** - Calculate total gas spent by a wallet
- Accepts wallet address
- Optional chain filter

✅ **Multi-chain support**
- Ethereum Mainnet
- Base
- Arbitrum
- Optimism  
- Polygon

✅ **Per-chain breakdown**
- Transaction count
- Total gas used
- Native token spent (ETH/MATIC)
- USD equivalent at time of transaction
- Average gas price (Gwei)
- Chain-specific verdict

✅ **Lifetime totals**
- Aggregate USD across all chains
- Total transaction count

✅ **Fun verdicts** with 12 tiers:
- 🌱 Grass Toucher ($0-1)
- 🐣 Baby Degen ($1-10)
- 🔥 Casual Burner ($10-50)
- 💸 Gas Guzzler ($50-100)
- 🚗 Road Trip Burner ($100-500)
- ✈️ Frequent Flyer ($500-1,000)
- 🏍️ Used Car Money ($1,000-5,000)
- 🚙 Car Payment Champion ($5,000-10,000)
- 🏠 Down Payment Destroyer ($10,000-50,000)
- 🛥️ Yacht Gas Money ($50,000-100,000)
- 🏰 Castle Builder ($100,000-500,000)
- 👑 Gas Royalty ($500,000+)

✅ **x402 Payment Protocol**
- HTTP 402 response with payment instructions
- USDC on Base Sepolia
- $0.05 per request

✅ **Tests** - 18 passing tests
- Gas calculation logic
- Verdict generation
- API endpoints
- Error handling

✅ **README with examples**

✅ **Docker deployment**

---

## Stack

- TypeScript / Bun
- Hono (HTTP framework)
- @lucid-agents/core, @lucid-agents/http, @lucid-agents/payments
- Alchemy SDK (blockchain data)
- Zod (validation)
- Docker

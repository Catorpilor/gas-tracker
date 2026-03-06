# Gas Spent Tracker API 🔥

Track wallet gas consumption across multiple EVM chains. Get per-chain breakdowns, USD totals, and fun verdicts like *"You have burned enough gas to buy a used car."*

## Features

- **Multi-chain support**: Ethereum, Base, Arbitrum, Optimism, Polygon
- **Per-chain breakdown**: Gas used, native token spent, USD equivalent
- **Lifetime totals**: Aggregate across all chains
- **Fun verdicts**: Witty comparisons based on total spend
- **Simple API**: POST an address, get results

## Quick Start

### Prerequisites

- Node.js 20+
- Alchemy API key ([get one free](https://dashboard.alchemy.com/))

### Local Development

```bash
# Install dependencies
npm install

# Configure
cp .env.example .env
# Edit .env and add your ALCHEMY_API_KEY

# Run in development
npm run dev
```

### Docker Deployment

```bash
# Configure
cp .env.example .env
# Edit .env with your settings

# Build and run
docker-compose up -d

# View logs
docker-compose logs -f
```

## API Reference

### POST /v1/gas-spent

Calculate total gas spent by a wallet.

**Request:**

```json
{
  "address": "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
  "chains": ["ethereum", "base", "arbitrum"]  // optional, defaults to all
}
```

**Response:**

```json
{
  "ok": true,
  "data": {
    "address": "0xd8da6bf26964af9d7eed9e03e53415d37aa96045",
    "chains": [
      {
        "chain": "Ethereum",
        "chainId": 1,
        "transactionCount": 847,
        "totalGasUsed": "125847392",
        "totalGasSpentNative": "2.458392",
        "totalGasSpentUsd": 4892.45,
        "avgGasPriceGwei": 45.23
      },
      {
        "chain": "Base",
        "chainId": 8453,
        "transactionCount": 124,
        "totalGasUsed": "8234567",
        "totalGasSpentNative": "0.012847",
        "totalGasSpentUsd": 25.58,
        "avgGasPriceGwei": 0.15
      }
    ],
    "summary": {
      "totalUsd": 4918.03,
      "totalTransactions": 971,
      "generatedAt": "2026-03-06T08:45:00.000Z"
    },
    "verdict": {
      "emoji": "🏍️",
      "title": "Used Car Money",
      "message": "You've burned enough gas to buy a used car. Literally. That's a lot of clicking.",
      "comparison": "a decent used motorcycle",
      "formatted": "🏍️ Used Car Money\n\n\"You've burned enough gas to buy a used car. Literally. That's a lot of clicking.\"\n\nYou spent $4,918 on gas — that's roughly a decent used motorcycle."
    }
  }
}
```

### GET /v1/gas-spent/:address

Convenience endpoint for quick lookups.

```bash
curl "https://gas-tracker.demos.zeh.app/v1/gas-spent/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045?chains=ethereum,base"
```

### Supported Chains

| Chain | ID | Native Token |
|-------|-----|--------------|
| ethereum | 1 | ETH |
| base | 8453 | ETH |
| arbitrum | 42161 | ETH |
| optimism | 10 | ETH |
| polygon | 137 | MATIC |

## Configuration

| Variable | Required | Description |
|----------|----------|-------------|
| `ALCHEMY_API_KEY` | Yes | Your Alchemy API key |
| `PORT` | No | Server port (default: 3000) |
| `ALCHEMY_ETH_URL` | No | Override ETH mainnet RPC |
| `ALCHEMY_BASE_URL` | No | Override Base RPC |
| `ALCHEMY_ARB_URL` | No | Override Arbitrum RPC |
| `ALCHEMY_OPT_URL` | No | Override Optimism RPC |
| `ALCHEMY_POLY_URL` | No | Override Polygon RPC |
| `DOMAIN` | No | Domain for Caddy (docker-compose) |

## Verdict Tiers

| USD Range | Title |
|-----------|-------|
| $0-1 | 🌱 Grass Toucher |
| $1-10 | 🐣 Baby Degen |
| $10-50 | 🔥 Casual Burner |
| $50-100 | 💸 Gas Guzzler |
| $100-500 | 🚗 Road Trip Burner |
| $500-1,000 | ✈️ Frequent Flyer |
| $1,000-5,000 | 🏍️ Used Car Money |
| $5,000-10,000 | 🚙 Car Payment Champion |
| $10,000-50,000 | 🏠 Down Payment Destroyer |
| $50,000-100,000 | 🛥️ Yacht Gas Money |
| $100,000-500,000 | 🏰 Castle Builder |
| $500,000+ | 👑 Gas Royalty |

## License

MIT

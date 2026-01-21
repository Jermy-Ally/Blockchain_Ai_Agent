# Testing On-Chain Payment Mode

This guide will help you set up and test the on-chain payment mode with real Solana devnet transactions.

## ⚠️ Important Notes

- **ONLY use devnet for testing** - Never use mainnet with test wallets
- **Devnet SOL has no real value** - It's free test currency
- **Never commit your private key to git** - Keep it in `.env` only (not `.env.example`)

## Step-by-Step Setup

### 1. Generate a Test Wallet

Run the setup script to generate a new test wallet:

```bash
cd Blockchain_ai_agent
node setup-test-wallet.js
```

This will generate:
- A new Solana keypair
- The public key (wallet address)
- The private key (base58 encoded)

### 2. Update Your `.env` File

Copy the output from step 1 and add it to your `.env` file:

```env
# Payment Configuration
PAYMENT_MODE=onchain

# Agent Configuration
AGENT_WALLET_ADDRESS=YOUR_GENERATED_PUBLIC_KEY_HERE
AGENT_PRIVATE_KEY=YOUR_GENERATED_PRIVATE_KEY_HERE

# Network Configuration (use devnet for testing)
SOLANA_RPC_URL=https://api.devnet.solana.com
NETWORK=solana
```

### 3. Fund Your Wallet

You need devnet SOL to pay for transaction fees. Get free devnet SOL from:

**Option A: Web Faucet**
- Visit: https://faucet.solana.com/
- Enter your `AGENT_WALLET_ADDRESS`
- Request 2 SOL (enough for testing)

**Option B: CLI (if you have Solana CLI installed)**
```bash
solana airdrop 2 YOUR_AGENT_WALLET_ADDRESS --url devnet
```

### 4. Verify Your Balance

Check that your wallet has funds:
```bash
solana balance YOUR_AGENT_WALLET_ADDRESS --url devnet
```

Or check on the frontend dashboard - it should show your balance.

### 5. Start the Backend

```bash
npm run dev
```

You should see in the logs:
```
Agent keypair loaded for on-chain transactions
BlockchainService initialized in onchain mode for solana
Current balance: X SOL
```

### 6. Test a Service Request

1. Open the frontend: http://localhost:5173
2. Go to the Services tab
3. Select a service (e.g., "Market Analysis")
4. Click "Submit Request"
5. Check the result - you should see:
   - `paymentMode: "onchain"` in the result
   - A real Solana transaction signature (not `sim_...`)
   - Transaction hash looks like: `5kXw...` (base58 string)

### 7. Verify Transaction on Solana Explorer

1. Copy the transaction hash from the service result
2. Visit: https://explorer.solana.com/?cluster=devnet
3. Paste the transaction hash in the search box
4. You should see:
   - Transaction details
   - Status: Success/Confirmed
   - Amount transferred
   - Block timestamp

## What Happens in On-Chain Mode

When `PAYMENT_MODE=onchain`:

1. **Real Transactions**: Every service request creates a real Solana transaction on devnet
2. **Transaction Fees**: Each transaction costs ~0.000005 SOL (very small on devnet)
3. **Transaction Signing**: The agent's private key signs transactions (for testing)
4. **Verification**: Transactions are verified on-chain before service execution

## Troubleshooting

### Error: "Agent keypair not available"
- Check that `AGENT_PRIVATE_KEY` is set in `.env`
- Ensure it's base58 encoded (from `setup-test-wallet.js`)

### Error: "Insufficient balance"
- Fund your wallet with devnet SOL
- Check balance: `solana balance YOUR_ADDRESS --url devnet`

### Error: "Transaction failed"
- Check your internet connection
- Verify `SOLANA_RPC_URL` points to devnet
- Check Solana devnet status: https://status.solana.com/

### Transaction shows in result but not on explorer
- Wait a few seconds - blockchains take time to confirm
- Check you're looking at devnet explorer (not mainnet)
- Transaction might be pending

## Differences: Simulated vs On-Chain

| Feature | Simulated | On-Chain |
|---------|-----------|----------|
| Real transactions | ❌ No | ✅ Yes |
| Transaction fees | ❌ No | ✅ Yes (~0.000005 SOL) |
| Blockchain confirmation | ❌ No | ✅ Yes |
| Explorer verification | ❌ No | ✅ Yes |
| Test speed | ⚡ Fast | 🐢 Slower (waits for confirmation) |
| Network required | ❌ No | ✅ Yes |

## Next Steps

Once on-chain mode is working:

1. Test all three services (Market Analysis, Trading Strategy, Data Aggregation)
2. Monitor transaction history on Solana Explorer
3. Check earnings tracking (should reflect real transactions)
4. Test sub-agent spawning (when threshold is met)

## Production Considerations

For production/mainnet:

1. **Use a Hardware Wallet**: Never store mainnet private keys in `.env`
2. **Implement Facilitator**: Use Dexter.cash facilitator for user payments
3. **User Wallet Integration**: Users sign transactions from their own wallets
4. **Security Audit**: Get code audited before handling real funds
5. **Transaction Monitoring**: Implement proper error handling and retries

---

**Ready to test?** Run `node setup-test-wallet.js` and follow the steps above!

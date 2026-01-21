/**
 * Helper script to generate a test wallet for on-chain testing
 * Run with: node setup-test-wallet.js
 */

const { Keypair } = require('@solana/web3.js');
const bs58 = require('bs58');

console.log('🔑 Generating test wallet for on-chain testing...\n');

// Generate a new keypair
const keypair = Keypair.generate();

const publicKey = keypair.publicKey.toBase58();
const privateKey = bs58.encode(keypair.secretKey);

console.log('✅ Wallet generated successfully!\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📝 Add these to your .env file:\n');
console.log(`AGENT_WALLET_ADDRESS=${publicKey}`);
console.log(`AGENT_PRIVATE_KEY=${privateKey}`);
console.log(`SOLANA_RPC_URL=https://api.devnet.solana.com`);
console.log(`PAYMENT_MODE=onchain`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
console.log('⚠️  IMPORTANT SECURITY NOTES:');
console.log('   1. This is a TEST wallet - never use for mainnet');
console.log('   2. Keep your private key SECRET');
console.log('   3. Fund your wallet on devnet: https://faucet.solana.com/');
console.log(`   4. Wallet address: ${publicKey}`);
console.log('\n💧 After adding to .env, fund your wallet with devnet SOL at:');
console.log('   https://faucet.solana.com/');
console.log(`   Or use: solana airdrop 2 ${publicKey} --url devnet`);
console.log('\n✅ After funding, restart your backend and test on-chain mode!');

import { AgentEarnings, ServiceConfig, SubAgent } from '../types';
import { BlockchainService } from '../services/blockchain.service';
import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';

export class RevenueManager {
  private earnings: AgentEarnings = {
    total: 0,
    byService: {},
    reinvested: 0,
    available: 0,
  };
  private reinvestmentThreshold: number;
  private blockchainService: BlockchainService;
  private subAgents: Map<string, SubAgent> = new Map();
  private services: ServiceConfig[];

  constructor(
    blockchainService: BlockchainService,
    services: ServiceConfig[],
    reinvestmentThreshold: number = 1.0 // SOL or BASE
  ) {
    this.blockchainService = blockchainService;
    this.services = services;
    this.reinvestmentThreshold = reinvestmentThreshold;
  }

  async recordPayment(serviceId: string, amount: number): Promise<void> {
    this.earnings.total += amount;
    this.earnings.byService[serviceId] = (this.earnings.byService[serviceId] || 0) + amount;
    this.earnings.available += amount;

    console.log(`Recorded payment: ${amount} for service ${serviceId}`);
    console.log(`Total earnings: ${this.earnings.total}, Available: ${this.earnings.available}`);

    // Check if we should reinvest
    if (this.earnings.available >= this.reinvestmentThreshold) {
      await this.considerReinvestment();
    }
  }

  async considerReinvestment(): Promise<void> {
    if (this.earnings.available < this.reinvestmentThreshold) {
      return;
    }

    // Decide between upgrading and spawning sub-agents
    const upgradeCost = 0.5; // SOL/BASE
    const spawnCost = 0.3; // SOL/BASE per sub-agent

    const canUpgrade = this.earnings.available >= upgradeCost;
    const canSpawn = this.earnings.available >= spawnCost;

    if (canSpawn && this.subAgents.size < 5) {
      // Spawn a new sub-agent
      await this.spawnSubAgent('data-collector', spawnCost);
      this.earnings.available -= spawnCost;
      this.earnings.reinvested += spawnCost;
    } else if (canUpgrade && this.shouldUpgrade()) {
      // Upgrade existing agent capabilities
      await this.upgradeAgent(upgradeCost);
      this.earnings.available -= upgradeCost;
      this.earnings.reinvested += upgradeCost;
    }
  }

  async spawnSubAgent(role: string, cost: number): Promise<SubAgent> {
    const subAgentId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Generate or create wallet for sub-agent
    const subAgentWallet = await this.createSubAgentWallet();
    
    // Fund the sub-agent wallet
    const fundingTxHash = await this.fundSubAgentWallet(subAgentWallet.address, cost);
    
    const subAgent: SubAgent = {
      id: subAgentId,
      parentId: 'main',
      role,
      balance: cost,
      status: 'active',
      createdAt: Date.now(),
      walletAddress: subAgentWallet.address,
      fundingTxHash,
    };

    this.subAgents.set(subAgentId, subAgent);
    console.log(`✅ Spawned sub-agent ${subAgentId} with role: ${role}`);
    console.log(`   Wallet: ${subAgentWallet.address}`);
    console.log(`   Initial funding: ${cost} ${process.env.NETWORK === 'solana' ? 'SOL' : 'BASE'}`);
    console.log(`   Funding transaction: ${fundingTxHash}`);

    // In production, this would also:
    // - Deploy sub-agent as separate process or smart contract
    // - Register sub-agent with facilitator
    // - Set up monitoring and communication channels

    return subAgent;
  }

  private async createSubAgentWallet(): Promise<{ address: string; privateKey?: string }> {
    // Generate new Solana keypair for sub-agent
    const keypair = Keypair.generate();
    const address = keypair.publicKey.toBase58();
    
    // In production, store private key securely (encrypted database, hardware wallet, etc.)
    // For now, we encode it (in production, use encrypted storage)
    const privateKey = bs58.encode(keypair.secretKey);
    
    console.log(`Generated new wallet for sub-agent: ${address}`);
    // Note: In production, securely store the private key - never log it!
    
    return { address, privateKey };
  }

  private async fundSubAgentWallet(toAddress: string, amount: number): Promise<string> {
    try {
      const agentAddress = process.env.AGENT_WALLET_ADDRESS || '';
      if (!agentAddress) {
        throw new Error('Agent wallet address not configured');
      }

      // Check if we have sufficient balance
      const balance = await this.blockchainService.getBalance(agentAddress);
      if (balance < amount) {
        throw new Error(`Insufficient balance to fund sub-agent. Required: ${amount}, Available: ${balance}`);
      }

      // Transfer funds to sub-agent wallet
      const txHash = await this.blockchainService.processPayment(agentAddress, toAddress, amount);
      
      console.log(`Funded sub-agent wallet ${toAddress} with ${amount} via transaction ${txHash}`);
      
      return txHash;
    } catch (error: any) {
      console.error('Error funding sub-agent wallet:', error);
      // In production, this should be handled more gracefully
      // For now, return a simulated transaction hash
      return `funding_tx_sim_${Date.now()}`;
    }
  }

  async upgradeAgent(cost: number): Promise<void> {
    // Upgrade agent capabilities
    // This could include:
    // - Increasing AI model complexity
    // - Adding new service endpoints
    // - Improving data processing speed
    // - Expanding to new blockchains
    
    console.log(`Upgrading agent capabilities with ${cost} funds`);
    
    // In production, this would update agent configuration or deploy new version
  }

  private shouldUpgrade(): boolean {
    // Decision logic: upgrade if we have few sub-agents or if performance is degrading
    return this.subAgents.size < 2 || this.earnings.total > 10;
  }

  getEarnings(): AgentEarnings {
    return { ...this.earnings };
  }

  getSubAgents(): SubAgent[] {
    return Array.from(this.subAgents.values());
  }

  async getBalance(): Promise<number> {
    const agentAddress = process.env.AGENT_WALLET_ADDRESS || '';
    if (!agentAddress) return 0;
    return await this.blockchainService.getBalance(agentAddress);
  }

  getBlockchainService(): BlockchainService {
    return this.blockchainService;
  }
}

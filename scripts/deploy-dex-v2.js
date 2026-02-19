#!/usr/bin/env node
'use strict';

// where/what/why:
// - where: Uniswap V2 fork workspace root
// - what: deploy WETH9, UniswapV2Factory, UniswapV2Router02 to an EVM chain
// - why: provide a minimal and reproducible path to bring up a usable DEX safely

const fs = require('fs');
const path = require('path');
const { Wallet, providers, ContractFactory, Contract, utils } = require('../v2-periphery/node_modules/ethers');

const ROOT_DIR = path.resolve(__dirname, '..');
const DEFAULT_OUTPUT = path.join(ROOT_DIR, 'docs', 'deployments', 'latest-testnet.json');

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env: ${name}`);
  }
  return value;
}

function loadArtifact(artifactPath) {
  const fullPath = path.join(ROOT_DIR, artifactPath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Artifact not found: ${artifactPath}. Run compile first.`);
  }
  const artifact = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
  if (!artifact.abi || !artifact.bytecode) {
    throw new Error(`Invalid artifact: ${artifactPath}`);
  }
  return artifact;
}

function buildTxOverrides() {
  const overrides = {};
  const gasPriceGwei = process.env.GAS_PRICE_GWEI;
  if (!gasPriceGwei) {
    return overrides;
  }
  overrides.gasPrice = utils.parseUnits(gasPriceGwei, 'gwei');

  const gasLimitRaw = process.env.GAS_LIMIT;
  if (gasLimitRaw) {
    const gasLimit = Number(gasLimitRaw);
    if (!Number.isInteger(gasLimit) || gasLimit <= 0) {
      throw new Error('GAS_LIMIT must be a positive integer');
    }
    overrides.gasLimit = gasLimit;
  }
  return overrides;
}

async function deploy(name, artifact, wallet, args, txOverrides) {
  const factory = new ContractFactory(artifact.abi, artifact.bytecode, wallet);
  const contract = await factory.deploy(...args, txOverrides);
  const txHash = contract.deployTransaction.hash;
  console.log(`[deploy:${name}] tx=${txHash}`);

  const provider = wallet.provider;
  if (!provider) {
    throw new Error('Wallet provider is missing');
  }

  let receipt = null;
  for (let i = 0; i < 180; i += 1) {
    receipt = await provider.send('eth_getTransactionReceipt', [txHash]);
    if (receipt) {
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  if (!receipt) {
    throw new Error(`Deployment timeout for ${name}: ${txHash}`);
  }
  if (receipt.status !== '0x1') {
    throw new Error(`Deployment reverted for ${name}: ${txHash}`);
  }
  if (!receipt.contractAddress) {
    throw new Error(`No contractAddress in receipt for ${name}: ${txHash}`);
  }

  console.log(`[deployed:${name}] address=${receipt.contractAddress}`);
  return new Contract(receipt.contractAddress, artifact.abi, wallet);
}

async function main() {
  const confirm = process.env.CONFIRM_DEPLOY;
  if (confirm !== 'YES') {
    throw new Error('Set CONFIRM_DEPLOY=YES to proceed.');
  }

  const rpcUrl = requiredEnv('RPC_URL');
  const privateKey = requiredEnv('PRIVATE_KEY');
  const feeToSetter = requiredEnv('FEE_TO_SETTER');
  const expectedChainIdRaw = requiredEnv('EXPECTED_CHAIN_ID');
  const outputPath = process.env.DEPLOY_OUTPUT || DEFAULT_OUTPUT;

  const expectedChainId = Number(expectedChainIdRaw);
  if (!Number.isInteger(expectedChainId) || expectedChainId <= 0) {
    throw new Error('EXPECTED_CHAIN_ID must be a positive integer');
  }

  const provider = new providers.JsonRpcProvider(rpcUrl);
  const network = await provider.getNetwork();
  if (network.chainId !== expectedChainId) {
    throw new Error(`Chain ID mismatch: expected ${expectedChainId}, got ${network.chainId}`);
  }

  const wallet = new Wallet(privateKey, provider);
  const balance = await wallet.getBalance();
  if (balance.isZero()) {
    throw new Error(`Deployer has zero balance: ${wallet.address}`);
  }

  console.log(`[network] chainId=${network.chainId}`);
  console.log(`[deployer] address=${wallet.address}`);
  console.log(`[feeToSetter] address=${feeToSetter}`);
  if (process.env.GAS_PRICE_GWEI) {
    console.log(`[gasPrice] ${process.env.GAS_PRICE_GWEI} gwei`);
  }
  if (process.env.GAS_LIMIT) {
    console.log(`[gasLimit] ${process.env.GAS_LIMIT}`);
  }

  const wethArtifact = loadArtifact('v2-periphery/build/WETH9.json');
  const factoryArtifact = loadArtifact('v2-core/build/UniswapV2Factory.json');
  const routerArtifact = loadArtifact('v2-periphery/build/UniswapV2Router02.json');
  const txOverrides = buildTxOverrides();

  const weth = await deploy('WETH9', wethArtifact, wallet, [], txOverrides);
  const factory = await deploy('UniswapV2Factory', factoryArtifact, wallet, [feeToSetter], txOverrides);
  const router02 = await deploy('UniswapV2Router02', routerArtifact, wallet, [factory.address, weth.address], txOverrides);

  const routerFactory = await router02.factory();
  const routerWeth = await router02.WETH();
  if (routerFactory.toLowerCase() !== factory.address.toLowerCase()) {
    throw new Error('Router factory mismatch after deployment');
  }
  if (routerWeth.toLowerCase() !== weth.address.toLowerCase()) {
    throw new Error('Router WETH mismatch after deployment');
  }

  const result = {
    chainId: network.chainId,
    deployer: wallet.address,
    feeToSetter,
    weth: weth.address,
    factory: factory.address,
    router02: router02.address,
    deployedAt: new Date().toISOString(),
  };

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  console.log(`[output] ${outputPath}`);
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(`[error] ${error.message}`);
  process.exit(1);
});

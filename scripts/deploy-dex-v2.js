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

function requiredEnv(name, env = process.env) {
  const value = env[name];
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

function buildTxOverrides(env = process.env, parseUnits = utils.parseUnits) {
  const overrides = {};
  const gasPriceGwei = env.GAS_PRICE_GWEI;
  if (!gasPriceGwei) {
    return overrides;
  }

  overrides.gasPrice = parseUnits(gasPriceGwei, 'gwei');

  const gasLimitRaw = env.GAS_LIMIT;
  if (gasLimitRaw) {
    const gasLimit = Number(gasLimitRaw);
    if (!Number.isInteger(gasLimit) || gasLimit <= 0) {
      throw new Error('GAS_LIMIT must be a positive integer');
    }
    overrides.gasLimit = gasLimit;
  }

  return overrides;
}

async function deploy(name, artifact, wallet, args, txOverrides, sleepFn = (ms) => new Promise((resolve) => setTimeout(resolve, ms))) {
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
    await sleepFn(2000);
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

async function runDeployDex(deps = {}, env = process.env) {
  const log = deps.log || console.log;
  const loadArtifactFn = deps.loadArtifact || loadArtifact;
  const deployFn = deps.deploy || deploy;
  const providerFactory = deps.providerFactory || ((rpcUrl) => new providers.JsonRpcProvider(rpcUrl));
  const walletFactory = deps.walletFactory || ((privateKey, provider) => new Wallet(privateKey, provider));
  const nowIso = deps.nowIso || (() => new Date().toISOString());

  const confirm = env.CONFIRM_DEPLOY;
  if (confirm !== 'YES') {
    throw new Error('Set CONFIRM_DEPLOY=YES to proceed.');
  }

  const rpcUrl = requiredEnv('RPC_URL', env);
  const privateKey = requiredEnv('PRIVATE_KEY', env);
  const feeToSetter = requiredEnv('FEE_TO_SETTER', env);
  const expectedChainIdRaw = requiredEnv('EXPECTED_CHAIN_ID', env);
  const outputPath = env.DEPLOY_OUTPUT || DEFAULT_OUTPUT;

  const expectedChainId = Number(expectedChainIdRaw);
  if (!Number.isInteger(expectedChainId) || expectedChainId <= 0) {
    throw new Error('EXPECTED_CHAIN_ID must be a positive integer');
  }

  const provider = deps.provider || providerFactory(rpcUrl);
  const network = await provider.getNetwork();
  if (network.chainId !== expectedChainId) {
    throw new Error(`Chain ID mismatch: expected ${expectedChainId}, got ${network.chainId}`);
  }

  const wallet = deps.wallet || walletFactory(privateKey, provider);
  const balance = await wallet.getBalance();
  if (balance.isZero()) {
    throw new Error(`Deployer has zero balance: ${wallet.address}`);
  }

  log(`[network] chainId=${network.chainId}`);
  log(`[deployer] address=${wallet.address}`);
  log(`[feeToSetter] address=${feeToSetter}`);
  if (env.GAS_PRICE_GWEI) {
    log(`[gasPrice] ${env.GAS_PRICE_GWEI} gwei`);
  }
  if (env.GAS_LIMIT) {
    log(`[gasLimit] ${env.GAS_LIMIT}`);
  }

  const wethArtifact = loadArtifactFn('v2-periphery/build/WETH9.json');
  const factoryArtifact = loadArtifactFn('v2-core/build/UniswapV2Factory.json');
  const routerArtifact = loadArtifactFn('v2-periphery/build/UniswapV2Router02.json');
  const txOverrides = buildTxOverrides(env, deps.parseUnits || utils.parseUnits);

  const weth = await deployFn('WETH9', wethArtifact, wallet, [], txOverrides, deps.sleepFn);
  const factory = await deployFn('UniswapV2Factory', factoryArtifact, wallet, [feeToSetter], txOverrides, deps.sleepFn);
  const router02 = await deployFn('UniswapV2Router02', routerArtifact, wallet, [factory.address, weth.address], txOverrides, deps.sleepFn);

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
    deployedAt: nowIso(),
  };

  if (deps.writeOutput) {
    deps.writeOutput(outputPath, result);
  } else {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  }

  log(`[output] ${outputPath}`);
  log(JSON.stringify(result, null, 2));
  return result;
}

async function main() {
  await runDeployDex();
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`[error] ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  requiredEnv,
  loadArtifact,
  buildTxOverrides,
  deploy,
  runDeployDex,
};

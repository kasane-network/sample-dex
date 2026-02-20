#!/usr/bin/env node
'use strict';

// where/what/why:
// - where: Uniswap V2 fork workspace root
// - what: deploy Kasane test tokens (testETH/testUSDC) to an EVM chain
// - why: provide immediately swappable assets for Router02 smoke/use tests

const fs = require('fs');
const path = require('path');
const { Wallet, providers, ContractFactory, Contract, utils } = require('../v2-periphery/node_modules/ethers');

const ROOT_DIR = path.resolve(__dirname, '..');
const DEFAULT_OUTPUT = path.join(ROOT_DIR, 'docs', 'deployments', 'latest-testnet.tokens.json');

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

function parseWholeTokenAmount(value, decimals, envName, parseUnits = utils.parseUnits) {
  if (!/^\d+$/.test(value)) {
    throw new Error(`${envName} must be an integer string`);
  }
  return parseUnits(value, decimals);
}

function buildTxOverrides(env = process.env, parseUnits = utils.parseUnits) {
  const gasPriceGwei = env.GAS_PRICE_GWEI;
  if (!gasPriceGwei) {
    return {};
  }
  return { gasPrice: parseUnits(gasPriceGwei, 'gwei') };
}

async function deployToken(artifact, wallet, params, txOverrides, sleepFn = (ms) => new Promise((resolve) => setTimeout(resolve, ms))) {
  const factory = new ContractFactory(artifact.abi, artifact.bytecode, wallet);
  const token = await factory.deploy(
    params.name,
    params.symbol,
    params.decimals,
    params.totalSupplyRaw,
    params.recipient,
    txOverrides,
  );
  const txHash = token.deployTransaction.hash;
  console.log(`[deploy:${params.symbol}] tx=${txHash}`);

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
    throw new Error(`Deployment timeout for ${params.symbol}: ${txHash}`);
  }
  if (receipt.status !== '0x1') {
    throw new Error(`Deployment reverted for ${params.symbol}: ${txHash}`);
  }
  if (!receipt.contractAddress) {
    throw new Error(`No contractAddress in receipt for ${params.symbol}: ${txHash}`);
  }

  console.log(`[deployed:${params.symbol}] address=${receipt.contractAddress}`);
  return new Contract(receipt.contractAddress, artifact.abi, wallet);
}

async function runDeployTestTokens(deps = {}, env = process.env) {
  const log = deps.log || console.log;
  const loadArtifactFn = deps.loadArtifact || loadArtifact;
  const deployTokenFn = deps.deployToken || deployToken;
  const providerFactory = deps.providerFactory || ((rpcUrl) => new providers.JsonRpcProvider(rpcUrl));
  const walletFactory = deps.walletFactory || ((privateKey, provider) => new Wallet(privateKey, provider));
  const nowIso = deps.nowIso || (() => new Date().toISOString());

  const confirm = env.CONFIRM_DEPLOY;
  if (confirm !== 'YES') {
    throw new Error('Set CONFIRM_DEPLOY=YES to proceed.');
  }

  const rpcUrl = requiredEnv('RPC_URL', env);
  const privateKey = requiredEnv('PRIVATE_KEY', env);
  const expectedChainIdRaw = requiredEnv('EXPECTED_CHAIN_ID', env);
  const outputPath = env.TOKEN_OUTPUT || DEFAULT_OUTPUT;

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

  const recipient = env.TOKEN_RECIPIENT || wallet.address;
  try {
    utils.getAddress(recipient);
  } catch (_error) {
    throw new Error(`TOKEN_RECIPIENT is not a valid address: ${recipient}`);
  }

  const testEthWhole = env.TEST_ETH_SUPPLY || '1000000';
  const testUsdcWhole = env.TEST_USDC_SUPPLY || '1000000000';
  const parseUnits = deps.parseUnits || utils.parseUnits;
  const testEthRaw = parseWholeTokenAmount(testEthWhole, 18, 'TEST_ETH_SUPPLY', parseUnits);
  const testUsdcRaw = parseWholeTokenAmount(testUsdcWhole, 6, 'TEST_USDC_SUPPLY', parseUnits);

  log(`[network] chainId=${network.chainId}`);
  log(`[deployer] address=${wallet.address}`);
  log(`[recipient] address=${recipient}`);
  if (env.GAS_PRICE_GWEI) {
    log(`[gasPrice] ${env.GAS_PRICE_GWEI} gwei`);
  }

  const artifact = loadArtifactFn('v2-periphery/build/KasaneTestERC20.json');
  const txOverrides = buildTxOverrides(env, parseUnits);
  const testEth = await deployTokenFn(artifact, wallet, {
    name: 'Kasane Test Ether',
    symbol: 'testETH',
    decimals: 18,
    totalSupplyRaw: testEthRaw,
    recipient,
  }, txOverrides, deps.sleepFn);
  const testUsdc = await deployTokenFn(artifact, wallet, {
    name: 'Kasane Test USD Coin',
    symbol: 'testUSDC',
    decimals: 6,
    totalSupplyRaw: testUsdcRaw,
    recipient,
  }, txOverrides, deps.sleepFn);

  const result = {
    chainId: network.chainId,
    deployer: wallet.address,
    recipient,
    testETH: {
      address: testEth.address,
      symbol: 'testETH',
      decimals: 18,
      wholeSupply: testEthWhole,
    },
    testUSDC: {
      address: testUsdc.address,
      symbol: 'testUSDC',
      decimals: 6,
      wholeSupply: testUsdcWhole,
    },
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
  await runDeployTestTokens();
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
  parseWholeTokenAmount,
  buildTxOverrides,
  deployToken,
  runDeployTestTokens,
};

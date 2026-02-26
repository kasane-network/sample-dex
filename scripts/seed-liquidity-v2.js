#!/usr/bin/env node
'use strict';

// where/what/why:
// - where: Uniswap V2 fork workspace root
// - what: create (if missing) a V2 pair and add initial liquidity through Router02
// - why: ensure required routing pairs (e.g. WICP-testUSDC / WICP-tes) exist for swaps
// - tx baseline: see docs/kasane_tx_baseline.md before sending on Kasane

const fs = require('fs');
const path = require('path');
const { Wallet, providers, Contract, utils, constants } = require('ethers');

const ROOT_DIR = path.resolve(__dirname, '..');
const DEFAULT_OUTPUT = path.join(ROOT_DIR, 'docs', 'deployments', 'latest-testnet.liquidity.json');
const DEFAULT_DEX_DEPLOYMENT = path.join(ROOT_DIR, 'docs', 'deployments', 'latest-testnet.json');
const DEFAULT_TOKEN_DEPLOYMENT = path.join(ROOT_DIR, 'docs', 'deployments', 'latest-testnet.tokens.json');

const ERC20_ABI = [
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function allowance(address,address) view returns (uint256)',
  'function approve(address,uint256) returns (bool)',
];

const ROUTER_ABI = [
  'function addLiquidity(address,address,uint256,uint256,uint256,uint256,address,uint256) returns (uint256,uint256,uint256)',
];

const FACTORY_ABI = ['function getPair(address,address) view returns (address)'];
const KASANE_CHAIN_ID = 4801360;

function requiredEnv(name, env = process.env) {
  const value = env[name];
  if (!value) {
    throw new Error(`Missing required env: ${name}`);
  }
  return value;
}

function loadJson(jsonPath, readFileFn = fs.readFileSync) {
  const raw = readFileFn(jsonPath, 'utf8');
  return JSON.parse(raw);
}

function readDeploymentJson(jsonPath, envName, readJsonFn = loadJson) {
  if (!fs.existsSync(jsonPath)) {
    throw new Error(`Missing deployment file: ${jsonPath}. Set ${envName} explicitly or create deployments first.`);
  }
  return readJsonFn(jsonPath);
}

function buildTxOverrides(env = process.env, parseUnits = utils.parseUnits) {
  const overrides = {};
  if (env.TX_TYPE !== undefined) {
    const txType = Number(env.TX_TYPE);
    if (!Number.isInteger(txType) || txType < 0) {
      throw new Error('TX_TYPE must be a non-negative integer');
    }
    overrides.type = txType;
  }
  if (env.GAS_PRICE_GWEI) {
    overrides.gasPrice = parseUnits(env.GAS_PRICE_GWEI, 'gwei');
  }

  if (env.GAS_LIMIT) {
    const gasLimit = Number(env.GAS_LIMIT);
    if (!Number.isInteger(gasLimit) || gasLimit <= 0) {
      throw new Error('GAS_LIMIT must be a positive integer');
    }
    overrides.gasLimit = gasLimit;
  }

  return overrides;
}

function resolveAddress(value, label, getAddress = utils.getAddress) {
  try {
    return getAddress(value);
  } catch (_error) {
    throw new Error(`Invalid address for ${label}: ${value}`);
  }
}

function normalizeDisplaySymbol({
  chainId,
  symbol,
  tokenAddress,
  wrappedNativeAddress,
}) {
  if (
    chainId === KASANE_CHAIN_ID &&
    tokenAddress.toLowerCase() === wrappedNativeAddress.toLowerCase() &&
    symbol === 'WETH'
  ) {
    return 'WICP';
  }
  return symbol;
}

function resolvePairTokenAddresses(env = process.env, deps = {}) {
  const readJsonFn = deps.readJsonFn || loadJson;
  const dexDeploymentPath = env.DEX_DEPLOYMENT || DEFAULT_DEX_DEPLOYMENT;
  const tokenDeploymentPath = env.TOKEN_DEPLOYMENT || DEFAULT_TOKEN_DEPLOYMENT;

  const pairKind = (env.PAIR_KIND || '').trim();
  if (!pairKind) {
    const tokenA = requiredEnv('TOKEN_A', env);
    const tokenB = requiredEnv('TOKEN_B', env);
    return {
      pairKind: 'CUSTOM',
      tokenA,
      tokenB,
    };
  }

  const dexDeployment = readDeploymentJson(dexDeploymentPath, 'DEX_DEPLOYMENT', readJsonFn);
  const wicp = requiredEnv('WICP_ADDRESS', { WICP_ADDRESS: dexDeployment.weth });

  if (pairKind === 'WICP_TESTUSDC') {
    const tokenDeployment = readDeploymentJson(tokenDeploymentPath, 'TOKEN_DEPLOYMENT', readJsonFn);
    return {
      pairKind,
      tokenA: wicp,
      tokenB: requiredEnv('TESTUSDC_ADDRESS', { TESTUSDC_ADDRESS: tokenDeployment.testUSDC && tokenDeployment.testUSDC.address }),
    };
  }

  if (pairKind === 'WICP_TES') {
    const tokenDeployment = fs.existsSync(tokenDeploymentPath) ? readJsonFn(tokenDeploymentPath) : {};
    const tesFromFile = tokenDeployment.testETH && tokenDeployment.testETH.address;
    const tesAddress = env.TES_ADDRESS || tesFromFile;
    if (!tesAddress) {
      throw new Error('TES_ADDRESS is required for PAIR_KIND=WICP_TES when testETH is not in TOKEN_DEPLOYMENT');
    }
    return {
      pairKind,
      tokenA: wicp,
      tokenB: tesAddress,
    };
  }

  throw new Error(`Unsupported PAIR_KIND: ${pairKind}. Use WICP_TESTUSDC, WICP_TES, or unset PAIR_KIND and set TOKEN_A/TOKEN_B.`);
}

async function ensureAllowance(token, owner, spender, minAmount, log, txOverrides = {}) {
  const allowance = await token.allowance(owner, spender);
  if (allowance.gte(minAmount)) {
    return;
  }

  const approveTx = await token.approve(spender, minAmount, txOverrides);
  log(`[approve] token=${token.address} tx=${approveTx.hash}`);
  await approveTx.wait();
}

async function runSeedLiquidity(deps = {}, env = process.env) {
  const log = deps.log || console.log;
  const providerFactory = deps.providerFactory || ((rpcUrl) => new providers.JsonRpcProvider(rpcUrl));
  const walletFactory = deps.walletFactory || ((privateKey, provider) => new Wallet(privateKey, provider));
  const nowSeconds = deps.nowSeconds || (() => Math.floor(Date.now() / 1000));
  const parseUnits = deps.parseUnits || utils.parseUnits;

  if (env.CONFIRM_DEPLOY !== 'YES') {
    throw new Error('Set CONFIRM_DEPLOY=YES to proceed.');
  }

  const rpcUrl = requiredEnv('RPC_URL', env);
  const privateKey = requiredEnv('PRIVATE_KEY', env);
  const expectedChainId = Number(requiredEnv('EXPECTED_CHAIN_ID', env));
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

  const dexDeploymentPath = env.DEX_DEPLOYMENT || DEFAULT_DEX_DEPLOYMENT;
  const dexDeployment = readDeploymentJson(dexDeploymentPath, 'DEX_DEPLOYMENT');
  const routerAddress = resolveAddress(env.ROUTER02_ADDRESS || dexDeployment.router02, 'ROUTER02_ADDRESS');
  const factoryAddress = resolveAddress(env.FACTORY_ADDRESS || dexDeployment.factory, 'FACTORY_ADDRESS');
  const pairSpec = resolvePairTokenAddresses(env);

  const tokenAAddress = resolveAddress(pairSpec.tokenA, 'TOKEN_A');
  const tokenBAddress = resolveAddress(pairSpec.tokenB, 'TOKEN_B');
  if (tokenAAddress.toLowerCase() === tokenBAddress.toLowerCase()) {
    throw new Error('TOKEN_A and TOKEN_B must be different addresses');
  }

  const amountA = requiredEnv('AMOUNT_A', env);
  const amountB = requiredEnv('AMOUNT_B', env);
  const recipientAddress = resolveAddress(env.TO || wallet.address, 'TO');
  const deadlineSeconds = Number(env.DEADLINE_SECONDS || '1200');
  if (!Number.isInteger(deadlineSeconds) || deadlineSeconds <= 0) {
    throw new Error('DEADLINE_SECONDS must be a positive integer');
  }

  const router = new Contract(routerAddress, ROUTER_ABI, wallet);
  const factory = new Contract(factoryAddress, FACTORY_ABI, wallet);
  const tokenA = new Contract(tokenAAddress, ERC20_ABI, wallet);
  const tokenB = new Contract(tokenBAddress, ERC20_ABI, wallet);

  const [tokenADecimals, tokenBDecimals, tokenASymbolRaw, tokenBSymbolRaw] = await Promise.all([
    tokenA.decimals(),
    tokenB.decimals(),
    tokenA.symbol(),
    tokenB.symbol(),
  ]);
  const tokenASymbol = normalizeDisplaySymbol({
    chainId: network.chainId,
    symbol: tokenASymbolRaw,
    tokenAddress: tokenAAddress,
    wrappedNativeAddress: dexDeployment.weth,
  });
  const tokenBSymbol = normalizeDisplaySymbol({
    chainId: network.chainId,
    symbol: tokenBSymbolRaw,
    tokenAddress: tokenBAddress,
    wrappedNativeAddress: dexDeployment.weth,
  });

  const amountADesired = parseUnits(amountA, tokenADecimals);
  const amountBDesired = parseUnits(amountB, tokenBDecimals);
  const amountAMin = parseUnits(env.AMOUNT_A_MIN || '0', tokenADecimals);
  const amountBMin = parseUnits(env.AMOUNT_B_MIN || '0', tokenBDecimals);
  const deadline = nowSeconds() + deadlineSeconds;
  const txOverrides = buildTxOverrides(env, parseUnits);

  log(`[network] chainId=${network.chainId}`);
  log(`[deployer] address=${wallet.address}`);
  log(`[pair] kind=${pairSpec.pairKind} ${tokenASymbol}-${tokenBSymbol}`);
  log(`[tokenA] ${tokenAAddress} amount=${amountA}`);
  log(`[tokenB] ${tokenBAddress} amount=${amountB}`);

  await ensureAllowance(tokenA, wallet.address, routerAddress, amountADesired, log, txOverrides);
  await ensureAllowance(tokenB, wallet.address, routerAddress, amountBDesired, log, txOverrides);

  const pairBefore = await factory.getPair(tokenAAddress, tokenBAddress);

  const tx = await router.addLiquidity(
    tokenAAddress,
    tokenBAddress,
    amountADesired,
    amountBDesired,
    amountAMin,
    amountBMin,
    recipientAddress,
    deadline,
    txOverrides,
  );
  log(`[addLiquidity] tx=${tx.hash}`);
  const receipt = await tx.wait();

  const pairAfter = await factory.getPair(tokenAAddress, tokenBAddress);
  if (pairAfter === constants.AddressZero) {
    throw new Error('Pair address is zero after addLiquidity');
  }

  const result = {
    chainId: network.chainId,
    deployer: wallet.address,
    router02: routerAddress,
    factory: factoryAddress,
    pairKind: pairSpec.pairKind,
    tokenA: { address: tokenAAddress, symbol: tokenASymbol, decimals: tokenADecimals },
    tokenB: { address: tokenBAddress, symbol: tokenBSymbol, decimals: tokenBDecimals },
    pairBefore,
    pairAfter,
    recipient: recipientAddress,
    amountA,
    amountB,
    amountAMin: env.AMOUNT_A_MIN || '0',
    amountBMin: env.AMOUNT_B_MIN || '0',
    txHash: tx.hash,
    blockNumber: receipt.blockNumber,
    updatedAt: new Date().toISOString(),
  };

  const outputPath = env.LIQUIDITY_OUTPUT || DEFAULT_OUTPUT;
  if (deps.writeOutput) {
    deps.writeOutput(outputPath, result);
  } else {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  }

  log(`[output] ${outputPath}`);
  return result;
}

async function main() {
  await runSeedLiquidity();
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`[error] ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  requiredEnv,
  loadJson,
  buildTxOverrides,
  resolvePairTokenAddresses,
  runSeedLiquidity,
};

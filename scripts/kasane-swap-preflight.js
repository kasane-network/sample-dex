#!/usr/bin/env node
/**
 * where: Kasane DEX workspace root
 * what: run RPC preflight (eth_estimateGas + eth_call) for a prepared swap tx
 * why: validate revert reason before wallet signing to reduce failed on-chain tx submissions
 */

const DEFAULT_RPC_URL = 'https://rpc-testnet.kasane.network';

function requiredEnv(name) {
  const value = process.env[name];
  if (!value || value.length === 0) {
    throw new Error(`Missing required env: ${name}`);
  }
  return value;
}

async function rpcFetch(rpcUrl, method, params = []) {
  const response = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method, params }),
  });
  const json = await response.json();
  if (json.error) {
    throw new Error(JSON.stringify(json.error));
  }
  return json.result;
}

function extractHexData(message) {
  const matches = message.match(/0x[0-9a-fA-F]{8,}/g);
  if (!matches || matches.length === 0) return undefined;
  return matches[matches.length - 1];
}

function decodeReason(message) {
  if (!message) return 'unknown error';
  const lower = message.toLowerCase();
  const prefix = 'execution reverted:';
  const index = lower.indexOf(prefix);
  if (index >= 0) {
    const reason = message.slice(index + prefix.length).trim();
    if (reason) return reason;
  }

  const hex = extractHexData(message);
  if (!hex) return message;
  const selector = hex.slice(0, 10).toLowerCase();
  if (selector === '0x08c379a0') {
    try {
      const payload = hex.slice(10);
      const offset = parseInt(payload.slice(0, 64), 16) * 2;
      const length = parseInt(payload.slice(offset, offset + 64), 16) * 2;
      const content = payload.slice(offset + 64, offset + 64 + length);
      return Buffer.from(content, 'hex').toString('utf8') || message;
    } catch {
      return message;
    }
  }
  if (selector === '0x4e487b71') {
    try {
      const codeHex = hex.slice(10 + 64, 10 + 128);
      return `panic code ${BigInt(`0x${codeHex}`).toString()}`;
    } catch {
      return message;
    }
  }
  return message;
}

async function main() {
  const rpcUrl = process.env.RPC_URL || DEFAULT_RPC_URL;
  const from = requiredEnv('FROM');
  const to = requiredEnv('TO');
  const data = requiredEnv('DATA');
  const value = process.env.VALUE || '0x0';

  const tx = { from, to, data, value };
  const chainId = await rpcFetch(rpcUrl, 'eth_chainId');

  const estimateGas = await rpcFetch(rpcUrl, 'eth_estimateGas', [tx]);
  console.log('[preflight] chainId:', chainId);
  console.log('[preflight] estimateGas:', estimateGas);

  try {
    const callResult = await rpcFetch(rpcUrl, 'eth_call', [tx, 'latest']);
    console.log('[preflight] eth_call: ok');
    console.log('[preflight] result:', callResult);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const decoded = decodeReason(message);
    console.error('[preflight] eth_call: failed');
    console.error('[preflight] reason:', decoded);
    process.exitCode = 1;
  }
}

void main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error('[preflight] fatal:', message);
  process.exit(1);
});

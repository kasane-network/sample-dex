const { ContractFactory, Wallet, providers } = require('ethers')
const hre = require('hardhat')

const PRIVATE_KEYS = [
  '0xf44a6a5aaa95b2071a8e44ffc726eee8771b25bef372879474d0f6e2a6878d11',
  '0xd9f54bc2155ac3a629eccc421127665e51a5d799b59d7239162a1db720a3807b',
  '0x1aec32a652737da277b6e803ac2cf4012b2d63b5910e1a710f00f55296f67606',
  '0x4ddc6788f0cd09014c03644ab5a844393aa2e90c360004a3bf3bf593c48c0d03',
  '0x180bd0bfab8ade2ffebf6be7d4827ad09c61de439c7fee389d091e9819c0183c'
]

function solidity() {}

function normalizeBytecode(artifact) {
  const bytecode = artifact.bytecode || (artifact.evm && artifact.evm.bytecode && artifact.evm.bytecode.object) || ''
  if (!bytecode) {
    throw new Error('Artifact does not contain bytecode')
  }
  return bytecode.startsWith('0x') ? bytecode : `0x${bytecode}`
}

class MockProvider extends providers.Web3Provider {
  constructor(_) {
    super(hre.network.provider)
    this.wallets = PRIVATE_KEYS.map((privateKey) => {
      const wallet = new Wallet(privateKey, this)
      const sendTransaction = wallet.sendTransaction.bind(wallet)
      wallet.sendTransaction = (transaction) => sendTransaction({
        ...transaction,
        gasLimit: transaction.gasLimit || 9000000,
        gasPrice: transaction.gasPrice == null ? 0 : transaction.gasPrice
      })
      return wallet
    })
  }

  getWallets() {
    return this.wallets
  }
}

function createFixtureLoader(provider, wallets) {
  return async function loadFixture(fixture) {
    return fixture(provider, wallets)
  }
}

async function deployContract(wallet, artifact, args = [], overrides = {}) {
  const factory = new ContractFactory(artifact.abi, normalizeBytecode(artifact), wallet)
  const contract = await factory.deploy(...args, overrides)
  await contract.deployed()
  return contract
}

module.exports = {
  solidity,
  MockProvider,
  createFixtureLoader,
  deployContract
}

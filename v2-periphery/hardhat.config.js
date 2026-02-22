require('@nomiclabs/hardhat-ethers')
require('@nomicfoundation/hardhat-chai-matchers')

const accounts = [
  {
    privateKey: '0xf44a6a5aaa95b2071a8e44ffc726eee8771b25bef372879474d0f6e2a6878d11',
    balance: '1000000000000000000000000'
  },
  {
    privateKey: '0xd9f54bc2155ac3a629eccc421127665e51a5d799b59d7239162a1db720a3807b',
    balance: '1000000000000000000000000'
  },
  {
    privateKey: '0x1aec32a652737da277b6e803ac2cf4012b2d63b5910e1a710f00f55296f67606',
    balance: '1000000000000000000000000'
  },
  {
    privateKey: '0x4ddc6788f0cd09014c03644ab5a844393aa2e90c360004a3bf3bf593c48c0d03',
    balance: '1000000000000000000000000'
  },
  {
    privateKey: '0x180bd0bfab8ade2ffebf6be7d4827ad09c61de439c7fee389d091e9819c0183c',
    balance: '1000000000000000000000000'
  }
]

module.exports = {
  defaultNetwork: 'hardhat',
  solidity: {
    compilers: [
      {
        version: '0.6.6',
        settings: {
          optimizer: {
            enabled: true,
            runs: 999999
          },
          evmVersion: 'istanbul'
        }
      }
    ]
  },
  networks: {
    hardhat: {
      chainId: 1,
      hardfork: 'istanbul',
      allowBlocksWithSameTimestamp: true,
      initialDate: '2020-01-01T00:00:00.000Z',
      gas: 9999999,
      blockGasLimit: 9999999,
      gasPrice: 0,
      accounts
    }
  },
  mocha: {
    timeout: 12000
  }
}

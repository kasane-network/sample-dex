import { expect } from 'chai'
import { utils } from 'ethers'

const deployDex = require('../../scripts/deploy-dex-v2.js')
const deployTokens = require('../../scripts/deploy-test-tokens.js')

async function expectError(promise: Promise<unknown>, expectedMessage: string) {
  let errorMessage = ''
  try {
    await promise
  } catch (error) {
    errorMessage = error.message
  }

  expect(errorMessage).to.contain(expectedMessage)
}

describe('deploy scripts', () => {
  describe('deploy-dex-v2', () => {
    it('validates GAS_LIMIT as positive integer', () => {
      expect(() => deployDex.buildTxOverrides({ GAS_PRICE_GWEI: '1', GAS_LIMIT: '0' })).to.throw(
        'GAS_LIMIT must be a positive integer'
      )
    })

    it('fails on chainId mismatch', async () => {
      await expectError(
        deployDex.runDeployDex(
          {
            provider: {
              getNetwork: async () => ({ chainId: 1 })
            },
            log: () => undefined
          },
          {
            CONFIRM_DEPLOY: 'YES',
            RPC_URL: 'http://127.0.0.1:8545',
            PRIVATE_KEY: '0x11',
            FEE_TO_SETTER: '0x0000000000000000000000000000000000000001',
            EXPECTED_CHAIN_ID: '31337'
          }
        ),
        'Chain ID mismatch: expected 31337, got 1'
      )
    })
  })

  describe('deploy-test-tokens', () => {
    it('builds gasPrice override when GAS_PRICE_GWEI is provided', () => {
      const overrides = deployTokens.buildTxOverrides({ GAS_PRICE_GWEI: '2' })
      expect(overrides.gasPrice.eq(utils.parseUnits('2', 'gwei'))).to.eq(true)
    })

    it('fails on chainId mismatch', async () => {
      await expectError(
        deployTokens.runDeployTestTokens(
          {
            provider: {
              getNetwork: async () => ({ chainId: 1 })
            },
            log: () => undefined
          },
          {
            CONFIRM_DEPLOY: 'YES',
            RPC_URL: 'http://127.0.0.1:8545',
            PRIVATE_KEY: '0x11',
            EXPECTED_CHAIN_ID: '31337'
          }
        ),
        'Chain ID mismatch: expected 31337, got 1'
      )
    })

    it('fails on invalid recipient address', async () => {
      await expectError(
        deployTokens.runDeployTestTokens(
          {
            provider: {
              getNetwork: async () => ({ chainId: 31337 })
            },
            wallet: {
              address: '0x0000000000000000000000000000000000000001',
              getBalance: async () => ({ isZero: () => false })
            },
            log: () => undefined
          },
          {
            CONFIRM_DEPLOY: 'YES',
            RPC_URL: 'http://127.0.0.1:8545',
            PRIVATE_KEY: '0x11',
            EXPECTED_CHAIN_ID: '31337',
            TOKEN_RECIPIENT: 'invalid-recipient'
          }
        ),
        'TOKEN_RECIPIENT is not a valid address'
      )
    })
  })
})

import chai, { expect } from 'chai'
import { Contract } from 'ethers'
import { AddressZero } from 'ethers/constants'
import { bigNumberify } from 'ethers/utils'
import { solidity, MockProvider, deployContract } from 'ethereum-waffle'

import KasaneTestERC20 from '../build/KasaneTestERC20.json'

chai.use(solidity)

describe('KasaneTestERC20', () => {
  const provider = new MockProvider({
    hardfork: 'istanbul',
    mnemonic: 'horn horn horn horn horn horn horn horn horn horn horn horn',
    gasLimit: 9999999
  })
  const [wallet, other, spender] = provider.getWallets()

  let token: Contract

  beforeEach(async () => {
    token = await deployContract(wallet, KasaneTestERC20, [
      'Kasane Test Ether',
      'testETH',
      18,
      bigNumberify('1000000000000000000000'),
      wallet.address
    ])
  })

  it('mints initial supply to recipient on constructor', async () => {
    const totalSupply = bigNumberify('1000000000000000000000')
    expect(await token.totalSupply()).to.eq(totalSupply)
    expect(await token.balanceOf(wallet.address)).to.eq(totalSupply)
  })

  it('transfer updates balances', async () => {
    const amount = bigNumberify('100')
    await expect(token.transfer(other.address, amount)).to.emit(token, 'Transfer').withArgs(wallet.address, other.address, amount)
    expect(await token.balanceOf(other.address)).to.eq(amount)
  })

  it('approve and transferFrom updates allowance and balances', async () => {
    const amount = bigNumberify('250')
    await expect(token.approve(spender.address, amount)).to.emit(token, 'Approval').withArgs(wallet.address, spender.address, amount)
    await expect(token.connect(spender).transferFrom(wallet.address, other.address, amount))
      .to.emit(token, 'Transfer')
      .withArgs(wallet.address, other.address, amount)

    expect(await token.allowance(wallet.address, spender.address)).to.eq(0)
    expect(await token.balanceOf(other.address)).to.eq(amount)
  })

  it('reverts when constructor recipient is zero address', async () => {
    await expect(
      deployContract(wallet, KasaneTestERC20, ['Kasane Test Ether', 'testETH', 18, bigNumberify('1'), AddressZero])
    ).to.be.revertedWith('KASANE_ERC20: ZERO_RECIPIENT')
  })
})

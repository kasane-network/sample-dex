import { BigNumber, constants, utils } from 'ethers'

export const AddressZero = constants.AddressZero
export const MaxUint256 = constants.MaxUint256
export const Zero = constants.Zero

export const bigNumberify = BigNumber.from
export const defaultAbiCoder = utils.defaultAbiCoder
export const formatEther = utils.formatEther
export const getAddress = utils.getAddress
export const hexlify = utils.hexlify
export const keccak256 = utils.keccak256
export const solidityPack = utils.solidityPack
export const toUtf8Bytes = utils.toUtf8Bytes

export { BigNumber }

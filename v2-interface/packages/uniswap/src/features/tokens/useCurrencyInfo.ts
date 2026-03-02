import { skipToken, useQuery } from '@tanstack/react-query'
import { BackendApi } from '@universe/api'
import { Contract, utils } from 'ethers/lib/ethers'
import { useMemo } from 'react'
import { getCommonBase } from 'uniswap/src/constants/routing'
import { UniverseChainId } from 'uniswap/src/features/chains/types'
import { useSearchTokens } from 'uniswap/src/features/dataApi/searchTokens'
import { CurrencyInfo, TokenList } from 'uniswap/src/features/dataApi/types'
import { buildCurrency, buildCurrencyInfo } from 'uniswap/src/features/dataApi/utils/buildCurrency'
import { createEthersProvider } from 'uniswap/src/features/providers/createEthersProvider'
import {
  buildNativeCurrencyId,
  buildWrappedNativeCurrencyId,
  currencyIdToAddress,
  currencyIdToChain,
} from 'uniswap/src/utils/currencyId'

const ERC20_METADATA_ABI = [
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)',
]

function parseCurrencyId(_currencyId?: string): { chainId: UniverseChainId | null; address?: Address } {
  const chainId = _currencyId ? currencyIdToChain(_currencyId) : null
  if (!_currencyId) {
    return { chainId }
  }

  try {
    return { chainId, address: currencyIdToAddress(_currencyId) }
  } catch (_error) {
    return { chainId, address: undefined }
  }
}

function findByAddress(currencyInfos: CurrencyInfo[] | undefined, address?: Address): CurrencyInfo | undefined {
  if (!currencyInfos || !address) {
    return undefined
  }

  return currencyInfos.find((info) => {
    try {
      const fallbackAddress = currencyIdToAddress(info.currencyId)
      return fallbackAddress.toLowerCase() === address.toLowerCase()
    } catch (_error) {
      return false
    }
  })
}

function normalizeTokenStringValue(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined
  }

  if (value.startsWith('0x') && value.length === 66) {
    try {
      const parsed = utils.parseBytes32String(value)
      return parsed.trim() || undefined
    } catch {
      return undefined
    }
  }

  const trimmed = value.trim()
  return trimmed || undefined
}

function normalizeTokenDecimalsValue(value: unknown): number | undefined {
  const isValidDecimals = (decimals: number): boolean =>
    Number.isInteger(decimals) && decimals >= 0 && decimals <= 255

  if (typeof value === 'number' && Number.isFinite(value)) {
    return isValidDecimals(value) ? value : undefined
  }

  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) && isValidDecimals(parsed) ? parsed : undefined
  }

  if (typeof value === 'object' && value !== null && 'toString' in value && typeof value.toString === 'function') {
    const parsed = Number(value.toString())
    return Number.isFinite(parsed) && isValidDecimals(parsed) ? parsed : undefined
  }

  return undefined
}

async function fetchKasaneOnchainCurrencyInfo({
  currencyId,
  tokenAddress,
}: {
  currencyId: string
  tokenAddress: Address
}): Promise<CurrencyInfo | undefined> {
  const provider = createEthersProvider({ chainId: UniverseChainId.Kasane })
  if (!provider) {
    return undefined
  }

  const contract = new Contract(tokenAddress, ERC20_METADATA_ABI, provider)

  const [decimalsResult, symbolResult, nameResult] = await Promise.allSettled([
    contract.callStatic.decimals(),
    contract.callStatic.symbol(),
    contract.callStatic.name(),
  ])

  if (decimalsResult.status !== 'fulfilled') {
    return undefined
  }

  const decimals = normalizeTokenDecimalsValue(decimalsResult.value)
  if (decimals === undefined) {
    return undefined
  }

  const symbol =
    symbolResult.status === 'fulfilled' ? normalizeTokenStringValue(symbolResult.value) ?? 'UNKNOWN' : 'UNKNOWN'
  const name = nameResult.status === 'fulfilled' ? normalizeTokenStringValue(nameResult.value) ?? symbol : symbol

  const currency = buildCurrency({
    chainId: UniverseChainId.Kasane,
    address: tokenAddress,
    decimals,
    symbol,
    name,
  })
  if (!currency) {
    return undefined
  }

  return buildCurrencyInfo({
    currency,
    currencyId,
    logoUrl: null,
    safetyInfo: {
      tokenList: TokenList.NonDefault,
      protectionResult: BackendApi.ProtectionResult.Benign,
    },
    isSpam: false,
  })
}

function useCurrencyInfoQuery(
  _currencyId?: string,
  options?: { refetch?: boolean; skip?: boolean },
): { currencyInfo: Maybe<CurrencyInfo>; loading: boolean; error?: Error } {
  const { chainId: currencyChainId, address: currencyAddressFromId } = parseCurrencyId(_currencyId)

  const commonBase = useMemo(() => {
    if (!currencyChainId || !currencyAddressFromId || !_currencyId) {
      return undefined
    }

    return getCommonBase(currencyChainId, currencyAddressFromId)
  }, [_currencyId, currencyAddressFromId, currencyChainId])

  const {
    data: fallbackCurrencyInfos,
    loading: fallbackCurrencyInfosLoading,
    error: fallbackCurrencyInfosError,
  } = useSearchTokens({
    searchQuery: currencyAddressFromId ?? null,
    chainFilter: currencyChainId === UniverseChainId.Kasane ? UniverseChainId.Kasane : null,
    skip: options?.skip === true || currencyChainId === UniverseChainId.Kasane || !currencyAddressFromId,
    hideWSOL: false,
    size: 20,
  })

  const shouldFetchOnchainCurrencyInfo =
    Boolean(_currencyId) &&
    currencyChainId === UniverseChainId.Kasane &&
    !!currencyAddressFromId &&
    !commonBase &&
    options?.skip !== true

  const {
    data: onchainCurrencyInfo,
    isLoading: onchainCurrencyInfoLoading,
    error: onchainCurrencyInfoError,
  } = useQuery<CurrencyInfo | undefined>({
    queryKey: ['kasane-onchain-currency-info', _currencyId ?? '', currencyAddressFromId ?? ''],
    queryFn:
      shouldFetchOnchainCurrencyInfo && _currencyId && currencyAddressFromId
        ? async () =>
            await fetchKasaneOnchainCurrencyInfo({
              currencyId: _currencyId,
              tokenAddress: currencyAddressFromId,
            })
        : skipToken,
    staleTime: 30_000,
    gcTime: 60_000,
    retry: false,
  })

  const currencyInfo = useMemo(() => {
    if (!_currencyId) {
      return undefined
    }

    if (commonBase) {
      const copyCommonBase = { ...commonBase }
      copyCommonBase.currencyId = _currencyId
      return copyCommonBase
    }

    if (currencyChainId === UniverseChainId.Kasane && currencyAddressFromId) {
      const fallbackMatch = findByAddress(fallbackCurrencyInfos, currencyAddressFromId)
      if (fallbackMatch) {
        return fallbackMatch
      }
    }

    return onchainCurrencyInfo
  }, [
    _currencyId,
    commonBase,
    currencyChainId,
    currencyAddressFromId,
    fallbackCurrencyInfos,
    onchainCurrencyInfo,
  ])

  const queryError =
    currencyInfo !== undefined
      ? undefined
      : fallbackCurrencyInfosError ?? (onchainCurrencyInfoError instanceof Error ? onchainCurrencyInfoError : undefined)

  return {
    currencyInfo,
    loading: fallbackCurrencyInfosLoading || onchainCurrencyInfoLoading,
    error: queryError,
  }
}

export function useCurrencyInfo(
  _currencyId?: string,
  options?: { refetch?: boolean; skip?: boolean },
): Maybe<CurrencyInfo> {
  const { currencyInfo } = useCurrencyInfoQuery(_currencyId, options)
  return currencyInfo
}

export function useCurrencyInfoWithLoading(
  _currencyId?: string,
  options?: { refetch?: boolean; skip?: boolean },
): {
  currencyInfo: Maybe<CurrencyInfo>
  loading: boolean
  error?: Error
} {
  return useCurrencyInfoQuery(_currencyId, options)
}

export function useCurrencyInfos(
  _currencyIds: string[],
  options?: { refetch?: boolean; skip?: boolean },
): Maybe<CurrencyInfo>[] {
  const kasaneCurrencyParams = useMemo(() => {
    const params: Array<{ currencyId: string; address: Address }> = []
    for (const _currencyId of _currencyIds) {
      const { chainId, address } = parseCurrencyId(_currencyId)
      if (chainId === UniverseChainId.Kasane && address) {
        params.push({ currencyId: _currencyId, address })
      }
    }
    return params
  }, [_currencyIds])

  const { data: kasaneOnchainCurrencyInfos } = useQuery<CurrencyInfo[]>({
    queryKey: ['kasane-onchain-currency-infos', ...kasaneCurrencyParams.map((param) => param.currencyId)],
    queryFn:
      options?.skip === true || kasaneCurrencyParams.length === 0
        ? skipToken
        : async () => {
            const infos = await Promise.all(
              kasaneCurrencyParams.map(async ({ currencyId, address }) => {
                return await fetchKasaneOnchainCurrencyInfo({
                  currencyId,
                  tokenAddress: address,
                })
              }),
            )
            return infos.filter((info): info is CurrencyInfo => info !== undefined)
          },
    staleTime: 30_000,
    gcTime: 60_000,
    retry: false,
  })

  return useMemo(() => {
    return _currencyIds.map((_currencyId) => {
      const { chainId, address } = parseCurrencyId(_currencyId)
      if (!chainId || !address) {
        return undefined
      }

      const commonBase = getCommonBase(chainId, address)
      if (commonBase) {
        const copyCommonBase = { ...commonBase }
        copyCommonBase.currencyId = _currencyId
        return copyCommonBase
      }

      if (chainId === UniverseChainId.Kasane) {
        return findByAddress(kasaneOnchainCurrencyInfos, address)
      }

      return undefined
    })
  }, [_currencyIds, kasaneOnchainCurrencyInfos])
}

export function useNativeCurrencyInfo(chainId: UniverseChainId): Maybe<CurrencyInfo> {
  const nativeCurrencyId = buildNativeCurrencyId(chainId)
  return useCurrencyInfo(nativeCurrencyId)
}

export function useWrappedNativeCurrencyInfo(chainId: UniverseChainId): Maybe<CurrencyInfo> {
  const wrappedCurrencyId = buildWrappedNativeCurrencyId(chainId)
  return useCurrencyInfo(wrappedCurrencyId)
}

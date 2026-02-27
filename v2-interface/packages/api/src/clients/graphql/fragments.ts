import type { QueryResult } from '@apollo/client'
import type {
  TokenBasicInfoPartsFragment,
  TokenBasicProjectPartsFragment,
  TokenDetailsScreenQuery,
  TokenDetailsScreenQueryVariables,
  TokenMarketPartsFragment,
  TokenProjectMarketsPartsFragment,
  TokenProjectUrlsPartsFragment,
} from '@universe/api/src/clients/graphql/__generated__/operations'
import { useTokenDetailsScreenQuery } from '@universe/api/src/clients/graphql/__generated__/react-hooks'

type FragmentVariables = Pick<TokenDetailsScreenQueryVariables, 'chain' | 'address'>

type FragmentResult<TData> = Pick<QueryResult<TokenDetailsScreenQuery, TokenDetailsScreenQueryVariables>, 'loading'> & {
  data: TData
}

export function useTokenBasicInfoPartsFragment(
  variables: FragmentVariables,
): FragmentResult<TokenBasicInfoPartsFragment | undefined> {
  const query = useTokenDetailsScreenQuery({ variables })
  return {
    data: query.data?.token
      ? {
          id: query.data.token.id,
          address: query.data.token.address,
          chain: query.data.token.chain,
          decimals: query.data.token.decimals,
          name: query.data.token.name,
          standard: query.data.token.standard,
          symbol: query.data.token.symbol,
          isBridged: query.data.token.isBridged,
          bridgedWithdrawalInfo: query.data.token.bridgedWithdrawalInfo,
        }
      : undefined,
    loading: query.loading,
  }
}

export function useTokenBasicProjectPartsFragment(
  variables: FragmentVariables,
): FragmentResult<TokenBasicProjectPartsFragment | undefined> {
  const query = useTokenDetailsScreenQuery({ variables })
  return {
    data: query.data?.token?.project
      ? {
          project: {
            id: query.data.token.project.id,
            isSpam: query.data.token.project.isSpam,
            logoUrl: query.data.token.project.logoUrl,
            name: query.data.token.project.name,
            safetyLevel: query.data.token.project.safetyLevel,
            spamCode: query.data.token.project.spamCode,
            tokens: query.data.token.project.tokens,
          },
        }
      : undefined,
    loading: query.loading,
  }
}

export function useTokenMarketPartsFragment(variables: FragmentVariables): FragmentResult<TokenMarketPartsFragment> {
  const query = useTokenDetailsScreenQuery({ variables })
  return {
    data: { market: query.data?.token?.market },
    loading: query.loading,
  }
}

export function useTokenProjectMarketsPartsFragment(
  variables: FragmentVariables,
): FragmentResult<TokenProjectMarketsPartsFragment> {
  const query = useTokenDetailsScreenQuery({ variables })
  return {
    data: {
      project: query.data?.token?.project ? { markets: query.data.token.project.markets } : undefined,
    },
    loading: query.loading,
  }
}

export function useTokenProjectUrlsPartsFragment(
  variables: FragmentVariables,
): FragmentResult<TokenProjectUrlsPartsFragment | undefined> {
  const query = useTokenDetailsScreenQuery({ variables })
  return {
    data: query.data?.token?.project
      ? {
          project: {
            homepageUrl: query.data.token.project.homepageUrl,
            twitterName: query.data.token.project.twitterName,
          },
        }
      : undefined,
    loading: query.loading,
  }
}

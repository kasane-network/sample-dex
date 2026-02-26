/**
 * where: Positions page (Kasane only)
 * what: shows LP pool list from Supabase snapshot view
 * why: wallet-specific positions API is disabled; this page now provides a stable pool directory for LP creation
 */
import { AdaptiveDropdown } from 'components/Dropdowns/AdaptiveDropdown'
import { PositionStatus, ProtocolVersion } from '@uniswap/client-data-api/dist/data/v1/poolTypes_pb'
import { CurrencyAmount, Token } from '@uniswap/sdk-core'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { TopPoolsCard } from 'pages/Positions/TopPoolsCard'
import { useSupabaseExploreStatsQuery } from 'state/explore/useSupabaseExploreStatsQuery'
import { UserV2PositionItem, useSupabaseUserV2PositionsQuery } from 'state/positions/useSupabaseUserV2PositionsQuery'
import { useAccount } from 'hooks/useAccount'
import { setOpenModal } from 'state/application/reducer'
import { useAppDispatch } from 'state/hooks'
import { Flex, Text, Button } from 'ui/src'
import { MoreHorizontal } from 'ui/src/components/icons/MoreHorizontal'
import { UniverseChainId } from 'uniswap/src/features/chains/types'
import { MenuContent } from 'uniswap/src/components/menus/ContextMenuContent'
import { MenuOptionItem } from 'uniswap/src/components/menus/ContextMenuV2'
import { ModalName } from 'uniswap/src/features/telemetry/constants'

function formatAmount(raw: string, decimals: number): string {
  const numeric = Number(raw)
  if (!Number.isFinite(numeric)) {
    return raw
  }
  return (numeric / 10 ** decimals).toLocaleString(undefined, {
    maximumFractionDigits: 6,
  })
}

function formatShareRatio(ratio: number): string {
  return `${(ratio * 100).toFixed(4)}%`
}

function toV2PositionInfo(row: UserV2PositionItem) {
  const token0 = new Token(row.chainId, row.token0Address, row.token0Decimals, row.token0Symbol)
  const token1 = new Token(row.chainId, row.token1Address, row.token1Decimals, row.token1Symbol)
  const liquidityToken = new Token(row.chainId, row.pairAddress, 18, `${row.token0Symbol}-${row.token1Symbol} LP`)

  return {
    status: PositionStatus.OPEN,
    version: ProtocolVersion.V2,
    chainId: row.chainId,
    poolId: row.pairAddress,
    currency0Amount: CurrencyAmount.fromRawAmount(token0, row.userAmount0Raw),
    currency1Amount: CurrencyAmount.fromRawAmount(token1, row.userAmount1Raw),
    liquidityToken,
    liquidityAmount: CurrencyAmount.fromRawAmount(liquidityToken, row.lpBalanceRaw),
    feeTier: undefined,
    v4hook: undefined,
    owner: undefined,
  }
}

export default function PositionsPage() {
  const { t } = useTranslation()
  const account = useAccount()
  const walletAddress = account.address
  const dispatch = useAppDispatch()
  const [openMenuPairAddress, setOpenMenuPairAddress] = useState<string | null>(null)

  const { data, isLoading, isError, error } = useSupabaseExploreStatsQuery({
    chainId: UniverseChainId.Kasane,
    enabled: true,
    limit: 100,
  })
  const {
    data: userV2Positions,
    isLoading: isUserPositionsLoading,
    isError: isUserPositionsError,
    error: userPositionsError,
  } = useSupabaseUserV2PositionsQuery({
    walletAddress,
    chainId: UniverseChainId.Kasane,
  })

  const pools = useMemo(() => {
    return data?.stats.poolStats ?? []
  }, [data?.stats.poolStats])

  return (
    <Flex gap="$gap16" px="$spacing16" py="$spacing16" width="100%" maxWidth={960} alignSelf="center">
      <Flex row justifyContent="space-between" alignItems="center" flexWrap="wrap" gap="$gap8">
        <Flex gap="$gap4">
          <Text variant="heading2">{t('pool.positions.title')}</Text>
        </Flex>

        <Flex row gap="$gap8">
          <Button
            variant="default"
            size="small"
            emphasis="secondary"
            tag="a"
            href="/positions/create/v2"
            $platform-web={{ textDecoration: 'none' }}
          >
            {t('position.new')}
          </Button>
        </Flex>
      </Flex>

      <Flex gap="$gap8" borderColor="$surface3" borderWidth="$spacing1" borderRadius="$rounded16" p="$padding12">
        {!walletAddress ? (
          <Text variant="body3" color="$neutral2">
            ウォレット接続後に表示されます
          </Text>
        ) : null}
        {walletAddress && isUserPositionsLoading ? (
          <Text variant="body3" color="$neutral2">
            読み込み中...
          </Text>
        ) : null}
        {walletAddress && isUserPositionsError ? (
          <Text variant="body3" color="$statusCritical">
            {userPositionsError instanceof Error ? userPositionsError.message : 'failed to load user positions'}
          </Text>
        ) : null}
        {walletAddress && !isUserPositionsLoading && !isUserPositionsError && (userV2Positions?.length ?? 0) === 0 ? (
          <Text variant="body3" color="$neutral2">
            保有LPはありません
          </Text>
        ) : null}
        {walletAddress && !isUserPositionsLoading && !isUserPositionsError ? (
          <Flex gap="$gap8">
            {(userV2Positions ?? []).map((position, index) => {
              const isMenuOpen = openMenuPairAddress === position.pairAddress
              const menuOptions: MenuOptionItem[] = [
                {
                  label: 'remove',
                  onPress: () => {
                    dispatch(
                      setOpenModal({
                        name: ModalName.RemoveLiquidity,
                        initialState: toV2PositionInfo(position),
                      }),
                    )
                    setOpenMenuPairAddress(null)
                  },
                },
              ]

              return (
                <Flex
                  key={position.pairAddress}
                  borderColor="$surface3"
                  backgroundColor="$surface1"
                  borderWidth="$spacing1"
                  borderRadius="$rounded12"
                  p="$padding12"
                  gap="$gap4"
                  position="relative"
                >
                  <Flex position="absolute" top="$spacing12" right="$spacing12">
                    <AdaptiveDropdown
                      alignRight
                      positionFixed
                      forceFlipUp={index === (userV2Positions ?? []).length - 1}
                      isOpen={isMenuOpen}
                      toggleOpen={(open) => setOpenMenuPairAddress(open ? position.pairAddress : null)}
                      trigger={
                        <Button
                          testID={`user-v2-position-menu-button-${position.pairAddress}`}
                          size="small"
                          emphasis="tertiary"
                          onPress={() => setOpenMenuPairAddress(isMenuOpen ? null : position.pairAddress)}
                        >
                          <MoreHorizontal size="$icon.16" color="$neutral1" />
                        </Button>
                      }
                      dropdownStyle={{
                        p: 0,
                        backgroundColor: 'transparent',
                        borderRadius: '$rounded20',
                        minWidth: 200,
                        borderWidth: 0,
                      }}
                    >
                      <MenuContent items={menuOptions} handleCloseMenu={() => setOpenMenuPairAddress(null)} />
                    </AdaptiveDropdown>
                  </Flex>

                  <Text variant="subheading2">
                    {position.token0Symbol} / {position.token1Symbol}
                  </Text>
                  <Text variant="body3" color="$neutral2">
                    pair: {position.pairAddress}
                  </Text>
                  <Text variant="body3" color="$neutral2">
                    share: {formatShareRatio(position.poolShareRatio)}
                  </Text>
                  <Text variant="body3" color="$neutral2">
                    {position.token0Symbol}: {formatAmount(position.userAmount0Raw, position.token0Decimals)}
                  </Text>
                  <Text variant="body3" color="$neutral2">
                    {position.token1Symbol}: {formatAmount(position.userAmount1Raw, position.token1Decimals)}
                  </Text>
                </Flex>
              )
            })}
          </Flex>
        ) : null}
      </Flex>

      {isLoading ? (
        <Text variant="body2" color="$neutral2">
          読み込み中...
        </Text>
      ) : null}

      {isError ? (
        <Flex gap="$gap6">
          <Text variant="subheading2" color="$statusCritical">
            プール一覧の取得に失敗しました
          </Text>
          <Text variant="body3" color="$neutral2">
            {error instanceof Error ? error.message : 'unknown error'}
          </Text>
        </Flex>
      ) : null}

      {!isLoading && !isError && pools.length === 0 ? (
        <Text variant="body2" color="$neutral2">
          プールが見つかりませんでした
        </Text>
      ) : null}

      {!isLoading && !isError && pools.length > 0 ? (
        <Flex gap="$gap12">
          {pools.map((pool) => (
            <TopPoolsCard key={`${pool.chain}-${pool.id}`} pool={pool} />
          ))}
        </Flex>
      ) : null}
    </Flex>
  )
}

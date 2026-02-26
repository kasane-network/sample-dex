import { memo, useCallback, useState } from 'react'
import { useDispatch } from 'react-redux'
import { Text } from 'ui/src'
import { BridgedAssetModal } from 'uniswap/src/components/BridgedAsset/BridgedAssetModal'
import {
  TokenOptionItem as BaseTokenOptionItem,
  TokenContextMenuVariant,
} from 'uniswap/src/components/lists/items/tokens/TokenOptionItem'
import { TokenOption, TokenSelectorOption } from 'uniswap/src/components/lists/items/types'
import { ItemRowInfo } from 'uniswap/src/components/lists/OnchainItemList/OnchainItemList'
import type { OnchainItemSection } from 'uniswap/src/components/lists/OnchainItemList/types'
import { SelectorBaseList } from 'uniswap/src/components/lists/SelectorBaseList'
import { WarningSeverity } from 'uniswap/src/components/modals/WarningModal/types'
import { HorizontalTokenList } from 'uniswap/src/components/TokenSelector/lists/HorizontalTokenList/HorizontalTokenList'
import { OnSelectCurrency } from 'uniswap/src/components/TokenSelector/types'
import { setHasSeenBridgingTooltip } from 'uniswap/src/features/behaviorHistory/slice'
import { useEnabledChains } from 'uniswap/src/features/chains/hooks/useEnabledChains'
import { UniverseChainId } from 'uniswap/src/features/chains/types'
import { useLocalizationContext } from 'uniswap/src/features/language/LocalizationContext'
import { getTokenProtectionWarning, getTokenWarningSeverity } from 'uniswap/src/features/tokens/warnings/safetyUtils'
import {
  useDismissedBridgedAssetWarnings,
  useDismissedTokenWarnings,
} from 'uniswap/src/features/tokens/warnings/slice/hooks'
import { CurrencyId } from 'uniswap/src/types/currency'
import { NumberType } from 'utilities/src/format/types'
import { DDRumManualTiming } from 'utilities/src/logger/datadog/datadogEvents'
import { usePerformanceLogger } from 'utilities/src/logger/usePerformanceLogger'
import { useEvent } from 'utilities/src/react/hooks'

function isHorizontalListTokenItem(data: TokenSelectorOption): data is TokenOption[] {
  return Array.isArray(data)
}

const TokenOptionItem = memo(function _TokenOptionItem({
  tokenOption,
  onSelectCurrency,
  section,
  index,
  showWarnings,
  showTokenAddress,
}: {
  tokenOption: TokenOption
  section: OnchainItemSection<TokenOption>
  index: number
  showWarnings: boolean
  showTokenAddress?: boolean
  onSelectCurrency: OnSelectCurrency
}): JSX.Element {
  const { currencyInfo } = tokenOption

  const onPress = useCallback(
    () => onSelectCurrency(currencyInfo, section, index),
    [index, onSelectCurrency, section, currencyInfo],
  )

  const dispatch = useDispatch()
  const onPressTokenOption = useCallback(() => {
    dispatch(setHasSeenBridgingTooltip(true))
    onPress()
  }, [dispatch, onPress])

  // Balance & quantity formatting
  const { convertFiatAmountFormatted, formatNumberOrString } = useLocalizationContext()

  const tokenBalance = formatNumberOrString({
    value: tokenOption.quantity,
    type: NumberType.TokenTx,
  })
  const fiatBalance = convertFiatAmountFormatted(tokenOption.balanceUSD, NumberType.FiatTokenQuantity)

  const { isTestnetModeEnabled } = useEnabledChains()
  const balanceText = isTestnetModeEnabled ? tokenBalance : fiatBalance
  const quantityText = isTestnetModeEnabled ? undefined : tokenBalance

  // Token protection modal
  const severity = getTokenWarningSeverity(currencyInfo)
  const tokenProtectionWarning = getTokenProtectionWarning(currencyInfo)
  const { tokenWarningDismissed } = useDismissedTokenWarnings(currencyInfo.currency, tokenProtectionWarning)
  const isBlocked = severity === WarningSeverity.Blocked
  const shouldShowWarningModalOnPress = false
  void tokenWarningDismissed

  const isBridgedAsset = Boolean(currencyInfo.isBridged)
  const [showBridgedAssetWarningModal, setShowBridgedAssetWarningModal] = useState(false)
  const { tokenWarningDismissed: bridgedAssetTokenWarningDismissed } = useDismissedBridgedAssetWarnings(
    currencyInfo.currency,
  )
  const shouldShowBridgedAssetWarningModalOnPress = showWarnings && isBridgedAsset && !bridgedAssetTokenWarningDismissed
  const hasWarningModals = shouldShowWarningModalOnPress || shouldShowBridgedAssetWarningModalOnPress

  const setWarningModalVisible = useCallback(
    (visible: boolean) => {
      // Handle token warning modal visibility as first priority
      if (shouldShowWarningModalOnPress) {
        void visible
        return
      }

      // Handle bridged asset warning modal visibility
      setShowBridgedAssetWarningModal(visible)
    },
    [shouldShowWarningModalOnPress],
  )

  const onAcceptTokenWarning = useCallback(() => {
    // Handle token warning modal dismissal
    if (showBridgedAssetWarningModal) {
      setShowBridgedAssetWarningModal(false)
      onPress()

      return
    }

    // No modals showing - proceed with action
    onPress()
  }, [onPress, showBridgedAssetWarningModal])

  return (
    <BaseTokenOptionItem
      option={tokenOption}
      showTokenAddress={showTokenAddress}
      contextMenuVariant={TokenContextMenuVariant.TokenSelector}
      rightElement={
        tokenOption.quantity && tokenOption.quantity !== 0 ? (
          <>
            <Text variant="body1">{balanceText}</Text>
            {quantityText && (
              <Text color="$neutral2" variant="body3">
                {quantityText}
              </Text>
            )}
          </>
        ) : undefined
      }
      showDisabled={Boolean((showWarnings && isBlocked) || tokenOption.isUnsupported)}
      modalInfo={{
        modal: showBridgedAssetWarningModal ? (
          <BridgedAssetModal
            currencyInfo0={currencyInfo}
            isOpen={showBridgedAssetWarningModal}
            onClose={(): void => setShowBridgedAssetWarningModal(false)}
            onContinue={onAcceptTokenWarning}
          />
        ) : (
          <></>
        ),
        modalShouldShow: hasWarningModals,
        modalSetIsOpen: setWarningModalVisible,
      }}
      onPress={onPressTokenOption}
    />
  )
})

interface TokenSelectorListProps {
  onSelectCurrency: OnSelectCurrency
  sections?: OnchainItemSection<TokenSelectorOption>[]
  chainFilter?: UniverseChainId | null
  showTokenWarnings: boolean
  refetch?: () => void
  loading?: boolean
  hasError?: boolean
  emptyElement?: JSX.Element
  errorText?: string
  showTokenAddress?: boolean
  isKeyboardOpen?: boolean
  renderedInModal: boolean
}

function _TokenSelectorList({
  onSelectCurrency,
  sections,
  chainFilter,
  showTokenWarnings,
  refetch,
  loading,
  hasError,
  emptyElement,
  errorText,
  showTokenAddress,
  renderedInModal,
}: TokenSelectorListProps): JSX.Element {
  const [expandedItems, setExpandedItems] = useState<string[]>([])
  const filteredSections = filterSectionsByChain(sections, chainFilter)

  usePerformanceLogger(DDRumManualTiming.TokenSelectorListRender, [chainFilter])

  const handleExpand = useEvent((item: TokenSelectorOption) => {
    setExpandedItems((prev) => [...prev, key(item)])
  })

  const isExpandedItem = useEvent((item: TokenOption[]) => {
    return expandedItems.includes(key(item))
  })

  const renderItem = useEvent(({ item, section, index }: ItemRowInfo<TokenSelectorOption>): JSX.Element => {
    if (isHorizontalListTokenItem(item)) {
      return (
        <HorizontalTokenList
          tokens={item}
          section={section as OnchainItemSection<TokenOption[]>}
          index={index}
          expanded={isExpandedItem(item)}
          onSelectCurrency={onSelectCurrency}
          onExpand={handleExpand}
        />
      )
    }
    return (
      <TokenOptionItem
        index={index}
        section={section as OnchainItemSection<TokenOption>}
        showTokenAddress={showTokenAddress}
        showWarnings={showTokenWarnings}
        tokenOption={item}
        onSelectCurrency={onSelectCurrency}
      />
    )
  })

  return (
    <SelectorBaseList
      renderItem={renderItem}
      sections={filteredSections}
      chainFilter={chainFilter}
      refetch={refetch}
      loading={loading}
      hasError={hasError}
      emptyElement={emptyElement}
      errorText={errorText}
      keyExtractor={key}
      expandedItems={expandedItems}
      renderedInModal={renderedInModal}
    />
  )
}

function key(item: TokenSelectorOption): CurrencyId {
  if (isHorizontalListTokenItem(item)) {
    return item.map((token) => token.currencyInfo.currencyId).join('-')
  }

  return item.currencyInfo.currencyId
}

export const TokenSelectorList = memo(_TokenSelectorList)

function filterSectionsByChain(
  sections: OnchainItemSection<TokenSelectorOption>[] | undefined,
  chainFilter: UniverseChainId | null | undefined,
): OnchainItemSection<TokenSelectorOption>[] | undefined {
  if (!sections || !chainFilter) {
    return sections
  }

  // Token search is Kasane-fixed; when wallet/network chainFilter is non-Kasane (e.g. Mainnet),
  // filtering here would incorrectly hide all valid search results.
  if (chainFilter !== UniverseChainId.Kasane) {
    return sections
  }

  return sections
    .map((section) => {
      const data = section.data
        .map((item) => {
          if (Array.isArray(item)) {
            const tokens = item.filter((token) => token.currencyInfo.currency.chainId === chainFilter)
            return tokens.length > 0 ? tokens : undefined
          }
          return item.currencyInfo.currency.chainId === chainFilter ? item : undefined
        })
        .filter((item): item is TokenSelectorOption => item !== undefined)

      return { ...section, data }
    })
    .filter((section) => section.data.length > 0)
}

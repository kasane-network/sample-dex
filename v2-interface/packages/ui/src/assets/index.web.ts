// where/what/why:
// - where: web-only asset exports for ui package
// - what: expose all asset URLs via import.meta.url resolution
// - why: avoid CommonJS require() at runtime under Vite/Rolldown ESM
const asset = (relativePath: string): string => new URL(relativePath, import.meta.url).href
export const ALL_NETWORKS_LOGO = asset('./logos/png/all-networks-icon.png')
export const ETHEREUM_LOGO = asset('./logos/png/ethereum-logo.png')
export const OPTIMISM_LOGO = asset('./logos/png/optimism-logo.png')
export const ARBITRUM_LOGO = asset('./logos/png/arbitrum-logo.png')
export const BASE_LOGO = asset('./logos/png/base-logo.png')
export const BNB_LOGO = asset('./logos/png/bnb-logo.png')
export const MONAD_LOGO_FILLED = asset('./logos/png/monad-logo-filled.png')
export const POLYGON_LOGO = asset('./logos/png/polygon-logo.png')
export const BLAST_LOGO = asset('./logos/png/blast-logo.png')
export const AVALANCHE_LOGO = asset('./logos/png/avalanche-logo.png')
export const CELO_LOGO = asset('./logos/png/celo-logo.png')
export const WORLD_CHAIN_LOGO = asset('./logos/png/world-chain-logo.png')
export const ZORA_LOGO = asset('./logos/png/zora-logo.png')
export const ZKSYNC_LOGO = asset('./logos/png/zksync-logo.png')
export const SOLANA_LOGO = asset('./logos/png/solana-logo.png')
export const SONEIUM_LOGO = asset('./logos/png/soneium-logo.png')
export const UNICHAIN_LOGO = asset('./logos/png/unichain-logo.png')
export const UNICHAIN_SEPOLIA_LOGO = asset('./logos/png/unichain-sepolia-logo.png')
export const UNISWAP_LOGO = asset('./logos/png/uniswap-logo.png')
export const UNISWAP_LOGO_LARGE = asset('./logos/png/uniswap-logo-large.png')
export const UNISWAP_MONO_LOGO_LARGE = asset('./logos/png/uniswap-mono-logo-large.png')
export const UNISWAP_APP_ICON = asset('./logos/png/uniswap-app-icon.png')
export const BINANCE_WALLET_ICON = asset('./logos/png/binance-icon.png')

export const ONBOARDING_QR_ETCHING_VIDEO_LIGHT = asset('./videos/light-etching.mp4')
export const ONBOARDING_QR_ETCHING_VIDEO_DARK = asset('./videos/dark-etching.mp4')
export const AVATARS_LIGHT = asset('./misc/avatars-light.png')
export const AVATARS_DARK = asset('./misc/avatars-dark.png')
export const APP_SCREENSHOT_LIGHT = asset('./misc/app-screenshot-light.png')
export const APP_SCREENSHOT_DARK = asset('./misc/app-screenshot-dark.png')
export const DOT_GRID = asset('./misc/dot-grid.png')

export const UNITAGS_BANNER_VERTICAL_LIGHT = asset('./graphics/unitags-banner-v-light.png')
export const UNITAGS_BANNER_VERTICAL_DARK = asset('./graphics/unitags-banner-v-dark.png')
export const UNITAGS_INTRO_BANNER_LIGHT = asset('./graphics/unitags-intro-banner-light.png')
export const UNITAGS_INTRO_BANNER_DARK = asset('./graphics/unitags-intro-banner-dark.png')

export const BRIDGING_BANNER = asset('./graphics/bridging-banner.png')

export const DAI_LOGO = asset('./logos/png/dai-logo.png')
export const USDC_LOGO = asset('./logos/png/usdc-logo.png')
export const ETH_LOGO = asset('./logos/png/eth-logo.png')
export const ICP_LOGO = asset('./logos/png/icp-logo.png')
export const OPENSEA_LOGO = asset('./logos/png/opensea-logo.png')
export const ENS_LOGO = asset('./logos/png/ens-logo.png')
export const FROGGY = asset('./graphics/froggy.png')

export const CEX_TRANSFER_MODAL_BG_LIGHT = asset('./graphics/cex-transfer-modal-bg-light.png')
export const CEX_TRANSFER_MODAL_BG_DARK = asset('./graphics/cex-transfer-modal-bg-dark.png')

export const UNITAG_DARK = asset('./graphics/unitag-dark.png')
export const UNITAG_LIGHT = asset('./graphics/unitag-light.png')

export const UNITAG_DARK_SMALL = asset('./graphics/unitag-dark-small.png')
export const UNITAG_LIGHT_SMALL = asset('./graphics/unitag-light-small.png')

export const PUSH_NOTIFICATIONS_CARD_BANNER = asset('./graphics/push-notifications-card-banner.png')
export const BRIDGED_ASSETS_CARD_BANNER = asset('./graphics/bridged-assets-card-banner.png')
export const BRIDGED_ASSETS_V2_CARD_BANNER_DARK = asset('./graphics/bridged-assets-v2-card-banner-dark.png')
export const BRIDGED_ASSETS_V2_CARD_BANNER_LIGHT = asset('./graphics/bridged-assets-v2-card-banner-light.png')
export const BRIDGED_ASSETS_V2_WEB_BANNER = asset('./graphics/bridged-assets-v2-web-banner.png')

export const ONBOARDING_NOTIFICATIONS_DARK = {
  ios: asset('./backgrounds/ios/notifications-dark.png'),
  android: asset('./backgrounds/android/notifications-dark.png'),
}
export const ONBOARDING_NOTIFICATIONS_LIGHT = {
  ios: asset('./backgrounds/ios/notifications-light.png'),
  android: asset('./backgrounds/android/notifications-light.png'),
}
export const FOR_CONNECTING_BACKGROUND_DARK = asset('./backgrounds/for-connecting-dark.png')
export const FOR_CONNECTING_BACKGROUND_LIGHT = asset('./backgrounds/for-connecting-light.png')

export const CRYPTO_PURCHASE_BACKGROUND_LIGHT = asset('./backgrounds/coins-background-light.png')
export const CRYPTO_PURCHASE_BACKGROUND_DARK = asset('./backgrounds/coins-background-dark.png')

export const SOLANA_BANNER_LIGHT = asset('./backgrounds/solana-banner-light.png')
export const SOLANA_BANNER_DARK = asset('./backgrounds/solana-banner-light.png')
export const MONAD_TEST_BANNER_LIGHT = asset('./backgrounds/monad-test-banner-light.png')

export const SECURITY_SCREEN_BACKGROUND_DARK = {
  ios: asset('./backgrounds/ios/security-background-dark.png'),
  android: asset('./backgrounds/android/security-background-dark.png'),
}
export const SECURITY_SCREEN_BACKGROUND_LIGHT = {
  ios: asset('./backgrounds/ios/security-background-light.png'),
  android: asset('./backgrounds/android/security-background-light.png'),
}

export const DEAD_LUNI = asset('./graphics/dead-luni.png')

export const UNITAGS_ADRIAN_LIGHT = asset('./graphics/unitags/adrian-light.png')
export const UNITAGS_ADRIAN_DARK = asset('./graphics/unitags/adrian-dark.png')
export const UNITAGS_ANDREW_LIGHT = asset('./graphics/unitags/andrew-light.png')
export const UNITAGS_ANDREW_DARK = asset('./graphics/unitags/andrew-dark.png')
export const UNITAGS_BRYAN_LIGHT = asset('./graphics/unitags/bryan-light.png')
export const UNITAGS_BRYAN_DARK = asset('./graphics/unitags/bryan-dark.png')
export const UNITAGS_CALLIL_LIGHT = asset('./graphics/unitags/callil-light.png')
export const UNITAGS_CALLIL_DARK = asset('./graphics/unitags/callil-dark.png')
export const UNITAGS_FRED_LIGHT = asset('./graphics/unitags/fred-light.png')
export const UNITAGS_FRED_DARK = asset('./graphics/unitags/fred-dark.png')
export const UNITAGS_MAGGIE_LIGHT = asset('./graphics/unitags/maggie-light.png')
export const UNITAGS_MAGGIE_DARK = asset('./graphics/unitags/maggie-dark.png')
export const UNITAGS_PHIL_LIGHT = asset('./graphics/unitags/phil-light.png')
export const UNITAGS_PHIL_DARK = asset('./graphics/unitags/phil-dark.png')
export const UNITAGS_SPENCER_LIGHT = asset('./graphics/unitags/spencer-light.png')
export const UNITAGS_SPENCER_DARK = asset('./graphics/unitags/spencer-dark.png')

export const SMART_WALLET_UPGRADE_VIDEO = asset('./videos/dark-etching.mp4')
export const SMART_WALLET_UPGRADE_FALLBACK = asset('./graphics/smart-wallet-image.png')

export const NO_UNISWAP_INTERFACE_FEES_BANNER_LIGHT = asset('./backgrounds/dots-banner-light.png')
export const NO_UNISWAP_INTERFACE_FEES_BANNER_DARK = asset('./backgrounds/dots-banner-dark.png')
export const NO_FEES_ICON = asset('./graphics/zero-percent.png')

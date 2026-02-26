import type { RemoveLiquidityTxInfo } from 'pages/RemoveLiquidity/RemoveLiquidityTxContext'

// RemoveLiquidity は Kasane 向けローカル Tx 生成へ統一したため、
// Trading API への依存をここで完全に切り離す。
export function useRemoveLiquidityTxAndGasInfo(_params: { account?: string }): RemoveLiquidityTxInfo {
  return {
    gasFeeEstimateUSD: undefined,
    decreaseCalldataLoading: false,
    approvalLoading: false,
    error: false,
    v2LpTokenApproval: undefined,
    decreaseCalldata: undefined,
    refetch: undefined,
  }
}

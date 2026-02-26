import { TradingApi } from '@universe/api'

export async function getOrders(orderIds: string[]): Promise<TradingApi.GetOrdersResponse> {
  void orderIds
  return { requestId: 'disabled', orders: [] }
}

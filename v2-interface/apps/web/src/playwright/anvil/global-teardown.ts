import { getAnvilManager } from 'playwright/anvil/anvil-manager'

export default async function globalTeardown(): Promise<void> {
  try {
    await getAnvilManager().stop()
  } catch (error) {
    console.error('Failed to stop Anvil in global teardown:', error)
  }
}

import { StorageDriver } from '@universe/api/src/storage/types'

export function createNativeStorageDriver(): StorageDriver {
  return {
    async get(key: string): Promise<string | null> {
      const value = globalThis.localStorage?.getItem(key)
      return value ?? null
    },

    async set(key: string, value: string): Promise<void> {
      globalThis.localStorage?.setItem(key, value)
    },

    async remove(key: string): Promise<void> {
      globalThis.localStorage?.removeItem(key)
    },
  }
}

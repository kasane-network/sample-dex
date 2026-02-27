import { atom } from 'jotai'
import type { RefObject } from 'react'

export const Web3StatusRef = atom<RefObject<HTMLElement | null> | undefined>(undefined)

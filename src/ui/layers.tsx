import { createContext, useContext } from 'react'
import type { Exercise } from '../lib/types'

export type Layer =
  | { k: 'active' }
  | { k: 'workout'; id: string }
  | { k: 'exercise'; id: string }
  | { k: 'routine'; id: string | null }
  | { k: 'picker'; onPick: (ids: string[]) => void }
  | { k: 'create'; onCreated?: (e: Exercise) => void }
  | { k: 'settings' }

export interface Nav { push: (l: Layer) => void; pop: () => void; replace: (l: Layer) => void }
export const NavCtx = createContext<Nav>({ push() {}, pop() {}, replace() {} })
export const useNav = () => useContext(NavCtx)

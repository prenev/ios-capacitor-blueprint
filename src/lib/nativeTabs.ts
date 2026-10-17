import { useEffect, useRef, useState } from 'react'
import { isIOSApp, NativeShell } from './native'

export interface NativeTab { id: string; label: string; /** SF Symbol name, e.g. "house.fill" */ symbol: string }

/**
 * Drives the real UIKit tab bar (Liquid Glass on iOS 26, the system bar before). Returns true once it is up; render your
 * web tab bar only when this is false. Any failure keeps the web bar, so the app is never left without navigation.
 */
export function useNativeTabs(items: NativeTab[], active: string, hidden: boolean, onSelect: (id: string) => void): boolean {
  const [native, setNative] = useState(false)
  const cb = useRef(onSelect); cb.current = onSelect
  const first = useRef({ items, active })

  useEffect(() => {
    if (!isIOSApp()) return
    let dead = false, handle: { remove: () => Promise<void> } | undefined
    NativeShell.addListener('tabSelected', e => cb.current(e.id)).then(h => { if (dead) h.remove().catch(() => {}); else handle = h }).catch(() => {})
    NativeShell.setTabs({ items: first.current.items, selected: first.current.active }).then(r => {
      if (dead || !r?.native) return
      document.documentElement.style.setProperty('--native-tab-h', `${Math.max(0, Math.round(r.height))}px`)
      setNative(true)
    }).catch(() => {})
    return () => { dead = true; handle?.remove().catch(() => {}) }
  }, [])

  useEffect(() => { document.documentElement.classList.toggle('native-tabs', native) }, [native])
  useEffect(() => { if (native) NativeShell.selectTab({ id: active }).catch(() => {}) }, [native, active])
  useEffect(() => { if (native) NativeShell.setTabsHidden({ hidden }).catch(() => {}) }, [native, hidden])
  return native
}

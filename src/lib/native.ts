import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core'

export const isIOSApp = (): boolean => Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios'

/** The app-local Swift plugin in ios-native/NativeShellPlugin.swift (JS name "NativeShell"). */
export interface NativeShellPlugin {
  /** Shows a real UITabBar over the web view. height = points it covers, for web padding. */
  setTabs(o: { items: { id: string; label: string; symbol: string }[]; selected: string }): Promise<{ native: boolean; height: number }>
  selectTab(o: { id: string }): Promise<void>
  setTabsHidden(o: { hidden: boolean }): Promise<void>
  addListener(event: 'tabSelected', cb: (e: { id: string }) => void): Promise<PluginListenerHandle>
}
export const NativeShell = registerPlugin<NativeShellPlugin>('NativeShell')

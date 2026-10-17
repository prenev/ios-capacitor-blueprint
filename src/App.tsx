import { useState } from 'react'
import { useNativeTabs, type NativeTab } from './lib/nativeTabs'

const TABS: NativeTab[] = [
  { id: 'home', label: 'Home', symbol: 'house.fill' },
  { id: 'search', label: 'Search', symbol: 'magnifyingglass' },
  { id: 'inbox', label: 'Inbox', symbol: 'tray.fill' },
  { id: 'me', label: 'Me', symbol: 'person.fill' },
]

export default function App() {
  const [tab, setTab] = useState('home')
  const [sheet, setSheet] = useState(false)
  // Hide the native bar while a sheet / full-screen flow is open so it never covers the bottom of it.
  const native = useNativeTabs(TABS, tab, sheet, setTab)
  return (
    <>
      <main className="app">
        <h1>{TABS.find(t => t.id === tab)?.label}</h1>
        <p>{native ? 'Native UITabBar is active.' : 'Web tab bar fallback (browser, or the native shell is missing).'}</p>
        <button className="btn" onClick={() => setSheet(true)}>Open a full-screen sheet</button>
      </main>
      {sheet && <div className="sheet"><p>The native tab bar hides while this is open.</p><button className="btn" onClick={() => setSheet(false)}>Close</button></div>}
      {!native && (
        <nav className="webtabs" aria-label="Tabs">
          {TABS.map(t => <button key={t.id} aria-current={t.id === tab} onClick={() => setTab(t.id)}>{t.label}</button>)}
        </nav>
      )}
    </>
  )
}

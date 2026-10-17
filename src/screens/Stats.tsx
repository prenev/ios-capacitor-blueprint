import { useState } from 'react'
import { fmtNum, fmtVolume, fromDisplay, toDisplay, weekStart, weeklyStreak, workoutVolume, workSets } from '../lib/calc'
import { useExercises } from '../lib/exercises'
import { addBody, deleteBody, exportJSON, importJSON, resetAll, updateSettings, useData } from '../lib/store'
import { Bars, Line, NumInput, Segmented, Sheet } from '../ui/bits'
import { useNav } from '../ui/layers'

const WEEK = 7 * 864e5

export function StatsTab() {
  const nav = useNav(), { workouts, settings, body } = useData(), { get } = useExercises()
  const u = settings.unit, cur = weekStart(Date.now())
  const weeks = Array.from({ length: 12 }, (_, i) => cur - (11 - i) * WEEK)
  const inWeek = (i: number) => workouts.filter(w => weekStart(w.start) === weeks[i])
  const counts = weeks.map((_, i) => inWeek(i).length), vols = weeks.map((_, i) => inWeek(i).reduce((a, w) => a + toDisplay(workoutVolume(w), u), 0))
  const labels = weeks.map((t, i) => i % 3 === 0 || i === 11 ? new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : '')
  const muscles = new Map<string, number>()
  for (const w of workouts) if (w.start > Date.now() - 30 * 864e5) for (const e of w.exercises) { const m = get(e.exerciseId).muscle; muscles.set(m, (muscles.get(m) ?? 0) + workSets(e).length) }
  const mrows = [...muscles].sort((a, b) => b[1] - a[1]), mmax = Math.max(1, ...mrows.map(r => r[1]))
  const [bw, setBw] = useState<number | null>(null)
  return (
    <main className="page">
      <div className="head"><h1>Stats</h1><button className="icon" aria-label="Settings" onClick={() => nav.push({ k: 'settings' })}>⚙︎</button></div>
      <div className="tiles">
        <div><small>Workouts</small><b>{workouts.length}</b></div>
        <div><small>This week</small><b>{inWeek(11).length}</b></div>
        <div><small>Week streak</small><b>{weeklyStreak(workouts)}</b></div>
        <div><small>Total volume</small><b>{fmtVolume(workouts.reduce((a, w) => a + workoutVolume(w), 0), u)} {u}</b></div>
      </div>
      <h2>Workouts per week</h2>
      <div className="card"><Bars values={counts} labels={labels} /></div>
      <h2>Volume per week ({u})</h2>
      <div className="card"><Bars values={vols} labels={labels} fmt={n => fmtNum(n, 0)} /></div>
      <h2>Sets by muscle · 30 days</h2>
      <div className="card">
        {!mrows.length && <div className="empty small">No data yet</div>}
        {mrows.map(([m, n]) => <div key={m} className="hbar"><span>{m}</span><i><u style={{ width: `${n / mmax * 100}%` }} /></i><b>{n}</b></div>)}
      </div>
      <h2>Body weight</h2>
      <div className="card">
        <Line pts={body.map(b => ({ t: b.t, y: toDisplay(b.kg, u) }))} fmt={n => `${fmtNum(n)} ${u}`} />
        <div className="inline">
          <NumInput value={bw} placeholder={`Today (${u})`} onChange={setBw} className="num wide" />
          <button className="btn small" disabled={!bw} onClick={() => { addBody(fromDisplay(bw!, u)); setBw(null) }}>Log</button>
        </div>
        {body.slice(-3).reverse().map(b => <div key={b.id} className="split"><small>{new Date(b.t).toLocaleDateString()}</small><span>{fmtNum(toDisplay(b.kg, u))} {u} <button className="link danger" onClick={() => deleteBody(b.id)}>✕</button></span></div>)}
      </div>
    </main>
  )
}

export function Settings() {
  const nav = useNav(), { settings } = useData(), u = settings.unit
  const [msg, setMsg] = useState('')
  const doExport = async () => {
    const name = `plate-backup-${new Date().toISOString().slice(0, 10)}.json`, text = exportJSON()
    try {
      const file = new File([text], name, { type: 'application/json' })
      if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: name }); return }
    } catch (e) { if ((e as Error).name === 'AbortError') return }
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' })); a.download = name; a.click()
    setMsg('Backup downloaded.')
  }
  const doImport = async (f?: File) => {
    if (!f) return
    if (!confirm('Importing replaces everything currently in the app. Continue?')) return
    setMsg(importJSON(await f.text()) ? 'Backup restored.' : 'That file is not a Plate backup.')
  }
  return (
    <Sheet title="Settings" onBack={nav.pop}>
      <div className="pad form">
        <div className="field"><span>Units</span><Segmented value={u} onChange={v => updateSettings({ unit: v })} options={[{ id: 'kg', label: 'kg' }, { id: 'lb', label: 'lb' }]} /></div>
        <label>Rest timer (seconds)<NumInput decimal={false} value={settings.rest} onChange={v => updateSettings({ rest: Math.max(0, v ?? 0) })} /></label>
        <label>Overload step ({u})<NumInput value={Math.round(toDisplay(settings.increment, u) * 100) / 100} onChange={v => updateSettings({ increment: fromDisplay(Math.max(0, v ?? 0), u) })} /></label>
        <p className="hint left">When every set reaches the top of the rep range, the next workout suggests this much more weight.</p>
        <h2>Data</h2>
        <p className="hint left">Everything lives on this device. No account, no network. Back up before deleting the app.</p>
        <button className="btn wide ghost" onClick={doExport}>Export backup</button>
        <label className="btn wide ghost filebtn">Import backup<input type="file" accept="application/json,.json" onChange={e => { doImport(e.target.files?.[0]); e.target.value = '' }} /></label>
        <button className="btn wide ghost danger" onClick={() => { if (confirm('Delete ALL workouts, routines and settings? This cannot be undone.')) { resetAll(); setMsg('All data deleted.') } }}>Delete all data</button>
        {msg && <p className="hint">{msg}</p>}
        <p className="hint">Exercise library: free-exercise-db (public domain).</p>
      </div>
    </Sheet>
  )
}

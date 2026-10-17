import { useMemo, useState } from 'react'
import { MUSCLES, EQUIPMENT, useExercises } from '../lib/exercises'
import { saveCustom, uid } from '../lib/store'
import type { Exercise, Kind } from '../lib/types'
import { Sheet, Segmented } from '../ui/bits'
import { useNav } from '../ui/layers'

export function ExerciseList({ onTap, selected }: { onTap: (e: Exercise) => void; selected?: Set<string> }) {
  const { list, ready } = useExercises()
  const [q, setQ] = useState(''), [m, setM] = useState('')
  const shown = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean)
    return list.filter(e => (!m || e.muscle === m) && words.every(w => `${e.name} ${e.equipment} ${e.muscle}`.toLowerCase().includes(w))).slice(0, 150)
  }, [list, q, m])
  return (
    <>
      <input className="search" type="search" placeholder="Search exercises" value={q} onChange={e => setQ(e.target.value)} />
      <div className="chips">
        <button aria-pressed={!m} onClick={() => setM('')}>All</button>
        {MUSCLES.map(x => <button key={x} aria-pressed={m === x} onClick={() => setM(m === x ? '' : x)}>{x}</button>)}
      </div>
      {!ready && !list.length && <div className="empty">Loading library…</div>}
      <ul className="list">
        {shown.map(e => (
          <li key={e.id}>
            <button className="row" onClick={() => onTap(e)}>
              <span className="row-main"><b>{e.name}</b><small>{e.muscle} · {e.equipment}{e.custom ? ' · custom' : ''}</small></span>
              {selected && <span className={'check' + (selected.has(e.id) ? ' on' : '')}>{selected.has(e.id) ? '✓' : ''}</span>}
            </button>
          </li>
        ))}
      </ul>
      {shown.length === 150 && <p className="hint">Showing the first 150. Search to narrow down.</p>}
      {ready && !shown.length && <div className="empty">No match. Create it as a custom exercise.</div>}
    </>
  )
}

export function ExercisesTab() {
  const nav = useNav()
  return (
    <main className="page">
      <div className="head"><h1>Exercises</h1><button className="link" onClick={() => nav.push({ k: 'create' })}>+ New</button></div>
      <ExerciseList onTap={e => nav.push({ k: 'exercise', id: e.id })} />
    </main>
  )
}

export function Picker({ onPick }: { onPick: (ids: string[]) => void }) {
  const nav = useNav()
  const [sel, setSel] = useState<Set<string>>(new Set())
  const toggle = (id: string) => setSel(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  return (
    <Sheet title="Add exercises" back="close" onBack={nav.pop}
      right={<button className="link" onClick={() => nav.push({ k: 'create', onCreated: e => toggle(e.id) })}>New</button>}>
      <div className="pad"><ExerciseList selected={sel} onTap={e => toggle(e.id)} /></div>
      <div className="dock"><button className="btn wide" disabled={!sel.size} onClick={() => { nav.pop(); onPick([...sel]) }}>{sel.size ? `Add ${sel.size} exercise${sel.size > 1 ? 's' : ''}` : 'Select exercises'}</button></div>
    </Sheet>
  )
}

export function CreateExercise({ onCreated }: { onCreated?: (e: Exercise) => void }) {
  const nav = useNav()
  const [name, setName] = useState(''), [muscle, setMuscle] = useState('Chest'), [equipment, setEq] = useState('Barbell'), [kind, setKind] = useState<Kind>('wr')
  const save = () => {
    const e: Exercise = { id: 'custom-' + uid(), name: name.trim(), muscle, equipment, kind, custom: true }
    saveCustom(e); nav.pop(); onCreated?.(e)
  }
  return (
    <Sheet title="New exercise" back="close" onBack={nav.pop} right={<button className="link" disabled={!name.trim()} onClick={save}>Save</button>}>
      <div className="pad form">
        <label>Name<input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Cable Fly (low to high)" autoFocus /></label>
        <label>Muscle<select value={muscle} onChange={e => setMuscle(e.target.value)}>{MUSCLES.map(x => <option key={x}>{x}</option>)}</select></label>
        <label>Equipment<select value={equipment} onChange={e => setEq(e.target.value)}>{EQUIPMENT.map(x => <option key={x}>{x}</option>)}</select></label>
        <div className="field"><span>Tracks</span>
          <Segmented value={kind} onChange={setKind} options={[{ id: 'wr', label: 'Weight × reps' }, { id: 'bw', label: 'Bodyweight' }, { id: 'time', label: 'Time' }]} />
        </div>
      </div>
    </Sheet>
  )
}

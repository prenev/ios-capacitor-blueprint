import { useState } from 'react'
import { fmtClock } from '../lib/calc'
import { useExercises } from '../lib/exercises'
import { deleteRoutine, saveRoutine, startWorkout, uid, useActive, useData } from '../lib/store'
import type { Routine, RoutineExercise } from '../lib/types'
import { NumInput, Sheet, useNow } from '../ui/bits'
import { useNav } from '../ui/layers'

const STARTERS: { name: string; ex: [string, number, number, number][] }[] = [
  { name: 'Push', ex: [['Barbell_Bench_Press_-_Medium_Grip', 3, 5, 8], ['Standing_Military_Press', 3, 6, 10], ['Incline_Dumbbell_Press', 3, 8, 12], ['Side_Lateral_Raise', 3, 12, 15], ['Triceps_Pushdown', 3, 10, 15]] },
  { name: 'Pull', ex: [['Pullups', 3, 6, 10], ['Bent_Over_Barbell_Row', 3, 6, 10], ['Seated_Cable_Rows', 3, 8, 12], ['Face_Pull', 3, 12, 15], ['Barbell_Curl', 3, 8, 12]] },
  { name: 'Legs', ex: [['Barbell_Squat', 3, 5, 8], ['Romanian_Deadlift', 3, 8, 10], ['Leg_Press', 3, 10, 12], ['Lying_Leg_Curls', 3, 10, 15], ['Standing_Calf_Raises', 4, 10, 15]] },
]

export function WorkoutTab() {
  const nav = useNav(), { routines } = useData(), active = useActive(), { get } = useExercises()
  const now = useNow(!!active)
  const begin = (r?: Routine) => { startWorkout({ routine: r }); nav.push({ k: 'active' }) }
  const addStarters = () => STARTERS.forEach(s => saveRoutine({ id: uid(), name: s.name, exercises: s.ex.map(([exerciseId, sets, repMin, repMax]) => ({ exerciseId, sets, repMin, repMax })) }))
  return (
    <main className="page">
      <div className="head"><h1>Workout</h1><button className="icon" aria-label="Settings" onClick={() => nav.push({ k: 'settings' })}>⚙︎</button></div>
      {active ? (
        <button className="card accent tap" onClick={() => nav.push({ k: 'active' })}>
          <small>In progress · {fmtClock((now - active.start) / 1000)}</small>
          <b>{active.name} — Resume</b>
        </button>
      ) : (
        <button className="btn wide big" onClick={() => begin()}>Start empty workout</button>
      )}
      <div className="head"><h2>Routines</h2><button className="link" onClick={() => nav.push({ k: 'routine', id: null })}>+ New</button></div>
      {!routines.length && (
        <div className="empty">
          No routines yet.
          <button className="btn ghost" onClick={addStarters}>Add Push / Pull / Legs</button>
        </div>
      )}
      {routines.map(r => (
        <div key={r.id} className="card">
          <div className="split"><b>{r.name}</b><button className="link" onClick={() => nav.push({ k: 'routine', id: r.id })}>Edit</button></div>
          <small className="clip">{r.exercises.map(e => get(e.exerciseId).name).join(', ') || 'No exercises'}</small>
          <button className="btn wide small" disabled={!!active || !r.exercises.length} onClick={() => begin(r)}>{active ? 'Finish current workout first' : 'Start'}</button>
        </div>
      ))}
    </main>
  )
}

export function RoutineEditor({ id }: { id: string | null }) {
  const nav = useNav(), { routines } = useData(), { get } = useExercises()
  const [r, setR] = useState<Routine>(() => routines.find(x => x.id === id) ?? { id: uid(), name: '', exercises: [] })
  const set = (i: number, p: Partial<RoutineExercise>) => setR(x => ({ ...x, exercises: x.exercises.map((e, j) => j === i ? { ...e, ...p } : e) }))
  const move = (i: number, d: number) => setR(x => { const a = [...x.exercises], j = i + d; if (j < 0 || j >= a.length) return x; [a[i], a[j]] = [a[j], a[i]]; return { ...x, exercises: a } })
  const save = () => { saveRoutine({ ...r, name: r.name.trim() || 'Routine' }); nav.pop() }
  return (
    <Sheet title={id ? 'Edit routine' : 'New routine'} back="close" onBack={nav.pop} right={<button className="link" disabled={!r.exercises.length} onClick={save}>Save</button>}>
      <div className="pad">
        <input className="search" placeholder="Routine name" value={r.name} onChange={e => setR({ ...r, name: e.target.value })} />
        {r.exercises.map((e, i) => (
          <section key={i} className="ex">
            <div className="ex-head"><b>{get(e.exerciseId).name}</b>
              <span className="row-btns"><button className="icon" aria-label="Move up" onClick={() => move(i, -1)}>↑</button><button className="icon" aria-label="Move down" onClick={() => move(i, 1)}>↓</button><button className="icon" aria-label="Remove" onClick={() => setR(x => ({ ...x, exercises: x.exercises.filter((_, j) => j !== i) }))}>✕</button></span>
            </div>
            <div className="target">
              <label>Sets<NumInput decimal={false} value={e.sets} onChange={v => set(i, { sets: Math.max(1, v ?? 1) })} /></label>
              <label>Reps from<NumInput decimal={false} value={e.repMin} onChange={v => set(i, { repMin: Math.max(1, v ?? 1) })} /></label>
              <label>to<NumInput decimal={false} value={e.repMax} onChange={v => set(i, { repMax: Math.max(e.repMin, v ?? e.repMin) })} /></label>
            </div>
          </section>
        ))}
        <button className="btn wide ghost" onClick={() => nav.push({ k: 'picker', onPick: ids => setR(x => ({ ...x, exercises: [...x.exercises, ...ids.map(exerciseId => ({ exerciseId, sets: 3, repMin: 8, repMax: 12 }))] })) })}>+ Add exercise</button>
        <p className="hint">Rep range drives progressive overload: when every set hits the top, the next workout adds weight and resets to the bottom.</p>
        {id && <button className="btn wide ghost danger" onClick={() => { if (confirm(`Delete "${r.name}"?`)) { deleteRoutine(r.id); nav.pop() } }}>Delete routine</button>}
      </div>
    </Sheet>
  )
}

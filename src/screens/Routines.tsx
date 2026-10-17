import { useState } from 'react'
import { ArrowDown, ArrowUp, Flame, Play, Plus, Settings as Cog, Trash2 } from 'lucide-react'
import { fmtClock, weekStart, weeklyStreak, workoutVolume } from '../lib/calc'
import { useExercises } from '../lib/exercises'
import { deleteRoutine, saveRoutine, startWorkout, uid, useActive, useData } from '../lib/store'
import type { Routine, RoutineExercise } from '../lib/types'
import { NumInput, Ring, Sheet, useNow } from '../ui/bits'
import { Stack, Thumb } from '../ui/ExImage'
import { useNav } from '../ui/layers'

const STARTERS: { name: string; ex: [string, number, number, number][] }[] = [
  { name: 'Push', ex: [['Barbell_Bench_Press_-_Medium_Grip', 3, 5, 8], ['Standing_Military_Press', 3, 6, 10], ['Incline_Dumbbell_Press', 3, 8, 12], ['Side_Lateral_Raise', 3, 12, 15], ['Triceps_Pushdown', 3, 10, 15]] },
  { name: 'Pull', ex: [['Pullups', 3, 6, 10], ['Bent_Over_Barbell_Row', 3, 6, 10], ['Seated_Cable_Rows', 3, 8, 12], ['Face_Pull', 3, 12, 15], ['Barbell_Curl', 3, 8, 12]] },
  { name: 'Legs', ex: [['Barbell_Squat', 3, 5, 8], ['Romanian_Deadlift', 3, 8, 10], ['Leg_Press', 3, 10, 12], ['Lying_Leg_Curls', 3, 10, 15], ['Standing_Calf_Raises', 4, 10, 15]] },
]
const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

function Week() {
  const { workouts, settings } = useData()
  const wk = weekStart(Date.now()), today = (new Date().getDay() + 6) % 7
  const days = new Set(workouts.filter(w => weekStart(w.start) >= wk).map(w => (new Date(w.start).getDay() + 6) % 7))
  const n = workouts.filter(w => weekStart(w.start) === wk).length, streak = weeklyStreak(workouts)
  return (
    <div className="panel week rise">
      <Ring value={n / settings.goal} size={84} stroke={9}><b className="big-n">{n}</b><small>of {settings.goal}</small></Ring>
      <div className="week-r">
        <div className="split"><b>This week</b>{streak > 0 && <span className="streak"><Flame size={15} /> {streak} wk</span>}</div>
        <div className="dots">{DAYS.map((d, i) => <span key={i} className={'day' + (days.has(i) ? ' on' : '') + (i === today ? ' today' : '')}>{d}</span>)}</div>
      </div>
    </div>
  )
}

export function WorkoutTab() {
  const nav = useNav(), { routines, workouts } = useData(), active = useActive(), { get } = useExercises()
  const now = useNow(!!active)
  const begin = (r?: Routine) => { startWorkout({ routine: r }); nav.push({ k: 'active' }) }
  const addStarters = () => STARTERS.forEach(s => saveRoutine({ id: uid(), name: s.name, exercises: s.ex.map(([exerciseId, sets, repMin, repMax]) => ({ exerciseId, sets, repMin, repMax })) }))
  const last = workouts[workouts.length - 1]
  return (
    <main className="page">
      <div className="head">
        <div><small className="eyebrow">{new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</small><h1>Train</h1></div>
        <button className="icon glass" aria-label="Settings" onClick={() => nav.push({ k: 'settings' })}><Cog size={20} /></button>
      </div>
      <Week />
      {active ? (
        <button className="cta live rise" onClick={() => nav.push({ k: 'active' })}>
          <span className="pulse" /><span className="cta-t"><b>{active.name}</b><small>In progress · {fmtClock((now - active.start) / 1000)}</small></span><span className="cta-go">Resume</span>
        </button>
      ) : (
        <button className="cta rise" onClick={() => begin()}><Plus size={22} strokeWidth={2.6} /><span className="cta-t"><b>Start empty workout</b>{last && <small>Last: {last.name}, {new Date(last.start).toLocaleDateString(undefined, { weekday: 'short' })}</small>}</span></button>
      )}
      <div className="head sec"><h2>Routines</h2><button className="link" onClick={() => nav.push({ k: 'routine', id: null })}><Plus size={16} /> New</button></div>
      {!routines.length && (
        <div className="empty panel">
          <b>No routines yet</b>
          <small>Start from a classic split or build your own.</small>
          <button className="btn" onClick={addStarters}>Add Push / Pull / Legs</button>
        </div>
      )}
      {routines.map((r, i) => {
        const sets = r.exercises.reduce((a, e) => a + e.sets, 0)
        return (
          <div key={r.id} className="panel routine rise" style={{ animationDelay: `${60 + i * 40}ms` }}>
            <button className="routine-body" onClick={() => nav.push({ k: 'routine', id: r.id })}>
              <b>{r.name}</b>
              <small>{r.exercises.length} exercises · {sets} sets</small>
              <Stack ids={r.exercises.map(e => e.exerciseId)} size={36} max={5} />
              <small className="clip">{r.exercises.map(e => get(e.exerciseId).name).join(' · ')}</small>
            </button>
            <button className="play" aria-label={`Start ${r.name}`} disabled={!!active || !r.exercises.length} onClick={() => begin(r)}><Play size={20} fill="currentColor" /></button>
          </div>
        )
      })}
      {workouts.length > 0 && <p className="hint">{workouts.length} workouts · {Math.round(workouts.reduce((a, w) => a + workoutVolume(w), 0) / 1000)}t lifted all-time</p>}
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
    <Sheet title={id ? 'Edit routine' : 'New routine'} back="close" onBack={nav.pop} right={<button className="btn small" disabled={!r.exercises.length} onClick={save}>Save</button>}>
      <div className="pad">
        <input className="title-field" placeholder="Routine name" value={r.name} onChange={e => setR({ ...r, name: e.target.value })} />
        {r.exercises.map((e, i) => (
          <section key={i} className="panel ex rise">
            <div className="ex-head"><Thumb id={e.exerciseId} size={44} /><b className="ex-title">{get(e.exerciseId).name}</b>
              <span className="row-btns"><button className="icon" aria-label="Move up" onClick={() => move(i, -1)}><ArrowUp size={18} /></button><button className="icon" aria-label="Move down" onClick={() => move(i, 1)}><ArrowDown size={18} /></button><button className="icon" aria-label="Remove" onClick={() => setR(x => ({ ...x, exercises: x.exercises.filter((_, j) => j !== i) }))}><Trash2 size={18} /></button></span>
            </div>
            <div className="target">
              <label>Sets<NumInput decimal={false} value={e.sets} onChange={v => set(i, { sets: Math.max(1, v ?? 1) })} /></label>
              <label>Reps from<NumInput decimal={false} value={e.repMin} onChange={v => set(i, { repMin: Math.max(1, v ?? 1) })} /></label>
              <label>to<NumInput decimal={false} value={e.repMax} onChange={v => set(i, { repMax: Math.max(e.repMin, v ?? e.repMin) })} /></label>
            </div>
          </section>
        ))}
        <button className="btn wide ghost" onClick={() => nav.push({ k: 'picker', onPick: ids => setR(x => ({ ...x, exercises: [...x.exercises, ...ids.map(exerciseId => ({ exerciseId, sets: 3, repMin: 8, repMax: 12 }))] })) })}><Plus size={18} /> Add exercise</button>
        <p className="hint">The rep range drives progressive overload: when every set hits the top, the next workout adds weight and resets to the bottom.</p>
        {id && <button className="btn wide ghost danger" onClick={() => { if (confirm(`Delete "${r.name}"?`)) { deleteRoutine(r.id); nav.pop() } }}>Delete routine</button>}
      </div>
    </Sheet>
  )
}

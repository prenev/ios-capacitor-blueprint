import { Clock, Repeat, Trash2, Trophy, Weight, BookmarkPlus } from 'lucide-react'
import { fmtDur, fmtVolume, fmtWeight, prsFor, workoutSets, workoutVolume, workSets, e1rm } from '../lib/calc'
import { useExercises } from '../lib/exercises'
import { deleteWorkout, saveRoutine, startWorkout, uid, useActive, useData } from '../lib/store'
import type { Workout } from '../lib/types'
import { Sheet } from '../ui/bits'
import { Stack, Thumb } from '../ui/ExImage'
import { useNav } from '../ui/layers'

const dateLong = (t: number) => new Date(t).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

export function HistoryTab() {
  const nav = useNav(), { workouts, settings } = useData(), { get } = useExercises()
  const list = [...workouts].reverse()
  let month = ''
  return (
    <main className="page">
      <div className="head"><h1>History</h1></div>
      {!list.length && <div className="empty panel"><b>No workouts yet</b><small>Finish one and it shows up here.</small></div>}
      {list.map(w => {
        const m = new Date(w.start).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }), h = m !== month ? <h2 key={'m' + m}>{m}</h2> : null
        month = m
        const prs = [...prsFor(w, workouts).values()].reduce((a, k) => a + k.length, 0)
        return (
          <div key={w.id}>
            {h}
            <button className="panel tap hcard" onClick={() => nav.push({ k: 'workout', id: w.id })}>
              <div className="split"><b className="h-title">{w.name}</b><small>{new Date(w.start).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}</small></div>
              <div className="metrics">
                <span><Clock size={14} />{fmtDur((w.end - w.start) / 1000)}</span>
                <span><Weight size={14} />{fmtVolume(workoutVolume(w), settings.unit)} {settings.unit}</span>
                {prs > 0 && <span className="pr-m"><Trophy size={14} />{prs}</span>}
              </div>
              <div className="split"><Stack ids={w.exercises.map(e => e.exerciseId)} size={30} max={6} /><small>{workoutSets(w)} sets</small></div>
              <small className="clip">{w.exercises.map(e => get(e.exerciseId).name).join(' · ')}</small>
            </button>
          </div>
        )
      })}
    </main>
  )
}

export function WorkoutDetail({ id }: { id: string }) {
  const nav = useNav(), { workouts, settings } = useData(), { get } = useExercises(), active = useActive()
  const w: Workout | undefined = workouts.find(x => x.id === id)
  if (!w) return <Sheet title="Workout" onBack={nav.pop}><div className="empty">Workout not found.</div></Sheet>
  const u = settings.unit, prs = prsFor(w, workouts)
  const prCount = [...prs.values()].reduce((a, k) => a + k.length, 0)
  const repeat = () => { if (active) { alert('Finish or discard your current workout first.'); return } startWorkout({ from: w }); nav.replace({ k: 'active' }) }
  const toRoutine = () => {
    saveRoutine({ id: uid(), name: w.name, exercises: w.exercises.map(e => ({ exerciseId: e.exerciseId, sets: workSets(e).length || 1, repMin: e.repMin, repMax: e.repMax })) })
    alert('Saved as a routine.')
  }
  return (
    <Sheet onBack={nav.pop} right={<button className="icon glass" aria-label="Delete workout" onClick={() => { if (confirm('Delete this workout?')) { deleteWorkout(w.id); nav.pop() } }}><Trash2 size={19} /></button>}>
      <div className="pad">
        <small className="eyebrow">{dateLong(w.start)}</small>
        <h1 className="ex-h1">{w.name}</h1>
        <div className="tiles three">
          <div><small>Time</small><b>{fmtDur((w.end - w.start) / 1000)}</b></div>
          <div><small>Volume</small><b>{fmtVolume(workoutVolume(w), u)}<i>{u}</i></b></div>
          <div className={prCount ? 'gold' : ''}><small>Records</small><b>{prCount ? <><Trophy size={18} /> {prCount}</> : '–'}</b></div>
        </div>
        {w.exercises.map(e => (
          <section key={e.id} className="panel ex rise">
            <button className="ex-tap" onClick={() => nav.push({ k: 'exercise', id: e.exerciseId })}><Thumb id={e.exerciseId} size={46} /><span className="ex-title"><b>{get(e.exerciseId).name}</b><small>{get(e.exerciseId).muscle}</small></span></button>
            {e.note && <p className="hint left">{e.note}</p>}
            {e.sets.map((s, i) => {
              const t = get(e.exerciseId).kind === 'time', k = prs.get(s.id)
              return (
                <div key={s.id} className="hset">
                  <span className={'set-n ' + s.type}>{s.type === 'normal' ? e.sets.slice(0, i + 1).filter(x => x.type !== 'warmup').length : s.type[0].toUpperCase()}</span>
                  <span className="hset-v">{t ? fmtDur(s.reps ?? 0) : `${s.weight ? fmtWeight(s.weight, u) + ' ' + u + ' × ' : ''}${s.reps ?? 0}`}</span>
                  <small>{!t && s.weight ? `1RM ${fmtWeight(e1rm(s.weight, s.reps ?? 0), u)}` : ''}</small>
                  {k && <span className="pr"><Trophy size={13} /> {k.map(x => x === 'weight' ? 'Weight' : x === '1rm' ? '1RM' : 'Volume').join(' · ')}</span>}
                </div>
              )
            })}
          </section>
        ))}
        <button className="btn wide" onClick={repeat}><Repeat size={18} /> Repeat workout</button>
        <button className="btn wide ghost" onClick={toRoutine}><BookmarkPlus size={18} /> Save as routine</button>
      </div>
    </Sheet>
  )
}

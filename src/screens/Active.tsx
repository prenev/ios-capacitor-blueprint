import { useState } from 'react'
import { fmtClock, fmtWeight, fromDisplay, sessionsFor, toDisplay, workoutVolume, fmtVolume } from '../lib/calc'
import { useExercises } from '../lib/exercises'
import { addExercises, adjustRest, discardWorkout, finishWorkout, patchActive, startRest, stopRest, uid, useActive, useData, useRestEnd } from '../lib/store'
import type { SetEntry, SetType, WorkoutExercise } from '../lib/types'
import { Menu, NumInput, Sheet, useNow } from '../ui/bits'
import { useNav } from '../ui/layers'

const TYPE_LABEL: Record<SetType, string> = { normal: '', warmup: 'W', drop: 'D', failure: 'F' }

function RestBar() {
  const end = useRestEnd(), now = useNow(end > 0, 250)
  if (!end) return null
  const left = Math.ceil((end - now) / 1000)
  return (
    <div className="rest">
      <button onClick={() => adjustRest(-15)}>−15</button>
      <b>{left > 0 ? `Rest ${fmtClock(left)}` : 'Rest over — go!'}</b>
      <button onClick={() => adjustRest(15)}>+15</button>
      <button className="skip" onClick={stopRest}>Skip</button>
    </div>
  )
}

function ExerciseCard({ we }: { we: WorkoutExercise }) {
  const nav = useNav(), { get } = useExercises(), { workouts, settings } = useData()
  const ex = get(we.exerciseId), u = settings.unit, time = ex.kind === 'time'
  const [menu, setMenu] = useState(false), [setMenuFor, setSetMenuFor] = useState<SetEntry | null>(null)
  const prev = sessionsFor(we.exerciseId, workouts)[0]?.sets ?? []
  const patch = (fn: (e: WorkoutExercise) => WorkoutExercise) => patchActive(w => ({ ...w, exercises: w.exercises.map(x => x.id === we.id ? fn(x) : x) }))
  const patchSet = (id: string, p: Partial<SetEntry>) => patch(e => ({ ...e, sets: e.sets.map(s => s.id === id ? { ...s, ...p } : s) }))
  const toggle = (s: SetEntry) => {
    if (!s.done) startRest(settings.rest)
    else stopRest()
    patchSet(s.id, { done: !s.done })
  }
  const addSet = () => patch(e => { const l = e.sets[e.sets.length - 1]; return { ...e, sets: [...e.sets, { id: uid(), type: 'normal', weight: l?.weight ?? null, reps: l?.reps ?? null, done: false }] } })
  let wi = 0
  return (
    <section className="ex">
      <div className="ex-head">
        <button className="ex-name" onClick={() => nav.push({ k: 'exercise', id: ex.id })}>{ex.name}</button>
        <button className="icon" aria-label="Exercise options" onClick={() => setMenu(true)}>⋯</button>
      </div>
      <input className="note" placeholder="Note" value={we.note} onChange={e => patch(x => ({ ...x, note: e.target.value }))} />
      <div className="sets-head"><span>SET</span><span>PREV</span><span>{time ? '' : ex.kind === 'bw' ? `+${u.toUpperCase()}` : u.toUpperCase()}</span><span>{time ? 'SEC' : 'REPS'}</span><span /></div>
      {we.sets.map(s => {
        if (s.type !== 'warmup') wi++
        const p = prev[Math.min(wi - 1, prev.length - 1)]
        return (
          <div key={s.id} className={'set' + (s.done ? ' done' : '')}>
            <button className={'set-n ' + s.type} onClick={() => setSetMenuFor(s)}>{TYPE_LABEL[s.type] || wi}</button>
            <button className="prev" onClick={() => p && patchSet(s.id, { weight: p.weight, reps: p.reps })}>{p ? (time ? `${p.reps}s` : `${p.weight ? fmtWeight(p.weight, u) + '×' : ''}${p.reps}`) : '–'}</button>
            {time ? <span /> : <NumInput value={s.weight == null ? null : Math.round(toDisplay(s.weight, u) * 100) / 100} placeholder="0" onChange={v => patchSet(s.id, { weight: v == null ? null : fromDisplay(v, u) })} />}
            <NumInput value={s.reps} placeholder="0" decimal={false} onChange={v => patchSet(s.id, { reps: v })} />
            <button className={'check' + (s.done ? ' on' : '')} aria-label={s.done ? 'Mark not done' : 'Mark done'} aria-pressed={s.done} onClick={() => toggle(s)}>✓</button>
          </div>
        )
      })}
      <button className="add-set" onClick={addSet}>+ Add set</button>
      {menu && <Menu onClose={() => setMenu(false)} items={[
        { label: 'View history & progress', run: () => nav.push({ k: 'exercise', id: ex.id }) },
        { label: 'Move up', run: () => patchActive(w => { const i = w.exercises.findIndex(x => x.id === we.id); if (i < 1) return w; const a = [...w.exercises]; [a[i - 1], a[i]] = [a[i], a[i - 1]]; return { ...w, exercises: a } }) },
        { label: 'Remove exercise', danger: true, run: () => patchActive(w => ({ ...w, exercises: w.exercises.filter(x => x.id !== we.id) })) },
      ]} />}
      {setMenuFor && <Menu onClose={() => setSetMenuFor(null)} items={[
        ...(['normal', 'warmup', 'drop', 'failure'] as SetType[]).map(t => ({ label: { normal: 'Normal set', warmup: 'Warm-up set', drop: 'Drop set', failure: 'Failure set' }[t], run: () => patchSet(setMenuFor.id, { type: t }) })),
        { label: 'Delete set', danger: true, run: () => patch(e => ({ ...e, sets: e.sets.filter(x => x.id !== setMenuFor.id) })) },
      ]} />}
    </section>
  )
}

export function ActiveWorkout() {
  const nav = useNav(), w = useActive(), { settings } = useData()
  const now = useNow(!!w)
  if (!w) return null
  const done = w.exercises.reduce((a, e) => a + e.sets.filter(s => s.done).length, 0)
  const total = w.exercises.reduce((a, e) => a + e.sets.length, 0)
  const finish = () => {
    if (!done) { if (confirm('No sets are checked off. Discard this workout?')) { discardWorkout(); nav.pop() } return }
    const left = total - done
    if (left && !confirm(`${left} unchecked set${left > 1 ? 's' : ''} will be dropped. Finish workout?`)) return
    const id = finishWorkout()
    if (id) nav.replace({ k: 'workout', id })
  }
  return (
    <Sheet back="down" onBack={nav.pop}
      title={<input className="title-in" value={w.name} aria-label="Workout name" onChange={e => patchActive(x => ({ ...x, name: e.target.value }))} />}
      right={<button className="btn small" onClick={finish}>Finish</button>}>
      <RestBar />
      <div className="pad">
        <div className="tiles three">
          <div><small>Duration</small><b>{fmtClock((now - w.start) / 1000)}</b></div>
          <div><small>Volume</small><b>{fmtVolume(workoutVolume(w), settings.unit)} {settings.unit}</b></div>
          <div><small>Sets</small><b>{done}/{total}</b></div>
        </div>
        {w.exercises.map(e => <ExerciseCard key={e.id} we={e} />)}
        <button className="btn wide ghost" onClick={() => nav.push({ k: 'picker', onPick: addExercises })}>+ Add exercise</button>
        <button className="btn wide ghost danger" onClick={() => { if (confirm('Discard this workout? Nothing will be saved.')) { discardWorkout(); nav.pop() } }}>Discard workout</button>
        <p className="hint">Checking a set off starts the rest timer ({settings.rest}s). Tap PREV to copy last time. Tap the set number for warm-up / drop / failure.</p>
      </div>
    </Sheet>
  )
}

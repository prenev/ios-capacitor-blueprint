import { useState } from 'react'
import { fmtDur, fmtNum, fmtWeight, recordsFor, sessionsFor, setVolume, e1rm, suggest, toDisplay } from '../lib/calc'
import { useExercises } from '../lib/exercises'
import { deleteCustom, useData } from '../lib/store'
import { Line, Segmented, Sheet } from '../ui/bits'
import { useNav } from '../ui/layers'

type Metric = 'weight' | '1rm' | 'volume'

export function ExerciseDetail({ id }: { id: string }) {
  const nav = useNav(), { get } = useExercises(), { workouts, settings } = useData()
  const ex = get(id), u = settings.unit, time = ex.kind === 'time'
  const [metric, setMetric] = useState<Metric>('weight')
  const sessions = sessionsFor(id, workouts), chrono = [...sessions].reverse()
  const rec = recordsFor(sessions)
  const next = sessions.length ? suggest(id, workouts, 8, 12, settings.increment, undefined, ex.kind)[0] : null
  const val = (s: typeof sessions[number]) => time ? Math.max(...s.sets.map(x => x.reps ?? 0))
    : metric === 'weight' ? toDisplay(Math.max(...s.sets.map(x => x.weight ?? 0)), u)
    : metric === '1rm' ? toDisplay(Math.max(...s.sets.map(x => e1rm(x.weight ?? 0, x.reps ?? 0))), u)
    : toDisplay(s.sets.reduce((a, x) => a + setVolume(x), 0), u)
  return (
    <Sheet title={ex.name} onBack={nav.pop} right={ex.custom ? <button className="link danger" onClick={() => { if (confirm(`Delete "${ex.name}"? Past workouts keep their data.`)) { deleteCustom(id); nav.pop() } }}>Delete</button> : undefined}>
      <div className="pad">
        <p className="sub">{ex.muscle} · {ex.equipment}</p>
        {next && !time && (
          <div className="card accent">
            <small>Next target (double progression, 8–12 reps)</small>
            <b>{next.weight ? `${fmtWeight(next.weight, u)} ${u} × ` : ''}{next.reps} reps {next.up && <span className="tag">↑ add weight</span>}</b>
          </div>
        )}
        {!time && sessions.length > 0 && (
          <>
            <div className="tiles">
              <div><small>Heaviest</small><b>{fmtWeight(rec.weight, u)} {u}</b></div>
              <div><small>Est. 1RM</small><b>{fmtWeight(rec.e1rm, u)} {u}</b></div>
              <div><small>Best set vol.</small><b>{fmtWeight(rec.setVolume, u)} {u}</b></div>
              <div><small>Best session vol.</small><b>{fmtWeight(rec.sessionVolume, u)} {u}</b></div>
            </div>
            <Segmented value={metric} onChange={setMetric} options={[{ id: 'weight', label: 'Weight' }, { id: '1rm', label: 'Est. 1RM' }, { id: 'volume', label: 'Volume' }]} />
          </>
        )}
        <Line pts={chrono.map(s => ({ t: s.workout.start, y: val(s) }))} fmt={n => time ? fmtDur(n) : fmtNum(n)} />
        <h2>History</h2>
        {!sessions.length && <div className="empty">No sets logged yet.</div>}
        {sessions.map(s => (
          <button key={s.workout.id + s.ex.id} className="card tap" onClick={() => nav.push({ k: 'workout', id: s.workout.id })}>
            <div className="split"><b>{new Date(s.workout.start).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</b><small>{s.workout.name}</small></div>
            <div className="sets">{s.sets.map((x, i) => <span key={x.id}>{i + 1}. {time ? fmtDur(x.reps ?? 0) : `${x.weight ? fmtWeight(x.weight, u) + ' × ' : ''}${x.reps ?? 0}`}</span>)}</div>
          </button>
        ))}
        {ex.howto && <><h2>How to</h2><p className="howto">{ex.howto}</p></>}
      </div>
    </Sheet>
  )
}

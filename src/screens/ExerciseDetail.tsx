import { useState } from 'react'
import { ArrowUp, Trash2 } from 'lucide-react'
import { fmtDur, fmtNum, fmtWeight, recordsFor, sessionsFor, setVolume, e1rm, suggest, toDisplay } from '../lib/calc'
import { useExercises } from '../lib/exercises'
import { deleteCustom, useData } from '../lib/store'
import { Line, Segmented, Sheet } from '../ui/bits'
import { Hero } from '../ui/ExImage'
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
    <Sheet floating onBack={nav.pop} right={ex.custom ? <button className="icon glass" aria-label="Delete exercise" onClick={() => { if (confirm(`Delete "${ex.name}"? Past workouts keep their data.`)) { deleteCustom(id); nav.pop() } }}><Trash2 size={19} /></button> : undefined}>
      <Hero id={id} />
      <div className="pad pull-up">
        <h1 className="ex-h1">{ex.name}</h1>
        <div className="pills"><span>{ex.muscle}</span><span>{ex.equipment}</span>{ex.custom && <span>Custom</span>}</div>
        {next && !time && (
          <div className="panel target-card rise">
            <small className="eyebrow">Next target</small>
            <div className="target-big"><b>{next.weight ? fmtWeight(next.weight, u) : '—'}<i>{next.weight ? u : ''}</i></b><span>×</span><b>{next.reps}<i>reps</i></b>{next.up && <span className="tag"><ArrowUp size={12} strokeWidth={3} /> add weight</span>}</div>
          </div>
        )}
        {!time && sessions.length > 0 && (
          <div className="tiles">
            <div><small>Heaviest</small><b>{fmtWeight(rec.weight, u)}<i>{u}</i></b></div>
            <div><small>Est. 1RM</small><b>{fmtWeight(rec.e1rm, u)}<i>{u}</i></b></div>
            <div><small>Best set</small><b>{fmtWeight(rec.setVolume, u)}<i>{u}</i></b></div>
            <div><small>Best session</small><b>{fmtWeight(rec.sessionVolume, u)}<i>{u}</i></b></div>
          </div>
        )}
        {!time && sessions.length > 0 && <Segmented value={metric} onChange={setMetric} options={[{ id: 'weight', label: 'Weight' }, { id: '1rm', label: 'Est. 1RM' }, { id: 'volume', label: 'Volume' }]} />}
        <div className="panel flush"><Line pts={chrono.map(s => ({ t: s.workout.start, y: val(s) }))} fmt={n => time ? fmtDur(n) : fmtNum(n)} /></div>
        <h2>History</h2>
        {!sessions.length && <div className="empty">No sets logged yet.</div>}
        {sessions.map(s => (
          <button key={s.workout.id + s.ex.id} className="panel tap hist" onClick={() => nav.push({ k: 'workout', id: s.workout.id })}>
            <div className="split"><b>{new Date(s.workout.start).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</b><small>{s.workout.name}</small></div>
            <div className="sets">{s.sets.map((x, i) => <span key={x.id}><em>{i + 1}</em>{time ? fmtDur(x.reps ?? 0) : `${x.weight ? fmtWeight(x.weight, u) + ' × ' : ''}${x.reps ?? 0}`}</span>)}</div>
          </button>
        ))}
        {ex.howto && <><h2>How to</h2><p className="howto">{ex.howto}</p></>}
      </div>
    </Sheet>
  )
}

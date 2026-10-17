import { e1rm, isWork, sessionsFor, weekStart, workSets, type Session } from '../src/lib/calc'
import type { Data, Exercise, Workout } from '../src/lib/types'

export interface Finding { severity: 'high' | 'medium' | 'low' | 'info'; area: string; message: string; evidence: string }
const DAY = 864e5, WEEK = 7 * DAY
const PUSH = ['Chest', 'Shoulders', 'Triceps'], PULL = ['Back', 'Biceps']
const MAJOR = ['Chest', 'Back', 'Shoulders', 'Quads', 'Hamstrings', 'Glutes', 'Biceps', 'Triceps', 'Calves', 'Abs']
const r1 = (n: number) => Math.round(n * 10) / 10
const median = (a: number[]) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0 }

/**
 * Heuristic coaching checks over the last `weeks` weeks. These are rules of thumb (not medical or coaching advice): every
 * finding carries its evidence so the caller (an AI) can sanity-check it against the raw data.
 */
export function analyze(data: Data, get: (id: string) => Exercise, weeks = 8, now = Date.now()): { findings: Finding[]; stats: Record<string, unknown> } {
  const from = now - weeks * WEEK
  const recent = data.workouts.filter(w => w.start >= from)
  const out: Finding[] = []
  const add = (severity: Finding['severity'], area: string, message: string, evidence: string) => out.push({ severity, area, message, evidence })
  if (!recent.length) {
    add('info', 'data', `No workouts logged in the last ${weeks} weeks, so there is nothing to analyse.`, `total workouts on file: ${data.workouts.length}`)
    return { findings: out, stats: { weeks, workouts: 0 } }
  }

  // consistency
  const perWeek = recent.length / weeks
  const last = Math.max(...data.workouts.map(w => w.start)), idle = Math.floor((now - last) / DAY)
  if (perWeek < 2) add('medium', 'consistency', 'Training less than twice a week makes progressive overload slow.', `${r1(perWeek)} workouts/week over ${weeks} weeks`)
  if (idle >= 10) add('info', 'consistency', `Last workout was ${idle} days ago.`, `last: ${new Date(last).toISOString().slice(0, 10)}`)

  // weekly sets per muscle
  const sets = new Map<string, number>(), days = new Map<string, Set<string>>()
  for (const w of recent) for (const e of w.exercises) {
    const m = get(e.exerciseId).muscle, n = workSets(e).length
    sets.set(m, (sets.get(m) ?? 0) + n)
    if (n) (days.get(m) ?? days.set(m, new Set()).get(m)!).add(new Date(w.start).toDateString())
  }
  const wk = (m: string) => (sets.get(m) ?? 0) / weeks
  const untrained = MAJOR.filter(m => !sets.get(m))
  if (untrained.length) add(untrained.some(m => !['Abs', 'Calves'].includes(m)) ? 'medium' : 'low', 'volume', `Not trained at all: ${untrained.join(', ')}.`, `0 working sets in ${weeks} weeks`)
  for (const m of MAJOR.filter(m => sets.get(m))) {
    const v = wk(m), freq = (days.get(m)?.size ?? 0) / weeks
    if (v < 6) add('low', 'volume', `${m} volume is low (about 10–20 hard sets/week is a common hypertrophy range; fewer can still maintain).`, `${r1(v)} sets/week`)
    else if (v > 25) add('medium', 'volume', `${m} volume is very high, which can outpace recovery.`, `${r1(v)} sets/week`)
    if (v >= 8 && freq <= 1.05) add('low', 'frequency', `${m} is hit once a week with high volume; splitting it over two days is often more effective.`, `${r1(v)} sets/week on ${r1(freq)} days/week`)
  }

  // balance
  const sum = (ms: string[]) => ms.reduce((a, m) => a + wk(m), 0), push = sum(PUSH), pull = sum(PULL)
  if (pull > 0 && push / pull > 1.5) add('medium', 'balance', 'Pushing outweighs pulling; add rows / pull-downs / rear delts to protect the shoulders.', `push ${r1(push)} vs pull ${r1(pull)} sets/week`)
  if (push > 0 && pull / push > 1.5) add('low', 'balance', 'Pulling outweighs pushing.', `push ${r1(push)} vs pull ${r1(pull)} sets/week`)
  else if (push === 0 && pull > 0) add('medium', 'balance', 'No pushing work logged.', `pull ${r1(pull)} sets/week`)
  const post = wk('Hamstrings') + wk('Glutes')
  if (wk('Quads') > 0 && wk('Quads') > 2 * post) add('medium', 'balance', 'Quads get far more work than hamstrings/glutes; add hinges and curls.', `quads ${r1(wk('Quads'))} vs hams+glutes ${r1(post)} sets/week`)

  // per-exercise: stalls, skipped overload, too heavy, warm-ups
  const ids = [...new Set(recent.flatMap(w => w.exercises.map(e => e.exerciseId)))]
  for (const id of ids) {
    const ex = get(id)
    if (ex.kind === 'time') continue
    const ses = sessionsFor(id, data.workouts).filter(s => s.workout.start >= from) // newest first
    if (ses.length < 2) continue
    const top = (s: Session) => Math.max(...s.sets.map(x => e1rm(x.weight ?? 0, x.reps ?? 0)))
    if (ses.length >= 4) {
      const last3 = Math.max(...ses.slice(0, 3).map(top)), before = Math.max(...ses.slice(3).map(top))
      if (before > 0 && last3 <= before + 1e-6) add('medium', 'stall', `${ex.name} has not improved in its last 3 sessions. Consider a deload, a different rep range, more weekly sets, or checking sleep/food.`, `best est. 1RM in last 3 sessions ${r1(last3)} kg vs ${r1(before)} kg before`)
    }
    const [n, p] = ses // newest, previous
    const wtop = (s: Session) => Math.max(...s.sets.map(x => x.weight ?? 0))
    if (p.sets.every(s => (s.reps ?? 0) >= p.ex.repMax) && wtop(p) > 0 && wtop(n) <= wtop(p))
      add('low', 'overload', `${ex.name}: every set reached ${p.ex.repMax} reps last time but the weight was not increased.`, `${new Date(p.workout.start).toISOString().slice(0, 10)}: ${p.sets.map(s => `${s.weight}x${s.reps}`).join(', ')} -> next ${n.sets.map(s => `${s.weight}x${s.reps}`).join(', ')}`)
    if (ses.slice(0, 2).every(s => s.sets.reduce((a, x) => a + (x.reps ?? 0), 0) / s.sets.length < s.ex.repMin - 0.5))
      add('low', 'overload', `${ex.name}: average reps are below the ${n.ex.repMin}–${n.ex.repMax} target for two sessions, so the weight is probably too heavy.`, `avg reps ${ses.slice(0, 2).map(s => r1(s.sets.reduce((a, x) => a + (x.reps ?? 0), 0) / s.sets.length)).join(', ')}`)
    if (ex.equipment === 'Barbell' && ses.length >= 4 && ses.every(s => !s.ex.sets.some(x => x.done && x.type === 'warmup')) && wtop(n) > 0)
      add('info', 'warm-up', `No warm-up sets logged for ${ex.name} in ${ses.length} sessions (ignore if you warm up elsewhere).`, `heaviest set ${wtop(n)} kg`)
  }

  // session length and load spikes
  const durs = recent.map(w => (w.end - w.start) / 60000).filter(d => d > 0)
  const md = median(durs)
  if (md > 100) add('low', 'sessions', 'Typical sessions are long; check rest times and exercise count.', `median ${Math.round(md)} min`)
  const vol = (w: Workout) => w.exercises.reduce((a, e) => a + workSets(e).reduce((b, s) => b + (s.weight ?? 0) * (s.reps ?? 0), 0), 0)
  const cur = weekStart(now), wv = (i: number) => data.workouts.filter(w => weekStart(w.start) === cur - i * WEEK).reduce((a, w) => a + vol(w), 0)
  const prior = (wv(2) + wv(3) + wv(4)) / 3
  if (prior > 0 && wv(1) > prior * 1.4) add('medium', 'load', 'Last full week\'s volume jumped sharply versus the weeks before; big spikes raise injury and fatigue risk.', `${Math.round(wv(1))} kg vs ${Math.round(prior)} kg 3-week average`)

  const rank = { high: 0, medium: 1, low: 2, info: 3 }
  out.sort((a, b) => rank[a.severity] - rank[b.severity])
  return { findings: out, stats: { weeks, workouts: recent.length, workoutsPerWeek: r1(perWeek), medianMinutes: Math.round(md), setsPerWeekByMuscle: Object.fromEntries([...sets].map(([m, n]) => [m, r1(n / weeks)])), doneSets: recent.reduce((a, w) => a + w.exercises.reduce((b, e) => b + e.sets.filter(isWork).length, 0), 0) } }
}

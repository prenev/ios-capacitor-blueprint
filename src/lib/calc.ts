import type { Kind, SetEntry, Workout, WorkoutExercise } from './types'

export const LB = 2.20462262
export const toDisplay = (kg: number, unit: 'kg' | 'lb') => unit === 'kg' ? kg : kg * LB
export const fromDisplay = (v: number, unit: 'kg' | 'lb') => unit === 'kg' ? v : v / LB
export const fmtNum = (n: number, dp = 1) => String(Math.round(n * 10 ** dp) / 10 ** dp)
export const fmtWeight = (kg: number | null, unit: 'kg' | 'lb') => kg == null ? '–' : fmtNum(toDisplay(kg, unit))
export const fmtVolume = (kg: number, unit: 'kg' | 'lb') => { const v = toDisplay(kg, unit); return v >= 10000 ? `${fmtNum(v / 1000)}k` : fmtNum(v, 0) }
export const fmtDur = (sec: number) => { sec = Math.max(0, Math.round(sec)); const h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s = sec % 60; return h ? `${h}h ${m}m` : m ? `${m}m ${String(s).padStart(2, '0')}s` : `${s}s` }
export const fmtClock = (sec: number) => { sec = Math.max(0, Math.round(sec)); const h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s = sec % 60; return (h ? `${h}:${String(m).padStart(2, '0')}` : `${m}`) + `:${String(s).padStart(2, '0')}` }

export const e1rm = (w: number, r: number) => r <= 0 ? 0 : r === 1 ? w : w * (1 + r / 30) // Epley
export const setVolume = (s: SetEntry) => (s.weight ?? 0) * (s.reps ?? 0)
export const isWork = (s: SetEntry) => s.done && s.type !== 'warmup'
export const workSets = (e: WorkoutExercise) => e.sets.filter(isWork)
export const workoutVolume = (w: Workout) => w.exercises.reduce((a, e) => a + workSets(e).reduce((b, s) => b + setVolume(s), 0), 0)
export const workoutSets = (w: Workout) => w.exercises.reduce((a, e) => a + workSets(e).length, 0)

export interface Session { workout: Workout; ex: WorkoutExercise; sets: SetEntry[] }
/** Past sessions of one exercise, newest first, working sets only. */
export function sessionsFor(exerciseId: string, workouts: Workout[]): Session[] {
  const out: Session[] = []
  for (const workout of workouts) for (const ex of workout.exercises) {
    if (ex.exerciseId !== exerciseId) continue
    const sets = workSets(ex)
    if (sets.length) out.push({ workout, ex, sets })
  }
  return out.sort((a, b) => b.workout.start - a.workout.start)
}

export interface Target { weight: number | null; reps: number | null; up: boolean }
/**
 * Double progression: stay at a weight until every working set reaches the top of the rep range, then add
 * `inc` kg and drop back to the bottom. Otherwise keep the weight and aim for one more rep per set.
 */
export function suggest(exerciseId: string, workouts: Workout[], repMin: number, repMax: number, inc: number, count?: number, kind: Kind = 'wr'): Target[] {
  const last = sessionsFor(exerciseId, workouts)[0]
  const n = count ?? last?.sets.length ?? 3
  if (!last) return Array.from({ length: n }, () => ({ weight: null, reps: kind === 'time' ? 60 : repMin, up: false }))
  if (kind === 'time') return Array.from({ length: n }, (_, i) => ({ weight: null, reps: last.sets[Math.min(i, last.sets.length - 1)].reps, up: false }))
  const heavy = last.sets.some(s => (s.weight ?? 0) > 0)
  const allTop = last.sets.every(s => (s.reps ?? 0) >= repMax)
  return Array.from({ length: n }, (_, i) => {
    const p = last.sets[Math.min(i, last.sets.length - 1)]
    const w = p.weight ?? 0, r = p.reps ?? repMin
    if (allTop && heavy) return { weight: w + inc, reps: repMin, up: true }
    return { weight: p.weight, reps: heavy ? Math.min(repMax, r + 1) : r + 1, up: false }
  })
}

export type PRKind = 'weight' | '1rm' | 'volume'
/** Sets in `w` that beat everything done before it (needs prior history of that exercise). */
export function prsFor(w: Workout, all: Workout[]): Map<string, PRKind[]> {
  const out = new Map<string, PRKind[]>()
  const before = all.filter(x => x.start < w.start)
  for (const ex of w.exercises) {
    const prior = sessionsFor(ex.exerciseId, before).flatMap(s => s.sets)
    if (!prior.length) continue
    let bw = Math.max(...prior.map(s => s.weight ?? 0)), b1 = Math.max(...prior.map(s => e1rm(s.weight ?? 0, s.reps ?? 0))), bv = Math.max(...prior.map(setVolume))
    if (bw <= 0) continue
    for (const s of workSets(ex)) {
      const k: PRKind[] = [], wt = s.weight ?? 0
      if (wt > bw) { k.push('weight'); bw = wt }
      const o = e1rm(wt, s.reps ?? 0); if (o > b1 + 1e-9) { k.push('1rm'); b1 = o }
      const v = setVolume(s); if (v > bv) { k.push('volume'); bv = v }
      if (k.length) out.set(s.id, k)
    }
  }
  return out
}

export interface Records { weight: number; e1rm: number; setVolume: number; sessionVolume: number; reps: number }
export function recordsFor(sessions: Session[]): Records {
  const r: Records = { weight: 0, e1rm: 0, setVolume: 0, sessionVolume: 0, reps: 0 }
  for (const s of sessions) {
    let v = 0
    for (const x of s.sets) { r.weight = Math.max(r.weight, x.weight ?? 0); r.e1rm = Math.max(r.e1rm, e1rm(x.weight ?? 0, x.reps ?? 0)); r.setVolume = Math.max(r.setVolume, setVolume(x)); r.reps = Math.max(r.reps, x.reps ?? 0); v += setVolume(x) }
    r.sessionVolume = Math.max(r.sessionVolume, v)
  }
  return r
}

export const weekStart = (t: number) => { const d = new Date(t); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - (d.getDay() + 6) % 7); return d.getTime() } // Monday
export function weeklyStreak(workouts: Workout[]): number {
  const weeks = new Set(workouts.map(w => weekStart(w.start)))
  let cur = weekStart(Date.now()), n = 0
  if (!weeks.has(cur)) cur = weekStart(cur - 1)
  while (weeks.has(cur)) { n++; cur = weekStart(cur - 1) }
  return n
}

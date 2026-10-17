import { useSyncExternalStore } from 'react'
import type { BodyWeight, Data, Exercise, Routine, Settings, Workout, WorkoutExercise } from './types'
import { suggest } from './calc'
import { base } from './exbase'

const KEY = 'plate.data', AKEY = 'plate.active'
export const uid = (): string => (globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`)

const DEFAULTS: Data = { v: 1, workouts: [], routines: [], custom: [], body: [], settings: { unit: 'kg', rest: 90, increment: 2.5 } }

const read = <T,>(k: string): T | null => { try { const s = localStorage.getItem(k); return s ? JSON.parse(s) as T : null } catch { return null } }
const write = (k: string, v: unknown) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)) } catch { /* storage full / blocked: keep running in memory */ } }

let data: Data = (() => { const d = read<Data>(KEY); return d && d.v === 1 ? { ...DEFAULTS, ...d, settings: { ...DEFAULTS.settings, ...d.settings } } : DEFAULTS })()
let active: Workout | null = read<Workout>(AKEY)
let restEnd = 0 // epoch ms when the rest timer ends (0 = off); not persisted
const subs = new Set<() => void>()
const emit = () => subs.forEach(f => f())
const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f) } }

const setData = (fn: (d: Data) => Data) => { data = fn(data); write(KEY, data); emit() }
const setActive = (a: Workout | null) => { active = a; write(AKEY, a); emit() }

export const useData = () => useSyncExternalStore(subscribe, () => data)
export const useActive = () => useSyncExternalStore(subscribe, () => active)
export const useRestEnd = () => useSyncExternalStore(subscribe, () => restEnd)

export const getData = () => data

// ---- settings / body weight / backup
export const updateSettings = (s: Partial<Settings>) => setData(d => ({ ...d, settings: { ...d.settings, ...s } }))
export const addBody = (kg: number) => setData(d => ({ ...d, body: [...d.body, { id: uid(), t: Date.now(), kg } as BodyWeight].sort((a, b) => a.t - b.t) }))
export const deleteBody = (id: string) => setData(d => ({ ...d, body: d.body.filter(b => b.id !== id) }))
export const exportJSON = () => JSON.stringify(data, null, 1)
/** mode 'replace' swaps everything; 'merge' adds unseen workouts/exercises/body entries and lets the file's routines win (used with the MCP server round-trip). */
export function importJSON(text: string, mode: 'replace' | 'merge' = 'replace'): boolean {
  try {
    const d = JSON.parse(text) as Data
    if (d?.v !== 1 || !Array.isArray(d.workouts) || !Array.isArray(d.routines)) return false
    if (mode === 'replace') { setData(() => ({ ...DEFAULTS, ...d, settings: { ...DEFAULTS.settings, ...d.settings } })); return true }
    const gone = new Set(d.deletedRoutines ?? [])
    const addNew = <T extends { id: string }>(have: T[], inc: T[] = []) => [...have, ...inc.filter(x => !have.some(h => h.id === x.id))]
    setData(cur => ({
      ...cur,
      workouts: addNew(cur.workouts, d.workouts).sort((a, b) => a.start - b.start),
      custom: addNew(cur.custom, d.custom),
      body: addNew(cur.body, d.body).sort((a, b) => a.t - b.t),
      routines: [...cur.routines.filter(r => !gone.has(r.id) && !d.routines.some(x => x.id === r.id)), ...d.routines.filter(r => !gone.has(r.id))],
    }))
    return true
  } catch { return false }
}
export const resetAll = () => { setData(() => DEFAULTS); setActive(null) }

// ---- exercises / routines
export const saveCustom = (e: Exercise) => setData(d => ({ ...d, custom: [...d.custom.filter(c => c.id !== e.id), e] }))
export const deleteCustom = (id: string) => setData(d => ({ ...d, custom: d.custom.filter(c => c.id !== id) }))
export const saveRoutine = (r: Routine) => setData(d => ({ ...d, routines: d.routines.some(x => x.id === r.id) ? d.routines.map(x => x.id === r.id ? r : x) : [...d.routines, r] }))
export const deleteRoutine = (id: string) => setData(d => ({ ...d, routines: d.routines.filter(r => r.id !== id) }))
export const deleteWorkout = (id: string) => setData(d => ({ ...d, workouts: d.workouts.filter(w => w.id !== id) }))
export const updateWorkout = (w: Workout) => setData(d => ({ ...d, workouts: d.workouts.map(x => x.id === w.id ? w : x) }))

// ---- active workout
const newExercise = (exerciseId: string, repMin = 8, repMax = 12, count?: number): WorkoutExercise => ({
  id: uid(), exerciseId, note: '', repMin, repMax,
  sets: suggest(exerciseId, data.workouts, repMin, repMax, data.settings.increment, count, (data.custom.find(c => c.id === exerciseId) ?? base.get(exerciseId))?.kind).map(s => ({ id: uid(), type: 'normal', weight: s.weight, reps: s.reps, done: false })),
})
export function startWorkout(opts: { routine?: Routine; from?: Workout } = {}) {
  if (active) return
  const { routine, from } = opts
  const exercises = routine ? routine.exercises.map(e => newExercise(e.exerciseId, e.repMin, e.repMax, e.sets))
    : from ? from.exercises.map(e => newExercise(e.exerciseId, e.repMin, e.repMax, e.sets.filter(s => s.type !== 'warmup').length || 1)) : []
  setActive({ id: uid(), name: routine?.name ?? from?.name ?? 'Workout', start: Date.now(), end: 0, note: '', exercises, routineId: routine?.id })
}
export const patchActive = (fn: (w: Workout) => Workout) => { if (active) setActive(fn(active)) }
export const addExercises = (ids: string[]) => patchActive(w => ({ ...w, exercises: [...w.exercises, ...ids.map(id => newExercise(id))] }))
export function finishWorkout(): string | null {
  if (!active) return null
  const exercises = active.exercises
    .map(e => ({ ...e, sets: e.sets.filter(s => s.done) }))
    .filter(e => e.sets.length)
  const w: Workout = { ...active, exercises, end: Date.now() }
  setData(d => ({ ...d, workouts: [...d.workouts, w].sort((a, b) => a.start - b.start) }))
  restEnd = 0
  setActive(null)
  return w.id
}
export const discardWorkout = () => { restEnd = 0; setActive(null) }

export const startRest = (sec: number) => { restEnd = Date.now() + sec * 1000; emit() }
export const adjustRest = (sec: number) => { if (restEnd) { restEnd = Math.max(Date.now(), restEnd + sec * 1000); emit() } }
export const stopRest = () => { restEnd = 0; emit() }

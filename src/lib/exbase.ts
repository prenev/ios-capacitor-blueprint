import type { Exercise, Kind } from './types'

/** The bundled exercise library (src/data/exercises.json, from yuhonas/free-exercise-db, public domain). Loaded lazily, fully offline. */
export const base = new Map<string, Exercise>()
let loaded = false
const subs = new Set<() => void>()
export const subscribeBase = (f: () => void) => { subs.add(f); return () => { subs.delete(f) } }
export const baseLoaded = () => loaded

type Row = [string, string, string, string, Kind, string]
import('../data/exercises.json').then(m => {
  for (const [id, name, muscle, equipment, kind, howto] of m.default as unknown as Row[]) base.set(id, { id, name, muscle, equipment, kind, howto })
  loaded = true
  subs.forEach(f => f())
}).catch(() => { /* custom exercises still work */ })

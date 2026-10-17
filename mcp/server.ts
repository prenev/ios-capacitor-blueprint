#!/usr/bin/env -S npx tsx
/**
 * Plate MCP server (stdio). Lets an AI app read your training data, manage routines and review your training.
 *
 * The app is fully offline and keeps data on the phone, so this server works on a Plate backup file instead:
 *   iPhone: Stats ⚙︎ > Export backup  -> save into iCloud Drive / AirDrop to the Mac
 *   AI:     reads the file, creates/edits routines (written back into the same file)
 *   iPhone: Settings > Import backup > "Merge"  -> new/changed routines appear, workouts are kept
 * Point it at the file with PLATE_DATA=/path/plate-backup.json (or the first CLI argument).
 */
import { readFileSync, writeFileSync, renameSync, existsSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import { e1rm, recordsFor, sessionsFor, suggest, workoutSets, workoutVolume, weeklyStreak } from '../src/lib/calc'
import type { Data, Exercise, Kind, Routine, Workout } from '../src/lib/types'
import { analyze } from './analyze'

const FILE = resolve(process.argv[2] ?? process.env.PLATE_DATA ?? 'plate-backup.json')
const here = dirname(fileURLToPath(import.meta.url))
const LIB: Exercise[] = (JSON.parse(readFileSync(resolve(here, '../src/data/exercises.json'), 'utf8')) as [string, string, string, string, Kind, string][])
  .map(([id, name, muscle, equipment, kind, howto]) => ({ id, name, muscle, equipment, kind, howto }))

const EMPTY: Data = { v: 1, workouts: [], routines: [], custom: [], body: [], settings: { unit: 'kg', rest: 90, increment: 2.5 } }
const load = (): Data => {
  if (!existsSync(FILE)) throw new Error(`No Plate backup at ${FILE}. In the app: Stats > ⚙︎ > Export backup, save it there (or set PLATE_DATA).`)
  const d = JSON.parse(readFileSync(FILE, 'utf8')) as Data
  if (d?.v !== 1) throw new Error('Not a Plate backup file (expected "v": 1).')
  return { ...EMPTY, ...d, settings: { ...EMPTY.settings, ...d.settings } }
}
const save = (d: Data) => { const tmp = `${FILE}.${process.pid}.tmp`; writeFileSync(tmp, JSON.stringify(d, null, 1)); renameSync(tmp, FILE) }
const library = (d: Data) => [...LIB.filter(e => !d.custom.some(c => c.id === e.id)), ...d.custom]

/** id, exact name, or unique token match; otherwise throws with candidates so the caller can retry with an id. */
function resolveExercise(d: Data, ref: string): Exercise {
  const all = library(d), q = ref.trim().toLowerCase()
  const exact = all.find(e => e.id.toLowerCase() === q || e.name.toLowerCase() === q)
  if (exact) return exact
  const words = q.split(/[\s_-]+/).filter(Boolean)
  const hits = all.filter(e => words.every(w => e.name.toLowerCase().includes(w)))
  if (hits.length === 1) return hits[0]
  if (!hits.length) throw new Error(`No exercise matches "${ref}". Use list_exercises to search.`)
  throw new Error(`"${ref}" is ambiguous. Pick one id: ${hits.sort((a, b) => a.name.length - b.name.length).slice(0, 8).map(e => `${e.id} (${e.name})`).join('; ')}`)
}

const text = (o: unknown) => ({ content: [{ type: 'text' as const, text: JSON.stringify(o, null, 1) }] })
const fail = (e: unknown) => ({ isError: true, content: [{ type: 'text' as const, text: e instanceof Error ? e.message : String(e) }] })
const tool = <S extends z.ZodRawShape>(server: McpServer, name: string, description: string, shape: S, run: (a: z.infer<z.ZodObject<S>>, d: Data) => unknown, write = false) =>
  server.registerTool(name, { description, inputSchema: shape, annotations: { readOnlyHint: !write, destructiveHint: false, openWorldHint: false } }, (async (a: z.infer<z.ZodObject<S>>) => {
    try { const d = load(); const r = run(a, d); if (write) save(d); return text(r) } catch (e) { return fail(e) }
  }) as never)

const setStr = (s: { weight: number | null; reps: number | null; type: string }) => `${s.weight ?? 0}x${s.reps ?? 0}${s.type === 'normal' ? '' : ` (${s.type})`}`
const brief = (w: Workout, name: (id: string) => string) => ({ id: w.id, name: w.name, date: new Date(w.start).toISOString(), minutes: Math.round((w.end - w.start) / 60000), volumeKg: Math.round(workoutVolume(w)), sets: workoutSets(w), exercises: w.exercises.map(e => name(e.exerciseId)) })
const routineOut = (r: Routine, name: (id: string) => string) => ({ id: r.id, name: r.name, exercises: r.exercises.map(e => ({ exercise: name(e.exerciseId), exerciseId: e.exerciseId, sets: e.sets, repMin: e.repMin, repMax: e.repMax })) })

const server = new McpServer({ name: 'plate', version: '1.0.0' }, { instructions: 'Plate gym tracker. All weights are kg. Data is a backup file exported from the phone app; routine changes are written to that file and the user must import it in the app (Settings > Import backup > Merge) to see them. Use analyze_training to review training and get_exercise_progress for per-lift detail.' })
const nameOf = (d: Data) => (id: string) => (library(d).find(e => e.id === id)?.name ?? id)

tool(server, 'get_summary', 'Overview: totals, date range, streak, units/settings, number of routines, most recent workouts.', {}, (_a, d) => ({
  file: FILE, units: d.settings.unit, restSeconds: d.settings.rest, overloadStepKg: d.settings.increment, workouts: d.workouts.length, routines: d.routines.length,
  firstWorkout: d.workouts[0] && new Date(d.workouts[0].start).toISOString(), lastWorkout: d.workouts.at(-1) && new Date(d.workouts.at(-1)!.start).toISOString(), weekStreak: weeklyStreak(d.workouts),
  latestBodyWeightKg: d.body.at(-1)?.kg ?? null, recent: d.workouts.slice(-5).reverse().map(w => brief(w, nameOf(d))),
}))

tool(server, 'list_workouts', 'List workouts (newest first), optionally filtered by date or exercise.', {
  limit: z.number().int().min(1).max(100).default(20), since: z.string().optional().describe('ISO date, e.g. 2026-09-01'), exercise: z.string().optional().describe('exercise name or id'),
}, ({ limit, since, exercise }, d) => {
  const id = exercise ? resolveExercise(d, exercise).id : null, t = since ? Date.parse(since) : 0
  return d.workouts.filter(w => w.start >= t && (!id || w.exercises.some(e => e.exerciseId === id))).reverse().slice(0, limit).map(w => brief(w, nameOf(d)))
})

tool(server, 'get_workout', 'Full detail of one workout: every set (weight kg x reps; warm-up/drop/failure tagged).', { id: z.string() }, ({ id }, d) => {
  const w = d.workouts.find(x => x.id === id); if (!w) throw new Error('Workout not found.')
  return { ...brief(w, nameOf(d)), note: w.note, exercises: w.exercises.map(e => ({ exercise: nameOf(d)(e.exerciseId), note: e.note, repRange: `${e.repMin}-${e.repMax}`, sets: e.sets.map(setStr) })) }
})

tool(server, 'list_exercises', 'Search the offline exercise library (753 built-in + custom). Use the returned id in routines.', {
  query: z.string().optional(), muscle: z.string().optional().describe('Chest, Back, Shoulders, Biceps, Triceps, Forearms, Abs, Quads, Hamstrings, Glutes, Legs, Calves'), equipment: z.string().optional(), limit: z.number().int().min(1).max(100).default(25),
}, ({ query, muscle, equipment, limit }, d) => {
  const words = (query ?? '').toLowerCase().split(/\s+/).filter(Boolean)
  return library(d).filter(e => (!muscle || e.muscle.toLowerCase() === muscle.toLowerCase()) && (!equipment || e.equipment.toLowerCase() === equipment.toLowerCase()) && words.every(w => e.name.toLowerCase().includes(w)))
    .slice(0, limit).map(e => ({ id: e.id, name: e.name, muscle: e.muscle, equipment: e.equipment, tracks: e.kind }))
})

tool(server, 'get_exercise_progress', 'Per-exercise history: sessions (newest first), records, estimated 1RM trend and the next progressive-overload target.', {
  exercise: z.string(), limit: z.number().int().min(1).max(50).default(10), repMin: z.number().int().default(8), repMax: z.number().int().default(12),
}, ({ exercise, limit, repMin, repMax }, d) => {
  const ex = resolveExercise(d, exercise), ses = sessionsFor(ex.id, d.workouts), rec = recordsFor(ses)
  return {
    exercise: ex.name, id: ex.id, sessions: ses.length,
    records: { heaviestKg: rec.weight, bestEstimated1RMKg: Math.round(rec.e1rm * 10) / 10, bestSetVolumeKg: rec.setVolume, bestSessionVolumeKg: rec.sessionVolume },
    recent: ses.slice(0, limit).map(s => ({ date: new Date(s.workout.start).toISOString().slice(0, 10), workout: s.workout.name, sets: s.sets.map(setStr), bestEstimated1RMKg: Math.round(Math.max(...s.sets.map(x => e1rm(x.weight ?? 0, x.reps ?? 0))) * 10) / 10 })),
    nextTarget: ses.length ? suggest(ex.id, d.workouts, repMin, repMax, d.settings.increment, undefined, ex.kind).map(t => `${t.weight ?? 0}kg x ${t.reps}${t.up ? ' (add weight)' : ''}`) : null,
  }
})

tool(server, 'analyze_training', 'Review training for problems: stalled lifts, missed overload, muscle volume/frequency gaps, push/pull and quad/hamstring balance, sudden volume spikes, session length, consistency. Heuristics with evidence, not medical advice.', {
  weeks: z.number().int().min(2).max(52).default(8),
}, ({ weeks }, d) => analyze(d, id => library(d).find(e => e.id === id) ?? { id, name: id, muscle: 'Other', equipment: 'Other', kind: 'wr' }, weeks))

tool(server, 'list_routines', 'All routines with their exercises, sets and rep ranges.', {}, (_a, d) => d.routines.map(r => routineOut(r, nameOf(d))))

tool(server, 'get_routine_targets', 'What to lift next in each exercise of a routine (double-progression targets from your history).', { id: z.string() }, ({ id }, d) => {
  const r = d.routines.find(x => x.id === id || x.name.toLowerCase() === id.toLowerCase()); if (!r) throw new Error('Routine not found.')
  return { routine: r.name, exercises: r.exercises.map(e => { const ex = library(d).find(x => x.id === e.exerciseId); return { exercise: ex?.name ?? e.exerciseId, repRange: `${e.repMin}-${e.repMax}`, targets: suggest(e.exerciseId, d.workouts, e.repMin, e.repMax, d.settings.increment, e.sets, ex?.kind).map(t => `${t.weight ?? 0}kg x ${t.reps}${t.up ? ' (add weight)' : ''}`) } }) }
})

const RoutineEx = z.object({ exercise: z.string().describe('exercise id or name (must resolve uniquely)'), sets: z.number().int().min(1).max(20).default(3), repMin: z.number().int().min(1).max(100).default(8), repMax: z.number().int().min(1).max(100).default(12) })
const build = (d: Data, xs: z.infer<typeof RoutineEx>[]) => xs.map(x => { const ex = resolveExercise(d, x.exercise); return { exerciseId: ex.id, sets: x.sets, repMin: Math.min(x.repMin, x.repMax), repMax: Math.max(x.repMin, x.repMax) } })
const done = (r: Routine, d: Data) => ({ saved: routineOut(r, nameOf(d)), next: `Wrote ${FILE}. On the phone: Settings > Import backup > Merge to load it.` })

tool(server, 'create_routine', 'Create a routine in the backup file.', { name: z.string().min(1), exercises: z.array(RoutineEx).min(1).max(30) }, ({ name, exercises }, d) => {
  const r: Routine = { id: randomUUID(), name, exercises: build(d, exercises) }; d.routines.push(r); return done(r, d)
}, true)

tool(server, 'update_routine', 'Rename a routine and/or replace its exercise list (give the full new list).', { id: z.string(), name: z.string().optional(), exercises: z.array(RoutineEx).min(1).max(30).optional() }, ({ id, name, exercises }, d) => {
  const r = d.routines.find(x => x.id === id); if (!r) throw new Error('Routine not found. Use list_routines for ids.')
  if (name) r.name = name; if (exercises) r.exercises = build(d, exercises)
  return done(r, d)
}, true)

tool(server, 'delete_routine', 'Delete a routine (recorded so a Merge import removes it from the phone too).', { id: z.string() }, ({ id }, d) => {
  const r = d.routines.find(x => x.id === id); if (!r) throw new Error('Routine not found.')
  d.routines = d.routines.filter(x => x.id !== id); d.deletedRoutines = [...new Set([...(d.deletedRoutines ?? []), id])]
  return { deleted: r.name, next: `Wrote ${FILE}. Import with Merge on the phone to apply.` }
}, true)

server.registerPrompt('review_my_training', { description: 'Full training review with concrete routine changes' }, () => ({
  messages: [{ role: 'user', content: { type: 'text', text: 'Review my gym training with the Plate tools. Call get_summary, then analyze_training, then get_exercise_progress for any stalled or flagged lifts. Tell me plainly what I am doing wrong (with the evidence), what is going well, and propose specific changes. If I agree, apply them with update_routine/create_routine and remind me to Merge-import the backup on my phone.' } }],
}))

await server.connect(new StdioServerTransport())

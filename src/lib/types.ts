export type Kind = 'wr' | 'bw' | 'time' // weight×reps, bodyweight (+optional weight)×reps, duration
export interface Exercise { id: string; name: string; muscle: string; equipment: string; kind: Kind; howto?: string; custom?: boolean }

export type SetType = 'normal' | 'warmup' | 'drop' | 'failure'
export interface SetEntry { id: string; type: SetType; weight: number | null; reps: number | null; done: boolean } // weight in kg; reps = seconds for 'time'
export interface WorkoutExercise { id: string; exerciseId: string; note: string; sets: SetEntry[]; repMin: number; repMax: number }
export interface Workout { id: string; name: string; start: number; end: number; note: string; exercises: WorkoutExercise[]; routineId?: string }

export interface RoutineExercise { exerciseId: string; sets: number; repMin: number; repMax: number }
export interface Routine { id: string; name: string; exercises: RoutineExercise[] }

export interface Settings { unit: 'kg' | 'lb'; rest: number; increment: number /* kg */ }
export interface BodyWeight { id: string; t: number; kg: number }
export interface Data { v: 1; workouts: Workout[]; routines: Routine[]; custom: Exercise[]; body: BodyWeight[]; settings: Settings }

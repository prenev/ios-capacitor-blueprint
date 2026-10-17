import { useMemo, useSyncExternalStore } from 'react'
import { base, baseLoaded, subscribeBase } from './exbase'
import { useData } from './store'
import type { Exercise } from './types'

export const MUSCLES = ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Forearms', 'Abs', 'Quads', 'Hamstrings', 'Glutes', 'Legs', 'Calves']
export const EQUIPMENT = ['Barbell', 'Dumbbell', 'Machine', 'Cable', 'Bodyweight', 'Kettlebell', 'Bands', 'Other']

const unknown = (id: string): Exercise => ({ id, name: 'Unknown exercise', muscle: 'Other', equipment: 'Other', kind: 'wr' })

export function useExercises() {
  const { custom } = useData()
  const ready = useSyncExternalStore(subscribeBase, baseLoaded)
  return useMemo(() => {
    const byId = new Map(base)
    for (const c of custom) byId.set(c.id, { ...c, custom: true })
    const list = [...byId.values()].sort((a, b) => a.name.localeCompare(b.name))
    return { ready, list, get: (id: string): Exercise => byId.get(id) ?? unknown(id) }
  }, [custom, ready])
}

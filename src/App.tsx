import { useCallback, useState } from 'react'
import { useNativeTabs, type NativeTab } from './lib/nativeTabs'
import { ActiveWorkout } from './screens/Active'
import { CreateExercise, ExercisesTab, Picker } from './screens/Exercises'
import { ExerciseDetail } from './screens/ExerciseDetail'
import { HistoryTab, WorkoutDetail } from './screens/History'
import { RoutineEditor, WorkoutTab } from './screens/Routines'
import { Settings, StatsTab } from './screens/Stats'
import { NavCtx, type Layer, type Nav } from './ui/layers'

const TABS: NativeTab[] = [
  { id: 'workout', label: 'Workout', symbol: 'figure.strengthtraining.traditional' },
  { id: 'history', label: 'History', symbol: 'clock.fill' },
  { id: 'exercises', label: 'Exercises', symbol: 'dumbbell.fill' },
  { id: 'stats', label: 'Stats', symbol: 'chart.bar.fill' },
]

function render(l: Layer) {
  switch (l.k) {
    case 'active': return <ActiveWorkout />
    case 'workout': return <WorkoutDetail id={l.id} />
    case 'exercise': return <ExerciseDetail id={l.id} />
    case 'routine': return <RoutineEditor id={l.id} />
    case 'picker': return <Picker onPick={l.onPick} />
    case 'create': return <CreateExercise onCreated={l.onCreated} />
    case 'settings': return <Settings />
  }
}

export default function App() {
  const [tab, setTab] = useState('workout')
  const [stack, setStack] = useState<Layer[]>([])
  const nav: Nav = {
    push: useCallback((l: Layer) => setStack(s => [...s, l]), []),
    pop: useCallback(() => setStack(s => s.slice(0, -1)), []),
    replace: useCallback((l: Layer) => setStack(s => [...s.slice(0, -1), l]), []),
  }
  // The native bar hides behind any full-screen layer so it never covers the bottom of it.
  const native = useNativeTabs(TABS, tab, stack.length > 0, setTab)
  return (
    <NavCtx.Provider value={nav}>
      {tab === 'workout' && <WorkoutTab />}
      {tab === 'history' && <HistoryTab />}
      {tab === 'exercises' && <ExercisesTab />}
      {tab === 'stats' && <StatsTab />}
      {stack.map((l, i) => <div key={i} className="layer" style={{ zIndex: 10 + i }}>{render(l)}</div>)}
      {!native && (
        <nav className="webtabs" aria-label="Tabs">
          {TABS.map(t => <button key={t.id} aria-current={t.id === tab} onClick={() => setTab(t.id)}>{t.label}</button>)}
        </nav>
      )}
    </NavCtx.Provider>
  )
}

import { useState } from 'react'
import { Dumbbell } from 'lucide-react'

export const exImg = (id: string, frame: 0 | 1) => `${import.meta.env.BASE_URL}ex/${encodeURIComponent(id)}/${frame}.webp`

/** Square thumbnail of the first photo frame; falls back to an icon for custom exercises / missing photos. */
export function Thumb({ id, size = 52, round = 14 }: { id: string; size?: number; round?: number }) {
  const [bad, setBad] = useState(id.startsWith('custom-'))
  return (
    <span className="thumb" style={{ width: size, height: size, borderRadius: round }}>
      {bad ? <Dumbbell size={size * 0.42} strokeWidth={1.8} /> : <img src={exImg(id, 0)} alt="" loading="lazy" decoding="async" onError={() => setBad(true)} />}
    </span>
  )
}

/** Overlapping thumbnails, used on routine and workout cards. */
export function Stack({ ids, size = 34, max = 4 }: { ids: string[]; size?: number; max?: number }) {
  const shown = [...new Set(ids)].slice(0, max)
  return <span className="stack">{shown.map(id => <span key={id} style={{ marginLeft: -size * 0.3 }}><Thumb id={id} size={size} round={size / 2} /></span>)}</span>
}

/** Big photo that gently flips between the two movement frames (like a looping demo). */
export function Hero({ id }: { id: string }) {
  const [bad, setBad] = useState(id.startsWith('custom-'))
  if (bad) return <div className="hero hero-empty"><Dumbbell size={64} strokeWidth={1.2} /></div>
  return (
    <div className="hero">
      <img src={exImg(id, 0)} alt="" onError={() => setBad(true)} />
      <img className="flip" src={exImg(id, 1)} alt="" onError={e => { e.currentTarget.style.display = 'none' }} />
    </div>
  )
}

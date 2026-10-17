import { useEffect, useState, type ReactNode } from 'react'

export function Sheet({ title, onBack, right, back = 'chevron', children }: { title?: ReactNode; onBack: () => void; right?: ReactNode; back?: 'chevron' | 'down' | 'close'; children: ReactNode }) {
  return (
    <div className="sheet">
      <header className="bar">
        <button className="icon" onClick={onBack} aria-label="Back">{back === 'close' ? '✕' : back === 'down' ? '⌄' : '‹'}</button>
        <div className="bar-title">{title}</div>
        <div className="bar-right">{right}</div>
      </header>
      <div className="scroll">{children}</div>
    </div>
  )
}

/** Number input that keeps what you typed ("6.") while the stored value is a number. */
export function NumInput({ value, onChange, placeholder, decimal = true, className }: { value: number | null; onChange: (v: number | null) => void; placeholder?: string; decimal?: boolean; className?: string }) {
  const [txt, setTxt] = useState(value == null ? '' : String(value))
  useEffect(() => { setTxt(t => (parseFloat(t) === value || (value == null && t === '') ? t : value == null ? '' : String(value))) }, [value])
  return (
    <input className={className ?? 'num'} inputMode={decimal ? 'decimal' : 'numeric'} placeholder={placeholder} value={txt}
      onFocus={e => e.currentTarget.select()}
      onChange={e => {
        const t = e.target.value.replace(',', '.'); if (!/^\d*\.?\d*$/.test(t)) return
        setTxt(t); const n = parseFloat(t); onChange(Number.isFinite(n) ? n : null)
      }} />
  )
}

export function useNow(on = true, ms = 1000) {
  const [n, setN] = useState(Date.now())
  useEffect(() => { if (!on) return; const i = setInterval(() => setN(Date.now()), ms); return () => clearInterval(i) }, [on, ms])
  return n
}

export function Menu({ items, onClose }: { items: { label: string; danger?: boolean; run: () => void }[]; onClose: () => void }) {
  return (
    <div className="scrim" onClick={onClose}>
      <div className="menu" onClick={e => e.stopPropagation()}>
        {items.map(i => <button key={i.label} className={i.danger ? 'danger' : ''} onClick={() => { onClose(); i.run() }}>{i.label}</button>)}
        <button className="cancel" onClick={onClose}>Cancel</button>
      </div>
    </div>
  )
}

export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void }) {
  return <div className="seg">{options.map(o => <button key={o.id} aria-pressed={o.id === value} onClick={() => onChange(o.id)}>{o.label}</button>)}</div>
}

export function Line({ pts, fmt = (n: number) => String(Math.round(n * 10) / 10), height = 120 }: { pts: { t: number; y: number }[]; fmt?: (n: number) => string; height?: number }) {
  if (pts.length < 2) return <div className="empty small">{pts.length ? `${fmt(pts[0].y)} — log more sessions to see a trend` : 'No data yet'}</div>
  const W = 320, H = height, P = 6
  const t0 = pts[0].t, t1 = pts[pts.length - 1].t || 1, lo = Math.min(...pts.map(p => p.y)), hi = Math.max(...pts.map(p => p.y))
  const x = (t: number) => P + (t1 === t0 ? 0 : (t - t0) / (t1 - t0)) * (W - 2 * P)
  const y = (v: number) => H - P - (hi === lo ? 0.5 : (v - lo) / (hi - lo)) * (H - 2 * P)
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)} ${y(p.y).toFixed(1)}`).join(' ')
  return (
    <div className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label="Trend chart">
        <path d={d} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="chart-axis"><span>{fmt(lo)}</span><span>{fmt(hi)}</span></div>
    </div>
  )
}

export function Bars({ values, labels, fmt = String }: { values: number[]; labels?: string[]; fmt?: (n: number) => string }) {
  const max = Math.max(1, ...values)
  return (
    <div className="bars">
      {values.map((v, i) => (
        <div key={i} className="bar-col" title={fmt(v)}>
          <div className="bar-fill" style={{ height: `${Math.max(v ? 4 : 1, v / max * 100)}%`, opacity: v ? 1 : 0.25 }} />
          {labels && <span>{labels[i]}</span>}
        </div>
      ))}
    </div>
  )
}

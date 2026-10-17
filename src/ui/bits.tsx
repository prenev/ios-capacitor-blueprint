import { useEffect, useId, useState, type ReactNode } from 'react'
import { ChevronDown, ChevronLeft, X } from 'lucide-react'

export function Sheet({ title, onBack, right, back = 'chevron', floating, children }: { title?: ReactNode; onBack: () => void; right?: ReactNode; back?: 'chevron' | 'down' | 'close'; floating?: boolean; children: ReactNode }) {
  const Back = back === 'close' ? X : back === 'down' ? ChevronDown : ChevronLeft
  return (
    <div className={'sheet' + (floating ? ' floating' : '')}>
      <header className="bar">
        <button className="icon glass" onClick={onBack} aria-label="Back"><Back size={22} strokeWidth={2.2} /></button>
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
        <div className="menu-group">{items.map(i => <button key={i.label} className={i.danger ? 'danger' : ''} onClick={() => { onClose(); i.run() }}>{i.label}</button>)}</div>
        <button className="menu-cancel" onClick={onClose}>Cancel</button>
      </div>
    </div>
  )
}

export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void }) {
  return <div className="seg">{options.map(o => <button key={o.id} aria-pressed={o.id === value} onClick={() => onChange(o.id)}>{o.label}</button>)}</div>
}

/** Circular progress ring. */
export function Ring({ value, size = 72, stroke = 8, children }: { value: number; size?: number; stroke?: number; children?: ReactNode }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, v = Math.max(0, Math.min(1, value))
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--s3)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--accent)" strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - v)} transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ transition: 'stroke-dashoffset .6s cubic-bezier(.3,.7,0,1)' }} />
      </svg>
      <div className="ring-in">{children}</div>
    </div>
  )
}

/** Smooth area chart; the last point gets a glowing dot. */
export function Line({ pts, fmt = (n: number) => String(Math.round(n * 10) / 10), height = 150 }: { pts: { t: number; y: number }[]; fmt?: (n: number) => string; height?: number }) {
  const gid = useId()
  if (pts.length < 2) return <div className="empty small">{pts.length ? `${fmt(pts[0].y)} — log one more session to see the trend` : 'No data yet'}</div>
  const W = 320, H = height, PX = 10, PT = 16, PB = 10
  const t0 = pts[0].t, t1 = pts[pts.length - 1].t, lo = Math.min(...pts.map(p => p.y)), hi = Math.max(...pts.map(p => p.y))
  const x = (t: number) => PX + (t1 === t0 ? 0 : (t - t0) / (t1 - t0)) * (W - 2 * PX)
  const y = (v: number) => H - PB - (hi === lo ? 0.5 : (v - lo) / (hi - lo)) * (H - PT - PB)
  const P = pts.map(p => [x(p.t), y(p.y)] as const)
  let d = `M${P[0][0]} ${P[0][1]}`
  for (let i = 0; i < P.length - 1; i++) { const [x0, y0] = P[i], [x1, y1] = P[i + 1], mx = (x0 + x1) / 2; d += ` C${mx} ${y0} ${mx} ${y1} ${x1} ${y1}` }
  const last = P[P.length - 1]
  return (
    <div className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label="Trend chart" style={{ height }}>
        <defs><linearGradient id={gid} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--accent)" stopOpacity=".28" /><stop offset="1" stopColor="var(--accent)" stopOpacity="0" /></linearGradient></defs>
        <path d={`${d} L${last[0]} ${H} L${P[0][0]} ${H} Z`} fill={`url(#${gid})`} />
        <path d={d} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      </svg>
      <i className="dot" style={{ left: `${last[0] / W * 100}%`, top: `${last[1] / H * 100}%` }} />
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
          <div className={'bar-fill' + (i === values.length - 1 ? ' now' : '')} style={{ height: `${Math.max(v ? 6 : 2, v / max * 100)}%`, opacity: v ? 1 : 0.5 }} />
          {labels && <span>{labels[i]}</span>}
        </div>
      ))}
    </div>
  )
}

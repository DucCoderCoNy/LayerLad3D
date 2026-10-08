import { presetRange } from '../lib/finance.js'
import { inp } from './ui.jsx'

const PRESETS = [['today', 'Hôm nay'], ['7d', '7 ngày'], ['month', 'Tháng này'], ['lastmonth', 'Tháng trước'], ['year', 'Năm nay'], ['all', 'Tất cả']]

/** Bộ lọc khoảng ngày: value = [from, to] ('YYYY-MM-DD', rỗng = không giới hạn) */
export default function DateRange({ value, onChange }) {
  const [from, to] = value
  return (
    <div className="flex flex-wrap items-center gap-2">
      {PRESETS.map(([k, l]) => { const r = presetRange(k), on = r[0] === from && r[1] === to; return <button key={k} type="button" onClick={() => onChange(r)} className={`rounded-full px-3 py-1.5 text-xs ${on ? 'bg-accent font-semibold text-ink-950' : 'bg-white/10 text-zinc-300 hover:bg-white/20'}`}>{l}</button> })}
      <input type="date" aria-label="Từ ngày" value={from} max={to || undefined} onChange={(e) => onChange([e.target.value, to])} className={`${inp} w-auto`} />
      <span className="text-zinc-500">→</span>
      <input type="date" aria-label="Đến ngày" value={to} min={from || undefined} onChange={(e) => onChange([from, e.target.value])} className={`${inp} w-auto`} />
    </div>
  )
}

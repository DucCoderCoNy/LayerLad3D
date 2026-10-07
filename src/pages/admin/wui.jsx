import { useStore } from '../../lib/store.js'
import { DEFSET } from '../../lib/workshop.js'

export const useWset = () => { const [s] = useStore('wset'); return { ...DEFSET, ...s } }

export const Tag = ({ s }) => {
  const c = { 'Huỷ': 'bg-zinc-500/20 text-zinc-400', 'Hoàn thành': 'bg-emerald-500/20 text-emerald-300', 'Đã giao': 'bg-emerald-500/20 text-emerald-300', 'Báo giá': 'bg-sky-500/20 text-sky-300' }[s] || 'bg-accent/20 text-accent'
  return <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${c}`}>{s}</span>
}
export const Kpi = ({ l, v, cls = '', big }) => (
  <div className={`rounded-xl border border-white/10 bg-ink-800 p-4 ${big ? 'border-l-4 border-l-accent' : ''}`}>
    <p className="text-xs text-zinc-400">{l}</p><p className={`mt-1 font-display text-xl font-bold text-white ${cls}`}>{v}</p></div>
)
export const Card = ({ title, children }) => (
  <div className="overflow-x-auto rounded-2xl border border-white/10 bg-ink-800 p-5">{title && <h2 className="mb-3 font-semibold text-white">{title}</h2>}{children}</div>
)

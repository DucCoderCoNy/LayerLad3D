import { X } from 'lucide-react'

export const inp = 'w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-white outline-none focus:border-accent'
export const btn = 'rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-ink-950 transition hover:bg-accent-soft disabled:opacity-50'
export const btn2 = 'rounded-xl border border-white/15 px-4 py-2.5 text-sm font-medium text-white transition hover:border-neon hover:text-neon'
export const td = 'px-4 py-3'

export const ORDER_STATUS = {
  new: ['Mới', 'bg-sky-500/20 text-sky-300'], confirmed: ['Đã xác nhận', 'bg-indigo-500/20 text-indigo-300'],
  printing: ['Đang in', 'bg-accent/20 text-accent'], shipping: ['Đang giao', 'bg-amber-500/20 text-amber-300'],
  done: ['Hoàn thành', 'bg-emerald-500/20 text-emerald-300'], cancelled: ['Đã hủy', 'bg-red-500/20 text-red-300'],
}
export const REQ_STATUS = {
  pending: ['Chờ báo giá', 'bg-sky-500/20 text-sky-300'], quoted: ['Đã báo giá', 'bg-amber-500/20 text-amber-300'],
  accepted: ['Khách đồng ý', 'bg-indigo-500/20 text-indigo-300'], printing: ['Đang in', 'bg-accent/20 text-accent'],
  done: ['Hoàn thành', 'bg-emerald-500/20 text-emerald-300'], rejected: ['Từ chối', 'bg-red-500/20 text-red-300'],
}
export const Badge = ({ map, v }) => <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${map[v]?.[1]}`}>{map[v]?.[0] || v}</span>

export const Field = ({ label, children }) => (
  <label className="block text-sm text-zinc-400"><span className="mb-1 block">{label}</span>{children}</label>
)

/** Ảnh sản phẩm: ảnh thật nếu có, không thì ô gradient + vạch lớp in */
export const Thumb = ({ p, className = '' }) =>
  p.image ? <img src={p.image} alt={p.name} className={`object-cover ${className}`} />
          : <div className={`layers-dark bg-gradient-to-br ${p.hue || 'from-accent to-amber-400'} ${className}`} />

export function Modal({ title, onClose, children, wide }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/70 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`w-full ${wide ? 'max-w-2xl' : 'max-w-lg'} rounded-2xl border border-white/10 bg-ink-800 p-6`}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-xl font-bold text-white">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-white/10"><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

export const DataTable = ({ heads, children, empty }) => (
  <div className="overflow-x-auto rounded-xl border border-white/10">
    <table className="w-full text-left text-sm">
      <thead className="bg-ink-800 text-zinc-400"><tr>{heads.map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr></thead>
      <tbody className="[&>tr]:border-t [&>tr]:border-white/5 [&>tr:hover]:bg-white/5">{children}</tbody>
    </table>
    {(!children || children.length === 0) && <p className="p-6 text-center text-zinc-500">{empty || 'Chưa có dữ liệu'}</p>}
  </div>
)

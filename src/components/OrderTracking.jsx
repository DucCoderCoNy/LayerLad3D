import { ExternalLink, Truck } from 'lucide-react'
import { FLOW, ORDER_STATUS } from './ui.jsx'

/** Chỉ cho phép link http/https (chặn javascript: và các kiểu độc hại do nhập nhầm) */
export const safeUrl = (u) => { try { const x = new URL(String(u || '').trim()); return /^https?:$/.test(x.protocol) ? x.href : '' } catch { return '' } }

/** Thanh tiến trình các bước của đơn */
export function Steps({ status }) {
  const at = FLOW.indexOf(status)
  if (status === 'cancelled') return <p className="text-sm text-red-300">Đơn đã bị hủy.</p>
  return (
    <ol className="flex">{FLOW.map((s, i) => (
      <li key={s} className="flex-1 text-center">
        <div className={`mx-auto h-2 ${i <= at ? 'bg-accent' : 'bg-white/10'} ${i === 0 ? 'rounded-l-full' : ''} ${i === FLOW.length - 1 ? 'rounded-r-full' : ''}`} />
        <span className={`mt-1 block text-[10px] leading-tight sm:text-[11px] ${i <= at ? 'text-white' : 'text-zinc-600'}`}>{ORDER_STATUS[s][0]}</span>
      </li>))}</ol>
  )
}

/** Khung vận chuyển: đơn vị, mã vận đơn, link theo dõi do LayerLab nhập sau khi gửi hàng */
export function ShipBox({ o }) {
  const url = safeUrl(o.trackingUrl)
  if (!o.trackingCode && !url && !o.shipNote) {
    return o.status === 'shipping' ? <p className="rounded-xl bg-ink-900 p-3 text-sm text-zinc-400">Đơn đang được giao. Mã vận đơn sẽ cập nhật tại đây ngay khi có.</p> : null
  }
  return (
    <div className="space-y-2 rounded-xl border border-accent/30 bg-accent/5 p-4 text-sm">
      <p className="flex items-center gap-2 font-semibold text-white"><Truck size={16} className="text-accent" />Thông tin vận chuyển</p>
      {o.shipProvider && <p className="text-zinc-300">Đơn vị vận chuyển: <b className="text-white">{o.shipProvider}</b></p>}
      {o.trackingCode && <p className="text-zinc-300">Mã vận đơn: <b className="select-all text-white">{o.trackingCode}</b></p>}
      {o.shipNote && <p className="text-zinc-400">{o.shipNote}</p>}
      {url && <a href={url} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 font-semibold text-ink-950 hover:bg-accent-soft">Theo dõi hành trình đơn hàng <ExternalLink size={14} /></a>}
      {o.trackingCode && !url && <p className="text-xs text-zinc-500">Bạn có thể dùng mã vận đơn trên để tra cứu trên website của đơn vị vận chuyển.</p>}
      {o.shippedAt && <p className="text-xs text-zinc-500">Cập nhật: {new Date(o.shippedAt).toLocaleString('vi-VN')}</p>}
    </div>
  )
}

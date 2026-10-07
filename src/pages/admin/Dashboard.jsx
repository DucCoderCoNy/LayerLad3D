import { Link } from 'react-router-dom'
import { formatVND } from '../../data/products.js'
import { useStore } from '../../lib/store.js'
import WorkshopSummary from './WorkshopSummary.jsx'
import { Badge, ORDER_STATUS, DataTable, td } from '../../components/ui.jsx'

export default function Dashboard() {
  const [orders] = useStore('orders'), [products] = useStore('products'), [users] = useStore('users'), [reqs] = useStore('requests')
  const valid = orders.filter((o) => o.status !== 'cancelled')
  const days = [...Array(7)].map((_, i) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - 6 + i); return d })
  const rev = days.map((d) => valid.filter((o) => new Date(o.createdAt).setHours(0, 0, 0, 0) === +d).reduce((s, o) => s + o.total, 0))
  const max = Math.max(...rev, 1)
  const cards = [
    ['Doanh thu', formatVND(valid.reduce((s, o) => s + o.total, 0))], ['Đơn hàng', orders.length], ['Đơn mới', orders.filter((o) => o.status === 'new').length],
    ['Yêu cầu chờ báo giá', reqs.filter((r) => r.status === 'pending').length], ['Sản phẩm', products.length], ['Người dùng', users.length],
  ]
  const low = products.filter((p) => p.stock <= 5)
  return (
    <div className="space-y-8">
      <h1 className="font-display text-3xl font-bold text-white">Tổng quan</h1>
      <WorkshopSummary />
      <h2 className="text-lg font-semibold text-white">Cửa hàng online</h2>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">{cards.map(([l, v]) => (
        <div key={l} className="rounded-2xl border border-white/10 bg-ink-800 p-5"><p className="text-sm text-zinc-400">{l}</p><p className="mt-1 font-display text-2xl font-bold text-white">{v}</p></div>))}</div>
      <div className="rounded-2xl border border-white/10 bg-ink-800 p-5">
        <p className="mb-4 text-sm text-zinc-400">Doanh thu 7 ngày gần nhất</p>
        <div className="flex h-40 items-end gap-3">{rev.map((v, i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-1" title={formatVND(v)}>
            <div className="w-full rounded-t-md bg-accent" style={{ height: `${(v / max) * 100}%`, minHeight: 3 }} />
            <span className="text-xs text-zinc-500">{days[i].getDate()}/{days[i].getMonth() + 1}</span></div>))}</div>
      </div>
      <div>
        <div className="mb-3 flex justify-between"><h2 className="text-lg font-semibold text-white">Đơn gần đây</h2><Link to="/admin/orders" className="text-sm text-accent">Xem tất cả</Link></div>
        <DataTable heads={['Mã', 'Khách', 'Tổng', 'Trạng thái']} empty="Chưa có đơn hàng">
          {orders.slice(0, 5).map((o) => <tr key={o.id}><td className={td}>{o.id}</td><td className={td}>{o.customer.name}</td><td className={td}>{formatVND(o.total)}</td><td className={td}><Badge map={ORDER_STATUS} v={o.status} /></td></tr>)}
        </DataTable>
      </div>
      {low.length > 0 && <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 text-sm text-amber-200">Sắp hết hàng: {low.map((p) => `${p.name} (${p.stock})`).join(', ')}</div>}
    </div>
  )
}

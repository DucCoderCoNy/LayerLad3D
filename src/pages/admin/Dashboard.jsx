import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatVND } from '../../data/products.js'
import { useStore } from '../../lib/store.js'
import { todoItems } from '../../lib/orderTools.js'
import { useWset } from './wui.jsx'
import { dayKey, periodStats, presetRange } from '../../lib/finance.js'
import BarChart from '../../components/BarChart.jsx'
import DateRange from '../../components/DateRange.jsx'
import WorkshopSummary from './WorkshopSummary.jsx'
import { Badge, ORDER_STATUS, DataTable, PAY_STATUS, payStatusOf, td } from '../../components/ui.jsx'

export default function Dashboard() {
  const [orders] = useStore('orders'), [ws] = useStore('ws'), [printers] = useStore('printers'), wset = useWset(), [wo] = useStore('wo'), [wc] = useStore('wc'), [products] = useStore('products'), [reqs] = useStore('requests')
  const [range, setRange] = useState(() => presetRange('month'))
  const [from, to] = range
  const S = useMemo(() => periodStats({ orders, wo, wc, products, wset, ws }, from, to), [orders, wo, wc, products, wset, ws, from, to])

  // Biểu đồ doanh thu: theo ngày nếu khoảng ≤ 31 ngày, ngược lại gộp theo tháng
  const bars = useMemo(() => {
    const valid = orders.filter((o) => o.status !== 'cancelled' && !o.wo), shop = wo.filter((o) => o.status !== 'Huỷ')
    const rows = [...valid.map((o) => [dayKey(o.createdAt), o.total]), ...shop.map((o) => [o.date, o.price])].filter(([d]) => d && (!from || d >= from) && (!to || d <= to))
    const a = from || rows.map((r) => r[0]).sort()[0] || dayKey(Date.now()), b = to || dayKey(Date.now())
    const span = (new Date(b) - new Date(a)) / 864e5 + 1, byMonth = span > 31, m = new Map()
    for (let t = new Date(a); t <= new Date(b); t = new Date(t.getFullYear(), t.getMonth(), t.getDate() + 1)) { const k = dayKey(t); m.set(byMonth ? k.slice(0, 7) : k, 0) }
    rows.forEach(([d, v]) => { const k = byMonth ? d.slice(0, 7) : d; if (m.has(k)) m.set(k, m.get(k) + v) })
    return [...m].map(([k, v]) => ({ k, v, label: byMonth ? `${k.slice(5)}/${k.slice(2, 4)}` : `${+k.slice(8)}/${+k.slice(5, 7)}` }))
  }, [orders, wo, from, to])
  const cards = [
    ['Doanh thu', formatVND(S.revenue), 'text-white', 'Tổng đơn không hủy'],
    ['Giá vốn hàng đã bán', formatVND(S.cogs), 'text-zinc-200', 'Nhựa + điện + máy thực dùng (ước tính)'],
    ['Lãi ước tính', formatVND(S.profit), S.profit < 0 ? 'text-red-400' : 'text-emerald-400', 'Doanh thu − giá vốn − chi phí vận hành khác'],
    ['Dòng tiền ròng', formatVND(S.cashflow), S.cashflow < 0 ? 'text-red-300' : 'text-white', 'Tiền đã thu − mọi khoản đã chi'],
    ['Đã chi (sổ Thu chi)', formatVND(S.expense), 'text-red-300', `Nhựa ${formatVND(S.filament)} · điện ${formatVND(S.power)} · khác ${formatVND(S.other)}`],
    ['Nhựa còn trong kho', formatVND(S.stockValue), 'text-white', 'Giá trị cuộn chưa dùng – là tài sản, không phải chi phí'],
    ['Số đơn', S.orders, 'text-white', ''], ['Đơn đang xử lý', S.processing, 'text-accent', ''], ['Đã thu tiền', formatVND(S.collected), 'text-white', ''],
  ]
  const todo = useMemo(() => todoItems({ orders, products, ws, wo, printers, wset }), [orders, products, ws, wo, printers, wset])
  const mine = [...orders].slice(0, 6)
  return (
    <div className="space-y-8">
      <h1 className="font-display text-3xl font-bold text-white">Tổng quan</h1>
      <div className="rounded-2xl border border-white/10 bg-ink-800 p-5">
        <h2 className="mb-3 font-semibold text-white">Việc cần làm hôm nay</h2>
        {todo.length === 0 ? <p className="text-sm text-emerald-400">✓ Không có việc tồn đọng. Mọi thứ đang ổn.</p> : (
          <ul className="space-y-2 text-sm">{todo.map((t) => (
            <li key={t.text}><Link to={t.to} className="flex items-start gap-3 rounded-lg bg-ink-900 p-3 hover:bg-white/5">
              <i className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${{ high: 'bg-red-400', mid: 'bg-amber-400', low: 'bg-sky-400' }[t.level]}`} /><span className="text-zinc-200">{t.text}</span><span className="ml-auto shrink-0 text-accent">Xử lý →</span></Link></li>))}</ul>)}
      </div>
      <div className="space-y-4 rounded-2xl border border-white/10 bg-ink-800 p-5">
        <DateRange value={range} onChange={setRange} />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">{cards.map(([l, v, c, n]) => (
          <div key={l} className="rounded-xl bg-ink-900 p-4"><p className="text-sm text-zinc-400">{l}</p><p className={`mt-1 font-display text-2xl font-bold ${c}`}>{v}</p>{n && <p className="mt-1 text-[11px] leading-snug text-zinc-500">{n}</p>}</div>))}</div>
        <p className="text-xs leading-relaxed text-zinc-500">Mua cuộn nhựa dự trữ làm <b>dòng tiền</b> giảm ngay nhưng chưa làm <b>lãi</b> giảm – chỉ phần nhựa dùng cho đơn mới tính vào giá vốn.{S.noCost > 0 && <> <span className="text-amber-300">{S.noCost} đơn chưa tính được giá vốn (món chưa khai số gram) nên lãi có thể đang cao hơn thực tế.</span></>} Giá vốn dựa trên cài đặt ở mục Giá vốn.</p>
      </div>
      <div className="rounded-2xl border border-white/10 bg-ink-800 p-5">
        <p className="mb-4 text-sm text-zinc-400">Doanh thu theo {bars.length && bars[0].k.length === 7 ? 'tháng' : 'ngày'}</p>
        <BarChart data={bars.map((b) => ({ key: b.k, label: b.label, values: [b.v] }))} series={[{ name: 'Doanh thu', color: 'bg-accent' }]} minColW={bars.length > 14 ? 22 : 44} />
      </div>
      <WorkshopSummary />
      <div>
        <div className="mb-3 flex justify-between"><h2 className="text-lg font-semibold text-white">Đơn gần đây</h2><Link to="/admin/orders" className="text-sm text-accent">Xem tất cả</Link></div>
        <DataTable heads={['Mã', 'Khách', 'Tổng', 'Thanh toán', 'Trạng thái']} empty="Chưa có đơn hàng">
          {mine.map((o) => <tr key={o.id}><td className={td}>{o.id}</td><td className={td}>{o.customer.name}</td><td className={td}>{formatVND(o.total)}</td><td className={td}><Badge map={PAY_STATUS} v={payStatusOf(o)} /></td><td className={td}><Badge map={ORDER_STATUS} v={o.status} /></td></tr>)}
        </DataTable>
      </div>
      {reqs.filter((r) => r.status === 'pending').length > 0 && <div className="rounded-2xl border border-sky-500/30 bg-sky-500/10 p-4 text-sm text-sky-200">Có {reqs.filter((r) => r.status === 'pending').length} yêu cầu báo giá cũ đang chờ – <Link to="/admin/requests" className="underline">xem</Link>.</div>}
    </div>
  )
}

import { useMemo, useState } from 'react'
import { formatVND } from '../../data/products.js'
import { useStore } from '../../lib/store.js'
import { dayKey, inRange, presetRange } from '../../lib/finance.js'
import { normPhone } from '../../lib/seo.js'
import DateRange from '../../components/DateRange.jsx'
import { ORDER_STATUS } from '../../components/ui.jsx'
import { paymentLabel } from '../../lib/payments.js'
import { Card } from './wui.jsx'

const kind = (i) => (i.id === 'cfg-print' ? 'In theo yêu cầu' : i.id === 'cfg-keychain' ? 'Móc khóa tùy biến' : i.id === 'cfg-timetable' ? 'Thời khóa biểu module' : i.name)

/** Danh sách xếp hạng có thanh ngang (chiều rộng theo % của giá trị lớn nhất) */
function Rank({ rows, fmt, empty = 'Chưa có dữ liệu' }) {
  const max = Math.max(...rows.map((r) => r.v), 1)
  if (!rows.length) return <p className="text-sm text-zinc-500">{empty}</p>
  return (
    <ol className="space-y-2.5">{rows.map((r, i) => (
      <li key={r.k} className="text-sm">
        <div className="flex justify-between gap-3"><span className="truncate text-zinc-200"><b className="mr-2 text-zinc-500">{i + 1}</b>{r.k}</span><span className="shrink-0 text-white">{fmt(r.v)}{r.sub && <small className="ml-2 text-zinc-500">{r.sub}</small>}</span></div>
        <div className="mt-1 h-1.5 rounded-full bg-white/5"><div className="h-full rounded-full bg-accent" style={{ width: `${Math.max(2, (r.v / max) * 100)}%` }} /></div>
      </li>))}</ol>
  )
}
const top = (m, n = 8) => [...m].map(([k, x]) => ({ k, ...x })).sort((a, b) => b.v - a.v).slice(0, n)
const add = (m, k, v, sub) => { const x = m.get(k) || { v: 0, n: 0 }; x.v += v; x.n += sub; m.set(k, x) }

/** Phân tích bán hàng trong khoảng thời gian: sản phẩm/màu bán chạy, khách mua nhiều, tỉ lệ khách quay lại, cơ cấu thanh toán */
export default function AdminInsights() {
  const [orders] = useStore('orders')
  const [range, setRange] = useState(() => presetRange('month')), [from, to] = range
  const d = useMemo(() => {
    const inR = orders.filter((o) => inRange(dayKey(o.createdAt), from, to)), ok = inR.filter((o) => o.status !== 'cancelled')
    const prod = new Map(), col = new Map(), cust = new Map(), pay = new Map(), st = new Map()
    for (const o of ok) {
      for (const i of o.items || []) { add(prod, kind(i), i.price * i.qty, i.qty); if (i.color) add(col, i.color, i.qty, 0) }
      add(cust, normPhone(o.customer?.phone) || '—', o.total, 1); cust.get(normPhone(o.customer?.phone) || '—').name = o.customer?.name
      add(pay, paymentLabel(o.customer?.payment), o.total, 1)
    }
    inR.forEach((o) => add(st, o.status, 1, 0))
    const everBefore = new Set(orders.filter((o) => o.status !== 'cancelled' && dayKey(o.createdAt) < (from || '0000')).map((o) => normPhone(o.customer?.phone)))
    const custs = [...cust.keys()].filter((k) => k !== '—'), repeat = custs.filter((k) => cust.get(k).n > 1 || everBefore.has(k)).length
    const rev = ok.reduce((s, o) => s + o.total, 0)
    return {
      count: ok.length, rev, aov: ok.length ? rev / ok.length : 0, cancelRate: inR.length ? (inR.length - ok.length) / inR.length : 0,
      custCount: custs.length, repeatRate: custs.length ? repeat / custs.length : 0,
      prod: top(prod).map((r) => ({ ...r, sub: `${r.n} sp` })), qty: top(new Map([...prod].map(([k, x]) => [k, { v: x.n }]))),
      col: top(col), cust: top(cust).map((r) => ({ ...r, k: `${r.name || 'Khách'} · ${r.k}`, sub: `${r.n} đơn` })),
      pay: top(pay).map((r) => ({ ...r, sub: `${r.n} đơn` })), st: top(st, 10),
    }
  }, [orders, from, to])
  const stats = [['Số đơn (không hủy)', d.count], ['Giá trị đơn trung bình', formatVND(d.aov)], ['Số khách', d.custCount], ['Khách quay lại', `${Math.round(d.repeatRate * 100)}%`], ['Tỉ lệ hủy', `${Math.round(d.cancelRate * 100)}%`]]
  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold text-white">Phân tích bán hàng</h1>
      <div className="space-y-4 rounded-2xl border border-white/10 bg-ink-800 p-5">
        <DateRange value={range} onChange={setRange} />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">{stats.map(([l, v]) => <div key={l} className="rounded-xl bg-ink-900 p-4"><p className="text-xs text-zinc-400">{l}</p><p className="mt-1 font-display text-xl font-bold text-white">{v}</p></div>)}</div>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Sản phẩm theo doanh thu"><Rank rows={d.prod} fmt={formatVND} /></Card>
        <Card title="Sản phẩm theo số lượng bán"><Rank rows={d.qty} fmt={(v) => `${v} sp`} /></Card>
        <Card title="Màu được chọn nhiều nhất"><Rank rows={d.col} fmt={(v) => `${v} sp`} /></Card>
        <Card title="Khách mua nhiều nhất"><Rank rows={d.cust} fmt={formatVND} /></Card>
        <Card title="Cơ cấu thanh toán"><Rank rows={d.pay} fmt={formatVND} /></Card>
        <Card title="Đơn theo trạng thái"><Rank rows={d.st.map((r) => ({ ...r, k: ORDER_STATUS[r.k]?.[0] || r.k }))} fmt={(v) => `${v} đơn`} /></Card>
      </div>
      <p className="text-xs text-zinc-500">"Khách quay lại" = khách có từ 2 đơn trở lên (tính cả đơn trước khoảng ngày đang chọn). Chỉ tính đơn hàng trên website, chưa gồm đơn xưởng nhập tay.</p>
    </div>
  )
}

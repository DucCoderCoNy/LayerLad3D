import { useState } from 'react'
import { formatVND as $ } from '../../data/products.js'
import { supa } from '../../lib/store.js'
import { must, useAsync } from '../../lib/useAsync.js'
import { downloadCSV } from '../../lib/export.js'
import { btn2, inp, td } from '../../components/ui.jsx'

const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const preset = (k) => {
  const t = new Date(), s = new Date(t)
  if (k === '7') s.setDate(t.getDate() - 6); else if (k === '30') s.setDate(t.getDate() - 29); else if (k === 'month') s.setDate(1); else if (k === '12m') { s.setMonth(t.getMonth() - 11); s.setDate(1) }
  return { from: ymd(s), to: ymd(t) }
}
const PROCESSING = ['new', 'confirmed', 'preparing', 'printing', 'finishing', 'shipping']

/** Tổng quan: doanh thu (đơn không hủy), đã thu, chi phí, lợi nhuận, số đơn, đơn đang xử lý — theo khoảng ngày, nhóm theo ngày hoặc tháng */
export default function AdminDashboardV2() {
  const [r, setR] = useState(preset('30')), [by, setBy] = useState('day')
  const d = useAsync(async () => {
    const a = new Date(r.from + 'T00:00:00').toISOString(), b = new Date(r.to + 'T23:59:59').toISOString()
    const [orders, exp, low, open] = await Promise.all([
      supa.from('orders').select('created_at,total,status,payment_status').gte('created_at', a).lte('created_at', b).limit(5000),
      supa.from('expenses').select('spent_on,amount,category').gte('spent_on', r.from).lte('spent_on', r.to).limit(5000),
      supa.from('filament_stock').select('material,color_name,remaining_g').eq('low', true),
      supa.from('orders').select('id', { count: 'exact', head: true }).in('status', PROCESSING),
    ])
    return { orders: must(orders), exp: must(exp), low: must(low), open: open.count || 0, capped: orders.data?.length >= 5000 }
  }, [r.from, r.to])
  const key = (s) => (by === 'month' ? s.slice(0, 7) : s.slice(0, 10))
  const rows = {}, add = (k, f, v) => { (rows[k] ||= { k, rev: 0, paid: 0, cost: 0, n: 0 })[f] += v }
  let T = { rev: 0, paid: 0, cost: 0, n: 0 }
  for (const o of d.data?.orders || []) { if (o.status === 'cancelled') continue; const k = key(ymd(new Date(o.created_at))); add(k, 'rev', +o.total); add(k, 'n', 1); T.rev += +o.total; T.n++; if (o.payment_status === 'paid') { add(k, 'paid', +o.total); T.paid += +o.total } }
  for (const e of d.data?.exp || []) { add(key(e.spent_on), 'cost', +e.amount); T.cost += +e.amount }
  const list = Object.values(rows).sort((a, b) => a.k.localeCompare(b.k)), max = Math.max(1, ...list.flatMap((x) => [x.rev, x.cost]))
  const kpi = [['Doanh thu', $(T.rev), 'Đơn không hủy trong kỳ'], ['Đã thu tiền', $(T.paid), 'Đơn đã thanh toán'], ['Chi phí', $(T.cost), 'Sổ chi phí'], ['Lợi nhuận', $(T.rev - T.cost), 'Doanh thu − chi phí'], ['Số đơn', T.n, 'Trong kỳ'], ['Đang xử lý', d.data?.open ?? '…', 'Toàn bộ, chưa hoàn thành/hủy']]
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="font-display text-3xl font-bold text-white">Tổng quan</h1>
        <div className="flex flex-wrap items-center gap-2">{[['7', '7 ngày'], ['30', '30 ngày'], ['month', 'Tháng này'], ['12m', '12 tháng']].map(([k, l]) => <button key={k} onClick={() => { setR(preset(k)); setBy(k === '12m' ? 'month' : 'day') }} className={btn2}>{l}</button>)}
          <input type="date" value={r.from} onChange={(e) => setR({ ...r, from: e.target.value })} className={`${inp} w-auto`} /><input type="date" value={r.to} onChange={(e) => setR({ ...r, to: e.target.value })} className={`${inp} w-auto`} />
          <select value={by} onChange={(e) => setBy(e.target.value)} className={`${inp} w-auto`}><option value="day">Theo ngày</option><option value="month">Theo tháng</option></select></div></div>
      {d.error && <p className="text-red-400">Lỗi: {d.error.message}</p>}
      {d.data?.capped && <p className="text-amber-400">Khoảng thời gian có quá nhiều đơn, chỉ tính 5.000 đơn đầu. Hãy thu hẹp khoảng ngày.</p>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{kpi.map(([l, v, s]) => (
        <div key={l} className="rounded-2xl border border-white/10 bg-ink-800 p-5"><p className="text-sm text-zinc-400">{l}</p><p className={`mt-1 font-display text-2xl font-bold ${l === 'Lợi nhuận' && T.rev - T.cost < 0 ? 'text-red-400' : 'text-white'}`}>{v}</p><p className="text-xs text-zinc-500">{s}</p></div>))}</div>
      {d.data?.low.length > 0 && <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-200">Nhựa sắp hết: {d.data.low.map((x) => `${x.material} ${x.color_name} (${Math.round(x.remaining_g)}g)`).join(', ')}</div>}
      <div className="rounded-2xl border border-white/10 bg-ink-800 p-5">
        <p className="mb-4 flex gap-4 text-sm text-zinc-400"><span><i className="mr-1 inline-block h-3 w-3 rounded bg-accent" />Doanh thu</span><span><i className="mr-1 inline-block h-3 w-3 rounded bg-red-400" />Chi phí</span></p>
        <div className="flex h-44 items-end gap-1 overflow-x-auto">{list.map((x) => (
          <div key={x.k} className="flex min-w-[14px] flex-1 flex-col items-center gap-1" title={`${x.k}: doanh thu ${$(x.rev)} · chi ${$(x.cost)}`}>
            <div className="flex h-full w-full items-end gap-px"><div className="flex-1 rounded-t bg-accent" style={{ height: `${(x.rev / max) * 100}%`, minHeight: x.rev ? 2 : 0 }} /><div className="flex-1 rounded-t bg-red-400" style={{ height: `${(x.cost / max) * 100}%`, minHeight: x.cost ? 2 : 0 }} /></div>
            {list.length <= 31 && <span className="text-[9px] text-zinc-500">{x.k.slice(by === 'month' ? 2 : 5)}</span>}</div>))}</div>
        {!list.length && <p className="py-10 text-center text-zinc-500">{d.loading ? 'Đang tải…' : 'Chưa có dữ liệu trong khoảng này'}</p>}
      </div>
      <div className="flex justify-end"><button onClick={() => downloadCSV('bao-cao.csv', [['Kỳ', 'Số đơn', 'Doanh thu', 'Đã thu', 'Chi phí', 'Lợi nhuận'], ...list.map((x) => [x.k, x.n, x.rev, x.paid, x.cost, x.rev - x.cost])])} className={btn2}>Xuất Excel (CSV)</button></div>
      <div className="overflow-x-auto rounded-xl border border-white/10"><table className="w-full text-left text-sm"><thead className="bg-ink-800 text-zinc-400"><tr>{['Kỳ', 'Đơn', 'Doanh thu', 'Đã thu', 'Chi phí', 'Lợi nhuận'].map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr></thead>
        <tbody className="[&>tr]:border-t [&>tr]:border-white/5">{list.map((x) => <tr key={x.k}><td className={`${td} text-white`}>{x.k}</td><td className={td}>{x.n}</td><td className={td}>{$(x.rev)}</td><td className={td}>{$(x.paid)}</td><td className={td}>{$(x.cost)}</td><td className={`${td} ${x.rev - x.cost < 0 ? 'text-red-400' : 'text-emerald-400'}`}>{$(x.rev - x.cost)}</td></tr>)}</tbody></table></div>
    </div>
  )
}

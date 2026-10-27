import { useMemo, useState } from 'react'
import { formatVND as $ } from '../../data/products.js'
import { useStore } from '../../lib/store.js'
import { downloadCSV } from '../../lib/export.js'
import { monthlyStats } from '../../lib/finance.js'
import { buildLedger } from '../../lib/ledger.js'
import BarChart from '../../components/BarChart.jsx'
import { btn2, td } from '../../components/ui.jsx'
import { useWset } from './wui.jsx'

/** Báo cáo theo tháng. Dùng CÙNG cách tính với Tổng quan tài chính:
 *  Lãi ròng = doanh thu − giá vốn − phí ship thực trả − chi phí cố định − chi phí vận hành khác. Tiền thu/chi lấy từ sổ tiền (gồm tiền thu từ đơn web). */
export default function AdminReport() {
  const [wo] = useStore('wo'), [wc] = useStore('wc'), [orders] = useStore('orders'), [products] = useStore('products'), [ws] = useStore('ws'), wset = useWset()
  const [months, setMonths] = useState(12)
  const rows = useMemo(() => {
    const ledger = buildLedger({ orders, wc })
    return monthlyStats({ orders, wo, wc, products, wset, ws }, months).map((r) => {
      const l = ledger.filter((x) => (x.date || '').startsWith(r.m)), inn = l.filter((x) => x.type === 'in').reduce((a, x) => a + x.amount, 0), out = l.filter((x) => x.type === 'out').reduce((a, x) => a + x.amount, 0)
      return { ...r, opex: r.fixed + r.other + r.shipCost, inn, out, net: inn - out }
    })
  }, [orders, wo, wc, products, wset, ws, months])
  const tot = (k) => rows.reduce((s, r) => s + r[k], 0)
  const COLS = [['Tháng', null], ['Đơn', 'orders'], ['Doanh thu', 'revenue'], ['Giá vốn', 'cogs'], ['Lãi gộp', 'gross'], ['Chi phí vận hành', 'opex'], ['Lãi ròng', 'profit'], ['Tiền thu', 'inn'], ['Tiền chi', 'out'], ['Dòng tiền', 'net']]
  const exportCsv = () => downloadCSV('bao-cao-thang.csv', [COLS.map(([l]) => l), ...rows.map((r) => [r.m, r.orders, r.revenue, r.cogs, r.gross, r.opex, r.profit, r.inn, r.out, r.net])])
  const neg = (v) => (v < 0 ? 'text-red-400' : '')
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="font-display text-3xl font-bold text-white">Báo cáo theo tháng</h1>
        <div className="flex gap-2"><select value={months} onChange={(e) => setMonths(+e.target.value)} aria-label="Số tháng" className="rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-white">{[6, 12, 24].map((n) => <option key={n} value={n}>{n} tháng gần nhất</option>)}</select><button onClick={exportCsv} className={btn2}>Xuất Excel (CSV)</button></div></div>
      <div className="rounded-2xl border border-white/10 bg-ink-800 p-5">
        <BarChart data={rows.map((r) => ({ key: r.m, label: `${r.m.slice(5)}/${r.m.slice(2, 4)}`, values: [r.revenue, r.out] }))} series={[{ name: 'Doanh thu', color: 'bg-accent' }, { name: 'Tiền chi thực', color: 'bg-red-400' }]} minColW={months > 12 ? 30 : 44} />
      </div>
      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full min-w-[780px] text-left text-sm">
          <thead className="bg-ink-800 text-zinc-400"><tr>{COLS.map(([h]) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr></thead>
          <tbody className="[&>tr]:border-t [&>tr]:border-white/5">
            {rows.map((r) => <tr key={r.m}><td className={`${td} text-white`}>{r.m}</td><td className={td}>{r.orders}</td><td className={td}>{$(r.revenue)}</td><td className={td}>{$(r.cogs)}</td><td className={`${td} ${neg(r.gross)}`}>{$(r.gross)}</td><td className={td}>{$(r.opex)}</td>
              <td className={`${td} font-medium ${r.profit < 0 ? 'text-red-400' : 'text-emerald-400'}`}>{$(r.profit)}</td><td className={td}>{$(r.inn)}</td><td className={td}>{$(r.out)}</td><td className={`${td} ${neg(r.net)}`}>{$(r.net)}</td></tr>)}
            <tr className="border-t-2 border-white/20 font-semibold text-white"><td className={td}>Tổng {months} tháng</td>{COLS.slice(1).map(([, k]) => <td key={k} className={`${td} ${k === 'profit' ? (tot(k) < 0 ? 'text-red-400' : 'text-emerald-400') : ''}`}>{k === 'orders' ? tot(k) : $(tot(k))}</td>)}</tr>
          </tbody>
        </table>
      </div>
      <p className="text-xs leading-relaxed text-zinc-500">Lãi ròng = doanh thu − giá vốn (ước tính theo mục Giá vốn) − chi phí vận hành (phí ship thực trả + chi phí cố định + chi phí khác). Mua nhựa dự trữ không làm giảm lãi mà chỉ làm giảm dòng tiền. Tiền thu/chi lấy từ sổ tiền, gồm cả tiền thu từ đơn web.</p>
    </div>
  )
}

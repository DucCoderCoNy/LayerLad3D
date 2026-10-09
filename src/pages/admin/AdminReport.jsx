import { formatVND as $ } from '../../data/products.js'
import { useStore } from '../../lib/store.js'
import { downloadCSV } from '../../lib/export.js'
import BarChart from '../../components/BarChart.jsx'
import { btn2, td } from '../../components/ui.jsx'

const ym = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
const sum = (a, f) => a.reduce((s, x) => s + f(x), 0)

/** Báo cáo 12 tháng: doanh thu, giá vốn, lãi gộp, thu/chi thực tế.
 *  Doanh thu = đơn xưởng (trừ đơn huỷ) + đơn web CHƯA chuyển sang xưởng (tránh tính 2 lần). Giá vốn chỉ có ở đơn xưởng. */
export default function AdminReport() {
  const [wo] = useStore('wo'), [wc] = useStore('wc'), [orders] = useStore('orders')
  const now = new Date()
  const rows = [...Array(12)].map((_, i) => {
    const m = ym(new Date(now.getFullYear(), now.getMonth() - 11 + i, 1))
    const w = wo.filter((o) => o.date?.startsWith(m) && o.status !== 'Huỷ')
    const web = orders.filter((o) => !o.wo && o.status !== 'cancelled' && ym(new Date(o.createdAt)) === m)
    const c = wc.filter((x) => x.date?.startsWith(m))
    const rev = sum(w, (o) => o.price) + sum(web, (o) => o.total), cost = sum(w, (o) => o.cost || 0)
    const inn = sum(c.filter((x) => x.type === 'in'), (x) => x.amount), out = sum(c.filter((x) => x.type === 'out'), (x) => x.amount)
    return { m, n: w.length + web.length, rev, cost, profit: rev - cost, inn, out, net: inn - out }
  })
  const tot = (k) => sum(rows, (r) => r[k])
  const exportCsv = () => downloadCSV('bao-cao-thang.csv', [['Tháng', 'Số đơn', 'Doanh thu', 'Giá vốn', 'Lãi gộp', 'Thu thực', 'Chi thực', 'Dòng tiền ròng'], ...rows.map((r) => [r.m, r.n, r.rev, r.cost, r.profit, r.inn, r.out, r.net])])
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="font-display text-3xl font-bold text-white">Báo cáo theo tháng</h1><button onClick={exportCsv} className={btn2}>Xuất Excel (CSV)</button></div>
      <div className="rounded-2xl border border-white/10 bg-ink-800 p-5">
        <BarChart data={rows.map((r) => ({ key: r.m, label: `${r.m.slice(5)}/${r.m.slice(2, 4)}`, values: [r.rev, r.out] }))} series={[{ name: 'Doanh thu', color: 'bg-accent' }, { name: 'Chi thực', color: 'bg-red-400' }]} />
      </div>
      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-ink-800 text-zinc-400"><tr>{['Tháng', 'Đơn', 'Doanh thu', 'Giá vốn', 'Lãi gộp', 'Thu thực', 'Chi thực', 'Ròng'].map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr></thead>
          <tbody className="[&>tr]:border-t [&>tr]:border-white/5">
            {rows.map((r) => <tr key={r.m}><td className={`${td} text-white`}>{r.m}</td><td className={td}>{r.n}</td><td className={td}>{$(r.rev)}</td><td className={td}>{$(r.cost)}</td>
              <td className={`${td} ${r.profit < 0 ? 'text-red-400' : 'text-emerald-400'}`}>{$(r.profit)}</td><td className={td}>{$(r.inn)}</td><td className={td}>{$(r.out)}</td>
              <td className={`${td} ${r.net < 0 ? 'text-red-400' : ''}`}>{$(r.net)}</td></tr>)}
            <tr className="border-t-2 border-white/20 font-semibold text-white"><td className={td}>Tổng 12 tháng</td><td className={td}>{tot('n')}</td><td className={td}>{$(tot('rev'))}</td><td className={td}>{$(tot('cost'))}</td><td className={td}>{$(tot('profit'))}</td><td className={td}>{$(tot('inn'))}</td><td className={td}>{$(tot('out'))}</td><td className={td}>{$(tot('net'))}</td></tr>
          </tbody>
        </table>
      </div>
      <p className="text-xs text-zinc-500">Lãi gộp = doanh thu − giá vốn (giá vốn tính theo cài đặt ở mục Giá vốn). Thu/chi thực lấy từ sổ Thu chi.</p>
    </div>
  )
}

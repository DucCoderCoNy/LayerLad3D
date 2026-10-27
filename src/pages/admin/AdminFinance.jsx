import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatVND as $ } from '../../data/products.js'
import { useStore } from '../../lib/store.js'
import { downloadCSV } from '../../lib/export.js'
import { dayKey, inRange, pctChange, periodStats, presetRange, prevRange } from '../../lib/finance.js'
import { balances, buildLedger } from '../../lib/ledger.js'
import { dueOf } from '../../lib/receivables.js'
import { num, today } from '../../lib/workshop.js'
import BarChart from '../../components/BarChart.jsx'
import DateRange from '../../components/DateRange.jsx'
import Rank from '../../components/Rank.jsx'
import { Field, btn, btn2, inp } from '../../components/ui.jsx'
import { Card, useWset } from './wui.jsx'

const top = (o, n = 8) => Object.entries(o).map(([k, v]) => ({ k, v })).filter((x) => x.v > 0).sort((a, b) => b.v - a.v).slice(0, n)

/** Phần trăm thay đổi so với kỳ trước; goodUp=false cho khoản chi (tăng là xấu) */
function Delta({ cur, prev, goodUp = true }) {
  const p = pctChange(cur, prev)
  if (p == null) return prev === undefined ? null : <span className="text-[11px] text-zinc-600">kỳ trước: {prev ? $(prev) : '0₫'}</span>
  const good = p === 0 ? null : (p > 0) === goodUp
  return <span className={`text-[11px] ${good == null ? 'text-zinc-500' : good ? 'text-emerald-400' : 'text-red-400'}`}>{p > 0 ? '▲' : p < 0 ? '▼' : '='} {Math.abs(p)}% so với kỳ trước ({$(prev)})</span>
}

/** Tổng quan tài chính: lãi lỗ, dòng tiền, số dư, so sánh kỳ trước, hòa vốn và mục tiêu – một màn hình. */
export default function AdminFinance() {
  const [orders] = useStore('orders'), [wo] = useStore('wo'), [wc] = useStore('wc'), [products] = useStore('products'), [ws] = useStore('ws'), [recurring] = useStore('recurring'), [st, setSt] = useStore('settings')
  const wset = useWset()
  const [range, setRange] = useState(() => presetRange('month')), [compare, setCompare] = useState(true), [goal, setGoal] = useState(null), [saved, setSaved] = useState(false)
  const [from, to] = range
  const data = useMemo(() => ({ orders, wo, wc, products, wset, ws }), [orders, wo, wc, products, wset, ws])
  const S = useMemo(() => periodStats(data, from, to), [data, from, to])
  const pr = compare ? prevRange(from, to) : null
  const P = useMemo(() => (pr ? periodStats(data, pr[0], pr[1]) : null), [data, pr?.[0], pr?.[1]])

  const ledger = useMemo(() => buildLedger({ orders, wc }), [orders, wc])
  const rows = useMemo(() => ledger.filter((x) => inRange(x.date, from, to)), [ledger, from, to])
  const prows = useMemo(() => (pr ? ledger.filter((x) => inRange(x.date, pr[0], pr[1])) : []), [ledger, pr?.[0], pr?.[1]])
  const sumT = (l, t) => l.filter((x) => x.type === t).reduce((a, x) => a + x.amount, 0)
  const cin = sumT(rows, 'in'), cout = sumT(rows, 'out'), pin = sumT(prows, 'in'), pout = sumT(prows, 'out')
  const bal = useMemo(() => balances(ledger, st), [ledger, st])
  const receivable = orders.reduce((t, o) => t + dueOf(o), 0)
  const opex = S.fixed + S.other + S.shipCost, popex = P ? P.fixed + P.other + P.shipCost : undefined
  const margin = S.revenue ? Math.round((S.gross / S.revenue) * 100) : 0

  // Thu/chi theo ngày (≤ 31 ngày) hoặc theo tháng
  const bars = useMemo(() => {
    const dates = rows.map((x) => x.date).filter(Boolean).sort(), a = from || dates[0] || today(), b = to || today()
    const span = Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 864e5) + 1, byMonth = span > 31, m = new Map()
    for (let t = new Date(a + 'T12:00:00'); t <= new Date(b + 'T12:00:00'); t = new Date(t.getFullYear(), t.getMonth(), t.getDate() + 1)) { const k = dayKey(t); m.set(byMonth ? k.slice(0, 7) : k, [0, 0]) }
    rows.forEach((x) => { const k = byMonth ? x.date.slice(0, 7) : x.date, v = m.get(k); if (v) v[x.type === 'in' ? 0 : 1] += x.amount })
    return [...m].map(([k, v]) => ({ key: k, label: byMonth ? `${k.slice(5)}/${k.slice(2, 4)}` : `${+k.slice(8)}/${+k.slice(5, 7)}`, values: v }))
  }, [rows, from, to])

  // Hòa vốn & mục tiêu
  const monthRange = presetRange('month'), M = useMemo(() => periodStats(data, ...monthRange), [data])
  const d90 = [dayKey(new Date(Date.now() - 89 * 864e5)), dayKey(new Date())], N90 = useMemo(() => periodStats(data, ...d90), [data])
  const Y = useMemo(() => periodStats(data, `${new Date().getFullYear()}-01-01`, dayKey(new Date())), [data])
  const fixedMonthly = recurring.filter((x) => x.active).reduce((t, x) => t + num(x.amount), 0)
  const margin90 = N90.revenue ? N90.gross / N90.revenue : 0, aov = N90.orders ? N90.revenue / N90.orders : 0
  const breakEven = fixedMonthly > 0 && margin90 > 0 ? fixedMonthly / margin90 : 0
  const bePct = breakEven ? Math.min(100, Math.round((M.revenue / breakEven) * 100)) : 0, beGap = Math.max(0, breakEven - M.revenue)
  const saveGoal = () => { setSt({ ...st, revenueGoal: num(goal.revenueGoal), yearGoal: num(goal.yearGoal), openCash: num(goal.openCash), openBank: num(goal.openBank) }); setSaved(true) }

  const pnl = [
    ['Doanh thu', S.revenue, '', 'text-white'], ['Giá vốn hàng đã bán (nhựa + điện + máy, ước tính)', -S.cogs, '', 'text-zinc-300'], ['Lãi gộp', S.gross, `${margin}% doanh thu`, 'text-white font-semibold'],
    ['Phí ship thực trả (nhập ở đơn)', -S.shipCost, '', 'text-zinc-300'], ['Chi phí cố định (thuê chỗ, internet, lương…)', -S.fixed, '', 'text-zinc-300'], ['Chi phí vận hành khác', -S.other, '', 'text-zinc-300'],
    ['LÃI RÒNG ƯỚC TÍNH', S.profit, S.revenue ? `${Math.round((S.profit / S.revenue) * 100)}% doanh thu` : '', S.profit < 0 ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold'],
  ]
  const exportCsv = () => downloadCSV('bao-cao-tai-chinh.csv', [['Khoản mục', 'Số tiền (₫)', 'Ghi chú'], ...pnl.map(([l, v, n]) => [l, Math.round(v), n]), [], ['Chi tiêu theo danh mục (sổ Thu chi)', '', ''], ...top(S.byCat, 99).map((x) => [x.k, x.v, '']), [], ['Doanh thu theo nguồn', '', ''], ...top(S.bySource, 99).map((x) => [x.k, x.v, '']), [], ['Tiền thu thực (sổ tiền)', cin, ''], ['Tiền chi thực (sổ tiền)', cout, ''], ['Dòng tiền ròng', cin - cout, '']])
  const Kpi2 = ({ l, v, sub, cls = 'text-white', children }) => <div className="rounded-xl border border-white/10 bg-ink-800 p-4"><p className="text-sm text-zinc-400">{l}</p><p className={`mt-1 font-display text-2xl font-bold ${cls}`}>{v}</p>{sub && <p className="mt-0.5 text-[11px] text-zinc-500">{sub}</p>}{children}</div>

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3"><h1 className="mr-auto font-display text-3xl font-bold text-white">Tổng quan tài chính</h1>
        <Link to="/admin/cash" className={btn2}>Sổ thu chi</Link><Link to="/admin/report" className={btn2}>Báo cáo tháng</Link><button onClick={exportCsv} className={btn2}>Xuất báo cáo (CSV)</button></div>

      <div className="space-y-3 rounded-2xl border border-white/10 bg-ink-800 p-5">
        <DateRange value={range} onChange={setRange} />
        <label className="flex items-center gap-2 text-sm text-zinc-300"><input type="checkbox" checked={compare} disabled={!prevRange(from, to)} onChange={(e) => setCompare(e.target.checked)} className="accent-orange-500" />So sánh với kỳ trước{pr ? ` (${pr[0].split('-').reverse().join('/')} – ${pr[1].split('-').reverse().join('/')})` : ' (chọn khoảng ngày đủ hai đầu)'}</label>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi2 l="Doanh thu" v={$(S.revenue)}><Delta cur={S.revenue} prev={P?.revenue} /></Kpi2>
          <Kpi2 l="Lãi gộp" v={$(S.gross)} sub={`biên lãi gộp ${margin}%`}><Delta cur={S.gross} prev={P?.gross} /></Kpi2>
          <Kpi2 l="Lãi ròng ước tính" v={$(S.profit)} cls={S.profit < 0 ? 'text-red-400' : 'text-emerald-400'}><Delta cur={S.profit} prev={P?.profit} /></Kpi2>
          <Kpi2 l="Chi phí vận hành" v={$(opex)} cls="text-red-300" sub={`cố định ${$(S.fixed)} · khác ${$(S.other)} · ship ${$(S.shipCost)}`}><Delta cur={opex} prev={popex} goodUp={false} /></Kpi2>
          <Kpi2 l="Tiền thu thực" v={$(cin)} cls="text-emerald-400" sub="theo ngày tiền vào (gồm đơn web)"><Delta cur={cin} prev={P ? pin : undefined} /></Kpi2>
          <Kpi2 l="Tiền chi thực" v={$(cout)} cls="text-red-300" sub="gồm cả mua nhựa dự trữ"><Delta cur={cout} prev={P ? pout : undefined} goodUp={false} /></Kpi2>
          <Kpi2 l="Dòng tiền ròng" v={$(cin - cout)} cls={cin - cout < 0 ? 'text-red-400' : 'text-white'}><Delta cur={cin - cout} prev={P ? pin - pout : undefined} /></Kpi2>
          <Kpi2 l="Số đơn" v={S.orders} sub={S.orders ? `trung bình ${$(S.revenue / S.orders)} / đơn` : ''}><Delta cur={S.orders} prev={P?.orders} /></Kpi2>
        </div>
        {S.noCost > 0 && <p className="text-xs text-amber-300">{S.noCost} đơn chưa tính được giá vốn (món chưa khai số gram) nên lãi có thể đang cao hơn thực tế.</p>}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi2 l="Tiền mặt (ước tính)" v={$(bal.cash)} cls={bal.cash < 0 ? 'text-red-400' : 'text-white'} sub="gồm tiền mặt + COD đã thu" />
        <Kpi2 l="Ngân hàng (ước tính)" v={$(bal.bank)} cls={bal.bank < 0 ? 'text-red-400' : 'text-white'} sub="gồm chuyển khoản" />
        <Kpi2 l="Nhựa còn trong kho" v={$(S.stockValue)} sub="tài sản, không phải chi phí" />
        <Kpi2 l="Còn phải thu từ khách" v={$(receivable)} cls={receivable ? 'text-amber-300' : 'text-white'}><Link to="/admin/receivables" className="text-[11px] text-accent hover:underline">Xem công nợ →</Link></Kpi2>
      </div>
      {(bal.cash < 0 || bal.bank < 0) && <p className="-mt-3 text-xs text-amber-300">Số dư âm thường do chưa nhập số dư đầu kỳ. Bấm "Mục tiêu & số dư đầu kỳ" ở cuối trang để nhập số tiền bạn đang có thực tế.</p>}

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Kết quả kinh doanh trong kỳ">
          <table className="w-full text-sm"><tbody>{pnl.map(([l, v, n, c], i) => <tr key={l} className={i === pnl.length - 1 || i === 2 ? 'border-t border-white/15' : ''}><td className={`py-2 ${c}`}>{l}</td><td className={`py-2 text-right ${c}`}>{v < 0 ? '−' : ''}{$(Math.abs(v))}{n && <small className="block text-[11px] font-normal text-zinc-500">{n}</small>}</td></tr>)}</tbody></table>
          <p className="mt-3 text-[11px] leading-relaxed text-zinc-500">Chi mua nhựa trong kỳ: {$(S.filament)} và tiền điện ghi sổ: {$(S.power)} <b>không</b> trừ trực tiếp vào lãi vì phần dùng thực tế đã nằm trong giá vốn ước tính. Chúng chỉ làm giảm dòng tiền.</p>
        </Card>
        <Card title="Điểm hòa vốn & mục tiêu">
          {fixedMonthly > 0 ? (
            <div className="space-y-3 text-sm">
              <p className="text-zinc-300">Chi phí cố định mỗi tháng: <b className="text-white">{$(fixedMonthly)}</b> · biên lãi gộp 90 ngày gần nhất: <b className="text-white">{Math.round(margin90 * 100)}%</b></p>
              {breakEven > 0 ? (<>
                <p className="text-zinc-300">Doanh thu hòa vốn: <b className="text-accent">{$(breakEven)} / tháng</b></p>
                <div className="h-3 overflow-hidden rounded-full bg-white/10"><div className={`h-full rounded-full ${bePct >= 100 ? 'bg-emerald-400' : 'bg-accent'}`} style={{ width: `${bePct}%` }} /></div>
                <p className="text-xs text-zinc-400">Tháng này đạt {$(M.revenue)} ({bePct}% mốc hòa vốn).{beGap > 0 ? <> Còn thiếu <b className="text-white">{$(beGap)}</b>{aov > 0 && <> – khoảng <b className="text-white">{Math.ceil(beGap / aov)} đơn</b> nữa (đơn trung bình {$(aov)})</>}.</> : <b className="text-emerald-400"> Đã vượt hòa vốn tháng này 🎉</b>}</p>
              </>) : <p className="text-xs text-amber-300">Chưa đủ dữ liệu bán hàng 90 ngày gần nhất để tính biên lãi.</p>}
            </div>
          ) : <p className="text-sm text-zinc-400">Chưa có chi phí cố định. Vào <Link to="/admin/cash" className="text-accent">Thu chi → Chi phí định kỳ</Link> thêm tiền thuê chỗ, internet… để hệ thống tính doanh thu hòa vốn mỗi tháng.</p>}
          {st.revenueGoal > 0 && <div className="mt-4 border-t border-white/10 pt-3 text-sm"><p className="text-zinc-300">Mục tiêu doanh thu tháng: <b className="text-white">{$(st.revenueGoal)}</b> – đạt {Math.round((M.revenue / st.revenueGoal) * 100)}%</p><div className="mt-1 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-sky-400" style={{ width: `${Math.min(100, Math.round((M.revenue / st.revenueGoal) * 100))}%` }} /></div></div>}
          {st.yearGoal > 0 && <div className="mt-3 text-sm"><p className="text-zinc-300">Mốc doanh thu năm bạn đặt: <b className="text-white">{$(st.yearGoal)}</b> – đã đạt {$(Y.revenue)} ({Math.round((Y.revenue / st.yearGoal) * 100)}%)</p><div className="mt-1 h-2 overflow-hidden rounded-full bg-white/10"><div className={`h-full rounded-full ${Y.revenue >= st.yearGoal ? 'bg-amber-400' : 'bg-violet-400'}`} style={{ width: `${Math.min(100, Math.round((Y.revenue / st.yearGoal) * 100))}%` }} /></div></div>}
        </Card>
      </div>

      <Card title="Tiền vào / tiền ra theo thời gian"><BarChart data={bars} series={[{ name: 'Tiền thu', color: 'bg-emerald-400' }, { name: 'Tiền chi', color: 'bg-red-400' }]} minColW={bars.length > 14 ? 22 : 44} /></Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Chi tiêu theo danh mục (sổ Thu chi)"><Rank rows={top(S.byCat)} fmt={$} empty="Chưa có khoản chi nào trong kỳ" /></Card>
        <Card title="Doanh thu theo nguồn"><Rank rows={top(S.bySource)} fmt={$} empty="Chưa có doanh thu trong kỳ" /></Card>
      </div>

      <details className="rounded-2xl border border-white/10 bg-ink-800 p-5" onToggle={(e) => e.target.open && !goal && setGoal({ revenueGoal: st.revenueGoal || '', yearGoal: st.yearGoal || '', openCash: st.openCash || '', openBank: st.openBank || '' })}>
        <summary className="cursor-pointer font-semibold text-accent">Mục tiêu & số dư đầu kỳ</summary>
        {goal && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field label="Mục tiêu doanh thu mỗi tháng (₫)"><input type="number" min="0" step="100000" value={goal.revenueGoal} onChange={(e) => { setSaved(false); setGoal({ ...goal, revenueGoal: e.target.value }) }} className={inp} /></Field>
            <Field label="Mốc doanh thu cả năm tự đặt (₫) – để theo dõi tiến độ"><input type="number" min="0" step="1000000" value={goal.yearGoal} onChange={(e) => setGoal({ ...goal, yearGoal: e.target.value })} className={inp} /></Field>
            <Field label="Tiền mặt đang có khi bắt đầu dùng hệ thống (₫)"><input type="number" step="1000" value={goal.openCash} onChange={(e) => setGoal({ ...goal, openCash: e.target.value })} className={inp} /></Field>
            <Field label="Số dư ngân hàng khi bắt đầu dùng hệ thống (₫)"><input type="number" step="1000" value={goal.openBank} onChange={(e) => setGoal({ ...goal, openBank: e.target.value })} className={inp} /></Field>
            <p className="text-xs text-zinc-500 sm:col-span-2">Số dư hiện tại = số dư đầu kỳ + mọi khoản thu − mọi khoản chi trong sổ. Nhập số dư thực tế lúc bạn bắt đầu ghi sổ để số dư hiện tại khớp với tiền bạn đang có. Hệ thống không đọc được sao kê ngân hàng nên bạn cần đối chiếu định kỳ.</p>
            <div className="flex items-center gap-3 sm:col-span-2"><button onClick={saveGoal} className={btn}>Lưu</button>{saved && <span className="text-sm text-emerald-400">✓ Đã lưu</span>}</div>
          </div>)}
      </details>
    </div>
  )
}

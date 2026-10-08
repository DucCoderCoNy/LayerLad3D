import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useStore } from '../../lib/store.js'
import { fmtDT, planAll } from '../../lib/workshop.js'
import { dayKey } from '../../lib/finance.js'
import { btn2 } from '../../components/ui.jsx'
import { Card, useWset } from './wui.jsx'

const hue = (id) => [...String(id)].reduce((a, c) => a + c.charCodeAt(0) * 7, 0) % 360
const DOW = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']

/** Lịch in dạng tháng: mỗi ô ngày liệt kê các đơn dự kiến in (theo hàng đợi từng máy) và hạn giao. Bấm 1 ngày để xem chi tiết. */
export default function AdminCalendar() {
  const [wo] = useStore('wo'), [printers] = useStore('printers'), S = useWset()
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1) })
  const [pick, setPick] = useState(dayKey(Date.now()))

  // jobs[dayKey] = [{ o, printer, s, e, run, late }]; đơn kéo dài nhiều ngày xuất hiện ở mỗi ngày nó chiếm máy
  const { jobs, due } = useMemo(() => {
    const jobs = {}, due = {}
    for (const { printer, plan } of planAll(wo, S, printers)) for (const x of plan) {
      const a = new Date(x.s); a.setHours(0, 0, 0, 0)
      for (let t = +a; t <= x.e && t - +a < 60 * 864e5; t += 864e5) (jobs[dayKey(t)] ||= []).push({ ...x, printer })
    }
    wo.filter((o) => o.due && !['Hoàn thành', 'Đã giao', 'Huỷ'].includes(o.status)).forEach((o) => (due[o.due] ||= []).push(o))
    return { jobs, due }
  }, [wo, printers, S])

  const first = new Date(month), offset = (first.getDay() + 6) % 7, days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const cells = [...Array(offset).fill(null), ...Array.from({ length: days }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1))]
  const go = (n) => setMonth(new Date(month.getFullYear(), month.getMonth() + n, 1))
  const list = jobs[pick] || [], dueList = due[pick] || []
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="mr-auto font-display text-3xl font-bold text-white">Lịch in</h1>
        <button onClick={() => go(-1)} aria-label="Tháng trước" className={btn2}><ChevronLeft size={16} /></button>
        <b className="min-w-32 text-center text-white">Tháng {month.getMonth() + 1}/{month.getFullYear()}</b>
        <button onClick={() => go(1)} aria-label="Tháng sau" className={btn2}><ChevronRight size={16} /></button>
        <button onClick={() => { const d = new Date(); setMonth(new Date(d.getFullYear(), d.getMonth(), 1)); setPick(dayKey(d)) }} className={btn2}>Hôm nay</button>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-ink-800 p-3">
        <div className="grid min-w-[640px] grid-cols-7 gap-1 text-xs">
          {DOW.map((d) => <div key={d} className="py-1 text-center font-medium text-zinc-500">{d}</div>)}
          {cells.map((d, i) => {
            if (!d) return <div key={i} />
            const k = dayKey(d), js = jobs[k] || [], dd = due[k] || [], today = k === dayKey(Date.now())
            return (
              <button key={k} onClick={() => setPick(k)} className={`flex min-h-24 flex-col items-stretch gap-0.5 rounded-lg border p-1.5 text-left align-top ${pick === k ? 'border-accent bg-accent/10' : 'border-white/5 hover:border-white/20'}`}>
                <span className={`mb-0.5 text-[11px] ${today ? 'font-bold text-accent' : 'text-zinc-400'}`}>{d.getDate()}</span>
                {js.slice(0, 3).map((x) => <span key={x.o.id + x.printer.id} className="truncate rounded px-1 text-[10px] text-white" style={{ background: `hsl(${hue(x.o.id)} 50% 38%)` }}>{x.o.name}</span>)}
                {js.length > 3 && <span className="text-[10px] text-zinc-500">+{js.length - 3} đơn</span>}
                {dd.length > 0 && <span className="truncate rounded border border-red-400/40 px-1 text-[10px] text-red-300">Hạn giao: {dd.length}</span>}
              </button>)
          })}
        </div>
      </div>
      <Card title={`Chi tiết ngày ${pick.split('-').reverse().join('/')}`}>
        {list.length === 0 && dueList.length === 0 && <p className="text-zinc-500">Không có đơn nào được xếp in hoặc đến hạn trong ngày này.</p>}
        <ul className="space-y-2 text-sm">
          {list.map((x) => (
            <li key={x.o.id + x.printer.id} className="flex flex-wrap items-center gap-x-3 rounded-lg bg-ink-900 p-3">
              <i className="h-3 w-3 rounded-full" style={{ background: `hsl(${hue(x.o.id)} 55% 45%)` }} /><b className="text-white">{x.o.cust}</b><span className="text-zinc-300">{x.o.name}</span>
              <span className="ml-auto text-zinc-500">{x.printer.name} · {fmtDT(x.s)} → {fmtDT(x.e)}{x.run && ' · đang in'}</span>{x.late && <span className="text-red-400">Trễ hạn</span>}
            </li>))}
          {dueList.map((o) => <li key={'d' + o.id} className="rounded-lg border border-red-400/30 p-3 text-red-200">Hạn giao: <b>{o.cust}</b> · {o.name} ({o.status})</li>)}
        </ul>
      </Card>
      <p className="text-xs text-zinc-500">Lịch được tính từ hàng đợi từng máy (đơn Đã cọc / Chờ in / Đang in) và thời gian in dự kiến của mỗi đơn; đơn chưa có giờ in sẽ chiếm 0 giờ.</p>
    </div>
  )
}

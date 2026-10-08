import { formatVND } from '../../data/products.js'
import { useStore } from '../../lib/store.js'
import { useState } from 'react'
import { fmtDT, isDone, plan, printerOf, waitList } from '../../lib/workshop.js'
import { DataTable, btn, btn2, td } from '../../components/ui.jsx'
import { Card, Kpi, Tag, useWset } from './wui.jsx'

const hue = (id) => [...id].reduce((a, c) => a + c.charCodeAt(0) * 7, 0) % 360

/** Công suất máy theo ngày: mỗi thanh = 24 giờ */
function DayBars({ p }) {
  const t0 = new Date().setHours(0, 0, 0, 0)
  const n = Math.min(14, Math.ceil((Math.max(...p.map((x) => x.e)) - t0) / 864e5))
  return (
    <div className="space-y-2">
      {[...Array(n)].map((_, i) => {
        const a = t0 + i * 864e5, b = a + 864e5; let used = 0
        const seg = p.filter((x) => x.s < b && x.e > a).map((x) => { const s = Math.max(x.s, a), e = Math.min(x.e, b); used += e - s
          return <div key={x.o.id} title={`${x.o.cust} · ${x.o.name}`} className="absolute inset-y-0 overflow-hidden whitespace-nowrap px-1 text-[11px] text-white"
            style={{ left: `${((s - a) / 864e5) * 100}%`, width: `${((e - s) / 864e5) * 100}%`, background: `hsl(${hue(x.o.id)} 50% 40%)` }}>{x.o.name}</div> })
        return <div key={i} className="grid grid-cols-[90px_1fr_50px] items-center gap-2 text-xs text-zinc-400">
          <span>{new Date(a).toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' })}</span>
          <div className="relative h-6 overflow-hidden rounded bg-white/5">{seg}</div><span className="text-right">{(used / 36e5).toFixed(1)}h</span></div>
      })}
      <p className="text-xs text-zinc-500">Mỗi thanh là 24 giờ (0h bên trái, 24h bên phải).</p>
    </div>
  )
}

/** Lịch in cho 1 máy (Kobra X): thứ tự, giờ dự kiến, cảnh báo trễ hạn */
export default function WorkshopQueue() {
  const [allOrders, setWo] = useStore('wo'), [, setStock] = useStore('ws'), [printers] = useStore('printers')
  const S = useWset()
  const act = printers.filter((p) => p.active), [pid, setPid] = useState('')
  const cur = act.find((p) => p.id === pid) || act[0]
  const orders = cur ? allOrders.filter((o) => printerOf(o, printers) === cur.id) : allOrders // mỗi máy có hàng đợi riêng
  const p = plan(orders, S), run = p.filter((x) => x.run), wait = p.filter((x) => !x.run)
  const free = p.length ? Math.max(...p.map((x) => x.e)) + S.buf * 6e4 : Date.now()
  const quoted = orders.filter((o) => o.status === 'Báo giá').length

  const renumber = (w) => { const m = Object.fromEntries(w.map((o, i) => [o.id, i + 1])); setWo((c) => c.map((o) => (m[o.id] ? { ...o, q: m[o.id] } : o))) }
  const autoSort = () => { const d = (o) => o.due || '9999'; renumber(waitList(orders).sort((a, b) => (b.prio - a.prio) || (d(a) < d(b) ? -1 : d(a) > d(b) ? 1 : 0) || ((a.q || 0) - (b.q || 0)))) }
  const move = (id, d) => { const w = waitList(orders), i = w.findIndex((o) => o.id === id), j = i + d; if (j < 0 || j >= w.length) return; [w[i], w[j]] = [w[j], w[i]]; renumber(w) }
  const start = (id) => { if (run.length && !confirm('Máy đang có đơn "Đang in". Vẫn bắt đầu đơn này?')) return; setWo((c) => c.map((o) => (o.id === id ? { ...o, status: 'Đang in', startedAt: Date.now() } : o))) }
  const finish = (id) => {
    const o = orders.find((x) => x.id === id)
    if (!o.deducted && o.spool && o.g > 0) setStock((c) => c.map((s) => (s.id === o.spool ? { ...s, qty: Math.max(0, s.qty - o.g) } : s)))
    setWo((c) => c.map((x) => (x.id === id ? { ...x, status: 'Hoàn thành', deducted: x.deducted || (!!x.spool && x.g > 0) } : x)))
  }
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3"><h1 className="mr-auto font-display text-3xl font-bold text-white">Hàng đợi in{cur ? ` – ${cur.name}` : ''}</h1>
        {act.length > 1 && <select value={cur?.id} onChange={(e) => setPid(e.target.value)} aria-label="Chọn máy in" className="rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-white">{act.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>}
        <button onClick={autoSort} className={btn2}>Tự sắp xếp: gấp trước, gần hạn trước</button>
        <span className="text-sm text-zinc-400">{p.length} đơn · {p.reduce((a, x) => a + x.o.h, 0).toFixed(1)}h máy</span></div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Kpi big l="Máy rảnh sớm nhất (để hẹn khách đơn mới)" v={fmtDT(free)} />
        <Kpi l="Đang in" v={run.length ? run[0].o.name : cur && cur.status !== 'idle' ? { maintenance: 'Máy đang bảo trì', offline: 'Máy tắt/không dùng' }[cur.status] : 'Máy đang nghỉ'} />
        <Kpi l="Đơn trễ hạn theo lịch" v={p.filter((x) => x.late).length} cls={p.some((x) => x.late) ? 'text-red-400' : ''} /></div>
      {run.length > 1 && <p className="rounded-xl bg-amber-500/10 p-3 text-sm text-amber-300">Có hơn 1 đơn "Đang in" nhưng chỉ có 1 máy. Hãy kiểm tra lại trạng thái.</p>}
      <Card title="Thứ tự in">
        <DataTable heads={['#', 'Khách / Mẫu / Thông số in', 'Gram · giờ', 'Dự kiến in', 'Hạn giao', '']} empty="Hàng đợi trống. Đơn có trạng thái Đã cọc, Chờ in hoặc Đang in sẽ hiện ở đây.">
          {p.map((x) => { const o = x.o; return (
            <tr key={o.id}>
              <td className={td}>{x.run ? <Tag s="Đang in" /> : wait.indexOf(x) + 1}</td>
              <td className={td}><b className="text-white">{o.cust}</b> · {o.name}{o.prio == 1 && <span className="ml-1 rounded bg-red-500/20 px-1.5 text-xs text-red-300">Gấp</span>}
                <br /><small className="text-zinc-500">File: {o.file || '—'} · Màu: {o.colors || '—'} · Layer {o.layer} · Infill {o.infill ?? '—'}%{o.note && ` · ${o.note}`}</small></td>
              <td className={td}>{o.g}g<br />{o.h ? `${o.h}h` : <span className="text-amber-400">chưa có giờ</span>}</td>
              <td className={td}>{fmtDT(x.s)}<br /><small className="text-zinc-500">đến {fmtDT(x.e)}</small></td>
              <td className={`${td} ${x.late ? 'text-red-400' : ''}`}>{o.due || '—'}{x.late && <><br />Trễ hạn!</>}</td>
              <td className={`${td} whitespace-nowrap`}>{x.run ? <button onClick={() => finish(o.id)} className={`${btn} !px-3 !py-1.5`}>Xong</button> : <>
                <button onClick={() => move(o.id, -1)} className="px-2 text-zinc-400 hover:text-white" title="Lên">↑</button>
                <button onClick={() => move(o.id, 1)} className="px-2 text-zinc-400 hover:text-white" title="Xuống">↓</button>
                <button onClick={() => start(o.id)} className={`${btn} !px-3 !py-1.5`}>Bắt đầu in</button></>}</td>
            </tr>) })}
        </DataTable>
        {quoted > 0 && <p className="mt-3 text-sm text-zinc-500">{quoted} đơn đang "Báo giá" chưa vào hàng đợi. Khi khách chốt, đổi sang "Chờ in" hoặc "Đã cọc".</p>}
      </Card>
      <Card title="Công suất máy theo ngày">{p.length ? <DayBars p={p} /> : <p className="text-zinc-500">Chưa có gì để xếp lịch.</p>}</Card>
    </div>
  )
}

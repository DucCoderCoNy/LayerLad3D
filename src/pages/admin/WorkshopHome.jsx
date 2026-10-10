import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import { formatVND } from '../../data/products.js'
import { useStore } from '../../lib/store.js'
import { fmtDT, isDone, num, plan, planAll, printerOf } from '../../lib/workshop.js'
import { ACTIVE_WO, attention, fmtDur, maintStatus, materialNeeds, printerHours, progress, wasteStats } from '../../lib/workshopTools.js'
import { btn, btn2 } from '../../components/ui.jsx'
import { Card, Kpi, useWset } from './wui.jsx'
import { FinishModal, MaintModal, WasteModal } from './workshopModals.jsx'

const STATUS = { idle: ['Sẵn sàng', 'text-emerald-300'], printing: ['Đang in', 'text-accent'], maintenance: ['Bảo trì', 'text-amber-300'], offline: ['Tắt / hỏng', 'text-zinc-500'] }

/** Tổng quan xưởng: một màn hình để biết máy nào đang in gì, còn bao lâu, việc nào gấp, nhựa có đủ không, in lỗi bao nhiêu. */
export default function WorkshopHome() {
  const [wo] = useStore('wo'), [stock] = useStore('ws'), [printers] = useStore('printers'), [wlog, setLog] = useStore('wlog'), S = useWset()
  const [waste, setWaste] = useState(null), [maint, setMaint] = useState(null), [fin, setFin] = useState(null)
  const now = Date.now()
  const act = printers.filter((p) => p.active)
  const all = useMemo(() => planAll(wo, S, printers), [wo, S, printers])
  const todo = useMemo(() => attention({ orders: wo, printers, wlog, stock, wset: S }), [wo, printers, wlog, stock, S])
  const needs = useMemo(() => materialNeeds(wo, stock), [wo, stock])
  const ws = wasteStats(wlog), done30 = wo.filter((o) => isDone(o) && now - (o.finishedAt || new Date(o.date).getTime()) <= 30 * 864e5).reduce((t, o) => t + num(o.gReal || o.g), 0)
  const running = wo.filter((o) => o.status === 'Đang in').length, waiting = wo.filter((o) => ['Đã cọc', 'Chờ in'].includes(o.status)).length
  const queueH = wo.filter((o) => ACTIVE_WO.includes(o.status)).reduce((t, o) => t + num(o.h), 0)
  const wastePct = done30 + ws.g > 0 ? Math.round((ws.g / (done30 + ws.g)) * 100) : 0
  const late = all.flatMap((x) => x.plan).filter((x) => x.late).length
  const lvl = { high: 'bg-red-400', mid: 'bg-amber-400', low: 'bg-sky-400' }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="mr-auto font-display text-3xl font-bold text-white">Tổng quan xưởng</h1>
        <Link to="/admin/workshop-board" className={btn2}>Bảng công việc</Link>
        <button onClick={() => setWaste({})} className={btn2}>Báo in lỗi</button>
        <Link to="/admin/workshop" className={btn}>+ Đơn xưởng mới</Link>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi l="Máy đang in" v={`${running}/${act.length}`} cls={running ? 'text-accent' : ''} /><Kpi l="Đơn chờ in" v={waiting} /><Kpi l="Giờ máy còn trong hàng đợi" v={`${queueH.toFixed(1)}h`} />
        <Kpi l="Đơn dự kiến trễ hạn" v={late} cls={late ? 'text-red-400' : ''} /><Kpi l="In lỗi 30 ngày" v={`${wastePct}%`} cls={wastePct > 10 ? 'text-red-400' : ''} />
      </div>

      <Card title="Việc cần chú ý">
        {todo.length === 0 ? <p className="text-sm text-emerald-400">✓ Xưởng đang ổn: không có đơn trễ, đủ nhựa, máy chưa tới kỳ bảo trì.</p> : (
          <ul className="space-y-2 text-sm">{todo.map((t) => <li key={t.text}><Link to={t.to} className="flex items-start gap-3 rounded-lg bg-ink-900 p-3 hover:bg-white/5"><i className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${lvl[t.level]}`} /><span className="text-zinc-200">{t.text}</span><span className="ml-auto shrink-0 text-accent">Xem →</span></Link></li>)}</ul>)}
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {all.map(({ printer: p, plan: pl }) => {
          const run = pl.find((x) => x.run), wait = pl.filter((x) => !x.run), pr = run ? progress(run.o, now) : null
          const hrs = printerHours(p, wo, wlog, printers, now), m = maintStatus(p, hrs), st = run ? 'printing' : p.status === 'printing' ? 'idle' : p.status
          const free = pl.length ? Math.max(...pl.map((x) => x.e)) + S.buf * 6e4 : now
          return (
            <div key={p.id} className="rounded-2xl border border-white/10 bg-ink-800 p-5">
              <div className="flex items-center justify-between"><h3 className="font-semibold text-white">{p.name}<span className="ml-2 text-xs font-normal text-zinc-500">{p.model}</span></h3><b className={`text-sm ${STATUS[st][1]}`}>● {STATUS[st][0]}</b></div>
              {run ? (
                <div className="mt-3 space-y-2">
                  <p className="text-sm text-zinc-200"><b className="text-white">{run.o.cust}</b> · {run.o.name}</p>
                  <div className="h-3 overflow-hidden rounded-full bg-white/10"><div className={`h-full rounded-full ${pr.over ? 'bg-red-400' : 'bg-accent'}`} style={{ width: `${Math.round(pr.pct * 100)}%` }} /></div>
                  <p className="flex justify-between text-xs text-zinc-400"><span>{Math.round(pr.pct * 100)}% · {pr.over ? <b className="text-red-300">đã quá giờ dự kiến</b> : `còn khoảng ${fmtDur(pr.left)}`}</span><span>{run.o.g}g · {run.o.h}h</span></p>
                  <button onClick={() => setFin(run.o)} className={`${btn} !px-3 !py-1.5`}>Xong</button>
                </div>) : <p className="mt-3 text-sm text-zinc-400">{st === 'idle' ? (wait.length ? 'Máy đang rảnh nhưng còn đơn trong hàng đợi – bấm "Bắt đầu in" ở Hàng đợi.' : 'Máy đang rảnh, chưa có đơn nào.') : 'Máy không nhận đơn lúc này.'}</p>}
              <p className="mt-3 text-sm text-zinc-400">Hàng đợi: <b className="text-white">{wait.length} đơn</b>{wait[0] && <> · kế tiếp: {wait[0].o.cust || wait[0].o.name}</>} · rảnh lúc <b className="text-white">{pl.length ? fmtDT(free) : 'ngay'}</b></p>
              <div className="mt-3 rounded-lg bg-ink-900 p-3">
                <div className="flex items-center justify-between text-xs"><span className="text-zinc-400">Bảo dưỡng: {m.every > 0 ? `${Math.round(m.since)}/${m.every} giờ từ lần cuối` : m.days > 0 ? `${m.daysSince ?? 0}/${m.days} ngày từ lần cuối` : 'chưa đặt chu kỳ nhắc'}</span><span className={m.due ? 'font-semibold text-red-300' : m.soon ? 'text-amber-300' : 'text-zinc-500'}>{m.due ? (m.reason ? 'Đến hạn!' : 'Đã đến kỳ!') : m.soon ? 'Sắp tới kỳ' : 'Ổn'}</span></div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10"><div className={`h-full ${m.due ? 'bg-red-400' : m.soon ? 'bg-amber-400' : 'bg-emerald-400'}`} style={{ width: `${Math.round(m.pct * 100)}%` }} /></div>
                <p className="mt-1 text-[11px] text-zinc-500">Tổng đã in {hrs.toFixed(0)} giờ · {m.last ? `bảo trì gần nhất ${new Date(m.last.t).toLocaleDateString('vi-VN')}` : 'chưa ghi lần bảo trì nào'}</p>
              </div>
              <div className="mt-3 flex flex-wrap gap-2"><button onClick={() => setWaste({ printer: p.id, order: run?.o.id })} className={`${btn2} !px-3 !py-1.5 text-xs`}>Báo in lỗi</button><button onClick={() => setMaint({ p, hrs })} className={`${btn2} !px-3 !py-1.5 text-xs`}>Ghi bảo trì</button><Link to="/admin/printers" className={`${btn2} !px-3 !py-1.5 text-xs`}>Hồ sơ máy</Link><Link to="/admin/queue" className={`${btn2} !px-3 !py-1.5 text-xs`}>Hàng đợi</Link></div>
            </div>)
        })}
        {act.length === 0 && <p className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-zinc-500 lg:col-span-2">Chưa có máy in nào đang sử dụng. Thêm ở mục Máy in.</p>}
      </div>

      <Card title="Nhựa cần cho hàng đợi so với tồn kho">
        {needs.rows.length === 0 && needs.looseOrders === 0 ? <p className="text-sm text-zinc-500">Hàng đợi trống hoặc các đơn chưa khai báo lượng nhựa.</p> : (
          <div className="overflow-x-auto"><table className="w-full min-w-[420px] text-left text-sm"><thead className="text-xs text-zinc-500"><tr><th className="py-2">Cuộn nhựa</th><th>Đơn</th><th>Cần</th><th>Còn</th><th>Kết quả</th></tr></thead><tbody>
            {needs.rows.map((r) => <tr key={r.sp.id} className="border-t border-white/5"><td className="py-2 text-white">{[r.sp.brand, r.sp.name].filter(Boolean).join(' ')}<span className="block text-xs text-zinc-500">{[r.sp.material, r.sp.color].filter(Boolean).join(' · ')}</span></td><td>{r.orders}</td><td>{Math.round(r.need)}g</td><td>{Math.round(r.sp.qty)}g</td><td>{r.short > 0 ? <b className="text-red-300">Thiếu {r.short}g – cần mở thêm cuộn</b> : <span className="text-emerald-400">Đủ (dư {Math.round(r.sp.qty - r.need)}g)</span>}</td></tr>)}
          </tbody></table></div>)}
        {needs.looseOrders > 0 && <p className="mt-3 text-sm text-amber-300">{needs.looseOrders} đơn (~{needs.loose}g) chưa chọn cuộn nhựa nên chưa kiểm tra được. Sửa đơn ở mục Đơn xưởng để chọn cuộn.</p>}
      </Card>

      <Card title="In lỗi / phế phẩm (30 ngày)">
        <div className="grid grid-cols-3 gap-3 text-sm"><div><p className="text-xs text-zinc-500">Số lần</p><b className="text-lg text-white">{ws.n}</b></div><div><p className="text-xs text-zinc-500">Nhựa hao</p><b className="text-lg text-white">{Math.round(ws.g)}g</b></div><div><p className="text-xs text-zinc-500">Thiệt hại ước tính</p><b className="text-lg text-red-300">{formatVND(ws.cost)}</b></div></div>
        {ws.top.length > 0 && <p className="mt-3 text-sm text-zinc-400">Nguyên nhân hay gặp: {ws.top.map(([r, n]) => `${r} (${n})`).join(' · ')}</p>}
        {wlog.length > 0 ? (
          <ul className="mt-3 max-h-64 space-y-1 overflow-auto text-xs">{[...wlog].reverse().slice(0, 30).map((w) => <li key={w.id} className="flex items-center gap-2 rounded bg-ink-900 p-2 text-zinc-300"><span className="text-zinc-500">{new Date(w.t).toLocaleDateString('vi-VN')}</span><span>{w.reason}</span><span className="text-zinc-500">· {w.g}g · {w.h}h{w.orderName && ` · ${w.orderName}`}{w.spoolName && ` · ${w.spoolName}`}</span><b className="ml-auto text-red-300">{formatVND(w.cost)}</b>
            <button onClick={() => confirm('Xóa dòng nhật ký này? (không hoàn lại nhựa đã trừ)') && setLog((c) => c.filter((x) => x.id !== w.id))} aria-label="Xóa" className="text-zinc-500 hover:text-red-400"><Trash2 size={14} /></button></li>)}</ul>
        ) : <p className="mt-3 text-sm text-zinc-500">Chưa ghi nhận lần in lỗi nào. Khi bị lỗi, bấm "Báo in lỗi" để theo dõi hao hụt – đây là khoản thất thoát thường bị bỏ sót.</p>}
      </Card>

      {waste && <WasteModal preset={waste} onClose={() => setWaste(null)} />}
      {maint && <MaintModal printer={maint.p} hours={maint.hrs} onClose={() => setMaint(null)} />}
      {fin && <FinishModal order={fin} onClose={() => setFin(null)} />}
    </div>
  )
}

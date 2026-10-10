import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { formatVND } from '../../data/products.js'
import { useStore } from '../../lib/store.js'
import { isDone, owed, printerOf, stStyle } from '../../lib/workshop.js'
import { BOARD, CHK, chkDone } from '../../lib/workshopTools.js'
import { Modal, btn, btn2 } from '../../components/ui.jsx'
import { FinishModal, WasteModal } from './workshopModals.jsx'

const todayKey = () => new Date().toISOString().slice(0, 10)

/** Bảng công việc: mỗi cột là một trạng thái đơn xưởng, bấm mũi tên để chuyển đơn sang bước kế tiếp. Bấm vào thẻ để xem chi tiết và tick checklist. */
export default function WorkshopBoard() {
  const [wo, setWo] = useStore('wo'), [printers] = useStore('printers')
  const [open, setOpen] = useState(null), [fin, setFin] = useState(null), [waste, setWaste] = useState(null), [pf, setPf] = useState('')
  const set = (id, d) => setWo((c) => c.map((o) => (o.id === id ? { ...o, ...d } : o)))
  const o = wo.find((x) => x.id === open)
  const pName = (x) => printers.find((p) => p.id === printerOf(x, printers))?.name || ''

  const move = (x, to) => {
    if (to === 'Hoàn thành') return setFin(x)                         // hỏi gram/giờ thực tế rồi trừ nhựa
    if (to === 'Đang in') {
      const busy = wo.some((y) => y.status === 'Đang in' && y.id !== x.id && printerOf(y, printers) === printerOf(x, printers))
      if (busy && !confirm('Máy này đang có đơn "Đang in". Vẫn chuyển đơn này sang đang in?')) return
      return set(x.id, { status: to, startedAt: Date.now() })
    }
    set(x.id, { status: to })
  }
  const due = (x) => (!x.due || isDone(x) || x.status === 'Đã giao' ? null : x.due < todayKey() ? ['Quá hạn', 'bg-red-500/20 text-red-300'] : x.due === todayKey() ? ['Hôm nay', 'bg-amber-500/20 text-amber-300'] : null)
  const cards = (col) => {
    const l = wo.filter((x) => x.status === col && (!pf || printerOf(x, printers) === pf))
    if (col === 'Hoàn thành' || col === 'Đã giao') return [...l].sort((a, b) => (b.finishedAt || 0) - (a.finishedAt || 0) || (b.date > a.date ? 1 : -1)).slice(0, 8)
    return [...l].sort((a, b) => (b.prio - a.prio) || ((a.due || '9999') < (b.due || '9999') ? -1 : 1) || ((a.q || 0) - (b.q || 0)))
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="mr-auto font-display text-3xl font-bold text-white">Bảng công việc</h1>
        {printers.filter((p) => p.active).length > 1 && <select value={pf} onChange={(e) => setPf(e.target.value)} aria-label="Lọc theo máy" className="rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-white"><option value="">Tất cả máy</option>{printers.filter((p) => p.active).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>}
        <Link to="/admin/workshop" className={btn}>+ Đơn xưởng mới</Link>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-3">
        {BOARD.map((col, ci) => { const l = cards(col), total = wo.filter((x) => x.status === col && (!pf || printerOf(x, printers) === pf)).length; return (
          <section key={col} aria-label={col} className={`w-64 shrink-0 rounded-2xl border-t-4 bg-ink-800 p-3 ${stStyle(col).bar}`}>
            <h2 className="mb-3 flex items-center justify-between text-sm font-semibold text-white"><span className="flex items-center gap-2"><i className={`h-2.5 w-2.5 rounded-full ${stStyle(col).dot}`} />{col}</span><span className={`rounded-full px-2 text-xs ${stStyle(col).badge}`}>{total}</span></h2>
            <div className="space-y-2">
              {l.map((x) => { const d = due(x), k = chkDone(x); return (
                <div key={x.id} className="rounded-xl bg-ink-900 p-3 text-sm">
                  <button onClick={() => setOpen(x.id)} className="w-full text-left">
                    <p className="font-semibold text-white">{x.cust || '(không tên)'}{x.prio == 1 && <span className="ml-1 rounded bg-red-500/20 px-1.5 text-[10px] text-red-300">GẤP</span>}</p>
                    <p className="truncate text-zinc-300" title={x.name}>{x.name}</p>
                    <p className="mt-1 text-xs text-zinc-500">{x.g}g · {x.h}h{pName(x) && ` · ${pName(x)}`}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">{d && <span className={`rounded px-1.5 text-[10px] ${d[1]}`}>{d[0]}{x.due && d[0] === 'Quá hạn' ? ` ${x.due.slice(5).split('-').reverse().join('/')}` : ''}</span>}{x.due && !d && !isDone(x) && <span className="text-[10px] text-zinc-500">Hạn {x.due.slice(5).split('-').reverse().join('/')}</span>}
                      {k > 0 && <span className="rounded bg-white/10 px-1.5 text-[10px] text-zinc-300">✓ {k}/{CHK.length}</span>}{owed(x) > 0 && col !== 'Báo giá' && <span className="rounded bg-amber-500/15 px-1.5 text-[10px] text-amber-300">còn nợ {formatVND(owed(x))}</span>}</div>
                  </button>
                  <div className="mt-2 flex justify-between">
                    <button disabled={ci === 0} onClick={() => move(x, BOARD[ci - 1])} aria-label={`Chuyển về ${BOARD[ci - 1]}`} className="rounded bg-white/5 p-1.5 text-zinc-400 hover:text-white disabled:opacity-20"><ArrowLeft size={14} /></button>
                    <button disabled={ci === BOARD.length - 1} onClick={() => move(x, BOARD[ci + 1])} aria-label={`Chuyển sang ${BOARD[ci + 1]}`} className="rounded bg-accent/20 p-1.5 text-accent hover:bg-accent/30 disabled:opacity-20"><ArrowRight size={14} /></button>
                  </div>
                </div>) })}
              {l.length === 0 && <p className="rounded-lg border border-dashed border-white/10 p-4 text-center text-xs text-zinc-600">Trống</p>}
              {total > l.length && <p className="text-center text-[11px] text-zinc-500">Hiện {l.length}/{total} đơn gần nhất</p>}
            </div>
          </section>) })}
      </div>

      {o && (
        <Modal title={`${o.cust || 'Đơn'} · ${o.name}`} onClose={() => setOpen(null)}>
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-2 rounded-lg bg-ink-900 p-3 text-zinc-300">
              <span>Trạng thái: <b className="text-white">{o.status}</b></span><span>Máy: <b className="text-white">{pName(o) || '—'}</b></span>
              <span>Nhựa: <b className="text-white">{o.g}g</b>{o.gReal ? ` (thực ${o.gReal}g)` : ''}</span><span>Giờ in: <b className="text-white">{o.h}h</b>{o.hReal ? ` (thực ${o.hReal}h)` : ''}</span>
              <span>Màu: {o.colors || '—'}</span><span>Layer {o.layer} · infill {o.infill ?? '—'}%</span>
              <span>Hạn giao: {o.due || '—'}</span><span>Giá: {formatVND(o.price)} · nợ {formatVND(owed(o))}</span>
              {o.file && <span className="col-span-2">File: {o.file}</span>}{o.note && <span className="col-span-2 italic text-zinc-400">{o.note}</span>}
              {o.wasteN > 0 && <span className="col-span-2 text-red-300">Đã in lỗi {o.wasteN} lần ({o.wasteG}g)</span>}
            </div>
            <div>
              <p className="mb-2 font-semibold text-white">Checklist ({chkDone(o)}/{CHK.length})</p>
              <div className="space-y-1.5">{CHK.map(([k, l]) => <label key={k} className="flex items-center gap-2 text-zinc-300"><input type="checkbox" checked={!!o.chk?.[k]} onChange={(e) => set(o.id, { chk: { ...(o.chk || {}), [k]: e.target.checked } })} className="accent-orange-500" />{l}</label>)}</div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => { setWaste({ order: o.id, printer: printerOf(o, printers) }); setOpen(null) }} className={btn2}>Báo in lỗi</button>
              <Link to="/admin/workshop" className={btn2}>Sửa đơn</Link>
              {o.status !== 'Huỷ' && <button onClick={() => confirm('Hủy đơn xưởng này?') && (set(o.id, { status: 'Huỷ' }), setOpen(null))} className={`${btn2} ml-auto text-red-400`}>Hủy đơn</button>}
            </div>
          </div>
        </Modal>)}
      {fin && <FinishModal order={fin} onClose={() => setFin(null)} />}
      {waste && <WasteModal preset={waste} onClose={() => setWaste(null)} />}
    </div>
  )
}

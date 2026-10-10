import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useStore } from '../../lib/store.js'
import { fmtDT, plan, printerOf } from '../../lib/workshop.js'
import { maintStatus, printerHours } from '../../lib/workshopTools.js'
import { DataTable, btn, td } from '../../components/ui.jsx'
import { Card, Tag, useWset } from './wui.jsx'
import PrinterProfile, { PRINTER_STATUS } from './PrinterProfile.jsx'

export { PRINTER_STATUS }

/** Danh sách máy in. Bấm vào một máy để mở hồ sơ: thông số kỹ thuật, mua sắm/bảo hành, lịch sử bảo dưỡng, lịch sử in. */
export default function AdminPrinters() {
  const [printers, setPrinters] = useStore('printers'), [wo] = useStore('wo'), [wlog] = useStore('wlog'), S = useWset()
  const [open, setOpen] = useState(null), [openHours, setOpenHours] = useState(false) // open: null | 'new' | id
  const setStatus = (p, status) => setPrinters((c) => c.map((x) => (x.id === p.id ? { ...x, status } : x)))
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="font-display text-3xl font-bold text-white">Máy in</h1>
        <button onClick={() => setOpen('new')} className={`${btn} flex items-center gap-1`}><Plus size={16} />Thêm máy</button></div>
      <p className="text-sm text-zinc-500">Bấm vào một máy để xem và nhập thông số kỹ thuật, ngày mua/bảo hành, lịch sử bảo dưỡng.</p>
      <DataTable heads={['Máy', 'Trạng thái', 'Đơn đang in', 'Hàng đợi', 'Tổng giờ in', 'Bảo dưỡng']} empty="Chưa có máy in">
        {printers.map((p) => {
          const mine = wo.filter((o) => printerOf(o, printers) === p.id), pl = plan(mine, S), run = pl.find((x) => x.run), wait = pl.filter((x) => !x.run)
          const eff = run ? 'printing' : p.status === 'printing' ? 'idle' : p.status, hrs = printerHours(p, wo, wlog, printers), m = maintStatus(p, hrs)
          return (
            <tr key={p.id} onClick={() => { setOpenHours(false); setOpen(p.id) }} className={`cursor-pointer hover:bg-white/5 ${p.active ? '' : 'opacity-50'}`}>
              <td className={`${td} text-white`}>
                <div className="flex items-center gap-3">
                  <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-lg bg-ink-900 text-xs text-zinc-600">{p.image ? <img src={p.image} alt="" loading="lazy" className="h-full w-full object-cover" /> : '3D'}</span>
                  <span><b>{p.name}</b>{(p.brand || p.model) && <span className="block text-xs text-zinc-500">{[p.brand, p.model].filter(Boolean).join(' · ')}</span>}{p.location && <span className="block text-xs text-zinc-600">{p.location}</span>}</span></div></td>
              <td className={td} onClick={(e) => e.stopPropagation()}>{run ? <span className={PRINTER_STATUS.printing[1]}>Đang in</span> : (
                <select value={eff} onChange={(e) => setStatus(p, e.target.value)} aria-label="Trạng thái máy" className="rounded border border-white/10 bg-ink-900 px-2 py-1 text-xs text-white">{Object.entries(PRINTER_STATUS).filter(([k]) => k !== 'printing').map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}</select>)}</td>
              <td className={td}>{run ? <>{run.o.cust} · {run.o.name}<br /><small className="text-zinc-500">đến {fmtDT(run.e)}</small></> : '—'}</td>
              <td className={td}>{wait.length} đơn</td>
              <td className={td} onClick={(e) => e.stopPropagation()}><b className="text-white">{hrs.toFixed(0)} giờ</b><button onClick={() => { setOpenHours(true); setOpen(p.id) }} className="block text-xs text-accent hover:underline">Cập nhật giờ</button></td>
              <td className={td}>{m.due ? <span className="font-semibold text-red-300">⚠ Đến hạn<small className="block font-normal text-red-200/70">{m.reason}</small></span> : m.soon ? <span className="text-amber-300">Sắp đến hạn</span>
                : m.last ? <span className="text-zinc-300">{new Date(m.last.date || m.last.t).toLocaleDateString('vi-VN')}<small className="block text-zinc-500">{m.last.title || m.last.note || 'Bảo dưỡng'}</small></span> : <span className="text-zinc-600">Chưa ghi</span>}</td>
            </tr>)
        })}
      </DataTable>
      <Card><p className="text-sm text-zinc-400">Gán máy cho đơn trong <Link to="/admin/workshop" className="text-accent">Đơn xưởng</Link> (ô "Máy in"). Xem tiến độ ở <Link to="/admin/workshop-home" className="text-accent">Tổng quan xưởng</Link>, xếp thứ tự in tại <Link to="/admin/queue" className="text-accent">Hàng đợi in</Link>, xem toàn bộ trên <Link to="/admin/calendar" className="text-accent">Lịch in</Link>.</p></Card>
      {open && <PrinterProfile key={open + openHours} printerId={open === 'new' ? null : open} initialTab={openHours ? 'maint' : 'spec'} openHours={openHours} onClose={() => { setOpen(null); setOpenHours(false) }} />}
    </div>
  )
}

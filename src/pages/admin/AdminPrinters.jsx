import { useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { uid, useStore } from '../../lib/store.js'
import { fmtDT, plan, printerOf } from '../../lib/workshop.js'
import { DataTable, Field, Modal, btn, btn2, inp, td } from '../../components/ui.jsx'
import { Card, Tag, useWset } from './wui.jsx'

export const PRINTER_STATUS = { idle: ['Sẵn sàng', 'text-emerald-300'], printing: ['Đang in', 'text-accent'], maintenance: ['Bảo trì', 'text-amber-300'], offline: ['Tắt / hỏng', 'text-zinc-500'] }
const EMPTY = { name: '', model: '', status: 'idle', note: '', active: true }

/** Danh sách máy in, trạng thái, đơn đang chạy và hàng đợi của từng máy */
export default function AdminPrinters() {
  const [printers, setPrinters] = useStore('printers'), [wo, setWo] = useStore('wo'), S = useWset()
  const [edit, setEdit] = useState(null)
  const set = (k, v) => setEdit((c) => ({ ...c, [k]: v }))
  const save = (e) => { e.preventDefault(); const p = { ...edit, name: edit.name.trim() }; setPrinters((c) => (p.id ? c.map((x) => (x.id === p.id ? p : x)) : [...c, { ...p, id: uid('pr') }])); setEdit(null) }
  const del = (p) => {
    if (printers.length <= 1) return alert('Cần giữ lại ít nhất 1 máy in')
    if (!confirm(`Xóa máy "${p.name}"? Các đơn đang gán máy này sẽ chuyển về máy đầu tiên.`)) return
    setPrinters((c) => c.filter((x) => x.id !== p.id)); setWo((c) => c.map((o) => (o.printer === p.id ? { ...o, printer: '' } : o)))
  }
  const setStatus = (p, status) => setPrinters((c) => c.map((x) => (x.id === p.id ? { ...x, status } : x)))
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="font-display text-3xl font-bold text-white">Máy in</h1>
        <button onClick={() => setEdit({ ...EMPTY })} className={`${btn} flex items-center gap-1`}><Plus size={16} />Thêm máy</button></div>
      <DataTable heads={['Máy', 'Trạng thái', 'Đơn đang in', 'Hàng đợi', 'Rảnh lúc', '']} empty="Chưa có máy in">
        {printers.map((p) => {
          const mine = wo.filter((o) => printerOf(o, printers) === p.id), pl = plan(mine, S), run = pl.find((x) => x.run), wait = pl.filter((x) => !x.run)
          const eff = run ? 'printing' : p.status === 'printing' ? 'idle' : p.status
          return (
            <tr key={p.id} className={p.active ? '' : 'opacity-50'}>
              <td className={`${td} text-white`}><b>{p.name}</b>{p.model && <span className="text-zinc-500"> · {p.model}</span>}{p.note && <><br /><small className="text-zinc-500">{p.note}</small></>}</td>
              <td className={td}>{run ? <span className={PRINTER_STATUS.printing[1]}>Đang in</span> : (
                <select value={eff} onChange={(e) => setStatus(p, e.target.value)} aria-label="Trạng thái máy" className="rounded border border-white/10 bg-ink-900 px-2 py-1 text-xs text-white">{Object.entries(PRINTER_STATUS).filter(([k]) => k !== 'printing').map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}</select>)}</td>
              <td className={td}>{run ? <>{run.o.cust} · {run.o.name}<br /><small className="text-zinc-500">đến {fmtDT(run.e)}</small></> : '—'}</td>
              <td className={td}>{wait.length} đơn</td>
              <td className={td}>{eff === 'maintenance' || eff === 'offline' ? <Tag s={PRINTER_STATUS[eff][0]} /> : pl.length ? fmtDT(Math.max(...pl.map((x) => x.e)) + S.buf * 6e4) : 'Đang rảnh'}</td>
              <td className={`${td} whitespace-nowrap text-right`}><button onClick={() => setEdit(p)} aria-label="Sửa" className="p-2 text-zinc-400 hover:text-white"><Pencil size={16} /></button><button onClick={() => del(p)} aria-label="Xóa" className="p-2 text-zinc-400 hover:text-red-400"><Trash2 size={16} /></button></td>
            </tr>)
        })}
      </DataTable>
      <Card><p className="text-sm text-zinc-400">Gán máy cho đơn trong <Link to="/admin/workshop" className="text-accent">Đơn xưởng</Link> (ô "Máy in"). Xếp thứ tự in tại <Link to="/admin/queue" className="text-accent">Hàng đợi in</Link>, xem toàn bộ trên <Link to="/admin/calendar" className="text-accent">Lịch in</Link>.</p></Card>
      {edit && (
        <Modal title={edit.id ? 'Sửa máy in' : 'Thêm máy in'} onClose={() => setEdit(null)}>
          <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
            <Field label="Tên máy"><input required value={edit.name} onChange={(e) => set('name', e.target.value)} className={inp} /></Field>
            <Field label="Model"><input value={edit.model} onChange={(e) => set('model', e.target.value)} className={inp} /></Field>
            <Field label="Trạng thái"><select value={edit.status === 'printing' ? 'idle' : edit.status} onChange={(e) => set('status', e.target.value)} className={inp}>{Object.entries(PRINTER_STATUS).filter(([k]) => k !== 'printing').map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}</select></Field>
            <label className="flex items-center gap-2 self-end text-sm"><input type="checkbox" checked={edit.active} onChange={(e) => set('active', e.target.checked)} className="accent-orange-500" />Đang sử dụng</label>
            <div className="sm:col-span-2"><Field label="Ghi chú"><input value={edit.note} onChange={(e) => set('note', e.target.value)} className={inp} /></Field></div>
            <div className="flex justify-end gap-2 sm:col-span-2"><button type="button" onClick={() => setEdit(null)} className={btn2}>Hủy</button><button className={btn}>Lưu</button></div>
          </form>
        </Modal>)}
    </div>
  )
}

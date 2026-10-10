import { useState } from 'react'
import { formatVND } from '../../data/products.js'
import { useStore } from '../../lib/store.js'
import { calc, num, uid } from '../../lib/workshop.js'
import { WASTE_REASONS } from '../../lib/workshopTools.js'
import { Field, Modal, btn, btn2, inp } from '../../components/ui.jsx'
import { useWset } from './wui.jsx'

/** Xác nhận in xong: nhập gram / giờ THỰC TẾ. Trừ nhựa theo gram thực tế và điều chỉnh giá vốn theo chênh lệch so với dự kiến. */
export function FinishModal({ order: o, onClose, toStatus = 'Hoàn thành' }) {
  const [, setWo] = useStore('wo'), [stock, setStock] = useStore('ws'), S = useWset()
  const [g, setG] = useState(o.gReal ?? o.g ?? 0), [h, setH] = useState(o.hReal ?? o.h ?? 0)
  const sp = stock.find((s) => s.id === o.spool && s.kind === 'filament')
  const dG = num(g) - num(o.g), dCost = Math.round(calc({ ...o, g: num(g), h: num(h) }, S, stock).cost - calc(o, S, stock).cost)
  const done = () => {
    if (!o.deducted && sp && num(g) > 0) setStock((c) => c.map((s) => (s.id === sp.id ? { ...s, qty: Math.max(0, s.qty - num(g)) } : s)))
    setWo((c) => c.map((x) => (x.id === o.id ? { ...x, status: toStatus, history: [...(x.history || []), { t: Date.now(), text: `Trạng thái: ${x.status} → ${toStatus} (thực tế ${num(g)}g · ${num(h)}h)` }].slice(-60), gReal: num(g), hReal: num(h), cost: Math.max(0, Math.round(num(x.cost) + dCost)), deducted: x.deducted || !!sp, finishedAt: Date.now() } : x)))
    onClose()
  }
  return (
    <Modal title={`Xong: ${o.name}`} onClose={onClose}>
      <div className="space-y-3 text-sm">
        <p className="text-zinc-400">Nhập số liệu thực tế để kho và giá vốn chính xác. Dự kiến: <b className="text-white">{o.g}g · {o.h}h</b>.</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nhựa thực tế dùng (g)"><input type="number" min="0" value={g} onChange={(e) => setG(e.target.value)} className={inp} /></Field>
          <Field label="Giờ in thực tế"><input type="number" min="0" step="0.1" value={h} onChange={(e) => setH(e.target.value)} className={inp} /></Field>
        </div>
        {(dG !== 0 || dCost !== 0) && <p className="rounded-lg bg-ink-900 p-3 text-zinc-300">Chênh lệch so với dự kiến: {dG > 0 ? '+' : ''}{Math.round(dG)}g nhựa · giá vốn {dCost > 0 ? '+' : ''}{formatVND(dCost)}</p>}
        <p className="text-xs text-zinc-500">{o.deducted ? 'Nhựa của đơn này đã được trừ kho trước đó.' : sp ? `Sẽ trừ ${Math.round(num(g))}g từ cuộn "${sp.name}" (còn ${Math.round(sp.qty)}g).` : 'Đơn chưa chọn cuộn nhựa nên sẽ không trừ kho. Sửa đơn để chọn cuộn.'}</p>
        <div className="flex justify-end gap-2"><button onClick={onClose} className={btn2}>Hủy</button><button onClick={done} className={btn}>Xác nhận xong</button></div>
      </div>
    </Modal>
  )
}

/** Báo in lỗi / phế phẩm: trừ nhựa hao, cộng chi phí vào đơn (nếu thuộc đơn) và ghi nhật ký để thống kê. */
export function WasteModal({ preset = {}, onClose }) {
  const [wo, setWo] = useStore('wo'), [stock, setStock] = useStore('ws'), [printers] = useStore('printers'), [, setLog] = useStore('wlog'), S = useWset()
  const running = wo.filter((o) => o.status === 'Đang in')
  const [f, setF] = useState({ order: preset.order || '', printer: preset.printer || printers.find((p) => p.active)?.id || '', spool: preset.spool || '', g: 20, h: 0.5, reason: WASTE_REASONS[0], note: '' })
  const set = (k, v) => setF((c) => ({ ...c, [k]: v }))
  const o = wo.find((x) => x.id === f.order), spId = f.spool || o?.spool || '', sp = stock.find((s) => s.id === spId && s.kind === 'filament')
  const cost = Math.round(num(f.g) * (sp ? sp.price / 1000 : S.matG) + num(f.h) * ((S.power / 1000) * S.elec + S.machine / S.life + S.maint))
  const pickOrder = (id) => { const x = wo.find((y) => y.id === id); setF((c) => ({ ...c, order: id, printer: x ? (x.printer || c.printer) : c.printer, spool: '' })) }
  const save = () => {
    if (!(num(f.g) > 0 || num(f.h) > 0)) return
    if (sp && num(f.g) > 0) setStock((c) => c.map((s) => (s.id === sp.id ? { ...s, qty: Math.max(0, s.qty - num(f.g)) } : s)))
    if (o) setWo((c) => c.map((x) => (x.id === o.id ? { ...x, cost: Math.round(num(x.cost) + cost), wasteG: num(x.wasteG) + num(f.g), wasteN: num(x.wasteN) + 1 } : x)))
    setLog((c) => [...c, { id: uid('w'), t: Date.now(), printer: f.printer, order: f.order, orderName: o ? `${o.cust} · ${o.name}` : '', spool: sp?.id || '', spoolName: sp?.name || '', g: num(f.g), h: num(f.h), reason: f.reason, note: f.note.trim(), cost }])
    onClose()
  }
  return (
    <Modal title="Báo in lỗi / phế phẩm" onClose={onClose}>
      <div className="grid gap-3 text-sm sm:grid-cols-2">
        <Field label="Thuộc đơn (nếu có)"><select value={f.order} onChange={(e) => pickOrder(e.target.value)} className={inp}><option value="">— Không thuộc đơn (in thử, canh máy) —</option>{[...running, ...wo.filter((x) => ['Chờ in', 'Đã cọc'].includes(x.status))].map((x) => <option key={x.id} value={x.id}>{x.status === 'Đang in' ? '● ' : ''}{x.cust} · {x.name}</option>)}</select></Field>
        <Field label="Máy in"><select value={f.printer} onChange={(e) => set('printer', e.target.value)} className={inp}>{printers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
        <Field label="Cuộn nhựa bị hao"><select value={f.spool || o?.spool || ''} onChange={(e) => set('spool', e.target.value)} className={inp}><option value="">— không trừ kho —</option>{stock.filter((s) => s.kind === 'filament').map((s) => <option key={s.id} value={s.id}>{[s.brand, s.name].filter(Boolean).join(' ')} · còn {Math.round(s.qty)}g</option>)}</select></Field>
        <Field label="Lý do"><select value={f.reason} onChange={(e) => set('reason', e.target.value)} className={inp}>{WASTE_REASONS.map((r) => <option key={r}>{r}</option>)}</select></Field>
        <Field label="Nhựa hao (g)"><input type="number" min="0" value={f.g} onChange={(e) => set('g', e.target.value)} className={inp} /></Field>
        <Field label="Giờ máy đã mất"><input type="number" min="0" step="0.1" value={f.h} onChange={(e) => set('h', e.target.value)} className={inp} /></Field>
        <div className="sm:col-span-2"><Field label="Ghi chú (tuỳ chọn)"><input value={f.note} onChange={(e) => set('note', e.target.value)} className={inp} placeholder="VD: lần 2 bị bong, đã lau bàn bằng cồn" /></Field></div>
        <p className="rounded-lg bg-ink-900 p-3 text-zinc-300 sm:col-span-2">Thiệt hại ước tính: <b className="text-red-300">{formatVND(cost)}</b>{o ? ' – sẽ cộng vào giá vốn của đơn này.' : ' – tính vào chi phí xưởng.'}{sp ? ` Trừ ${Math.round(num(f.g))}g từ "${sp.name}".` : ''}</p>
        <div className="flex justify-end gap-2 sm:col-span-2"><button onClick={onClose} className={btn2}>Hủy</button><button onClick={save} className={btn}>Lưu nhật ký</button></div>
      </div>
    </Modal>
  )
}

/** Ghi lại một lần bảo trì máy: đặt lại bộ đếm giờ */
export function MaintModal({ printer, hours, onClose }) {
  const [, setPrinters] = useStore('printers'), [note, setNote] = useState('Vệ sinh đầu phun, bôi trơn trục, siết dây curoa')
  const save = () => { setPrinters((c) => c.map((p) => (p.id === printer.id ? { ...p, skipMaintHours: 0, maint: [...(p.maint || []), { id: uid('mt'), t: Date.now(), date: new Date().toISOString().slice(0, 10), type: 'Định kỳ', title: note.trim() || 'Bảo dưỡng', note: note.trim(), atHours: Math.round(hours * 10) / 10 }].slice(-200) } : p))); onClose() }
  return (
    <Modal title={`Ghi bảo trì: ${printer.name}`} onClose={onClose}>
      <div className="space-y-3 text-sm">
        <p className="text-zinc-400">Máy đã in tổng cộng <b className="text-white">{hours.toFixed(1)} giờ</b>. Sau khi ghi, bộ đếm bảo trì bắt đầu lại từ 0.</p>
        <Field label="Đã làm gì"><input value={note} onChange={(e) => setNote(e.target.value)} className={inp} /></Field>
        {printer.maint?.length > 0 && <ul className="max-h-32 space-y-1 overflow-auto text-xs text-zinc-500">{[...printer.maint].reverse().map((m, i) => <li key={i}>{new Date(m.t).toLocaleDateString('vi-VN')} · tại {m.atHours}h – {m.title || m.note}</li>)}</ul>}
        <div className="flex justify-end gap-2"><button onClick={onClose} className={btn2}>Hủy</button><button onClick={save} className={btn}>Ghi bảo trì</button></div>
      </div>
    </Modal>
  )
}

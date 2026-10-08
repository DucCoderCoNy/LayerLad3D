import { useState } from 'react'
import { Plus } from 'lucide-react'
import { formatVND as $ } from '../../data/products.js'
import { useStore } from '../../lib/store.js'
import { BLANK, PKG, SRC, ST, calc, isDone, num, owed, today, uid } from '../../lib/workshop.js'
import { DataTable, Field, Modal, btn, btn2, inp, td } from '../../components/ui.jsx'
import { Tag, useWset } from './wui.jsx'

/** Đơn xưởng: tính giá gợi ý + giá vốn + lãi gộp; tự ghi Thu chi khi nhập "đã thu"; tự trừ nhựa khi hoàn thành */
export default function WorkshopOrders() {
  const [orders, setWo] = useStore('wo'), [stock, setStock] = useStore('ws'), [, setCash] = useStore('wc'), [printers] = useStore('printers')
  const S = useWset()
  const [fil, setFil] = useState(''), [q, setQ] = useState(''), [f, setF] = useState(null), [touched, setTouched] = useState(false)
  const ex = f && orders.find((x) => x.id === f.id)
  const list = [...orders].sort((a, b) => b.date.localeCompare(a.date)).filter((o) => (!fil || o.status === fil) && (o.cust + o.name).toLowerCase().includes(q.toLowerCase()))
  const set = (k, v) => setF((c) => ({ ...c, [k]: v }))
  const c = f ? calc(f, S, stock) : null
  const price = f ? (touched ? num(f.price) : c.sug) : 0

  const I = (k, l, type = 'text', x = {}) => <Field key={k} label={l}><input type={type} value={f[k]} onChange={(e) => set(k, e.target.value)} className={inp} {...x} /></Field>
  const Sel = (k, l, opts) => <Field key={k} label={l}><select value={f[k]} onChange={(e) => set(k, e.target.value)} className={inp}>
    {opts.map((o) => (Array.isArray(o) ? <option key={o[0]} value={o[0]}>{o[1]}</option> : <option key={o}>{o}</option>))}</select></Field>

  const open = (o) => { setTouched(!!o); setF(o ? { ...o } : { ...BLANK, id: '' }) }
  const save = () => {
    const prev = ex?.paid || 0
    const o = { ...(ex || { deducted: false, q: Date.now() }), ...f, id: ex?.id || uid('wo'), cust: f.cust.trim() || 'Khách lẻ', name: f.name.trim() || '(chưa đặt tên)',
      g: num(f.g), h: num(f.h), min: num(f.min), col: num(f.col), rush: num(f.rush), paint: num(f.paint), other: num(f.other), infill: num(f.infill), price, paid: num(f.paid), cost: c.cost }
    if (o.status === 'Đang in') { if (!o.startedAt) o.startedAt = Date.now() } else if (!isDone(o)) o.startedAt = 0
    const d = o.paid - prev
    if (d) setCash((x) => [...x, { id: uid('c'), date: today(), type: d > 0 ? 'in' : 'out', cat: d > 0 ? 'Thu đơn hàng' : 'Hoàn tiền khách', amount: Math.abs(d), note: `${o.cust} · ${o.name}`, orderId: o.id }])
    if (isDone(o) && !o.deducted && o.spool && o.g > 0) { setStock((x) => x.map((s) => (s.id === o.spool ? { ...s, qty: Math.max(0, s.qty - o.g) } : s))); o.deducted = true }
    setWo((x) => (ex ? x.map((y) => (y.id === o.id ? o : y)) : [o, ...x])); setF(null)
  }
  const del = (o) => confirm('Xoá đơn này? Các khoản thu chi đã ghi vẫn được giữ lại.') && setWo((x) => x.filter((y) => y.id !== o.id))

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="mr-auto font-display text-3xl font-bold text-white">Đơn xưởng</h1>
        <select value={fil} onChange={(e) => setFil(e.target.value)} className={`${inp} w-44`}><option value="">Mọi trạng thái</option>{ST.map((s) => <option key={s}>{s}</option>)}</select>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm khách / mẫu" className={`${inp} w-44`} />
        <button onClick={() => open()} className={`${btn} flex items-center gap-1`}><Plus size={16} />Đơn mới</button>
      </div>
      <DataTable heads={['Ngày', 'Nguồn', 'Khách / Mẫu', 'g / giờ', 'Trạng thái', 'Giá', 'Đã thu', 'Lãi gộp', '']} empty="Chưa có đơn xưởng. Bấm “Đơn mới” hoặc chuyển từ đơn web.">
        {list.map((o) => (
          <tr key={o.id}>
            <td className={td}>{o.date}</td><td className={td}>{o.src}</td>
            <td className={td}><span className="text-white">{o.cust}</span>{o.prio == 1 && <span className="ml-1 rounded bg-red-500/20 px-1.5 text-xs text-red-300">Gấp</span>}<br /><small className="text-zinc-500">{o.name}{o.colors && ` · ${o.colors}`}{o.due && ` · hạn ${o.due}`}</small></td>
            <td className={td}>{o.g} / {o.h}</td><td className={td}><Tag s={o.status} /></td><td className={td}>{$(o.price)}</td>
            <td className={`${td} ${owed(o) ? 'text-amber-400' : ''}`}>{$(o.paid)}</td><td className={td}>{$(o.price - o.cost)}</td>
            <td className={`${td} whitespace-nowrap`}><button onClick={() => open(o)} className="px-2 text-sm text-accent">Sửa</button><button onClick={() => del(o)} className="px-2 text-sm text-zinc-500 hover:text-red-400">Xoá</button></td>
          </tr>))}
      </DataTable>
      {f && (
        <Modal title={ex ? 'Sửa đơn xưởng' : 'Đơn xưởng mới'} onClose={() => setF(null)} wide>
          <div className="grid gap-3 sm:grid-cols-2">
            {I('date', 'Ngày', 'date')}{Sel('src', 'Nguồn', SRC)}{I('cust', 'Khách')}{I('name', 'Tên mẫu')}
            <div className="sm:col-span-2">{I('file', 'File in (tên file hoặc link)')}</div>
            {I('colors', 'Màu in (ghi rõ từng phần)')}{Sel('layer', 'Layer (mm)', ['0.28', '0.2', '0.12', '0.08'])}
            {I('infill', 'Infill (%)', 'number')}{I('due', 'Hạn giao', 'date')}{Sel('printer', 'Máy in', [['', '— tự chọn máy đầu tiên —'], ...printers.filter((p) => p.active).map((p) => [p.id, p.name])])}{Sel('prio', 'Ưu tiên', [['0', 'Thường'], ['1', 'Gấp']])}
            {Sel('pkg', 'Gói in', Object.entries(PKG).map(([k, v]) => [k, v[0]]))}
            {Sel('spool', 'Cuộn nhựa dùng', [['', '— chưa chọn —'], ...stock.filter((s) => s.kind === 'filament').map((s) => [s.id, `${s.name} (còn ${s.qty}g)`])])}
            {I('g', 'Gram (cả support)', 'number')}{I('h', 'Giờ in', 'number')}{I('min', 'Phút làm tay', 'number')}
            {Sel('col', 'Phụ phí đa màu', [[0, '1 màu'], [15000, '2 màu +15k'], [30000, '3 màu +30k'], [45000, '4+ màu +45k']])}
            {Sel('rush', 'Hàng gấp', [[0, 'Không'], [40000, 'Gấp +40k']])}{I('paint', 'Sơn / hoàn thiện (đ)', 'number')}{I('other', 'Phụ phí khác (đ)', 'number')}
          </div>
          <div className="my-4 rounded-xl bg-accent/10 p-3 text-sm text-zinc-200">
            Theo gram: {$(c.byG)} · Theo công thức: {$(c.byF)} · Tối thiểu: {$(S.min)} → lấy cao nhất {$(c.base)}<br />
            Phụ phí: {$(c.extra)} · <b>Giá gợi ý: {$(c.sug)}</b> · Giá vốn: {$(c.cost)} · Lãi gộp: <b className={price < c.cost ? 'text-red-400' : 'text-emerald-400'}>{$(price - c.cost)}</b>
            {price < c.cost && <span className="text-red-400"> (giá thấp hơn giá vốn!)</span>}
            {num(f.g) > 0 && num(f.h) > 0 && num(f.g) / num(f.h) < 12 && <><br /><span className="text-amber-400">g/giờ dưới 12: mẫu nhẹ nhưng in lâu, nên dùng giá công thức.</span></>}
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Giá chốt (đ)"><input type="number" step="1000" value={touched ? f.price : c.sug} onChange={(e) => { setTouched(true); set('price', e.target.value) }} className={inp} /></Field>
            {I('paid', 'Đã thu (đ)', 'number', { min: 0, step: 1000 })}{Sel('status', 'Trạng thái', ST)}
            <div className="sm:col-span-3"><Field label="Ghi chú"><textarea rows={2} value={f.note} onChange={(e) => set('note', e.target.value)} className={inp} /></Field></div>
          </div>
          <div className="mt-4 flex gap-2"><button onClick={save} className={btn}>Lưu đơn</button><button onClick={() => setF(null)} className={btn2}>Đóng</button></div>
        </Modal>)}
    </div>
  )
}

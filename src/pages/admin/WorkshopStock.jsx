import { useState } from 'react'
import { Plus } from 'lucide-react'
import { formatVND as $ } from '../../data/products.js'
import { useStore } from '../../lib/store.js'
import { num, stockCost, today, uid } from '../../lib/workshop.js'
import { DataTable, Field, Modal, btn, btn2, inp, td } from '../../components/ui.jsx'
import { Card } from './wui.jsx'

/** Kho nhựa (gram, giá/kg) và vật tư. Nhập thêm/thêm mới có thể tự ghi khoản chi */
export default function WorkshopStock() {
  const [stock, setStock] = useStore('ws'), [, setCash] = useStore('wc')
  const [f, setF] = useState(null)
  const set = (k, v) => setF((c) => ({ ...c, [k]: v }))
  const spend = (s, amount, note) => amount > 0 && setCash((c) => [...c, { id: uid('c'), date: today(), type: 'out', cat: s.kind === 'filament' ? 'Mua nhựa' : 'Vật tư', amount, note }])

  const save = () => {
    const v = { kind: f.kind, name: f.name.trim() || '(chưa đặt tên)', qty: num(f.qty), unit: f.kind === 'filament' ? 'g' : f.unit || 'cái', price: num(f.price), min: num(f.min) }
    if (f.id) setStock((c) => c.map((s) => (s.id === f.id ? { ...s, ...v } : s)))
    else { const s = { id: uid('s'), ...v }; setStock((c) => [...c, s]); if (f.rec && s.qty > 0) spend(s, Math.round(stockCost(s, s.qty)), s.name) }
    setF(null)
  }
  const restock = (s) => {
    const q = num(prompt(`Nhập thêm bao nhiêu ${s.unit} cho "${s.name}"?`)); if (!q) return
    const amt = num(prompt('Số tiền đã chi (đ)?', Math.round(stockCost(s, q))))
    setStock((c) => c.map((x) => (x.id === s.id ? { ...x, qty: x.qty + q } : x))); spend(s, amt, 'Nhập thêm: ' + s.name)
  }
  const table = (k) => (
    <DataTable heads={['Tên', 'Còn lại', 'Giá', 'Ngưỡng cảnh báo', '']} empty="Chưa có mục nào.">
      {stock.filter((s) => s.kind === k).map((s) => (
        <tr key={s.id}><td className={`${td} text-white`}>{s.name}</td>
          <td className={`${td} ${s.min > 0 && s.qty <= s.min ? 'font-semibold text-amber-400' : ''}`}>{s.qty} {s.unit}</td>
          <td className={td}>{$(s.price)}{k === 'filament' ? '/kg' : `/${s.unit}`}</td><td className={td}>{s.min || '—'}</td>
          <td className={`${td} whitespace-nowrap`}><button onClick={() => restock(s)} className="px-2 text-sm text-neon">Nhập thêm</button>
            <button onClick={() => setF(s)} className="px-2 text-sm text-accent">Sửa</button>
            <button onClick={() => confirm('Xoá mục này khỏi kho?') && setStock((c) => c.filter((x) => x.id !== s.id))} className="px-2 text-sm text-zinc-500 hover:text-red-400">Xoá</button></td></tr>))}
    </DataTable>)
  return (
    <div className="space-y-5">
      <div className="flex items-center"><h1 className="mr-auto font-display text-3xl font-bold text-white">Kho nhựa & vật tư</h1>
        <button onClick={() => setF({ kind: 'filament', name: '', qty: 1000, unit: 'g', price: 175000, min: 200, rec: true })} className={`${btn} flex items-center gap-1`}><Plus size={16} />Thêm vào kho</button></div>
      <Card title="Nhựa in (tính bằng gram)">{table('filament')}</Card>
      <Card title="Vật tư (hộp, băng keo, sơn, giấy nhám, nozzle…)">{table('supply')}</Card>
      {f && (
        <Modal title={f.id ? 'Sửa mục kho' : 'Thêm vào kho'} onClose={() => setF(null)}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Loại"><select value={f.kind} onChange={(e) => set('kind', e.target.value)} className={inp}><option value="filament">Nhựa in (gram)</option><option value="supply">Vật tư</option></select></Field>
            <Field label="Tên (vd: PLA đỏ eSUN)"><input value={f.name} onChange={(e) => set('name', e.target.value)} className={inp} /></Field>
            <Field label="Số lượng còn"><input type="number" value={f.qty} onChange={(e) => set('qty', e.target.value)} className={inp} /></Field>
            {f.kind === 'supply' && <Field label="Đơn vị"><input value={f.unit} onChange={(e) => set('unit', e.target.value)} className={inp} /></Field>}
            <Field label="Giá (nhựa: đ/kg · vật tư: đ/đơn vị)"><input type="number" value={f.price} onChange={(e) => set('price', e.target.value)} className={inp} /></Field>
            <Field label="Ngưỡng cảnh báo"><input type="number" value={f.min} onChange={(e) => set('min', e.target.value)} className={inp} /></Field>
            {!f.id && <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={f.rec} onChange={(e) => set('rec', e.target.checked)} className="accent-orange-500" />Ghi khoản chi mua vào Thu chi</label>}
          </div>
          <div className="mt-4 flex gap-2"><button onClick={save} className={btn}>Lưu</button><button onClick={() => setF(null)} className={btn2}>Đóng</button></div>
        </Modal>)}
    </div>
  )
}

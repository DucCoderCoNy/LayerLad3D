import { useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { formatVND } from '../../data/products.js'
import { supa, useStore } from '../../lib/store.js'
import { must, useAsync } from '../../lib/useAsync.js'
import { DataTable, Field, Modal, btn, btn2, inp, td } from '../../components/ui.jsx'

const MATS = ['PLA', 'PETG', 'ABS', 'TPU', 'OTHER']
const EMPTY = { material: 'PLA', brand: '', color_name: '', initial_g: 1000, remaining_g: 1000, purchase_price: 0, low_threshold_g: 200, purchased_at: new Date().toISOString().slice(0, 10), note: '', logExpense: true }

/** Kho nhựa: mỗi dòng là 1 cuộn. Cảnh báo khi còn ít hơn ngưỡng. Khi đơn chuyển "Hoàn thành", hệ thống tự trừ nhựa theo hàng đợi in. */
export default function AdminFilament() {
  const [colors] = useStore('colors'), [edit, setEdit] = useState(null), [err, setErr] = useState('')
  const d = useAsync(async () => must(await supa.from('filament_inventory').select('*').order('created_at', { ascending: false })), [])
  const rows = d.data || [], low = (x) => Number(x.remaining_g) <= Number(x.low_threshold_g)
  const sum = {}; for (const x of rows) { const k = `${x.material}|${x.color_name || '—'}`; (sum[k] ||= { m: x.material, c: x.color_name || '—', g: 0, n: 0, low: false }); sum[k].g += Number(x.remaining_g); if (x.remaining_g > 0) sum[k].n++; if (low(x)) sum[k].low = true }
  const set = (k, v) => setEdit((c) => ({ ...c, [k]: v }))
  const save = async (e) => {
    e.preventDefault(); setErr('')
    try {
      const { logExpense, id, created_at, color_id, ...r } = edit
      const row = { ...r, color_id: colors.find((c) => c.name === r.color_name)?.id || null, initial_g: +r.initial_g, remaining_g: Math.min(+r.remaining_g, +r.initial_g), purchase_price: Math.round(+r.purchase_price || 0), low_threshold_g: +r.low_threshold_g, purchased_at: r.purchased_at || null }
      if (id) must(await supa.from('filament_inventory').update(row).eq('id', id))
      else {
        must(await supa.from('filament_inventory').insert(row))
        if (logExpense && row.purchase_price > 0) must(await supa.from('expenses').insert({ spent_on: row.purchased_at || undefined, category: 'filament', amount: row.purchase_price, note: `Mua cuộn ${row.material} ${row.color_name || ''} ${row.brand || ''}`.trim() }))
      }
      setEdit(null); d.reload()
    } catch (x) { setErr(x.message) }
  }
  const del = async (x) => { if (confirm('Xóa cuộn này khỏi kho?')) { must(await supa.from('filament_inventory').delete().eq('id', x.id)); d.reload() } }
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between"><h1 className="font-display text-3xl font-bold text-white">Kho nhựa</h1>
        <button onClick={() => { setEdit(EMPTY); setErr('') }} className={`${btn} flex items-center gap-1`}><Plus size={16} />Thêm cuộn</button></div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{Object.values(sum).map((s) => (
        <div key={s.m + s.c} className={`rounded-xl border p-4 ${s.low ? 'border-amber-500/50 bg-amber-500/10' : 'border-white/10 bg-ink-800'}`}>
          <p className="text-sm text-zinc-400">{s.m} · {s.c}</p><p className="font-display text-2xl font-bold text-white">{Math.round(s.g)} g</p><p className="text-xs text-zinc-500">{s.n} cuộn còn nhựa{s.low ? ' · SẮP HẾT' : ''}</p></div>))}</div>
      {d.error && <p className="text-red-400">{d.error.message}</p>}
      <DataTable heads={['Loại', 'Màu', 'Hãng', 'Còn lại', 'Giá nhập', 'Ngày mua', '']} empty={d.loading ? 'Đang tải…' : 'Chưa có cuộn nhựa nào'}>
        {rows.map((x) => (
          <tr key={x.id}><td className={`${td} font-medium text-white`}>{x.material}</td><td className={td}>{x.color_name || '—'}</td><td className={td}>{x.brand || '—'}</td>
            <td className={`${td} ${low(x) ? 'text-amber-400' : ''}`}>{Math.round(x.remaining_g)} / {Math.round(x.initial_g)} g{low(x) && ' ⚠'}</td><td className={td}>{formatVND(x.purchase_price)}</td><td className={td}>{x.purchased_at || '—'}</td>
            <td className={`${td} whitespace-nowrap text-right`}><button onClick={() => { setEdit({ ...x, logExpense: false }); setErr('') }} className="p-2 text-zinc-400 hover:text-white"><Pencil size={16} /></button>
              <button onClick={() => del(x)} className="p-2 text-zinc-400 hover:text-red-400"><Trash2 size={16} /></button></td></tr>))}
      </DataTable>
      {edit && (
        <Modal title={edit.id ? 'Sửa cuộn nhựa' : 'Thêm cuộn nhựa'} onClose={() => setEdit(null)} wide>
          <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
            <Field label="Loại nhựa"><select value={edit.material} onChange={(e) => set('material', e.target.value)} className={inp}>{MATS.map((m) => <option key={m}>{m}</option>)}</select></Field>
            <Field label="Màu"><input list="fil-colors" value={edit.color_name || ''} onChange={(e) => set('color_name', e.target.value)} className={inp} /><datalist id="fil-colors">{colors.map((c) => <option key={c.id} value={c.name} />)}</datalist></Field>
            <Field label="Hãng"><input value={edit.brand || ''} onChange={(e) => set('brand', e.target.value)} className={inp} /></Field>
            <Field label="Giá nhập cả cuộn (₫)"><input type="number" min="0" step="1000" value={edit.purchase_price} onChange={(e) => set('purchase_price', e.target.value)} className={inp} /></Field>
            <Field label="Khối lượng cuộn (g)"><input required type="number" min="1" value={edit.initial_g} onChange={(e) => set('initial_g', e.target.value)} className={inp} /></Field>
            <Field label="Còn lại (g)"><input required type="number" min="0" value={edit.remaining_g} onChange={(e) => set('remaining_g', e.target.value)} className={inp} /></Field>
            <Field label="Cảnh báo khi còn dưới (g)"><input type="number" min="0" value={edit.low_threshold_g} onChange={(e) => set('low_threshold_g', e.target.value)} className={inp} /></Field>
            <Field label="Ngày mua"><input type="date" value={edit.purchased_at || ''} onChange={(e) => set('purchased_at', e.target.value)} className={inp} /></Field>
            {!edit.id && <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={edit.logExpense} onChange={(e) => set('logExpense', e.target.checked)} className="accent-orange-500" />Ghi giá nhập vào sổ chi phí (tiền nhựa)</label>}
            {err && <p className="text-sm text-red-400 sm:col-span-2">{err}</p>}
            <div className="flex justify-end gap-2 sm:col-span-2"><button type="button" onClick={() => setEdit(null)} className={btn2}>Hủy</button><button className={btn}>Lưu</button></div>
          </form>
        </Modal>)}
    </div>
  )
}

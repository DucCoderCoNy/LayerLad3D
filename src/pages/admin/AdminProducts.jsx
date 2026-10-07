import { useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { CATEGORIES, formatVND } from '../../data/products.js'
import { uid, useStore } from '../../lib/store.js'
import { DataTable, Field, Modal, Thumb, btn, btn2, inp, td } from '../../components/ui.jsx'

const EMPTY = { name: '', category: 'keychain', price: 39000, stock: 20, hot: false, active: true, desc: '', image: '', hue: 'from-accent to-amber-400' }

/** Đọc ảnh, thu nhỏ còn tối đa 640px rồi lưu dạng base64 (nhẹ, đủ để lưu localStorage) */
const toDataUrl = (file) => new Promise((res) => {
  const img = new Image()
  img.onload = () => { const s = Math.min(1, 640 / img.width), c = document.createElement('canvas'); c.width = img.width * s; c.height = img.height * s; c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); res(c.toDataURL('image/jpeg', 0.8)) }
  img.src = URL.createObjectURL(file)
})

export default function AdminProducts() {
  const [products, setProducts] = useStore('products')
  const [edit, setEdit] = useState(null), [q, setQ] = useState('')
  const set = (k, v) => setEdit((c) => ({ ...c, [k]: v }))
  const save = (e) => {
    e.preventDefault()
    const p = { ...edit, price: +edit.price, stock: +edit.stock }
    setProducts((c) => (p.id ? c.map((x) => (x.id === p.id ? p : x)) : [{ ...p, id: uid('sp') }, ...c])); setEdit(null)
  }
  const del = (p) => confirm(`Xóa "${p.name}"?`) && setProducts((c) => c.filter((x) => x.id !== p.id))
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-bold text-white">Sản phẩm</h1>
        <div className="flex gap-2"><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm…" className={`${inp} w-48`} />
          <button onClick={() => setEdit(EMPTY)} className={`${btn} flex items-center gap-1`}><Plus size={16} />Thêm</button></div>
      </div>
      <DataTable heads={['Ảnh', 'Tên', 'Danh mục', 'Giá', 'Kho', 'Trạng thái', '']}>
        {products.filter((p) => p.name.toLowerCase().includes(q.toLowerCase())).map((p) => (
          <tr key={p.id}>
            <td className={td}><Thumb p={p} className="h-12 w-12 rounded-lg" /></td>
            <td className={`${td} font-medium text-white`}>{p.name}{p.hot && <span className="ml-2 rounded bg-accent/20 px-1.5 text-xs text-accent">Hot</span>}</td>
            <td className={td}>{CATEGORIES.find((c) => c.id === p.category)?.label}</td>
            <td className={td}>{formatVND(p.price)}</td>
            <td className={`${td} ${p.stock <= 5 ? 'text-amber-400' : ''}`}>{p.stock}</td>
            <td className={td}>{p.active ? 'Đang bán' : 'Ẩn'}</td>
            <td className={`${td} whitespace-nowrap text-right`}>
              <button onClick={() => setEdit(p)} className="p-2 text-zinc-400 hover:text-white"><Pencil size={16} /></button>
              <button onClick={() => del(p)} className="p-2 text-zinc-400 hover:text-red-400"><Trash2 size={16} /></button></td>
          </tr>))}
      </DataTable>
      {edit && (
        <Modal title={edit.id ? 'Sửa sản phẩm' : 'Thêm sản phẩm'} onClose={() => setEdit(null)} wide>
          <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2"><Field label="Tên sản phẩm"><input required value={edit.name} onChange={(e) => set('name', e.target.value)} className={inp} /></Field></div>
            <Field label="Danh mục"><select value={edit.category} onChange={(e) => set('category', e.target.value)} className={inp}>{CATEGORIES.slice(1).map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select></Field>
            <Field label="Giá (₫)"><input required type="number" min="0" step="1000" value={edit.price} onChange={(e) => set('price', e.target.value)} className={inp} /></Field>
            <Field label="Tồn kho"><input required type="number" min="0" value={edit.stock} onChange={(e) => set('stock', e.target.value)} className={inp} /></Field>
            <Field label="Ảnh sản phẩm"><input type="file" accept="image/*" onChange={async (e) => e.target.files[0] && set('image', await toDataUrl(e.target.files[0]))} className="text-xs" /></Field>
            <div className="sm:col-span-2"><Field label="Mô tả"><textarea rows={3} value={edit.desc} onChange={(e) => set('desc', e.target.value)} className={inp} /></Field></div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={edit.hot} onChange={(e) => set('hot', e.target.checked)} className="accent-orange-500" />Nổi bật (hiện ở trang chủ)</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={edit.active} onChange={(e) => set('active', e.target.checked)} className="accent-orange-500" />Đang bán</label>
            <div className="flex items-center gap-3 sm:col-span-2">{edit.image && <><Thumb p={edit} className="h-16 w-16 rounded-lg" /><button type="button" onClick={() => set('image', '')} className="text-xs text-red-400">Xóa ảnh</button></>}
              <div className="ml-auto flex gap-2"><button type="button" onClick={() => setEdit(null)} className={btn2}>Hủy</button><button className={btn}>Lưu</button></div></div>
          </form>
        </Modal>)}
    </div>
  )
}

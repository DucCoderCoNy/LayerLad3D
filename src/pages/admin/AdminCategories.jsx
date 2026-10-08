import { useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useStore } from '../../lib/store.js'
import { slugify } from '../../lib/seo.js'
import { DataTable, Field, Modal, btn, btn2, inp, td } from '../../components/ui.jsx'

/** Danh mục sản phẩm: thêm / sửa tên / xóa (không xóa được danh mục còn sản phẩm) */
export default function AdminCategories() {
  const [cats, setCats] = useStore('categories'), [products] = useStore('products')
  const [edit, setEdit] = useState(null), [err, setErr] = useState('')
  const count = (id) => products.filter((p) => p.category === id).length
  const save = (e) => {
    e.preventDefault()
    const label = edit.label.trim(), id = edit.isNew ? slugify(edit.id || label) : edit.id
    if (!label || !id) return setErr('Nhập tên danh mục')
    if (id === 'all') return setErr('Mã "all" đã được hệ thống dùng')
    if (edit.isNew && cats.some((c) => c.id === id)) return setErr('Danh mục này đã tồn tại')
    setCats((c) => (edit.isNew ? [...c, { id, label }] : c.map((x) => (x.id === id ? { ...x, label } : x)))); setEdit(null); setErr('')
  }
  const del = (c) => (count(c.id) ? alert(`Còn ${count(c.id)} sản phẩm thuộc danh mục này. Hãy chuyển chúng sang danh mục khác trước.`) : confirm(`Xóa danh mục "${c.label}"?`) && setCats((x) => x.filter((y) => y.id !== c.id)))
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between"><h1 className="font-display text-3xl font-bold text-white">Danh mục sản phẩm</h1>
        <button onClick={() => { setEdit({ isNew: true, id: '', label: '' }); setErr('') }} className={`${btn} flex items-center gap-1`}><Plus size={16} />Thêm</button></div>
      <DataTable heads={['Tên', 'Mã', 'Số sản phẩm', '']} empty="Chưa có danh mục">
        {cats.map((c) => (
          <tr key={c.id}><td className={`${td} font-medium text-white`}>{c.label}</td><td className={`${td} text-zinc-500`}>{c.id}</td><td className={td}>{count(c.id)}</td>
            <td className={`${td} text-right`}><button onClick={() => { setEdit(c); setErr('') }} className="p-2 text-zinc-400 hover:text-white"><Pencil size={16} /></button>
              <button onClick={() => del(c)} className="p-2 text-zinc-400 hover:text-red-400"><Trash2 size={16} /></button></td></tr>))}
      </DataTable>
      {edit && (
        <Modal title={edit.isNew ? 'Thêm danh mục' : 'Sửa danh mục'} onClose={() => setEdit(null)}>
          <form onSubmit={save} className="space-y-4">
            <Field label="Tên hiển thị"><input autoFocus required value={edit.label} onChange={(e) => setEdit({ ...edit, label: e.target.value })} className={inp} /></Field>
            {edit.isNew && <Field label="Mã (không dấu, để trống sẽ tự tạo từ tên)"><input value={edit.id} onChange={(e) => setEdit({ ...edit, id: e.target.value })} className={inp} /></Field>}
            {err && <p className="text-sm text-red-400">{err}</p>}
            <div className="flex gap-2"><button className={btn}>Lưu</button><button type="button" onClick={() => setEdit(null)} className={btn2}>Hủy</button></div>
          </form>
        </Modal>)}
    </div>
  )
}

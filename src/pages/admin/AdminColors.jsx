import { useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { uid, useStore } from '../../lib/store.js'
import { DataTable, Field, Modal, btn, btn2, inp, td } from '../../components/ui.jsx'

const EMPTY = { name: '', hex: '#ff6a13', active: true, sort: 50 }

/** Quản lý màu nhựa: thêm / sửa / xóa. Màu nào dùng cho sản phẩm nào thì chọn ở Sản phẩm → Sửa. */
export default function AdminColors() {
  const [colors, setColors] = useStore('colors'), [products, setProducts] = useStore('products')
  const [edit, setEdit] = useState(null), [err, setErr] = useState('')
  const set = (k, v) => setEdit((c) => ({ ...c, [k]: v }))
  const usedBy = (id) => products.filter((p) => p.colorIds?.includes(id)).length
  const list = [...colors].sort((a, b) => (a.sort || 0) - (b.sort || 0))

  const save = (e) => {
    e.preventDefault(); setErr('')
    const name = edit.name.trim()
    if (!name) return setErr('Nhập tên màu')
    if (!/^#[0-9a-fA-F]{6}$/.test(edit.hex)) return setErr('Mã màu phải dạng #rrggbb')
    if (colors.some((c) => c.id !== edit.id && c.name.toLowerCase() === name.toLowerCase())) return setErr('Tên màu đã tồn tại')
    const c = { ...edit, name, sort: +edit.sort || 0 }
    setColors((cur) => (c.id ? cur.map((x) => (x.id === c.id ? c : x)) : [...cur, { ...c, id: uid('c') }])); setEdit(null)
  }
  const del = (c) => {
    const n = usedBy(c.id)
    if (!confirm(n ? `Màu "${c.name}" đang được gán cho ${n} sản phẩm. Xóa màu sẽ gỡ khỏi các sản phẩm đó (đơn cũ vẫn giữ nguyên tên màu). Tiếp tục?` : `Xóa màu "${c.name}"?`)) return
    setColors((cur) => cur.filter((x) => x.id !== c.id))
    if (n) setProducts((cur) => cur.map((p) => (p.colorIds?.includes(c.id) ? { ...p, colorIds: p.colorIds.filter((x) => x !== c.id) } : p)))
  }
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-bold text-white">Quản lý màu</h1>
        <button onClick={() => { setErr(''); setEdit({ ...EMPTY }) }} className={`${btn} flex items-center gap-1`}><Plus size={16} />Thêm màu</button>
      </div>
      <p className="text-sm text-zinc-500">Màu đang bật hiện ở trang In theo yêu cầu và sản phẩm. Để chỉ cho một số màu ở từng sản phẩm, vào Sản phẩm → Sửa → chọn màu.</p>
      <DataTable heads={['Màu', 'Tên', 'Mã màu', 'Thứ tự', 'Dùng cho', 'Trạng thái', '']} empty="Chưa có màu nào">
        {list.map((c) => (
          <tr key={c.id}>
            <td className={td}><span className="inline-block h-8 w-8 rounded-full border border-white/20" style={{ background: c.hex }} /></td>
            <td className={`${td} font-medium text-white`}>{c.name}</td><td className={td}>{c.hex}</td><td className={td}>{c.sort}</td>
            <td className={td}>{usedBy(c.id) ? `${usedBy(c.id)} sản phẩm` : 'Mọi sản phẩm chưa chọn riêng'}</td>
            <td className={td}>{c.active ? 'Đang bật' : <span className="text-zinc-500">Ẩn</span>}</td>
            <td className={`${td} whitespace-nowrap text-right`}>
              <button onClick={() => { setErr(''); setEdit(c) }} aria-label="Sửa" className="p-2 text-zinc-400 hover:text-white"><Pencil size={16} /></button>
              <button onClick={() => del(c)} aria-label="Xóa" className="p-2 text-zinc-400 hover:text-red-400"><Trash2 size={16} /></button></td>
          </tr>))}
      </DataTable>
      {edit && (
        <Modal title={edit.id ? 'Sửa màu' : 'Thêm màu'} onClose={() => setEdit(null)}>
          <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2"><Field label="Tên màu"><input required maxLength={30} value={edit.name} onChange={(e) => set('name', e.target.value)} className={inp} /></Field></div>
            <Field label="Mã màu"><div className="flex gap-2"><input type="color" value={/^#[0-9a-fA-F]{6}$/.test(edit.hex) ? edit.hex : '#000000'} onChange={(e) => set('hex', e.target.value)} className="h-10 w-14 cursor-pointer rounded border border-white/10 bg-transparent" /><input value={edit.hex} onChange={(e) => set('hex', e.target.value)} className={inp} /></div></Field>
            <Field label="Thứ tự hiển thị"><input type="number" value={edit.sort} onChange={(e) => set('sort', e.target.value)} className={inp} /></Field>
            <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={edit.active} onChange={(e) => set('active', e.target.checked)} className="accent-orange-500" />Đang bật (khách chọn được)</label>
            {err && <p className="text-sm text-red-400 sm:col-span-2">{err}</p>}
            <div className="flex justify-end gap-2 sm:col-span-2"><button type="button" onClick={() => setEdit(null)} className={btn2}>Hủy</button><button className={btn}>Lưu</button></div>
          </form>
        </Modal>)}
    </div>
  )
}

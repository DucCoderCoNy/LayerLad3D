import { useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { uid, useStore } from '../../lib/store.js'
import { uploadImage } from '../../lib/upload.js'
import { DataTable, Field, Modal, btn, btn2, inp, td } from '../../components/ui.jsx'

const EMPTY = { title: '', image: '', customer: '', quote: '', rating: 5, active: true }

/** Thư viện ảnh "sản phẩm đã làm" + đánh giá khách (đánh giá hiện ở trang chủ nếu có nội dung) */
export default function AdminShowcase() {
  const [items, setItems] = useStore('showcase'), [edit, setEdit] = useState(null), [busy, setBusy] = useState(false), [err, setErr] = useState('')
  const set = (k, v) => setEdit((c) => ({ ...c, [k]: v }))
  const save = (e) => { e.preventDefault(); const p = { ...edit, rating: +edit.rating }; setItems((c) => (p.id ? c.map((x) => (x.id === p.id ? p : x)) : [{ ...p, id: uid('sc') }, ...c])); setEdit(null) }
  const pick = async (e) => { const f = e.target.files[0]; if (!f) return; setBusy(true); try { set('image', await uploadImage(f, 'showcase')) } catch (x) { setErr(x.message) } setBusy(false) }
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between"><h1 className="font-display text-3xl font-bold text-white">Thư viện & đánh giá</h1>
        <button onClick={() => { setEdit(EMPTY); setErr('') }} className={`${btn} flex items-center gap-1`}><Plus size={16} />Thêm</button></div>
      <p className="text-sm text-zinc-500">Chỉ đăng đánh giá thật của khách (nên xin phép khách trước khi đăng tên/ảnh).</p>
      <DataTable heads={['Ảnh', 'Tiêu đề', 'Khách', 'Đánh giá', 'Hiển thị', '']} empty="Chưa có mục nào">
        {items.map((x) => (
          <tr key={x.id}><td className={td}>{x.image ? <img src={x.image} alt="" className="h-12 w-12 rounded-lg object-cover" /> : '—'}</td><td className={`${td} font-medium text-white`}>{x.title}</td>
            <td className={td}>{x.customer || '—'}</td><td className={td}>{x.quote ? `${x.rating}★ có nội dung` : '—'}</td><td className={td}>{x.active ? 'Hiện' : 'Ẩn'}</td>
            <td className={`${td} whitespace-nowrap text-right`}><button onClick={() => { setEdit(x); setErr('') }} className="p-2 text-zinc-400 hover:text-white"><Pencil size={16} /></button>
              <button onClick={() => confirm('Xóa mục này?') && setItems((c) => c.filter((y) => y.id !== x.id))} className="p-2 text-zinc-400 hover:text-red-400"><Trash2 size={16} /></button></td></tr>))}
      </DataTable>
      {edit && (
        <Modal title={edit.id ? 'Sửa mục' : 'Thêm mục'} onClose={() => setEdit(null)}>
          <form onSubmit={save} className="space-y-4">
            <Field label="Tên sản phẩm / tiêu đề"><input required value={edit.title} onChange={(e) => set('title', e.target.value)} className={inp} /></Field>
            <Field label="Ảnh"><input type="file" accept="image/*" onChange={pick} className="text-xs" /></Field>
            {edit.image && <img src={edit.image} alt="" className="h-24 rounded-lg" />}
            <div className="grid grid-cols-2 gap-3"><Field label="Tên khách (tùy chọn)"><input value={edit.customer} onChange={(e) => set('customer', e.target.value)} className={inp} /></Field>
              <Field label="Số sao"><select value={edit.rating} onChange={(e) => set('rating', e.target.value)} className={inp}>{[5, 4, 3].map((n) => <option key={n}>{n}</option>)}</select></Field></div>
            <Field label="Nhận xét của khách (tùy chọn)"><textarea rows={3} value={edit.quote} onChange={(e) => set('quote', e.target.value)} className={inp} /></Field>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={edit.active} onChange={(e) => set('active', e.target.checked)} className="accent-orange-500" />Hiển thị</label>
            {err && <p className="text-sm text-red-400">{err}</p>}
            <div className="flex justify-end gap-2"><button type="button" onClick={() => setEdit(null)} className={btn2}>Hủy</button><button disabled={busy} className={btn}>{busy ? 'Đang tải ảnh…' : 'Lưu'}</button></div>
          </form>
        </Modal>)}
    </div>
  )
}

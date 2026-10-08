import { useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { POST_CATS } from '../../data/posts.js'
import { useStore } from '../../lib/store.js'
import { slugify } from '../../lib/seo.js'
import { uploadImage } from '../../lib/upload.js'
import { DataTable, Field, Modal, btn, btn2, inp, td } from '../../components/ui.jsx'

const EMPTY = { title: '', category: 'huong-dan', excerpt: '', content: '', cover: '', published: true }

/** Đăng bài ở mục Tin tức. Nội dung: "## Tiêu đề", "### Tiêu đề nhỏ", "- gạch đầu dòng", **in đậm**, cách đoạn bằng dòng trống */
export default function AdminPosts() {
  const [posts, setPosts] = useStore('posts'), [edit, setEdit] = useState(null), [busy, setBusy] = useState(false), [err, setErr] = useState('')
  const set = (k, v) => setEdit((c) => ({ ...c, [k]: v }))
  const save = (e) => {
    e.preventDefault()
    if (edit.isNew) {
      const id = slugify(edit.title) || 'bai-' + Date.now().toString(36)
      if (posts.some((p) => p.id === id)) return setErr('Đã có bài trùng tiêu đề, hãy đổi tiêu đề một chút')
      const { isNew, ...p } = edit; setPosts((c) => [{ ...p, id, createdAt: Date.now() }, ...c])
    } else { const { isNew, ...p } = edit; setPosts((c) => c.map((x) => (x.id === p.id ? p : x))) }
    setEdit(null); setErr('')
  }
  const pick = async (e) => { const f = e.target.files[0]; if (!f) return; setBusy(true); try { set('cover', await uploadImage(f, 'posts')) } catch (x) { setErr(x.message) } setBusy(false) }
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between"><h1 className="font-display text-3xl font-bold text-white">Bài viết</h1>
        <button onClick={() => { setEdit({ ...EMPTY, isNew: true }); setErr('') }} className={`${btn} flex items-center gap-1`}><Plus size={16} />Viết bài</button></div>
      <DataTable heads={['Tiêu đề', 'Chuyên mục', 'Ngày', 'Trạng thái', '']} empty="Chưa có bài viết">
        {[...posts].sort((a, b) => b.createdAt - a.createdAt).map((p) => (
          <tr key={p.id}><td className={`${td} font-medium text-white`}>{p.title}</td><td className={td}>{POST_CATS.find((c) => c.id === p.category)?.label}</td>
            <td className={td}>{new Date(p.createdAt).toLocaleDateString('vi-VN')}</td>
            <td className={td}><span className={`rounded-full px-2.5 py-1 text-xs ${p.published ? 'bg-emerald-500/20 text-emerald-300' : 'bg-zinc-500/20 text-zinc-400'}`}>{p.published ? 'Đã đăng' : 'Nháp'}</span></td>
            <td className={`${td} whitespace-nowrap text-right`}><button onClick={() => { setEdit(p); setErr('') }} className="p-2 text-zinc-400 hover:text-white"><Pencil size={16} /></button>
              <button onClick={() => confirm(`Xóa bài "${p.title}"?`) && setPosts((c) => c.filter((x) => x.id !== p.id))} className="p-2 text-zinc-400 hover:text-red-400"><Trash2 size={16} /></button></td></tr>))}
      </DataTable>
      {edit && (
        <Modal title={edit.isNew ? 'Viết bài mới' : 'Sửa bài viết'} onClose={() => setEdit(null)} wide>
          <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2"><Field label="Tiêu đề"><input required value={edit.title} onChange={(e) => set('title', e.target.value)} className={inp} /></Field></div>
            <Field label="Chuyên mục"><select value={edit.category} onChange={(e) => set('category', e.target.value)} className={inp}>{POST_CATS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select></Field>
            <Field label="Ảnh bìa"><input type="file" accept="image/*" onChange={pick} className="text-xs" /></Field>
            <div className="sm:col-span-2"><Field label="Mô tả ngắn (hiện ở danh sách)"><textarea rows={2} value={edit.excerpt} onChange={(e) => set('excerpt', e.target.value)} className={inp} /></Field></div>
            <div className="sm:col-span-2"><Field label="Nội dung"><textarea required rows={12} value={edit.content} onChange={(e) => set('content', e.target.value)} className={`${inp} font-mono`} placeholder={'## Tiêu đề mục\n\nĐoạn văn…\n\n- Gạch đầu dòng 1\n- Gạch đầu dòng 2'} /></Field></div>
            {edit.cover && <div className="flex items-center gap-3 sm:col-span-2"><img src={edit.cover} alt="" className="h-16 rounded-lg" /><button type="button" onClick={() => set('cover', '')} className="text-xs text-red-400">Xóa ảnh</button></div>}
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={edit.published} onChange={(e) => set('published', e.target.checked)} className="accent-orange-500" />Đăng công khai (bỏ chọn = lưu nháp)</label>
            {err && <p className="text-sm text-red-400 sm:col-span-2">{err}</p>}
            <div className="flex justify-end gap-2 sm:col-span-2"><button type="button" onClick={() => setEdit(null)} className={btn2}>Hủy</button><button disabled={busy} className={btn}>{busy ? 'Đang tải ảnh…' : 'Lưu'}</button></div>
          </form>
        </Modal>)}
    </div>
  )
}

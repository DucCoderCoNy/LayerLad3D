import { useState } from 'react'
import { ArrowLeft, ArrowRight, Pencil, Plus, Trash2 } from 'lucide-react'
import { formatVND } from '../../data/products.js'
import { uid, useStore } from '../../lib/store.js'
import { uploadImage } from '../../lib/upload.js'
import { slugify } from '../../lib/seo.js'
import ProductImport, { HEADERS } from './ProductImport.jsx'
import { downloadCSV } from '../../lib/export.js'
import { DataTable, Field, Modal, Thumb, btn, btn2, inp, td } from '../../components/ui.jsx'

const EMPTY = { name: '', slug: '', category: '', price: 39000, stock: 20, hot: false, active: true, desc: '', image: '', images: [], colorIds: [], grams: 0, material: 'PLA', hue: 'from-accent to-amber-400' }
const MAX_IMAGES = 8
const PAGE = 15

export default function AdminProducts() {
  const [products, setProducts] = useStore('products'), [CATEGORIES] = useStore('categories'), [colors] = useStore('colors')
  const [imp, setImp] = useState(false), [busy, setBusy] = useState(false), [err, setErr] = useState(''), [edit, setEdit] = useState(null), [q, setQ] = useState(''), [page, setPage] = useState(1)
  const set = (k, v) => setEdit((c) => ({ ...c, [k]: v }))
  const imgs = edit ? (edit.images?.length ? edit.images : edit.image ? [edit.image] : []) : []

  const open = (p) => { setErr(''); setEdit(p ? { ...EMPTY, ...p, images: p.images?.length ? p.images : p.image ? [p.image] : [], colorIds: p.colorIds || [] } : { ...EMPTY, category: CATEGORIES[0]?.id || '' }) }
  /** Chọn nhiều ảnh: mỗi ảnh được thu nhỏ rồi tải lên Supabase Storage (bucket public-images) */
  const pick = async (e) => {
    const files = [...(e.target.files || [])]; e.target.value = ''
    if (!files.length) return
    if (imgs.length + files.length > MAX_IMAGES) return setErr(`Tối đa ${MAX_IMAGES} ảnh cho mỗi sản phẩm`)
    setBusy(true); setErr('')
    try { const urls = []; for (const f of files) urls.push(await uploadImage(f, 'products')); set('images', [...imgs, ...urls]) } catch (x) { setErr(x.message) }
    setBusy(false)
  }
  const move = (i, d) => { const a = [...imgs], j = i + d; if (j < 0 || j >= a.length) return;[a[i], a[j]] = [a[j], a[i]]; set('images', a) }
  const toggleColor = (id) => set('colorIds', edit.colorIds.includes(id) ? edit.colorIds.filter((x) => x !== id) : [...edit.colorIds, id])

  const save = (e) => {
    e.preventDefault()
    const base = slugify(edit.slug || edit.name) || 'san-pham'
    let slug = base, n = 2
    while (products.some((x) => x.id !== edit.id && x.slug === slug)) slug = `${base}-${n++}`   // slug không trùng
    const p = { ...edit, slug, price: +edit.price, stock: +edit.stock, grams: +edit.grams || 0, images: imgs, image: imgs[0] || '' }
    setProducts((c) => (p.id ? c.map((x) => (x.id === p.id ? p : x)) : [{ ...p, id: uid('sp') }, ...c])); setEdit(null)
  }
  const del = (p) => confirm(`Xóa "${p.name}"?`) && setProducts((c) => c.filter((x) => x.id !== p.id))
  const filtered = products.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()))
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE)), cur = Math.min(page, pages)
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-bold text-white">Sản phẩm</h1>
        <div className="flex gap-2"><input value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} placeholder="Tìm…" className={`${inp} w-48`} />
          <button onClick={() => setImp(true)} className={btn2}>Nhập CSV</button>
          <button onClick={() => downloadCSV('san-pham.csv', [HEADERS, ...products.map((p) => [p.name, CATEGORIES.find((c) => c.id === p.category)?.label || p.category, p.price, p.stock, p.desc, p.grams || 0, p.material || 'PLA', (p.images?.length ? p.images : p.image ? [p.image] : []).join('|'), (p.colorIds || []).map((id) => colors.find((c) => c.id === id)?.name).filter(Boolean).join('|'), p.slug || '', p.active ? 1 : 0])])} className={btn2}>Xuất CSV</button>
          <button onClick={() => open()} className={`${btn} flex items-center gap-1`}><Plus size={16} />Thêm</button></div>
      </div>
      <DataTable heads={['Ảnh', 'Tên', 'Danh mục', 'Giá', 'Kho', 'Trạng thái', '']}>
        {filtered.slice((cur - 1) * PAGE, cur * PAGE).map((p) => (
          <tr key={p.id}>
            <td className={td}><Thumb p={{ ...p, image: p.images?.[0] || p.image }} className="h-12 w-12 rounded-lg" /></td>
            <td className={`${td} font-medium text-white`}>{p.name}{p.hot && <span className="ml-2 rounded bg-accent/20 px-1.5 text-xs text-accent">Hot</span>}<br /><small className="font-normal text-zinc-500">/shop/{p.slug || p.id}{p.images?.length > 1 && ` · ${p.images.length} ảnh`}</small></td>
            <td className={td}>{CATEGORIES.find((c) => c.id === p.category)?.label}</td>
            <td className={td}>{formatVND(p.price)}</td>
            <td className={`${td} ${p.stock <= 5 ? 'text-amber-400' : ''}`}>{p.stock}</td>
            <td className={td}>{p.active ? 'Đang bán' : 'Ẩn'}</td>
            <td className={`${td} whitespace-nowrap text-right`}>
              <button onClick={() => open(p)} aria-label="Sửa" className="p-2 text-zinc-400 hover:text-white"><Pencil size={16} /></button>
              <button onClick={() => del(p)} aria-label="Xóa" className="p-2 text-zinc-400 hover:text-red-400"><Trash2 size={16} /></button></td>
          </tr>))}
      </DataTable>
      {pages > 1 && <div className="flex items-center justify-center gap-3 text-sm"><button disabled={cur <= 1} onClick={() => setPage(cur - 1)} className={btn2}>‹</button>Trang {cur}/{pages}<button disabled={cur >= pages} onClick={() => setPage(cur + 1)} className={btn2}>›</button></div>}
      {imp && <ProductImport onClose={() => setImp(false)} />}
      {edit && (
        <Modal title={edit.id ? 'Sửa sản phẩm' : 'Thêm sản phẩm'} onClose={() => setEdit(null)} wide>
          <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2"><Field label="Tên sản phẩm"><input required value={edit.name} onChange={(e) => set('name', e.target.value)} className={inp} /></Field></div>
            <Field label="Đường dẫn (slug) – để trống sẽ tự tạo từ tên"><input value={edit.slug} onChange={(e) => set('slug', e.target.value)} placeholder={slugify(edit.name)} className={inp} /></Field>
            <Field label="Danh mục"><select value={edit.category} onChange={(e) => set('category', e.target.value)} className={inp}>{CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select></Field>
            <Field label="Giá (₫)"><input required type="number" min="0" step="1000" value={edit.price} onChange={(e) => set('price', e.target.value)} className={inp} /></Field>
            <Field label="Tồn kho"><input required type="number" min="0" value={edit.stock} onChange={(e) => set('stock', e.target.value)} className={inp} /></Field>
            <div className="sm:col-span-2"><Field label="Mô tả"><textarea rows={4} value={edit.desc} onChange={(e) => set('desc', e.target.value)} className={inp} /></Field></div>

            <fieldset className="sm:col-span-2">
              <legend className="mb-2 text-sm text-zinc-400">Ảnh sản phẩm ({imgs.length}/{MAX_IMAGES}) – ảnh đầu tiên là ảnh đại diện</legend>
              <div className="flex flex-wrap gap-3">
                {imgs.map((u, i) => (
                  <div key={u} className="w-24 text-center">
                    <img src={u} alt="" loading="lazy" className="h-24 w-24 rounded-lg object-cover" />
                    <div className="mt-1 flex justify-between text-zinc-400"><button type="button" onClick={() => move(i, -1)} aria-label="Dời trước"><ArrowLeft size={14} /></button><button type="button" onClick={() => set('images', imgs.filter((_, k) => k !== i))} className="text-xs text-red-400">Xóa</button><button type="button" onClick={() => move(i, 1)} aria-label="Dời sau"><ArrowRight size={14} /></button></div>
                  </div>))}
                {imgs.length < MAX_IMAGES && <label className="grid h-24 w-24 cursor-pointer place-items-center rounded-lg border-2 border-dashed border-white/20 text-center text-xs text-zinc-400 hover:border-accent">{busy ? 'Đang tải…' : '+ Thêm ảnh'}<input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={pick} className="hidden" disabled={busy} /></label>}
              </div>
            </fieldset>

            <fieldset className="sm:col-span-2">
              <legend className="mb-2 text-sm text-zinc-400">Màu / biến thể khách được chọn {edit.colorIds.length === 0 && <i className="text-zinc-500">(chưa chọn = mọi màu đang bật)</i>}</legend>
              <div className="flex flex-wrap gap-2">
                {colors.filter((c) => c.active).sort((a, b) => (a.sort || 0) - (b.sort || 0)).map((c) => (
                  <label key={c.id} className={`flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm ${edit.colorIds.includes(c.id) ? 'border-accent bg-accent/10 text-white' : 'border-white/10 text-zinc-400'}`}>
                    <input type="checkbox" className="hidden" checked={edit.colorIds.includes(c.id)} onChange={() => toggleColor(c.id)} /><i className="h-4 w-4 rounded-full border border-white/20" style={{ background: c.hex }} />{c.name}</label>))}
              </div>
            </fieldset>

            <Field label="Nhựa dùng cho 1 sản phẩm (g) – để trừ kho khi hoàn thành đơn"><input type="number" min="0" value={edit.grams} onChange={(e) => set('grams', e.target.value)} className={inp} /></Field>
            <Field label="Loại nhựa"><select value={edit.material} onChange={(e) => set('material', e.target.value)} className={inp}><option>PLA</option><option>PETG</option><option>ABS</option></select></Field>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={edit.hot} onChange={(e) => set('hot', e.target.checked)} className="accent-orange-500" />Nổi bật (hiện ở trang chủ)</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={edit.active} onChange={(e) => set('active', e.target.checked)} className="accent-orange-500" />Đang bán</label>
            {err && <p className="text-sm text-red-400 sm:col-span-2">{err}</p>}
            <div className="flex justify-end gap-2 sm:col-span-2"><button type="button" onClick={() => setEdit(null)} className={btn2}>Hủy</button><button disabled={busy} className={btn}>{busy ? 'Đang tải ảnh…' : 'Lưu'}</button></div>
          </form>
        </Modal>)}
    </div>
  )
}

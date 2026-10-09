import { useMemo, useState } from 'react'
import { downloadCSV } from '../../lib/export.js'
import { parseCSV } from '../../lib/csv.js'
import { slugify } from '../../lib/slug.js'
import { uid, useStore } from '../../lib/store.js'
import { safeUrl } from '../../components/OrderTracking.jsx'
import { Modal, btn, btn2 } from '../../components/ui.jsx'

export const HEADERS = ['Tên', 'Danh mục', 'Giá', 'Tồn kho', 'Mô tả', 'Nhựa (g)', 'Loại nhựa', 'Ảnh (link, cách nhau bằng |)', 'Màu (cách nhau bằng |)', 'Slug', 'Đang bán (1/0)']
const KEYS = { 'tên': 'name', name: 'name', 'danh mục': 'cat', category: 'cat', 'giá': 'price', price: 'price', 'tồn kho': 'stock', stock: 'stock', 'mô tả': 'desc', desc: 'desc', 'nhựa (g)': 'grams', grams: 'grams', 'loại nhựa': 'material', material: 'material', slug: 'slug' }
const norm = (s) => String(s || '').trim().toLowerCase()
const MAX_ROWS = 500

/** Nhập nhiều sản phẩm từ file CSV (Excel → Lưu thành CSV UTF-8). Có bước xem trước và báo lỗi từng dòng trước khi nhập. */
export default function ProductImport({ onClose }) {
  const [products, setProducts] = useStore('products'), [cats] = useStore('categories'), [colors] = useStore('colors')
  const [rows, setRows] = useState(null), [fileErr, setFileErr] = useState(''), [update, setUpdate] = useState(false)

  const load = async (e) => {
    const f = e.target.files?.[0]; if (!f) return
    setFileErr(''); setRows(null)
    if (f.size > 2 * 1024 * 1024) return setFileErr('File quá lớn (tối đa 2 MB)')
    const table = parseCSV(await f.text())
    if (table.length < 2) return setFileErr('File không có dòng dữ liệu')
    if (table.length - 1 > MAX_ROWS) return setFileErr(`Tối đa ${MAX_ROWS} sản phẩm mỗi lần nhập`)
    const head = table[0].map((h) => (KEYS[norm(h)] || (norm(h).startsWith('ảnh') || norm(h).startsWith('image') ? 'images' : norm(h).startsWith('màu') || norm(h).startsWith('color') ? 'colors' : norm(h).startsWith('đang bán') || norm(h) === 'active' ? 'active' : '')))
    if (!head.includes('name') || !head.includes('price')) return setFileErr('Thiếu cột bắt buộc: "Tên" và "Giá". Tải file mẫu để xem đúng định dạng.')
    setRows(table.slice(1).map((r, i) => { const o = {}; head.forEach((k, c) => k && (o[k] = (r[c] ?? '').trim())); return { line: i + 2, ...o } }))
  }

  const parsed = useMemo(() => (rows || []).map((r) => {
    const errs = [], warn = []
    const price = Number(String(r.price).replace(/[.,\s₫đ]/g, '')), stock = r.stock === '' || r.stock == null ? 0 : Number(r.stock)
    if (!r.name) errs.push('Thiếu tên')
    if (!Number.isFinite(price) || price < 0 || r.price === '') errs.push('Giá không hợp lệ')
    if (!Number.isFinite(stock) || stock < 0) errs.push('Tồn kho không hợp lệ')
    const cat = cats.find((c) => c.id === r.cat || norm(c.label) === norm(r.cat) || slugify(c.label) === slugify(r.cat))
    if (!cat) errs.push(`Không có danh mục "${r.cat || ''}"`)
    const cids = (r.colors || '').split('|').map((x) => x.trim()).filter(Boolean).map((n) => { const c = colors.find((x) => norm(x.name) === norm(n)); if (!c) warn.push(`bỏ màu "${n}"`); return c?.id }).filter(Boolean)
    const imgs = (r.images || '').split('|').map((x) => x.trim()).filter(Boolean).map((u) => { const s = safeUrl(u); if (!s) warn.push('bỏ link ảnh sai'); return s }).filter(Boolean).slice(0, 8)
    const slug = slugify(r.slug || r.name), dup = products.find((p) => norm(p.name) === norm(r.name) || (slug && p.slug === slug))
    const grams = Number(r.grams) || 0, material = ['PLA', 'PETG', 'ABS'].includes((r.material || '').toUpperCase()) ? r.material.toUpperCase() : 'PLA'
    const active = !['0', 'false', 'không', 'ẩn'].includes(norm(r.active))
    const p = { name: r.name, slug, category: cat?.id, price, stock: Math.round(stock), desc: r.desc || '', grams, material, images: imgs, image: imgs[0] || '', colorIds: cids, active, hot: false, hue: 'from-accent to-amber-400' }
    return { line: r.line, p, errs, warn, dup, action: errs.length ? 'lỗi' : dup ? (update ? 'cập nhật' : 'bỏ qua (trùng)') : 'thêm mới' }
  }), [rows, cats, colors, products, update])

  const ok = parsed.filter((x) => x.action === 'thêm mới' || x.action === 'cập nhật')
  const run = () => {
    setProducts((cur) => {
      let out = [...cur]; const used = new Set(out.map((p) => p.slug))
      for (const x of ok) {
        if (x.dup) { out = out.map((p) => (p.id === x.dup.id ? { ...p, ...x.p, slug: p.slug || x.p.slug, hot: p.hot, hue: p.hue } : p)); continue }
        let slug = x.p.slug || 'san-pham', n = 2; while (used.has(slug)) slug = `${x.p.slug}-${n++}`
        used.add(slug); out = [{ ...x.p, slug, id: uid('sp') }, ...out]
      }
      return out
    })
    alert(`Đã nhập ${ok.length} sản phẩm.`); onClose()
  }
  const template = () => downloadCSV('mau-nhap-san-pham.csv', [HEADERS, ['Móc khóa tên Alex', cats[0]?.label || 'Móc khóa', 39000, 20, 'Móc khóa in tên theo yêu cầu', 12, 'PLA', 'https://example.com/anh1.jpg|https://example.com/anh2.jpg', colors[0]?.name || 'Đen', '', 1]])
  return (
    <Modal title="Nhập sản phẩm từ CSV" onClose={onClose} wide>
      <div className="space-y-4 text-sm">
        <p className="text-zinc-400">Cột bắt buộc: <b>Tên</b>, <b>Giá</b>, <b>Danh mục</b> (đúng tên hoặc mã danh mục đã có). Ảnh nhập bằng link; ảnh từ máy hãy thêm sau bằng nút Sửa. <button onClick={template} className="text-accent underline">Tải file mẫu</button></p>
        <input type="file" accept=".csv,text/csv" onChange={load} className="block w-full text-zinc-300 file:mr-3 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-white" />
        {fileErr && <p className="text-red-400">{fileErr}</p>}
        {rows && (
          <>
            <label className="flex items-center gap-2 text-zinc-300"><input type="checkbox" checked={update} onChange={(e) => setUpdate(e.target.checked)} className="accent-orange-500" />Cập nhật luôn sản phẩm trùng tên/slug (không chọn = bỏ qua dòng trùng)</label>
            <div className="max-h-72 overflow-auto rounded-lg border border-white/10">
              <table className="w-full text-left text-xs"><thead className="sticky top-0 bg-ink-800 text-zinc-400"><tr><th className="p-2">Dòng</th><th className="p-2">Tên</th><th className="p-2">Giá</th><th className="p-2">Kết quả</th></tr></thead>
                <tbody>{parsed.map((x) => (
                  <tr key={x.line} className="border-t border-white/5"><td className="p-2">{x.line}</td><td className="p-2 text-white">{x.p.name || '—'}</td><td className="p-2">{Number.isFinite(x.p.price) ? x.p.price.toLocaleString('vi-VN') : '—'}</td>
                    <td className={`p-2 ${x.errs.length ? 'text-red-400' : x.action.startsWith('bỏ') ? 'text-zinc-500' : 'text-emerald-400'}`}>{x.action}{x.errs.length > 0 && `: ${x.errs.join(', ')}`}{x.warn.length > 0 && <span className="text-amber-300"> ({[...new Set(x.warn)].join(', ')})</span>}</td></tr>))}</tbody></table>
            </div>
          </>)}
        <div className="flex items-center justify-end gap-2"><span className="mr-auto text-zinc-500">{rows ? `${ok.length}/${parsed.length} dòng sẽ được nhập` : ''}</span>
          <button onClick={onClose} className={btn2}>Hủy</button><button disabled={!ok.length} onClick={run} className={btn}>Nhập {ok.length || ''} sản phẩm</button></div>
      </div>
    </Modal>
  )
}

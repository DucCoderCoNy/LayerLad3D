import { useState } from 'react'
import { CheckCircle2, Upload } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { formatVND } from '../data/products.js'
import { supa, uid, useStore } from '../lib/store.js'
import { Field, btn, inp } from '../components/ui.jsx'

const DENSITY = { PLA: 1.24, PETG: 1.27 } // g/cm³
const COLORS = ['Trắng', 'Đen', 'Đỏ', 'Xanh dương', 'Xanh lá', 'Custom']

/** Tính thể tích (cm³) từ file STL nhị phân bằng tổng thể tích tứ diện có dấu. ASCII/OBJ trả về null -> nhập gram thủ công */
async function stlVolume(file) {
  if (!file.name.toLowerCase().endsWith('.stl')) return null
  const buf = await file.arrayBuffer(), dv = new DataView(buf), n = dv.getUint32(80, true)
  if (buf.byteLength !== 84 + n * 50) return null
  let v = 0
  for (let t = 0; t < n; t++) {
    const o = 84 + t * 50 + 12
    const [x1, y1, z1, x2, y2, z2, x3, y3, z3] = [0, 1, 2, 3, 4, 5, 6, 7, 8].map((k) => dv.getFloat32(o + k * 4, true))
    v += x1 * (y2 * z3 - z2 * y3) + y1 * (z2 * x3 - x2 * z3) + z1 * (x2 * y3 - y2 * x3)
  }
  return Math.abs(v) / 6 / 1000
}

export default function Custom() {
  const { user } = useAuth()
  const [st] = useStore('settings')
  const [, setReqs] = useStore('requests')
  const [file, setFile] = useState(null), [vol, setVol] = useState(null), [manual, setManual] = useState(20)
  const [f, setF] = useState({ material: 'PLA', color: 'Trắng', infill: 20, qty: 1, design: false, name: user?.name || '', phone: user?.phone || '', email: user?.email || '', note: '' })
  const [sent, setSent] = useState(null), [err, setErr] = useState('')
  const set = (k, v) => setF((c) => ({ ...c, [k]: v }))

  const onFile = async (e) => {
    const x = e.target.files[0]; if (!x) return
    if (!/\.(stl|obj)$/i.test(x.name)) return setErr('Chỉ nhận file .STL hoặc .OBJ')
    if (x.size > 50 * 1024 * 1024) return setErr('File tối đa 50MB')
    setErr(''); setFile(x); setVol(await stlVolume(x))
  }
  // Ước tính: gram = thể tích × tỷ trọng × hệ số đặc (vỏ + infill); thời gian ≈ gram / 10 g/giờ
  const fill = 0.35 + 0.65 * (f.infill / 100)
  const grams = (vol != null ? vol * DENSITY[f.material] * fill : manual) * f.qty
  const hours = grams / 10
  const costG = grams * st.pricePerGram, costT = hours * st.pricePerHour, costD = f.design ? st.designFee : 0
  const total = Math.round((costG + costT + costD) / 1000) * 1000

  const submit = async (e) => {
    e.preventDefault()
    if (!file && !f.design) return setErr('Hãy tải file hoặc chọn "cần hỗ trợ thiết kế"')
    const id = 'YC' + Date.now().toString().slice(-6)
    let filePath = ''
    if (file && supa) { // lưu file thật lên Supabase Storage để admin tải về in
      const path = `${id}/${file.name.replace(/[^\w.-]/g, '_')}`
      const { error } = await supa.storage.from('stl-files').upload(path, file)
      if (error) return setErr('Tải file lên thất bại: ' + error.message)
      filePath = path
    }
    setReqs((c) => [{ id, userId: user?.id || null, fileName: file?.name || '(chưa có file)', filePath, ...f, grams: Math.round(grams), hours: +hours.toFixed(1), estimate: total, quote: null, adminNote: '', status: 'pending', createdAt: Date.now() }, ...c])
    setSent(id)
  }
  if (sent) return (
    <div className="mx-auto max-w-lg px-5 py-24 text-center"><CheckCircle2 className="mx-auto text-neon" size={56} />
      <h1 className="mt-4 font-display text-3xl font-bold text-white">Đã gửi yêu cầu {sent}</h1>
      <p className="mt-2 text-zinc-400">Bên mình sẽ kiểm tra file và báo giá chính thức qua số điện thoại/email bạn để lại.</p></div>
  )
  return (
    <form onSubmit={submit} className="mx-auto max-w-6xl px-5 py-12">
      <h1 className="font-display text-4xl font-bold text-white">In 3D theo yêu cầu</h1>
      <p className="mt-2 text-zinc-400">Tải file STL/OBJ, chọn thông số và nhận giá ước tính ngay.</p>
      <div className="mt-8 grid gap-8 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-3">
          <label className="flex cursor-pointer flex-col items-center rounded-2xl border-2 border-dashed border-white/20 p-8 text-center hover:border-accent">
            <Upload className="text-accent" size={32} />
            <span className="mt-2 font-medium text-white">{file ? file.name : 'Bấm để chọn file .STL hoặc .OBJ'}</span>
            {file && <span className="text-sm text-zinc-500">{(file.size / 1048576).toFixed(2)} MB{vol != null && ` · thể tích ${vol.toFixed(1)} cm³`}</span>}
            <input type="file" accept=".stl,.obj" onChange={onFile} className="hidden" />
          </label>
          {file && vol == null && <Field label="Không đọc được thể tích tự động – nhập ước lượng gram nhựa (1 sản phẩm)"><input type="number" min="1" value={manual} onChange={(e) => setManual(+e.target.value || 1)} className={inp} /></Field>}
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Vật liệu"><select value={f.material} onChange={(e) => set('material', e.target.value)} className={inp}><option>PLA</option><option>PETG</option></select></Field>
            <Field label="Màu sắc"><select value={f.color} onChange={(e) => set('color', e.target.value)} className={inp}>{COLORS.map((c) => <option key={c}>{c}</option>)}</select></Field>
            <Field label="Số lượng"><input type="number" min="1" value={f.qty} onChange={(e) => set('qty', Math.max(1, +e.target.value))} className={inp} /></Field>
          </div>
          <Field label={`Độ đặc (infill): ${f.infill}%`}><input type="range" min="10" max="100" step="5" value={f.infill} onChange={(e) => set('infill', +e.target.value)} className="w-full accent-orange-500" /></Field>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.design} onChange={(e) => set('design', e.target.checked)} className="accent-orange-500" />Cần hỗ trợ thiết kế / chỉnh sửa file (+{formatVND(st.designFee)})</label>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Họ tên"><input required value={f.name} onChange={(e) => set('name', e.target.value)} className={inp} /></Field>
            <Field label="Số điện thoại"><input required value={f.phone} onChange={(e) => set('phone', e.target.value)} className={inp} /></Field>
            <Field label="Email"><input type="email" value={f.email} onChange={(e) => set('email', e.target.value)} className={inp} /></Field>
          </div>
          <Field label="Ghi chú thêm"><textarea rows={3} value={f.note} onChange={(e) => set('note', e.target.value)} className={inp} placeholder="Kích thước mong muốn, màu tùy chọn, thời hạn cần hàng…" /></Field>
        </div>
        <aside className="h-fit rounded-2xl border border-white/10 bg-ink-800 p-6 lg:col-span-2">
          <h2 className="font-semibold text-white">Bảng giá ước tính</h2>
          <table className="mt-4 w-full text-sm">
            <tbody className="[&_td]:py-2 [&_td:last-child]:text-right">
              <tr><td className="text-zinc-400">Nhựa {f.material}: {grams.toFixed(0)}g × {formatVND(st.pricePerGram)}</td><td>{formatVND(costG)}</td></tr>
              <tr><td className="text-zinc-400">Thời gian in: {hours.toFixed(1)}h × {formatVND(st.pricePerHour)}</td><td>{formatVND(costT)}</td></tr>
              <tr><td className="text-zinc-400">Phí thiết kế / chỉnh file</td><td>{formatVND(costD)}</td></tr>
              <tr className="border-t border-white/10 text-lg font-bold"><td className="pt-3 text-white">Ước tính</td><td className="pt-3 text-accent">{formatVND(total)}</td></tr>
            </tbody>
          </table>
          <p className="mt-3 text-xs text-zinc-500">Đây là giá tham khảo. Giá chính thức được báo sau khi kiểm tra file và hướng in.</p>
          {err && <p className="mt-3 text-sm text-red-400">{err}</p>}
          <button className={`${btn} mt-4 w-full`}>Gửi yêu cầu báo giá</button>
        </aside>
      </div>
    </form>
  )
}

import { useEffect, useRef, useState } from 'react'
import { FileUp } from 'lucide-react'
import { useCart } from '../context/CartContext.jsx'
import { formatVND } from '../data/products.js'
import { supa, useStore } from '../lib/store.js'
import { LAYER_HEIGHTS, analyzeMesh, estimatePrint } from '../lib/mesh.js'
import { useTitle } from '../lib/seo.js'
import { Field, btn, inp } from '../components/ui.jsx'

const MAX = 50 * 1024 * 1024
const MULT = { PLA: 1, PETG: 1.1, ABS: 1.2 }, LMULT = { '0.12': 1.3, '0.16': 1.15, '0.2': 1, '0.28': 0.85 } // khớp mặc định trong place_order_v2
const token = () => Array.from(crypto.getRandomValues(new Uint8Array(9)), (b) => (b % 36).toString(36)).join('')

/** In theo yêu cầu: tải STL/3MF -> đọc thể tích -> ước tính gram/giờ/giá -> thêm vào giỏ hàng. File lưu ở Supabase Storage (bucket stl-files) và gắn vào đơn khi đặt hàng. */
export default function CustomRel() {
  useTitle('In 3D theo yêu cầu', 'Tải file STL/3MF, chọn vật liệu, màu, độ dày lớp và nhận giá ước tính ngay.')
  const { addConfigured } = useCart(), [st] = useStore('settings'), [colors] = useStore('colors')
  const colorList = colors.filter((c) => c.active !== false), input = useRef()
  const [file, setFile] = useState(null), [info, setInfo] = useState(null), [err, setErr] = useState(''), [busy, setBusy] = useState(false), [uploaded, setUploaded] = useState(null)
  const [f, setF] = useState({ material: 'PLA', color: '', layer: '0.2', infill: 20, qty: 1, note: '', design: false, mGrams: 20, mHours: 2 })
  const set = (k, v) => setF((c) => ({ ...c, [k]: v }))
  useEffect(() => { if (!f.color && colorList[0]) set('color', colorList[0].name) }, [colorList.length]) // eslint-disable-line react-hooks/exhaustive-deps

  const onFile = async (e) => {
    const x = e.target.files[0]; if (!x) return
    setErr(''); setInfo(null); setUploaded(null); setFile(null)
    if (!/\.(stl|3mf)$/i.test(x.name)) return setErr('Chỉ nhận file .STL hoặc .3MF')
    if (x.size > MAX) return setErr('File quá lớn (tối đa 50MB)')
    setFile(x); setBusy(true)
    try { setInfo(await analyzeMesh(await x.arrayBuffer(), x.name)) } catch (ex) { setErr(ex.message + '. Bạn vẫn có thể gửi file, nhập gram/giờ in dự kiến ở bên dưới để có giá tham khảo.') }
    setBusy(false)
  }
  const est = info ? estimatePrint({ volumeCm3: info.volumeCm3, material: f.material, infill: +f.infill, layerHeight: f.layer }) : { grams: Math.max(1, +f.mGrams || 1), hours: Math.max(0, +f.mHours || 0) }
  const raw = est.grams * (st.pricePerGram || 1500) * MULT[f.material] + est.hours * (st.pricePerHour || 8000) * LMULT[f.layer] + (f.design ? st.designFee || 50000 : 0)
  const price = Math.max(Math.round(raw / 1000) * 1000, st.minCustomPrice || 0)
  const canAdd = (file || f.design) && !busy

  const add = async () => {
    setErr(''); setBusy(true)
    try {
      let path = uploaded
      if (file && !path) {
        const safe = file.name.replace(/[^A-Za-z0-9._-]/g, '_').slice(-100)
        path = `${token()}/${safe}`
        const { error } = await supa.storage.from('stl-files').upload(path, file, { contentType: 'application/octet-stream' })
        if (error) throw new Error('Tải file lên thất bại: ' + error.message)
        setUploaded(path)
      }
      addConfigured({
        id: 'cfg-custom', name: `In theo yêu cầu: ${file?.name || 'cần thiết kế'} (${f.material})`, price, hue: 'from-neon to-cyan-500',
        color: `${f.material} · ${f.color} · ${f.layer}mm · infill ${f.infill}%`,
        cfg: { material: f.material, color: f.color, layer_height: f.layer, infill: +f.infill, grams: est.grams, hours: est.hours, design: f.design, note: f.note, file_path: path || null, file_name: file?.name || '' },
      }, f.qty)
    } catch (ex) { setErr(ex.message) }
    setBusy(false)
  }

  return (
    <div className="mx-auto max-w-5xl px-5 py-12">
      <h1 className="font-display text-4xl font-bold text-white">In 3D theo yêu cầu</h1>
      <p className="mt-2 text-zinc-400">Tải file, chọn thông số, thêm vào giỏ hàng. Giá chỉ là <b className="text-white">ước tính</b>; LayerLab 3D sẽ xác nhận lại sau khi kiểm tra file.</p>
      <div className="mt-8 grid gap-8 lg:grid-cols-5">
        <div className="space-y-5 lg:col-span-3">
          <button type="button" onClick={() => input.current.click()} className="flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-white/20 bg-ink-800 p-8 text-zinc-400 hover:border-accent">
            <FileUp size={32} className="text-accent" />{file ? <b className="text-white">{file.name}</b> : 'Bấm để chọn file .STL hoặc .3MF (tối đa 50MB)'}
          </button>
          <input ref={input} type="file" accept=".stl,.3mf" onChange={onFile} className="hidden" />
          {info && (
            <div className="grid grid-cols-2 gap-3 rounded-xl border border-white/10 bg-ink-800 p-4 text-sm sm:grid-cols-4">
              <div><p className="text-zinc-500">Định dạng</p><b className="text-white">{info.format}</b></div>
              <div><p className="text-zinc-500">Thể tích</p><b className="text-white">{info.volumeCm3.toFixed(2)} cm³</b></div>
              <div><p className="text-zinc-500">Kích thước</p><b className="text-white">{info.size ? info.size.map((v) => Math.round(v)).join('×') + ' mm' : '—'}</b></div>
              <div><p className="text-zinc-500">Số tam giác</p><b className="text-white">{info.triangles.toLocaleString('vi-VN')}</b></div>
            </div>)}
          {busy && !uploaded && <p className="text-sm text-zinc-400">Đang xử lý…</p>}
          {err && <p className="text-sm text-amber-400">{err}</p>}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Vật liệu"><select value={f.material} onChange={(e) => set('material', e.target.value)} className={inp}><option>PLA</option><option>PETG</option><option value="ABS">ABS (xưởng sẽ xác nhận khả năng in)</option></select></Field>
            <Field label="Màu"><select value={f.color} onChange={(e) => set('color', e.target.value)} className={inp}>{colorList.map((c) => <option key={c.id}>{c.name}</option>)}</select></Field>
            <Field label="Độ dày lớp (layer height)"><select value={f.layer} onChange={(e) => set('layer', e.target.value)} className={inp}>{LAYER_HEIGHTS.map((h) => <option key={h} value={h}>{h} mm{h === '0.2' ? ' (chuẩn)' : h === '0.12' ? ' (mịn, lâu hơn)' : h === '0.28' ? ' (nhanh)' : ''}</option>)}</select></Field>
            <Field label={`Infill (độ đặc): ${f.infill}%`}><input type="range" min="10" max="100" step="5" value={f.infill} onChange={(e) => set('infill', e.target.value)} className="w-full accent-orange-500" /></Field>
            <Field label="Số lượng"><input type="number" min="1" max="99" value={f.qty} onChange={(e) => set('qty', Math.min(99, Math.max(1, +e.target.value || 1)))} className={inp} /></Field>
            <label className="flex items-center gap-2 pt-6 text-sm"><input type="checkbox" checked={f.design} onChange={(e) => set('design', e.target.checked)} className="accent-orange-500" />Cần hỗ trợ thiết kế/chỉnh file (+{formatVND(st.designFee || 50000)})</label>
          </div>
          {!info && (
            <div className="grid grid-cols-2 gap-4 rounded-xl border border-white/10 p-4">
              <Field label="Gram nhựa dự kiến / sản phẩm"><input type="number" min="1" value={f.mGrams} onChange={(e) => set('mGrams', e.target.value)} className={inp} /></Field>
              <Field label="Giờ in dự kiến / sản phẩm"><input type="number" min="0" step="0.5" value={f.mHours} onChange={(e) => set('mHours', e.target.value)} className={inp} /></Field>
              <p className="col-span-2 text-xs text-zinc-500">Chưa đọc được file nên nhập tay. Không rõ thì cứ để mặc định, xưởng sẽ báo lại giá chính xác.</p>
            </div>)}
          <Field label="Ghi chú cho xưởng"><textarea rows={3} value={f.note} onChange={(e) => set('note', e.target.value)} maxLength={500} className={inp} placeholder="Mục đích sử dụng, yêu cầu về màu, độ bền…" /></Field>
        </div>
        <aside className="h-fit space-y-3 rounded-2xl border border-white/10 bg-ink-800 p-5 lg:col-span-2">
          <h2 className="font-display text-xl font-bold text-white">Giá ước tính</h2>
          <dl className="space-y-1 text-sm text-zinc-400">
            <div className="flex justify-between"><dt>Khối lượng ước tính</dt><dd className="text-white">{est.grams} g / sản phẩm</dd></div>
            <div className="flex justify-between"><dt>Thời gian in ước tính</dt><dd className="text-white">~{est.hours} giờ / sản phẩm</dd></div>
            <div className="flex justify-between"><dt>Đơn giá</dt><dd className="text-white">{formatVND(price)}</dd></div>
          </dl>
          <p className="border-t border-white/10 pt-3 font-display text-3xl font-bold text-accent">{formatVND(price * f.qty)}</p>
          <button disabled={!canAdd} onClick={add} className={`${btn} w-full`}>{busy ? 'Đang tải file…' : 'Thêm vào giỏ hàng'}</button>
          <p className="text-xs leading-relaxed text-zinc-500">Khối lượng và thời gian chỉ là ước tính từ thể tích file. Giá cuối cùng do LayerLab 3D xác nhận sau khi kiểm tra file (mô hình lỗi, cần support, nhiều chi tiết…). Chúng tôi sẽ liên hệ trước khi in nếu giá chênh lệch đáng kể.</p>
        </aside>
      </div>
    </div>
  )
}

import { useMemo, useRef, useState } from 'react'
import { AlertTriangle, FileBox, Loader2, ShoppingCart, Upload } from 'lucide-react'
import { formatVND } from '../data/products.js'
import { CUSTOM_COLOR } from '../data/colors.js'
import { supa, uid, useStore } from '../lib/store.js'
import { analyzeModel, safeName } from '../lib/model3d.js'
import { INFILLS, LAYERS, MATERIALS, MAX_QTY, estimateOne, unitPrice } from '../lib/printCalc.js'
import { useCart } from '../context/CartContext.jsx'
import { Field, btn, btn2, inp } from '../components/ui.jsx'
import { useTitle } from '../lib/seo.js'

/** In theo yêu cầu: tải STL/3MF → tự đọc thể tích/kích thước → ước tính khối lượng, giờ in, giá → thêm vào giỏ → đặt hàng cùng sản phẩm khác.
 *  File chỉ được tải lên Supabase Storage khi bấm "Thêm vào giỏ" (không tải khi chỉ xem thử giá). */
export default function Custom() {
  useTitle('In 3D theo yêu cầu', 'Tải file STL/3MF, chọn vật liệu PLA/PETG/ABS, màu, layer height và nhận giá ước tính ngay.')
  const [st] = useStore('settings'), [colors] = useStore('colors')
  const { addConfigured } = useCart()
  const palette = useMemo(() => colors.filter((c) => c.active).sort((a, b) => (a.sort || 0) - (b.sort || 0)), [colors])
  const [file, setFile] = useState(null), [model, setModel] = useState(null), [busy, setBusy] = useState(false), [err, setErr] = useState(''), [done, setDone] = useState(false)
  const [manual, setManual] = useState({ grams: 30, hours: 3 })
  const [f, setF] = useState({ material: 'PLA', color: '', layer: '0.2', infill: 20, qty: 1, design: false, note: '' })
  const inputRef = useRef(null)
  const set = (k, v) => setF((c) => ({ ...c, [k]: v }))
  const color = f.color || palette[0]?.name || CUSTOM_COLOR

  const onFile = async (e) => {
    const x = e.target.files?.[0]; if (!x) return
    setErr(''); setModel(null); setFile(null); setDone(false); setBusy(true)
    try { const m = await analyzeModel(x); setModel(m); setFile(x) }
    catch (ex) { setErr(ex.message || 'Không đọc được file'); if (/Chỉ nhận|quá lớn|rỗng|không hợp lệ/.test(ex.message)) { e.target.value = '' } else setFile(x) } // lỗi đọc thể tích: vẫn cho nhập tay
    setBusy(false)
  }

  // Ước tính: có model → từ thể tích; không đọc được → khách nhập gram/giờ thủ công (vẫn là ước tính)
  const one = useMemo(() => model ? estimateOne(model, f) : { grams: Math.max(1, +manual.grams || 1), hours: Math.max(0.25, +manual.hours || 0.25) }, [model, f.material, f.layer, f.infill, manual])
  const calc = unitPrice({ ...f, ...one }, st), total = calc.price * f.qty

  const add = async () => {
    setErr('')
    if (!file && !f.design) return setErr('Hãy tải file STL/3MF hoặc chọn "cần hỗ trợ thiết kế"')
    setBusy(true)
    try {
      let path = ''
      if (file && supa) { // thư mục ngẫu nhiên + tên đã làm sạch; chính sách Storage chỉ cho phép đúng dạng này, đuôi .stl/.3mf
        path = `${uid('s').replace('-', '')}${Date.now().toString(36)}/${safeName(file.name)}`
        const { error } = await supa.storage.from('stl-files').upload(path, file, { contentType: 'application/octet-stream', upsert: false })
        if (error) throw new Error('Tải file lên thất bại: ' + error.message)
      }
      addConfigured({
        id: 'cfg-print', name: `In theo yêu cầu: ${file?.name || '(chưa có file)'}`, price: calc.price, color, hue: 'from-neon to-cyan-500',
        cfg: { material: f.material, layer: f.layer, infill: f.infill, grams: one.grams, hours: one.hours, design: f.design, note: f.note.slice(0, 500), fileName: file?.name || '', filePath: path, fileSize: file?.size || 0, volumeCm3: model ? +model.volumeCm3.toFixed(2) : 0, dims: model ? model.dims.map((d) => +d.toFixed(1)) : [], estimate: true },
      }, f.qty)
      setDone(true)
    } catch (ex) { setErr(ex.message) }
    setBusy(false)
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-12">
      <h1 className="font-display text-4xl font-bold text-white">In 3D theo yêu cầu</h1>
      <p className="mt-2 text-zinc-400">Tải file STL/3MF, chọn thông số và nhận giá ước tính ngay. Thêm vào giỏ hàng để đặt cùng các sản phẩm khác.</p>
      <div className="mt-8 grid gap-8 lg:grid-cols-5">
        <div className="space-y-5 lg:col-span-3">
          <label className="flex cursor-pointer flex-col items-center rounded-2xl border-2 border-dashed border-white/20 p-8 text-center hover:border-accent">
            {busy && !file ? <Loader2 className="animate-spin text-accent" size={32} /> : <Upload className="text-accent" size={32} />}
            <span className="mt-2 font-medium text-white">{file ? file.name : 'Bấm để chọn file .STL hoặc .3MF (tối đa 50 MB)'}</span>
            <input ref={inputRef} type="file" accept=".stl,.3mf" onChange={onFile} className="hidden" />
          </label>

          {model && (
            <div className="grid grid-cols-2 gap-3 rounded-2xl border border-white/10 bg-ink-800 p-4 text-sm sm:grid-cols-4">
              <Info l="Loại file" v={model.kind.toUpperCase()} icon /><Info l="Dung lượng" v={`${(file.size / 1048576).toFixed(2)} MB`} />
              <Info l="Kích thước (mm)" v={model.dims.map((d) => d.toFixed(0)).join(' × ')} /><Info l="Thể tích" v={`${model.volumeCm3.toFixed(1)} cm³`} />
              <Info l="Số tam giác" v={model.triangles.toLocaleString('vi-VN')} /><Info l="Khối lượng ước tính" v={`${one.grams} g / sp`} /><Info l="Thời gian in ước tính" v={`~${one.hours} giờ / sp`} />
              {model.dims.some((d) => d > 220) && <p className="col-span-full flex gap-2 text-amber-300"><AlertTriangle size={16} className="mt-0.5 shrink-0" />Mô hình lớn hơn 220 mm ở một cạnh – có thể phải chia nhỏ để in; LayerLab sẽ liên hệ xác nhận.</p>}
              {model.warnings.map((w) => <p key={w} className="col-span-full flex gap-2 text-amber-300"><AlertTriangle size={16} className="mt-0.5 shrink-0" />{w}</p>)}
            </div>)}
          {file && !model && (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
              <p>Không đọc tự động được thể tích file này. Bạn có thể nhập khối lượng/thời gian ước lượng, LayerLab sẽ kiểm tra lại file và báo giá chính xác.</p>
              <div className="mt-3 grid grid-cols-2 gap-3"><Field label="Khối lượng (gram / sản phẩm)"><input type="number" min="1" max="5000" value={manual.grams} onChange={(e) => setManual({ ...manual, grams: e.target.value })} className={inp} /></Field>
                <Field label="Giờ in (giờ / sản phẩm)"><input type="number" min="0.25" step="0.25" max="500" value={manual.hours} onChange={(e) => setManual({ ...manual, hours: e.target.value })} className={inp} /></Field></div>
            </div>)}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Vật liệu"><select value={f.material} onChange={(e) => set('material', e.target.value)} className={inp}>{Object.keys(MATERIALS).map((m) => <option key={m}>{m}</option>)}</select></Field>
            <Field label="Số lượng"><input type="number" min="1" max={MAX_QTY} value={f.qty} onChange={(e) => set('qty', Math.min(MAX_QTY, Math.max(1, +e.target.value || 1)))} className={inp} /></Field>
            <Field label="Layer height (độ mịn)"><select value={f.layer} onChange={(e) => set('layer', e.target.value)} className={inp}>{LAYERS.map((l) => <option key={l.v} value={l.v}>{l.label}</option>)}</select></Field>
            <Field label="Infill (độ đặc)"><select value={f.infill} onChange={(e) => set('infill', +e.target.value)} className={inp}>{INFILLS.map((i) => <option key={i} value={i}>{i}%</option>)}</select></Field>
          </div>
          <p className="-mt-2 text-xs text-zinc-500">{MATERIALS[f.material].note}</p>

          <fieldset>
            <legend className="mb-2 text-sm text-zinc-400">Màu sắc: <b className="text-white">{color}</b></legend>
            <div className="flex flex-wrap gap-2">
              {palette.map((c) => <button type="button" key={c.id} title={c.name} aria-label={c.name} onClick={() => set('color', c.name)} className={`h-9 w-9 rounded-full border-2 ${color === c.name ? 'border-accent ring-2 ring-accent/40' : 'border-white/20'}`} style={{ background: c.hex }} />)}
              <button type="button" onClick={() => set('color', CUSTOM_COLOR)} className={`rounded-full border-2 px-3 text-xs ${color === CUSTOM_COLOR ? 'border-accent text-accent' : 'border-white/20 text-zinc-400'}`}>Màu khác</button>
            </div>
            {color === CUSTOM_COLOR && <p className="mt-2 text-xs text-zinc-500">Ghi rõ màu mong muốn ở ô ghi chú bên dưới.</p>}
          </fieldset>

          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.design} onChange={(e) => set('design', e.target.checked)} className="accent-orange-500" />Cần hỗ trợ thiết kế / chỉnh sửa file (+{formatVND(st.designFee)})</label>
          <Field label="Ghi chú cho LayerLab 3D"><textarea rows={3} maxLength={500} value={f.note} onChange={(e) => set('note', e.target.value)} className={inp} placeholder="Hướng đặt mô hình, màu từng phần, thời hạn cần hàng…" /></Field>
        </div>

        <aside className="h-fit space-y-4 rounded-2xl border border-white/10 bg-ink-800 p-6 lg:sticky lg:top-24 lg:col-span-2">
          <h2 className="font-semibold text-white">Giá ước tính</h2>
          <table className="w-full text-sm"><tbody className="[&_td]:py-2 [&_td:last-child]:text-right">
            <tr><td className="text-zinc-400">Nhựa {f.material}: {one.grams} g × {formatVND(st.pricePerGram)}</td><td>{formatVND(calc.byGrams)}</td></tr>
            <tr><td className="text-zinc-400">Máy in: ~{one.hours} giờ × {formatVND(st.pricePerHour)}</td><td>{formatVND(calc.byHours)}</td></tr>
            {f.design && <tr><td className="text-zinc-400">Hỗ trợ thiết kế</td><td>{formatVND(calc.design)}</td></tr>}
            <tr><td className="text-zinc-400">Giá / sản phẩm (làm tròn)</td><td>{formatVND(calc.price)}</td></tr>
            <tr className="border-t border-white/10 text-lg font-bold"><td className="pt-3 text-white">× {f.qty} = Ước tính</td><td className="pt-3 text-accent">{formatVND(total)}</td></tr>
          </tbody></table>
          <p className="rounded-lg bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-200">Đây chỉ là <b>giá ước tính</b> dựa trên thể tích mô hình. LayerLab 3D có thể xác nhận lại giá và khả năng in sau khi kiểm tra file; nếu chênh lệch đáng kể, bên mình sẽ liên hệ trước khi in.</p>
          {err && <p className="text-sm text-red-400">{err}</p>}
          {done ? (
            <div className="space-y-2 rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-300">Đã thêm vào giỏ hàng.
              <div className="flex gap-2"><button type="button" onClick={() => { setDone(false); setFile(null); setModel(null); if (inputRef.current) inputRef.current.value = '' }} className={btn2}>In file khác</button></div></div>
          ) : <button type="button" disabled={busy || (!file && !f.design)} onClick={add} className={`${btn} flex w-full items-center justify-center gap-2`}>{busy ? <Loader2 size={16} className="animate-spin" /> : <ShoppingCart size={16} />}Thêm vào giỏ hàng</button>}
        </aside>
      </div>
    </div>
  )
}
const Info = ({ l, v, icon }) => <div><p className="text-xs text-zinc-500">{l}</p><p className="flex items-center gap-1 font-medium text-white">{icon && <FileBox size={14} className="text-accent" />}{v}</p></div>

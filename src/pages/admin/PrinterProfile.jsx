import { useMemo, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { formatVND } from '../../data/products.js'
import { uid, useStore } from '../../lib/store.js'
import { uploadImage } from '../../lib/upload.js'
import { isDone, num, printerOf, today } from '../../lib/workshop.js'
import { maintStatus, printerHours } from '../../lib/workshopTools.js'
import { Field, Modal, btn, btn2, inp } from '../../components/ui.jsx'

export const PRINTER_STATUS = { idle: ['Sẵn sàng', 'text-emerald-300'], printing: ['Đang in', 'text-accent'], maintenance: ['Bảo trì', 'text-amber-300'], offline: ['Tắt / hỏng', 'text-zinc-500'] }
export const MAT_LIST = ['PLA', 'PETG', 'ABS', 'ASA', 'TPU', 'PA (Nylon)', 'PC']
export const MAINT_TYPES = ['Định kỳ', 'Vệ sinh', 'Thay linh kiện', 'Sửa chữa', 'Hiệu chuẩn / cân bàn', 'Nâng cấp', 'Khác']
export const EMPTY_PRINTER = { name: '', brand: '', model: '', serial: '', location: '', image: '', status: 'idle', active: true, buildX: '', buildY: '', buildZ: '', nozzle: '0.4', maxNozzle: '', maxBed: '', maxSpeed: '', power: '', firmware: '', enclosed: false, materials: ['PLA', 'PETG'], purchaseDate: '', purchasePrice: '', purchaseFrom: '', warrantyUntil: '', maintEvery: 100, maintEveryDays: 0, extra: [], note: '' }
const SPEC_KEYS = Object.keys(EMPTY_PRINTER)
const dmy = (d) => (d ? d.split('-').reverse().join('/') : '—')

/** Hồ sơ máy in (3 tab): Thông số & mua sắm · Bảo dưỡng / sửa chữa · Lịch sử in. Dữ liệu lưu cùng bản ghi máy in, không cần cấu hình thêm. */
export default function PrinterProfile({ printerId, onClose, initialTab = 'spec', openHours = false }) {
  const [printers, setPrinters] = useStore('printers'), [wo] = useStore('wo'), [wlog] = useStore('wlog'), [, setCash] = useStore('wc')
  const saved = printers.find((p) => p.id === printerId)
  const [id, setId] = useState(printerId), cur = printers.find((p) => p.id === id) || saved
  const [d, setD] = useState(() => ({ ...EMPTY_PRINTER, ...(saved || {}) })), [tab, setTab] = useState(printerId ? initialTab : 'spec'), [busy, setBusy] = useState(false), [err, setErr] = useState(''), [ok, setOk] = useState('')
  const set = (k, v) => { setOk(''); setD((c) => ({ ...c, [k]: v })) }
  const hours = cur ? printerHours(cur, wo, wlog, printers) : 0, ms = cur ? maintStatus(cur, hours) : null

  const save = () => {
    if (!d.name.trim()) return setErr('Nhập tên máy')
    setErr('')
    const spec = Object.fromEntries(SPEC_KEYS.map((k) => [k, d[k]]))
    spec.name = d.name.trim(); spec.extra = (d.extra || []).filter((x) => x.k.trim())
    if (id) setPrinters((c) => c.map((p) => (p.id === id ? { ...p, ...spec } : p))) // giữ nguyên nhật ký bảo dưỡng
    else { const nid = uid('pr'); setPrinters((c) => [...c, { ...spec, id: nid, maint: [] }]); setId(nid) }
    setOk('Đã lưu thông số máy.')
  }
  const pickImage = async (e) => {
    const f = e.target.files?.[0]; e.target.value = ''; if (!f) return
    setBusy(true); setErr(''); try { set('image', await uploadImage(f, 'printers')) } catch (x) { setErr(x.message) } setBusy(false)
  }
  const del = () => {
    if (printers.length <= 1) return alert('Cần giữ lại ít nhất 1 máy in')
    if (confirm(`Xóa máy "${cur.name}" cùng toàn bộ lịch sử bảo dưỡng? Các đơn đang gán máy này sẽ chuyển về máy đầu tiên.`)) { setPrinters((c) => c.filter((p) => p.id !== id)); onClose() }
  }

  /* ---- Bảo dưỡng ---- */
  const blankM = () => ({ date: today(), type: MAINT_TYPES[0], title: '', detail: '', parts: '', cost: '', by: '', atHours: '', nextDate: '', rec: true }) // atHours trống = lấy tổng giờ hiện tại lúc bấm ghi
  const [m, setM] = useState(blankM)
  const addMaint = () => {
    if (!m.title.trim()) return setErr('Nhập tiêu đề bảo dưỡng')
    setErr('')
    const e = { id: uid('mt'), t: new Date(m.date + 'T12:00:00').getTime() || Date.now(), date: m.date, type: m.type, title: m.title.trim(), detail: m.detail.trim(), parts: m.parts.trim(), cost: num(m.cost), by: m.by.trim(), atHours: m.atHours === '' ? Math.round(hours * 10) / 10 : num(m.atHours), nextDate: m.nextDate }
    setPrinters((c) => c.map((p) => (p.id === id ? { ...p, skipMaintHours: 0, maint: [...(p.maint || []), e].slice(-200) } : p)))
    if (m.rec && e.cost > 0) setCash((c) => [...c, { id: uid('c'), date: e.date, type: 'out', cat: 'Bảo trì máy', amount: e.cost, note: `${cur.name}: ${e.title}` }])
    setM(blankM()); setOk('Đã ghi lịch sử bảo dưỡng.')
  }
  const delMaint = (e) => confirm(`Xóa bản ghi "${e.title || e.note}"? (không xóa khoản chi đã ghi vào Thu chi)`) && setPrinters((c) => c.map((p) => (p.id === id ? { ...p, maint: p.maint.filter((x) => x !== e && x.id !== e.id) } : p)))
  const log = useMemo(() => [...(cur?.maint || [])].sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.t || 0) - (a.t || 0)), [cur])
  const totalCost = log.reduce((t, e) => t + num(e.cost), 0)

  /* ---- Cập nhật tổng giờ in ---- */
  const [hEd, setHEd] = useState(openHours && printerId ? { total: '', skip: true, note: '' } : null)
  const startHEd = () => setHEd({ total: String(Math.round(hours * 10) / 10), skip: true, note: '' })
  const saveHours = () => {
    const to = num(hEd.total)
    if (!(to >= 0) || hEd.total === '') return setErr('Nhập tổng số giờ in (≥ 0)')
    const delta = Math.round((to - hours) * 100) / 100
    if (delta === 0) return setHEd(null)
    setErr('')
    setPrinters((c) => c.map((p) => (p.id === id ? { ...p, hoursAdjust: Math.round((num(p.hoursAdjust) + delta) * 100) / 100,
      skipMaintHours: hEd.skip && delta > 0 ? Math.round((num(p.skipMaintHours) + delta) * 100) / 100 : num(p.skipMaintHours),
      hoursLog: [...(p.hoursLog || []), { t: Date.now(), from: Math.round(hours * 10) / 10, to, note: hEd.note.trim() }].slice(-50) } : p)))
    setHEd(null); setOk(`Đã cập nhật tổng giờ in: ${hours.toFixed(1)}h → ${to}h.`)
  }

  /* ---- Lịch sử in ---- */
  const jobs = useMemo(() => (cur ? wo.filter((o) => printerOf(o, printers) === cur.id && ['Đang in', 'Hoàn thành', 'Đã giao'].includes(o.status)).sort((a, b) => (b.finishedAt || b.startedAt || 0) - (a.finishedAt || a.startedAt || 0)) : []), [cur, wo, printers])
  const jobStats = { n: jobs.filter(isDone).length, h: jobs.filter(isDone).reduce((t, o) => t + (num(o.hReal) || num(o.h)), 0), g: jobs.filter(isDone).reduce((t, o) => t + (num(o.gReal) || num(o.g)), 0) }

  const inWarranty = d.warrantyUntil && d.warrantyUntil >= today()
  const TabBtn = ({ k, l, off }) => <button disabled={off} onClick={() => { setTab(k); setErr(''); setOk('') }} className={`px-4 py-2 text-sm ${tab === k ? 'border-b-2 border-accent font-semibold text-white' : 'text-zinc-400 hover:text-white'} disabled:opacity-30`}>{l}</button>

  return (
    <Modal title={cur ? `Hồ sơ máy: ${cur.name}` : 'Thêm máy in'} onClose={onClose} wide>
      <div className="mb-4 flex border-b border-white/10"><TabBtn k="spec" l="Thông số" /><TabBtn k="maint" l={`Bảo dưỡng${cur?.maint?.length ? ` (${cur.maint.length})` : ''}`} off={!cur} /><TabBtn k="jobs" l="Lịch sử in" off={!cur} /></div>
      {!cur && <p className="mb-3 rounded-lg bg-ink-900 p-3 text-sm text-zinc-400">Điền thông tin rồi bấm Lưu. Sau khi lưu, bạn ghi được lịch sử bảo dưỡng và xem lịch sử in của máy.</p>}

      {tab === 'spec' && (
        <div className="space-y-5 text-sm">
          <div className="flex gap-4">
            <label className="grid h-28 w-28 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-xl border-2 border-dashed border-white/20 text-center text-xs text-zinc-400 hover:border-accent">
              {d.image ? <img src={d.image} alt={d.name} loading="lazy" className="h-full w-full object-cover" /> : busy ? 'Đang tải…' : '+ Ảnh máy'}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={pickImage} className="hidden" disabled={busy} /></label>
            <div className="grid flex-1 gap-3 sm:grid-cols-2">
              <Field label="Tên máy (hiển thị trong hệ thống)"><input value={d.name} onChange={(e) => set('name', e.target.value)} className={inp} /></Field>
              <Field label="Trạng thái"><select value={d.status === 'printing' ? 'idle' : d.status} onChange={(e) => set('status', e.target.value)} className={inp}>{Object.entries(PRINTER_STATUS).filter(([k]) => k !== 'printing').map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}</select></Field>
              <Field label="Hãng"><input value={d.brand} onChange={(e) => set('brand', e.target.value)} placeholder="Anycubic, Bambu Lab, Creality…" className={inp} /></Field>
              <Field label="Model"><input value={d.model} onChange={(e) => set('model', e.target.value)} className={inp} /></Field>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Số serial"><input value={d.serial} onChange={(e) => set('serial', e.target.value)} className={inp} /></Field>
            <Field label="Vị trí đặt máy"><input value={d.location} onChange={(e) => set('location', e.target.value)} placeholder="Phòng xưởng, kệ 2…" className={inp} /></Field>
            <label className="flex items-center gap-2 self-end pb-2 text-zinc-300"><input type="checkbox" checked={d.active} onChange={(e) => set('active', e.target.checked)} className="accent-orange-500" />Đang sử dụng</label>
          </div>

          <fieldset className="rounded-xl border border-white/10 p-4"><legend className="px-2 text-zinc-300">Thông số kỹ thuật</legend>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Vùng in X (mm)"><input type="number" min="0" value={d.buildX} onChange={(e) => set('buildX', e.target.value)} className={inp} /></Field>
              <Field label="Vùng in Y (mm)"><input type="number" min="0" value={d.buildY} onChange={(e) => set('buildY', e.target.value)} className={inp} /></Field>
              <Field label="Vùng in Z (mm)"><input type="number" min="0" value={d.buildZ} onChange={(e) => set('buildZ', e.target.value)} className={inp} /></Field>
              <Field label="Đường kính đầu phun (mm)"><input value={d.nozzle} onChange={(e) => set('nozzle', e.target.value)} className={inp} /></Field>
              <Field label="Nhiệt độ đầu phun tối đa (°C)"><input type="number" min="0" value={d.maxNozzle} onChange={(e) => set('maxNozzle', e.target.value)} className={inp} /></Field>
              <Field label="Nhiệt độ bàn tối đa (°C)"><input type="number" min="0" value={d.maxBed} onChange={(e) => set('maxBed', e.target.value)} className={inp} /></Field>
              <Field label="Tốc độ tối đa (mm/s)"><input type="number" min="0" value={d.maxSpeed} onChange={(e) => set('maxSpeed', e.target.value)} className={inp} /></Field>
              <Field label="Công suất (W)"><input type="number" min="0" value={d.power} onChange={(e) => set('power', e.target.value)} className={inp} /></Field>
              <Field label="Firmware"><input value={d.firmware} onChange={(e) => set('firmware', e.target.value)} className={inp} /></Field>
            </div>
            <label className="mt-3 flex items-center gap-2 text-zinc-300"><input type="checkbox" checked={d.enclosed} onChange={(e) => set('enclosed', e.target.checked)} className="accent-orange-500" />Có buồng kín (in ABS/ASA tốt hơn)</label>
            <p className="mb-1 mt-3 text-zinc-400">Vật liệu in được</p>
            <div className="flex flex-wrap gap-2">{MAT_LIST.map((x) => <label key={x} className={`cursor-pointer rounded-full border px-3 py-1 ${d.materials.includes(x) ? 'border-accent bg-accent/10 text-white' : 'border-white/10 text-zinc-400'}`}><input type="checkbox" className="hidden" checked={d.materials.includes(x)} onChange={() => set('materials', d.materials.includes(x) ? d.materials.filter((y) => y !== x) : [...d.materials, x])} />{x}</label>)}</div>
          </fieldset>

          <fieldset className="rounded-xl border border-white/10 p-4"><legend className="px-2 text-zinc-300">Mua sắm & bảo hành {d.warrantyUntil && <span className={inWarranty ? 'text-emerald-300' : 'text-red-300'}>· {inWarranty ? 'còn bảo hành' : 'hết bảo hành'}</span>}</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Ngày mua"><input type="date" value={d.purchaseDate} onChange={(e) => set('purchaseDate', e.target.value)} className={inp} /></Field>
              <Field label="Giá mua (₫)"><input type="number" min="0" step="1000" value={d.purchasePrice} onChange={(e) => set('purchasePrice', e.target.value)} className={inp} /></Field>
              <Field label="Nơi mua"><input value={d.purchaseFrom} onChange={(e) => set('purchaseFrom', e.target.value)} className={inp} /></Field>
              <Field label="Bảo hành đến ngày"><input type="date" value={d.warrantyUntil} onChange={(e) => set('warrantyUntil', e.target.value)} className={inp} /></Field>
            </div>
          </fieldset>

          <fieldset className="rounded-xl border border-white/10 p-4"><legend className="px-2 text-zinc-300">Nhắc bảo dưỡng</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Nhắc sau mỗi (giờ in) – 0 = tắt"><input type="number" min="0" max="5000" value={d.maintEvery} onChange={(e) => set('maintEvery', e.target.value === '' ? 100 : +e.target.value)} className={inp} /></Field>
              <Field label="Nhắc sau mỗi (ngày) – 0 = tắt"><input type="number" min="0" max="1000" value={d.maintEveryDays} onChange={(e) => set('maintEveryDays', +e.target.value || 0)} className={inp} /></Field>
            </div>
          </fieldset>

          <fieldset className="rounded-xl border border-white/10 p-4"><legend className="px-2 text-zinc-300">Thông số khác (tự thêm)</legend>
            {(d.extra || []).map((x, i) => (
              <div key={i} className="mb-2 flex gap-2"><input value={x.k} onChange={(e) => set('extra', d.extra.map((y, j) => (j === i ? { ...y, k: e.target.value } : y)))} placeholder="Tên thông số (VD: Loại bàn in)" aria-label="Tên thông số" className={inp} /><input value={x.v} onChange={(e) => set('extra', d.extra.map((y, j) => (j === i ? { ...y, v: e.target.value } : y)))} placeholder="Giá trị" aria-label="Giá trị" className={inp} />
                <button type="button" onClick={() => set('extra', d.extra.filter((_, j) => j !== i))} aria-label="Xóa dòng" className="px-2 text-zinc-500 hover:text-red-400"><Trash2 size={16} /></button></div>))}
            <button type="button" onClick={() => set('extra', [...(d.extra || []), { k: '', v: '' }])} className="flex items-center gap-1 text-accent"><Plus size={14} />Thêm thông số</button>
          </fieldset>
          <Field label="Ghi chú"><textarea rows={3} value={d.note} onChange={(e) => set('note', e.target.value)} className={inp} /></Field>
          {err && <p className="text-red-400">{err}</p>}{ok && <p className="text-emerald-400">{ok}</p>}
          <div className="flex flex-wrap items-center gap-2">{cur && <button onClick={del} className={`${btn2} text-red-400`}>Xóa máy</button>}<span className="ml-auto" /><button onClick={onClose} className={btn2}>Đóng</button><button onClick={save} disabled={busy} className={btn}>Lưu thông số</button></div>
        </div>)}

      {tab === 'maint' && cur && (
        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-xl bg-ink-900 p-3"><p className="text-xs text-zinc-500">Tổng giờ in</p><p className="font-display text-lg font-bold text-white">{hours.toFixed(1)} h</p><button onClick={startHEd} className="text-xs text-accent hover:underline">Cập nhật giờ</button></div>
            {[['Từ lần bảo dưỡng cuối', `${ms.since.toFixed(0)} h`], ['Số lần bảo dưỡng', log.length], ['Tổng đã chi', formatVND(totalCost)]].map(([l, v]) => <div key={l} className="rounded-xl bg-ink-900 p-3"><p className="text-xs text-zinc-500">{l}</p><p className="font-display text-lg font-bold text-white">{v}</p></div>)}</div>
          {hEd && (
            <fieldset className="space-y-3 rounded-xl border border-accent/40 bg-accent/5 p-4"><legend className="px-2 text-accent">Cập nhật tổng số giờ máy đã in</legend>
              <p className="text-zinc-400">Hệ thống đang tính <b className="text-white">{hours.toFixed(1)} giờ</b> (từ các việc in đã ghi{num(cur.hoursAdjust) ? `, đã điều chỉnh ${num(cur.hoursAdjust) > 0 ? '+' : ''}${num(cur.hoursAdjust)}h` : ''}). Nhập số giờ thực tế trên đồng hồ máy – ví dụ máy cũ đã chạy 300 giờ trước khi dùng hệ thống.</p>
              <div className="grid gap-3 sm:grid-cols-2"><Field label="Tổng số giờ in thực tế"><input type="number" min="0" step="0.1" value={hEd.total} onChange={(e) => setHEd({ ...hEd, total: e.target.value })} className={inp} autoFocus /></Field>
                <Field label="Ghi chú (tuỳ chọn)"><input value={hEd.note} onChange={(e) => setHEd({ ...hEd, note: e.target.value })} placeholder="VD: lấy theo đồng hồ máy ngày 10/10" className={inp} /></Field></div>
              <label className="flex items-start gap-2 text-zinc-300"><input type="checkbox" checked={hEd.skip} onChange={(e) => setHEd({ ...hEd, skip: e.target.checked })} className="mt-0.5 accent-orange-500" /><span>Số giờ cộng thêm là giờ <b>trước đây</b>, không tính vào bộ đếm nhắc bảo dưỡng (nên chọn khi nhập giờ của máy cũ).</span></label>
              {err && <p className="text-red-400">{err}</p>}
              <div className="flex gap-2"><button onClick={saveHours} className={btn}>Lưu số giờ</button><button onClick={() => { setHEd(null); setErr('') }} className={btn2}>Hủy</button></div>
              {cur.hoursLog?.length > 0 && <ul className="space-y-0.5 text-xs text-zinc-500">{[...cur.hoursLog].reverse().slice(0, 5).map((h, i) => <li key={i}>{new Date(h.t).toLocaleDateString('vi-VN')}: {h.from}h → {h.to}h{h.note && ` – ${h.note}`}</li>)}</ul>}
            </fieldset>)}
          {ms.due && <p className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-red-200">⚠ Đến hạn bảo dưỡng: {ms.reason}.</p>}
          <fieldset className="rounded-xl border border-white/10 p-4"><legend className="px-2 text-zinc-300">Ghi một lần bảo dưỡng / sửa chữa</legend>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Ngày"><input type="date" value={m.date} onChange={(e) => setM({ ...m, date: e.target.value })} className={inp} /></Field>
              <Field label="Loại"><select value={m.type} onChange={(e) => setM({ ...m, type: e.target.value })} className={inp}>{MAINT_TYPES.map((t) => <option key={t}>{t}</option>)}</select></Field>
              <Field label="Số giờ máy đã in lúc này (trống = hiện tại)"><input type="number" min="0" step="0.1" value={m.atHours} placeholder={`${hours.toFixed(1)}`} onChange={(e) => setM({ ...m, atHours: e.target.value })} className={inp} /></Field>
              <div className="sm:col-span-3"><Field label="Tiêu đề"><input value={m.title} onChange={(e) => setM({ ...m, title: e.target.value })} placeholder="VD: Thay đầu phun, bôi trơn trục Z" className={inp} /></Field></div>
              <div className="sm:col-span-3"><Field label="Chi tiết đã làm"><textarea rows={2} value={m.detail} onChange={(e) => setM({ ...m, detail: e.target.value })} className={inp} /></Field></div>
              <Field label="Linh kiện đã thay"><input value={m.parts} onChange={(e) => setM({ ...m, parts: e.target.value })} className={inp} /></Field>
              <Field label="Chi phí (₫)"><input type="number" min="0" step="1000" value={m.cost} onChange={(e) => setM({ ...m, cost: e.target.value })} className={inp} /></Field>
              <Field label="Người thực hiện"><input value={m.by} onChange={(e) => setM({ ...m, by: e.target.value })} className={inp} /></Field>
              <Field label="Hẹn bảo dưỡng lần sau"><input type="date" value={m.nextDate} onChange={(e) => setM({ ...m, nextDate: e.target.value })} className={inp} /></Field>
              <label className="flex items-center gap-2 self-end pb-2 text-zinc-300 sm:col-span-2"><input type="checkbox" checked={m.rec} onChange={(e) => setM({ ...m, rec: e.target.checked })} className="accent-orange-500" />Ghi chi phí vào Thu chi (loại "Bảo trì máy")</label>
            </div>
            {err && !hEd && <p className="mt-2 text-red-400">{err}</p>}{ok && <p className="mt-2 text-emerald-400">{ok}</p>}
            <button onClick={addMaint} className={`${btn} mt-3`}>Ghi vào lịch sử</button>
          </fieldset>
          <ol className="space-y-2">
            {log.map((e) => (
              <li key={e.id || e.t} className="rounded-xl bg-ink-900 p-3">
                <div className="flex flex-wrap items-center gap-2"><b className="text-white">{e.title || e.note}</b><span className="rounded bg-white/10 px-1.5 text-[11px] text-zinc-300">{e.type || 'Bảo trì'}</span><span className="text-xs text-zinc-500">{dmy(e.date || (e.t ? new Date(e.t).toISOString().slice(0, 10) : ''))} · tại {e.atHours ?? 0}h</span>
                  {num(e.cost) > 0 && <b className="ml-auto text-sm text-amber-300">{formatVND(e.cost)}</b>}<button onClick={() => delMaint(e)} aria-label="Xóa bản ghi" className={`text-zinc-500 hover:text-red-400 ${num(e.cost) > 0 ? '' : 'ml-auto'}`}><Trash2 size={14} /></button></div>
                {e.detail && <p className="mt-1 text-zinc-300">{e.detail}</p>}
                <p className="mt-1 text-xs text-zinc-500">{[e.parts && `Linh kiện: ${e.parts}`, e.by && `Thực hiện: ${e.by}`, e.nextDate && `Hẹn lần sau: ${dmy(e.nextDate)}`].filter(Boolean).join(' · ')}</p>
              </li>))}
            {log.length === 0 && <li className="rounded-xl border border-dashed border-white/10 p-6 text-center text-zinc-500">Chưa có lịch sử bảo dưỡng. Ghi lần đầu ở phía trên (kể cả lần vệ sinh nhỏ).</li>}
          </ol>
        </div>)}

      {tab === 'jobs' && cur && (
        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-3 gap-2">{[['Việc hoàn thành', jobStats.n], ['Tổng giờ in', `${jobStats.h.toFixed(1)} h`], ['Nhựa đã dùng', `${Math.round(jobStats.g)} g`]].map(([l, v]) => <div key={l} className="rounded-xl bg-ink-900 p-3"><p className="text-xs text-zinc-500">{l}</p><p className="font-display text-lg font-bold text-white">{v}</p></div>)}</div>
          <ul className="max-h-80 space-y-1.5 overflow-auto">
            {jobs.slice(0, 50).map((o) => <li key={o.id} className="flex items-center gap-2 rounded-lg bg-ink-900 p-2.5"><span className={`rounded px-1.5 text-[11px] ${o.status === 'Đang in' ? 'bg-accent/20 text-accent' : 'bg-emerald-500/15 text-emerald-300'}`}>{o.status}</span><span className="text-white">{o.cust}</span><span className="truncate text-zinc-400">{o.name}</span><span className="ml-auto shrink-0 text-xs text-zinc-500">{num(o.gReal) || o.g}g · {num(o.hReal) || o.h}h</span></li>)}
            {jobs.length === 0 && <li className="rounded-xl border border-dashed border-white/10 p-6 text-center text-zinc-500">Máy chưa có việc in nào. Việc in xuất hiện ở đây khi bạn bấm "Bắt đầu in" / "Xong" trong Hàng đợi hoặc Bảng công việc.</li>}
          </ul>
          <p className="text-xs text-zinc-500">Chỉ tính các việc đã được chuyển sang trạng thái Đang in / Hoàn thành trong hệ thống. Việc in không ghi vào hệ thống sẽ không có ở đây.</p>
        </div>)}
    </Modal>
  )
}

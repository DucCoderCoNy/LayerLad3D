import { useState } from 'react'
import { resetAll, seedRemote, supa, useStore } from '../../lib/store.js'
import { Field, btn, btn2, inp } from '../../components/ui.jsx'

const GROUPS = [
  ['Thông tin cửa hàng', [['storeName', 'Tên cửa hàng'], ['phone', 'Số điện thoại'], ['email', 'Email']]],
  ['Tài khoản nhận chuyển khoản (QR)', [['bankId', 'Mã ngân hàng (BIN, vd 970422 = MB, 970436 = Vietcombank)'], ['bankAccount', 'Số tài khoản'], ['bankHolder', 'Tên chủ tài khoản (không dấu)']]],
  ['Liên hệ nhanh (nút nổi, trang Liên hệ)', [['zalo', 'Link Zalo (https://zalo.me/số)'], ['messenger', 'Link Messenger (https://m.me/trang) – để trống nếu không dùng'], ['address', 'Địa chỉ (tùy chọn)'], ['hours', 'Giờ làm việc']]],
  ['Giá công cụ tùy biến (server tự tính lại khi đặt hàng)', [['keychainBase', 'Móc khóa: giá đế (₫)', 1], ['keychainPerChar', 'Móc khóa: giá mỗi ký tự (₫)', 1], ['ttBase', 'Thời khóa biểu: giá nền (₫)', 1], ['ttPerCell', 'Thời khóa biểu: giá mỗi ô (₫)', 1]]],
  ['Hệ số giá in theo yêu cầu (1 = giá gốc; server dùng đúng các hệ số này)', [['materialMult.PLA', 'Hệ số nhựa PLA', 1, 1], ['materialMult.PETG', 'Hệ số nhựa PETG', 1, 1.1], ['materialMult.ABS', 'Hệ số nhựa ABS', 1, 1.2], ['layerMult.0.12', 'Hệ số layer 0.12 mm', 1, 1.3], ['layerMult.0.16', 'Hệ số layer 0.16 mm', 1, 1.15], ['layerMult.0.2', 'Hệ số layer 0.20 mm', 1, 1], ['layerMult.0.28', 'Hệ số layer 0.28 mm', 1, 0.85]]],
  ['Giá in theo yêu cầu & vận chuyển', [['pricePerGram', 'Giá / gram nhựa (₫)', 1], ['pricePerHour', 'Giá / giờ in (₫)', 1], ['designFee', 'Phí thiết kế / chỉnh file (₫)', 1], ['minCustomPrice', 'Giá tối thiểu / 1 món in theo yêu cầu (₫)', 1], ['shipFee', 'Phí giao hàng (₫)', 1], ['freeShipOver', 'Miễn phí ship từ (₫)', 1]]],
]

const getK = (o, k) => (k.includes('.') ? (k.startsWith('layerMult.') ? o.layerMult?.[k.slice(10)] : o.materialMult?.[k.slice(13)]) : o[k])
const setK = (o, k, v) => (!k.includes('.') ? { ...o, [k]: v } : k.startsWith('layerMult.') ? { ...o, layerMult: { ...(o.layerMult || {}), [k.slice(10)]: v } } : { ...o, materialMult: { ...(o.materialMult || {}), [k.slice(13)]: v } })

export default function AdminSettings() {
  const [st, setSt] = useStore('settings')
  const [f, setF] = useState(st), [saved, setSaved] = useState(false)
  return (
    <form onSubmit={(e) => { e.preventDefault(); setSt(f); setSaved(true); setTimeout(() => setSaved(false), 2000) }} className="max-w-2xl space-y-8">
      <h1 className="font-display text-3xl font-bold text-white">Cài đặt</h1>
      {GROUPS.map(([title, fields]) => (
        <fieldset key={title} className="space-y-3 rounded-2xl border border-white/10 bg-ink-800 p-5">
          <legend className="px-2 font-semibold text-accent">{title}</legend>
          {fields.map(([k, l, num, def]) => <Field key={k} label={l}><input type={num ? 'number' : 'text'} step={k.includes('Mult') ? '0.05' : undefined} value={getK(f, k) ?? def ?? ''} onChange={(e) => setF(setK(f, k, num ? +e.target.value : e.target.value))} className={inp} /></Field>)}
        </fieldset>))}
      <fieldset className="space-y-3 rounded-2xl border border-white/10 bg-ink-800 p-5">
        <legend className="px-2 font-semibold text-accent">Phí giao hàng theo khu vực</legend>
        {(f.shipZones || []).map((z, i) => (
          <div key={z.id} className="flex gap-2">
            <input value={z.name} onChange={(e) => setF({ ...f, shipZones: f.shipZones.map((x, k) => (k === i ? { ...x, name: e.target.value } : x)) })} className={inp} />
            <input type="number" min="0" value={z.fee} onChange={(e) => setF({ ...f, shipZones: f.shipZones.map((x, k) => (k === i ? { ...x, fee: +e.target.value } : x)) })} className={`${inp} w-32`} />
            <button type="button" onClick={() => setF({ ...f, shipZones: f.shipZones.filter((_, k) => k !== i) })} className="px-2 text-zinc-500 hover:text-red-400">Xóa</button>
          </div>))}
        <button type="button" onClick={() => setF({ ...f, shipZones: [...(f.shipZones || []), { id: 'z' + Date.now().toString(36), name: 'Khu vực mới', fee: 30000 }] })} className={btn2}>+ Thêm khu vực</button>
        <p className="text-xs text-zinc-500">Đơn đạt mức "Miễn phí ship từ" ở trên vẫn được miễn phí. Nếu xóa hết khu vực, hệ thống dùng "Phí giao hàng" chung.</p>
      </fieldset>
      <div className="flex items-center gap-3"><button className={btn}>Lưu cài đặt</button>{saved && <span className="text-sm text-neon">Đã lưu</span>}
        {supa ? <button type="button" onClick={seedRemote} className={`${btn2} ml-auto`}>Nạp sản phẩm mẫu lên server</button> : <button type="button" onClick={() => confirm('Xóa TOÀN BỘ dữ liệu (sản phẩm, đơn, người dùng) và khôi phục mặc định?') && resetAll()} className={`${btn2} ml-auto text-red-400`}>Khôi phục dữ liệu mẫu</button>}</div>
    </form>
  )
}

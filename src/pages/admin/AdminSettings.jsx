import { useState } from 'react'
import { resetAll, seedRemote, supa, useStore } from '../../lib/store.js'
import { Field, btn, btn2, inp } from '../../components/ui.jsx'

const GROUPS = [
  ['Thông tin cửa hàng', [['storeName', 'Tên cửa hàng'], ['phone', 'Số điện thoại'], ['email', 'Email']]],
  ['Tài khoản nhận chuyển khoản (QR)', [['bankId', 'Mã ngân hàng (BIN, vd 970422 = MB, 970436 = Vietcombank)'], ['bankAccount', 'Số tài khoản'], ['bankHolder', 'Tên chủ tài khoản (không dấu)']]],
  ['Giá in theo yêu cầu & vận chuyển', [['pricePerGram', 'Giá / gram nhựa (₫)', 1], ['pricePerHour', 'Giá / giờ in (₫)', 1], ['designFee', 'Phí thiết kế / chỉnh file (₫)', 1], ['shipFee', 'Phí giao hàng (₫)', 1], ['freeShipOver', 'Miễn phí ship từ (₫)', 1]]],
]

export default function AdminSettings() {
  const [st, setSt] = useStore('settings')
  const [f, setF] = useState(st), [saved, setSaved] = useState(false)
  return (
    <form onSubmit={(e) => { e.preventDefault(); setSt(f); setSaved(true); setTimeout(() => setSaved(false), 2000) }} className="max-w-2xl space-y-8">
      <h1 className="font-display text-3xl font-bold text-white">Cài đặt</h1>
      {GROUPS.map(([title, fields]) => (
        <fieldset key={title} className="space-y-3 rounded-2xl border border-white/10 bg-ink-800 p-5">
          <legend className="px-2 font-semibold text-accent">{title}</legend>
          {fields.map(([k, l, num]) => <Field key={k} label={l}><input type={num ? 'number' : 'text'} value={f[k]} onChange={(e) => setF({ ...f, [k]: num ? +e.target.value : e.target.value })} className={inp} /></Field>)}
        </fieldset>))}
      <div className="flex items-center gap-3"><button className={btn}>Lưu cài đặt</button>{saved && <span className="text-sm text-neon">Đã lưu</span>}
        {supa ? <button type="button" onClick={seedRemote} className={`${btn2} ml-auto`}>Nạp sản phẩm mẫu lên server</button> : <button type="button" onClick={() => confirm('Xóa TOÀN BỘ dữ liệu (sản phẩm, đơn, người dùng) và khôi phục mặc định?') && resetAll()} className={`${btn2} ml-auto text-red-400`}>Khôi phục dữ liệu mẫu</button>}</div>
    </form>
  )
}

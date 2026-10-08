import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { formatVND } from '../data/products.js'
import { getStore, supa } from '../lib/store.js'
import { normPhone, useTitle } from '../lib/seo.js'
import { ShipBox, Steps } from '../components/OrderTracking.jsx'
import { Badge, ORDER_STATUS, PAY_STATUS, payStatusOf, Field, btn, inp } from '../components/ui.jsx'


/** Tra cứu đơn bằng mã đơn + số điện thoại (server: hàm track_order; chế độ 1 máy: tìm trong dữ liệu local) */
export default function Track() {
  useTitle('Tra cứu đơn hàng', 'Nhập mã đơn và số điện thoại để xem trạng thái đơn hàng LayerLab 3D.')
  const [sp] = useSearchParams()
  const [id, setId] = useState(sp.get('id') || ''), [phone, setPhone] = useState(''), [o, setO] = useState(null), [err, setErr] = useState(''), [busy, setBusy] = useState(false)
  const submit = async (e) => {
    e.preventDefault(); setErr(''); setO(null); setBusy(true)
    try {
      let found = null
      if (supa) { const { data, error } = await supa.rpc('track_order', { oid: id.trim(), phone }); if (error) throw error; found = data }
      else found = getStore('orders').find((x) => x.id.toUpperCase() === id.trim().toUpperCase() && normPhone(x.customer?.phone) === normPhone(phone))
      found ? setO(found) : setErr('Không tìm thấy đơn. Kiểm tra lại mã đơn và số điện thoại đã đặt hàng.')
    } catch (x) { setErr(x.message || 'Có lỗi, thử lại sau') }
    setBusy(false)
  }
  return (
    <div className="mx-auto max-w-2xl px-5 py-12">
      <h1 className="font-display text-4xl font-bold text-white">Tra cứu đơn hàng</h1>
      <form onSubmit={submit} className="mt-6 grid gap-4 sm:grid-cols-2">
        <Field label="Mã đơn (vd DH1A2B3C)"><input required value={id} onChange={(e) => setId(e.target.value)} className={inp} /></Field>
        <Field label="Số điện thoại đặt hàng"><input required value={phone} onChange={(e) => setPhone(e.target.value)} className={inp} /></Field>
        <button disabled={busy} className={`${btn} sm:col-span-2`}>{busy ? 'Đang tìm…' : 'Tra cứu'}</button>
      </form>
      {err && <p className="mt-4 text-sm text-red-400">{err}</p>}
      {o && (
        <div className="mt-8 space-y-5 rounded-2xl border border-white/10 bg-ink-800 p-6">
          <div className="flex items-center justify-between"><b className="text-lg text-white">{o.id}</b><Badge map={ORDER_STATUS} v={o.status} /></div>
          <Steps status={o.status} />
          <ShipBox o={o} />
          <ul className="space-y-1 text-sm">{o.items.map((i, k) => <li key={k} className="flex justify-between gap-3"><span className="text-zinc-300">{i.name} ({i.color}) × {i.qty}</span><span>{formatVND(i.price * i.qty)}</span></li>)}</ul>
          <div className="flex justify-between border-t border-white/10 pt-3 font-bold text-white"><span>Tổng (ship {o.ship ? formatVND(o.ship) : 'miễn phí'})</span><span className="text-accent">{formatVND(o.total)}</span></div>
          <p className="flex flex-wrap items-center gap-2 text-sm text-zinc-500">Thanh toán: {o.customer.payment === 'bank' ? 'Chuyển khoản' : 'COD'} · <Badge map={PAY_STATUS} v={payStatusOf(o)} /></p>
          {o.items.some((i) => i.cfg?.estimate) && <p className="rounded-lg bg-amber-500/10 p-3 text-xs text-amber-200">Món in theo yêu cầu có giá ước tính, LayerLab 3D sẽ xác nhận lại sau khi kiểm tra file.</p>}
        </div>)}
    </div>
  )
}

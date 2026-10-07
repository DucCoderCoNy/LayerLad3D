import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'
import { useCart } from '../context/CartContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { formatVND } from '../data/products.js'
import { findOrder, placeOrder, useStore } from '../lib/store.js'
import { Field, btn, inp } from '../components/ui.jsx'

/** Phí ship: miễn phí khi đơn đạt ngưỡng trong Cài đặt */
export const shipOf = (st, subtotal) => (subtotal >= st.freeShipOver ? 0 : st.shipFee)

/** Link ảnh QR chuyển khoản VietQR (cần Internet). Nội dung CK = mã đơn */
export const qrUrl = (st, amount, memo) =>
  `https://img.vietqr.io/image/${st.bankId}-${st.bankAccount}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(memo)}&accountName=${encodeURIComponent(st.bankHolder)}`

export default function Checkout() {
  const { items, total, clear } = useCart()
  const { user } = useAuth()
  const [st] = useStore('settings')
  const [busy, setBusy] = useState(false)
  const nav = useNavigate()
  const [f, setF] = useState({ name: user?.name || '', phone: user?.phone || '', address: '', note: '', payment: 'cod' })
  const [err, setErr] = useState('')
  const ship = shipOf(st, total)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  if (items.length === 0) return <div className="py-32 text-center text-zinc-400">Giỏ hàng trống. <Link to="/shop" className="text-accent">Đến cửa hàng</Link></div>

  const submit = (e) => {
    e.preventDefault()
    if (!/^(0|\+84)\d{9}$/.test(f.phone.replace(/\s/g, ''))) return setErr('Số điện thoại không hợp lệ')
    if (f.address.trim().length < 8) return setErr('Vui lòng nhập địa chỉ đầy đủ')
    const id = 'DH' + Date.now().toString().slice(-7)
    setBusy(true)
    placeOrder({ id, userId: user?.id || null, customer: f, items: items.map(({ image, ...i }) => i), subtotal: total, ship, total: total + ship, status: 'new', paid: false, createdAt: Date.now() })
      .then(() => { clear(); nav('/order/' + id) })
      .catch((x) => { setErr(x.message); setBusy(false) })
  }
  return (
    <form onSubmit={submit} className="mx-auto grid max-w-6xl gap-10 px-5 py-12 md:grid-cols-5">
      <div className="space-y-4 md:col-span-3">
        <h1 className="font-display text-3xl font-bold text-white">Thanh toán</h1>
        <Field label="Họ và tên"><input required value={f.name} onChange={set('name')} className={inp} /></Field>
        <Field label="Số điện thoại"><input required value={f.phone} onChange={set('phone')} className={inp} /></Field>
        <Field label="Địa chỉ giao hàng"><textarea required rows={2} value={f.address} onChange={set('address')} className={inp} /></Field>
        <Field label="Ghi chú (màu tùy chọn, tên khắc...)"><textarea rows={2} value={f.note} onChange={set('note')} className={inp} /></Field>
        <fieldset className="space-y-2">
          <legend className="mb-1 text-sm text-zinc-400">Phương thức thanh toán</legend>
          {[['cod', 'Thanh toán khi nhận hàng (COD)'], ['bank', 'Chuyển khoản ngân hàng (có mã QR)']].map(([v, l]) => (
            <label key={v} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 ${f.payment === v ? 'border-accent bg-accent/10' : 'border-white/10'}`}>
              <input type="radio" name="pay" checked={f.payment === v} onChange={() => setF({ ...f, payment: v })} className="accent-orange-500" />{l}
            </label>
          ))}
        </fieldset>
      </div>
      <aside className="h-fit rounded-2xl border border-white/10 bg-ink-800 p-6 md:col-span-2">
        <h2 className="mb-4 font-semibold text-white">Đơn hàng</h2>
        <ul className="space-y-2 text-sm">{items.map((i) => <li key={i.key} className="flex justify-between gap-3"><span className="text-zinc-300">{i.name} ({i.color}) × {i.qty}</span><span>{formatVND(i.price * i.qty)}</span></li>)}</ul>
        <div className="mt-4 space-y-1 border-t border-white/10 pt-4 text-sm">
          <div className="flex justify-between text-zinc-400"><span>Tạm tính</span><span>{formatVND(total)}</span></div>
          <div className="flex justify-between text-zinc-400"><span>Phí giao hàng</span><span>{ship ? formatVND(ship) : 'Miễn phí'}</span></div>
          <div className="flex justify-between pt-2 text-lg font-bold text-white"><span>Tổng</span><span className="text-accent">{formatVND(total + ship)}</span></div>
        </div>
        {err && <p className="mt-3 text-sm text-red-400">{err}</p>}
        <button disabled={busy} className={`${btn} mt-5 w-full`}>{busy ? 'Đang gửi…' : 'Đặt hàng'}</button>
      </aside>
    </form>
  )
}

/** Trang đặt hàng thành công + QR chuyển khoản */
export function OrderDone() {
  const { id } = useParams()
  const [st] = useStore('settings')
  useStore('orders')
  const o = findOrder(id)
  if (!o) return <div className="py-32 text-center text-zinc-400">Không tìm thấy đơn hàng.</div>
  return (
    <div className="mx-auto max-w-lg px-5 py-16 text-center">
      <CheckCircle2 className="mx-auto text-neon" size={56} />
      <h1 className="mt-4 font-display text-3xl font-bold text-white">Đặt hàng thành công</h1>
      <p className="mt-2 text-zinc-400">Mã đơn <b className="text-white">{o.id}</b>. Bên mình sẽ gọi xác nhận trong thời gian sớm nhất.</p>
      {o.customer.payment === 'bank' && (
        <div className="mt-8 rounded-2xl border border-white/10 bg-ink-800 p-6">
          <img src={qrUrl(st, o.total, o.id)} alt="QR chuyển khoản" className="mx-auto w-64 rounded-xl bg-white p-2" />
          <p className="mt-4 text-sm text-zinc-400">Quét QR để chuyển <b className="text-accent">{formatVND(o.total)}</b></p>
          <p className="text-sm text-zinc-500">{st.bankHolder} · STK {st.bankAccount}<br />Nội dung: <b className="text-white">{o.id}</b></p>
        </div>
      )}
      <Link to="/shop" className="mt-8 inline-block text-accent hover:underline">Tiếp tục mua sắm</Link>
    </div>
  )
}

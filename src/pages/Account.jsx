import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { formatVND } from '../data/products.js'
import { useStore } from '../lib/store.js'
import { Badge, ORDER_STATUS, PAY_STATUS, REQ_STATUS, btn2, payStatusOf } from '../components/ui.jsx'
import { ShipBox, Steps } from '../components/OrderTracking.jsx'

export default function Account() {
  const { user, logout, ready } = useAuth()
  const [orders] = useStore('orders'), [reqs] = useStore('requests')
  if (!ready) return null
  if (!user) return <Navigate to="/login" replace />
  const [open, setOpen] = useState(null)
  const mine = orders.filter((o) => o.userId === user.id), myReqs = reqs.filter((r) => r.userId === user.id)
  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <div className="flex items-center justify-between">
        <div><h1 className="font-display text-3xl font-bold text-white">{user.name}</h1><p className="text-zinc-500">{user.email}</p></div>
        <div className="flex gap-2">{user.role === 'admin' && <Link to="/admin" className={btn2}>Trang quản trị</Link>}<button onClick={logout} className={btn2}>Đăng xuất</button></div>
      </div>
      <h2 className="mb-3 mt-10 text-xl font-semibold text-white">Đơn hàng của tôi & theo dõi vận chuyển</h2>
      <div className="space-y-3">
        {mine.map((o) => (
          <div key={o.id} className={`rounded-xl border bg-ink-800 ${open === o.id ? 'border-accent/60' : 'border-white/10'}`}>
            <button onClick={() => setOpen(open === o.id ? null : o.id)} aria-expanded={open === o.id} className="flex w-full items-center justify-between gap-3 p-4 text-left">
              <div><b className="text-white">{o.id}</b><p className="text-xs text-zinc-500">{new Date(o.createdAt).toLocaleString('vi-VN')} · {o.items.length} món</p>
                {o.trackingCode && o.status !== 'done' && <p className="mt-1 text-xs text-accent">Đã có mã vận đơn – bấm để theo dõi</p>}</div>
              <div className="text-right"><Badge map={ORDER_STATUS} v={o.status} /><p className="mt-1 text-sm text-accent">{formatVND(o.total)}</p></div>
            </button>
            {open === o.id && (
              <div className="space-y-4 border-t border-white/10 p-4 text-sm">
                <Steps status={o.status} />
                <ShipBox o={o} />
                <ul className="space-y-1">{o.items.map((i, k) => <li key={k} className="flex justify-between gap-3"><span className="text-zinc-300">{i.name}{i.color ? ` (${i.color})` : ''} × {i.qty}</span><span>{formatVND(i.price * i.qty)}</span></li>)}</ul>
                <p className="flex flex-wrap items-center gap-2 text-zinc-500">Thanh toán: <Badge map={PAY_STATUS} v={payStatusOf(o)} /> · Giao đến: {o.customer?.address}</p>
                {o.items.some((i) => i.cfg?.estimate) && <p className="rounded-lg bg-amber-500/10 p-3 text-xs text-amber-200">Món in theo yêu cầu đang ở giá ước tính, LayerLab 3D sẽ xác nhận lại sau khi kiểm tra file.</p>}
                <Link to={`/order/${o.id}`} className="text-accent">Xem trang đơn hàng / mã QR thanh toán →</Link>
              </div>)}
          </div>
        ))}
        {mine.length === 0 && <p className="text-zinc-500">Bạn chưa có đơn hàng nào.</p>}
      </div>
      <h2 className="mb-3 mt-10 text-xl font-semibold text-white">Yêu cầu in theo yêu cầu</h2>
      <div className="space-y-3">
        {myReqs.map((r) => (
          <div key={r.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-ink-800 p-4">
            <div><b className="text-white">{r.id}</b> <span className="text-sm text-zinc-500">{r.fileName}</span>{r.adminNote && <p className="text-xs text-zinc-400">Ghi chú: {r.adminNote}</p>}</div>
            <div className="text-right"><Badge map={REQ_STATUS} v={r.status} /><p className="mt-1 text-sm text-accent">{formatVND(r.quote ?? r.estimate)}{r.quote == null && ' (ước tính)'}</p></div>
          </div>
        ))}
        {myReqs.length === 0 && <p className="text-zinc-500">Chưa có yêu cầu nào.</p>}
      </div>
    </div>
  )
}

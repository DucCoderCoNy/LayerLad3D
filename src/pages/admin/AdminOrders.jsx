import { useState } from 'react'
import { formatVND } from '../../data/products.js'
import { useStore } from '../../lib/store.js'
import { addWorkshopOrder } from '../../lib/bridge.js'
import { Badge, DataTable, Modal, ORDER_STATUS, btn2, inp, td } from '../../components/ui.jsx'

export default function AdminOrders() {
  const [orders, setOrders] = useStore('orders')
  const [sel, setSel] = useState(null), [filter, setFilter] = useState('')
  const o = orders.find((x) => x.id === sel)
  const patch = (id, d) => setOrders((c) => c.map((x) => (x.id === id ? { ...x, ...d } : x)))
  const toWorkshop = (o) => { addWorkshopOrder({ src: 'Website', cust: o.customer.name, name: o.items.map((i) => `${i.name} ×${i.qty}`).join(', '), colors: [...new Set(o.items.map((i) => i.color))].join(', '), price: o.total, paid: o.paid ? o.total : 0, status: o.paid ? 'Đã cọc' : 'Chờ in', note: `Đơn web ${o.id} · ${o.customer.phone}` }); patch(o.id, { wo: true }) }
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-bold text-white">Đơn hàng</h1>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className={`${inp} w-48`}><option value="">Tất cả trạng thái</option>{Object.entries(ORDER_STATUS).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}</select>
      </div>
      <DataTable heads={['Mã', 'Ngày', 'Khách', 'Thanh toán', 'Tổng', 'Trạng thái']} empty="Chưa có đơn hàng">
        {orders.filter((x) => !filter || x.status === filter).map((x) => (
          <tr key={x.id} onClick={() => setSel(x.id)} className="cursor-pointer">
            <td className={`${td} font-medium text-white`}>{x.id}</td><td className={td}>{new Date(x.createdAt).toLocaleDateString('vi-VN')}</td><td className={td}>{x.customer.name}</td>
            <td className={td}>{x.customer.payment === 'bank' ? 'CK' : 'COD'} · {x.paid ? <span className="text-emerald-400">Đã thu</span> : 'Chưa thu'}</td>
            <td className={td}>{formatVND(x.total)}</td><td className={td}><Badge map={ORDER_STATUS} v={x.status} /></td></tr>))}
      </DataTable>
      {o && (
        <Modal title={`Đơn ${o.id}`} onClose={() => setSel(null)} wide>
          <div className="space-y-4 text-sm">
            <div className="rounded-lg bg-ink-900 p-3 text-zinc-300">{o.customer.name} · {o.customer.phone}<br />{o.customer.address}{o.customer.note && <><br /><i className="text-zinc-500">Ghi chú: {o.customer.note}</i></>}</div>
            <ul className="space-y-1">{o.items.map((i) => <li key={i.key} className="flex justify-between"><span>{i.name} ({i.color}) × {i.qty}</span><span>{formatVND(i.price * i.qty)}</span></li>)}</ul>
            <div className="flex justify-between border-t border-white/10 pt-2 font-bold text-white"><span>Tổng (gồm ship {formatVND(o.ship)})</span><span className="text-accent">{formatVND(o.total)}</span></div>
            <div className="flex flex-wrap items-center gap-3">
              <select value={o.status} onChange={(e) => patch(o.id, { status: e.target.value })} className={`${inp} w-44`}>{Object.entries(ORDER_STATUS).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}</select>
              <label className="flex items-center gap-2"><input type="checkbox" checked={o.paid} onChange={(e) => patch(o.id, { paid: e.target.checked })} className="accent-orange-500" />Đã thanh toán</label>
              <button disabled={o.wo} onClick={() => toWorkshop(o)} className={btn2}>{o.wo ? 'Đã chuyển sang xưởng' : 'Tạo đơn xưởng'}</button>
              <button onClick={() => confirm('Xóa đơn này?') && (setOrders((c) => c.filter((x) => x.id !== o.id)), setSel(null))} className={`${btn2} ml-auto text-red-400`}>Xóa đơn</button>
            </div>
          </div>
        </Modal>)}
    </div>
  )
}

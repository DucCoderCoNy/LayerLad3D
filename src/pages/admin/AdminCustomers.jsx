import { useMemo, useState } from 'react'
import { downloadCSV } from '../../lib/export.js'
import { formatVND } from '../../data/products.js'
import { useStore } from '../../lib/store.js'
import { normPhone } from '../../lib/seo.js'
import { Badge, DataTable, Modal, ORDER_STATUS, btn, btn2, inp, td } from '../../components/ui.jsx'

/** Khách hàng: tổng hợp từ đơn hàng theo số điện thoại (không cần nhập tay). Ghi chú nội bộ lưu ở bộ `customers`, chỉ admin đọc được. */
export default function AdminCustomers() {
  const [orders] = useStore('orders'), [notes, setNotes] = useStore('customers')
  const [q, setQ] = useState(''), [sel, setSel] = useState(null), [draft, setDraft] = useState('')
  const list = useMemo(() => {
    const m = new Map()
    for (const o of orders) {
      const k = normPhone(o.customer?.phone); if (!k) continue
      const c = m.get(k) || { phone: k, name: o.customer.name, address: o.customer.address, orders: [], spent: 0, last: 0 }
      c.orders.push(o); if (o.status !== 'cancelled') c.spent += o.total
      if (o.createdAt > c.last) { c.last = o.createdAt; c.name = o.customer.name; c.address = o.customer.address }
      m.set(k, c)
    }
    return [...m.values()].sort((a, b) => b.last - a.last)
  }, [orders])
  const shown = list.filter((c) => !q.trim() || `${c.name} ${c.phone}`.toLowerCase().includes(q.trim().toLowerCase()))
  const c = list.find((x) => x.phone === sel), note = (p) => notes.find((n) => n.id === p)?.note || ''
  const saveNote = () => { setNotes((cur) => (cur.some((n) => n.id === sel) ? cur.map((n) => (n.id === sel ? { ...n, note: draft } : n)) : [...cur, { id: sel, note: draft }])); setSel(null) }
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-bold text-white">Khách hàng</h1>
        <div className="flex gap-2"><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm tên / SĐT" className={`${inp} w-52`} />
          <button className={btn2} onClick={() => downloadCSV('khach-hang.csv', [['Tên', 'SĐT', 'Địa chỉ gần nhất', 'Số đơn', 'Đã mua (₫)', 'Ghi chú'], ...shown.map((x) => [x.name, x.phone, x.address, x.orders.length, x.spent, note(x.phone)])])}>Xuất Excel (CSV)</button></div>
      </div>
      <DataTable heads={['Khách', 'SĐT', 'Số đơn', 'Đã mua', 'Gần nhất', 'Ghi chú']} empty="Chưa có khách hàng. Danh sách tự tạo từ đơn hàng.">
        {shown.map((x) => (
          <tr key={x.phone} onClick={() => { setSel(x.phone); setDraft(note(x.phone)) }} className="cursor-pointer">
            <td className={`${td} font-medium text-white`}>{x.name}</td><td className={td}>{x.phone}</td><td className={td}>{x.orders.length}</td><td className={td}>{formatVND(x.spent)}</td>
            <td className={td}>{new Date(x.last).toLocaleDateString('vi-VN')}</td><td className={`${td} max-w-48 truncate text-zinc-500`}>{note(x.phone)}</td></tr>))}
      </DataTable>
      {c && (
        <Modal title={c.name} onClose={() => setSel(null)} wide>
          <div className="space-y-4 text-sm">
            <p className="text-zinc-300">{c.phone} · {c.address}<br />Tổng đã mua <b className="text-accent">{formatVND(c.spent)}</b> trong {c.orders.length} đơn</p>
            <ul className="max-h-48 space-y-1 overflow-y-auto">{c.orders.map((o) => <li key={o.id} className="flex items-center justify-between gap-3"><span>{o.id} · {new Date(o.createdAt).toLocaleDateString('vi-VN')}</span><span className="flex items-center gap-2">{formatVND(o.total)}<Badge map={ORDER_STATUS} v={o.status} /></span></li>)}</ul>
            <label className="block text-zinc-400">Ghi chú nội bộ (khách không thấy)<textarea rows={3} value={draft} onChange={(e) => setDraft(e.target.value)} className={`${inp} mt-1`} placeholder="Sở thích màu, hay đặt gấp, lưu ý khi giao…" /></label>
            <div className="flex gap-2"><button onClick={saveNote} className={btn}>Lưu ghi chú</button><button onClick={() => setSel(null)} className={btn2}>Đóng</button></div>
          </div>
        </Modal>)}
    </div>
  )
}

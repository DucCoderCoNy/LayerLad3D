import { useMemo, useState } from 'react'
import { MessageCircle } from 'lucide-react'
import { formatVND } from '../../data/products.js'
import { useStore } from '../../lib/store.js'
import { downloadCSV } from '../../lib/export.js'
import { zaloLink } from '../../lib/orderTools.js'
import { KIND, PAY_METHODS, addPayment, dueOf, methodLabel, paidOf, receivableKind, reminderText } from '../../lib/receivables.js'
import { Badge, DataTable, Field, Modal, ORDER_STATUS, btn, btn2, inp, td } from '../../components/ui.jsx'

const ORDER = ['delivered', 'partial', 'bank', 'cod']
const KCLS = { delivered: 'text-red-300', partial: 'text-amber-300', bank: 'text-sky-300', cod: 'text-zinc-300' }

/** Công nợ & thu tiền: các đơn chưa thu đủ, chia theo mức rủi ro, thu tiền nhanh và nhắc khách. */
export default function AdminReceivables() {
  const [orders, setOrders] = useStore('orders'), [st] = useStore('settings')
  const [kind, setKind] = useState('all'), [pay, setPay] = useState(null), [msg, setMsg] = useState('')
  const now = Date.now()
  const rows = useMemo(() => orders.filter((o) => dueOf(o) > 0).map((o) => ({ o, due: dueOf(o), kind: receivableKind(o), age: Math.floor((now - o.createdAt) / 864e5) }))
    .sort((a, b) => ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind) || b.age - a.age), [orders])
  const by = (k) => rows.filter((r) => r.kind === k), sum = (l) => l.reduce((t, r) => t + r.due, 0)
  const shown = kind === 'all' ? rows : by(kind)

  const apply = () => {
    const amt = Math.round(+pay.amount || 0); if (!amt) return
    setOrders((c) => c.map((o) => (o.id === pay.o.id ? { ...o, ...addPayment(o, pay), history: [...(o.history || []), { t: Date.now(), text: `Thu ${formatVND(amt)} (${methodLabel(pay.method)})${pay.note ? ` – ${pay.note}` : ''}` }].slice(-50) } : o)))
    setPay(null)
  }
  const remind = (o) => navigator.clipboard?.writeText(reminderText(o, st)).then(() => setMsg(`Đã copy tin nhắn nhắc cho ${o.customer.name} – dán vào Zalo/Messenger.`), () => setMsg('Không copy được, hãy thử lại.'))

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3"><h1 className="mr-auto font-display text-3xl font-bold text-white">Công nợ & thu tiền</h1>
        <button onClick={() => downloadCSV('cong-no.csv', [['Mã đơn', 'Khách', 'SĐT', 'Ngày đặt', 'Số ngày', 'Phân loại', 'Tổng', 'Đã thu', 'Còn thiếu'], ...shown.map((r) => [r.o.id, r.o.customer.name, r.o.customer.phone, new Date(r.o.createdAt).toLocaleDateString('vi-VN'), r.age, KIND[r.kind], r.o.total, paidOf(r.o), r.due])])} className={btn2}>Xuất Excel (CSV)</button></div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-xl border border-white/10 bg-ink-800 p-4"><p className="text-sm text-zinc-400">Tổng còn phải thu</p><p className="mt-1 font-display text-2xl font-bold text-amber-300">{formatVND(sum(rows))}</p><p className="text-[11px] text-zinc-500">{rows.length} đơn</p></div>
        {ORDER.slice(0, 3).map((k) => <div key={k} className="rounded-xl border border-white/10 bg-ink-800 p-4"><p className="text-sm text-zinc-400">{KIND[k]}</p><p className={`mt-1 font-display text-2xl font-bold ${KCLS[k]}`}>{formatVND(sum(by(k)))}</p><p className="text-[11px] text-zinc-500">{by(k).length} đơn</p></div>)}
      </div>
      {by('delivered').length > 0 && <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">⚠ {by('delivered').length} đơn đã hoàn thành nhưng chưa thu đủ ({formatVND(sum(by('delivered')))}). Đây là khoản nên đòi trước.</p>}

      <div className="flex flex-wrap gap-2">{[['all', `Tất cả (${rows.length})`], ...ORDER.map((k) => [k, `${KIND[k]} (${by(k).length})`])].map(([k, l]) => <button key={k} onClick={() => setKind(k)} className={`rounded-full px-3 py-1.5 text-xs ${kind === k ? 'bg-accent font-semibold text-ink-950' : 'bg-white/10 text-zinc-300 hover:bg-white/20'}`}>{l}</button>)}</div>
      {msg && <p className="rounded-lg bg-accent/10 p-3 text-sm text-accent">{msg}</p>}

      <DataTable heads={['Đơn', 'Khách', 'Phân loại', 'Tổng', 'Đã thu', 'Còn thiếu', 'Trạng thái đơn', '']} empty="Không có khoản nào cần thu 🎉">
        {shown.map(({ o, due, kind: k, age }) => (
          <tr key={o.id}>
            <td className={`${td} font-medium text-white`}>{o.id}<small className="block font-normal text-zinc-500">{age} ngày trước</small></td>
            <td className={td}>{o.customer.name}<small className="block text-zinc-500">{o.customer.phone}</small></td>
            <td className={`${td} ${KCLS[k]}`}>{KIND[k]}</td>
            <td className={td}>{formatVND(o.total)}</td><td className={td}>{formatVND(paidOf(o))}</td><td className={`${td} font-semibold text-amber-300`}>{formatVND(due)}</td>
            <td className={td}><Badge map={ORDER_STATUS} v={o.status} /></td>
            <td className={`${td} whitespace-nowrap text-right`}>
              <button onClick={() => setPay({ o, amount: due, method: o.customer?.payment === 'bank' ? 'bank' : 'cash', note: '' })} className={`${btn} !px-3 !py-1.5 text-xs`}>Ghi nhận thu</button>
              <button onClick={() => remind(o)} className={`${btn2} ml-1 !px-3 !py-1.5 text-xs`}>Nhắc</button>
              <a href={zaloLink(o.customer.phone)} target="_blank" rel="noreferrer" aria-label="Mở Zalo" className="ml-1 inline-block p-2 align-middle text-zinc-400 hover:text-accent"><MessageCircle size={16} /></a></td>
          </tr>))}
      </DataTable>
      <p className="text-xs text-zinc-500">Đơn đã hủy hoặc đã hoàn tiền không tính. "COD – thu khi giao" là khoản đang chờ thu hộ, chưa phải nợ quá hạn. Để ghi cọc cho một đơn mới, vào chi tiết đơn → Thanh toán & giảm giá.</p>

      {pay && (
        <Modal title={`Thu tiền đơn ${pay.o.id}`} onClose={() => setPay(null)}>
          <div className="space-y-3 text-sm">
            <p className="text-zinc-400">{pay.o.customer.name} · còn thiếu <b className="text-amber-300">{formatVND(dueOf(pay.o))}</b> trên tổng {formatVND(pay.o.total)}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Số tiền thu (₫)"><input type="number" step="1000" value={pay.amount} onChange={(e) => setPay({ ...pay, amount: e.target.value })} className={inp} autoFocus /></Field>
              <Field label="Hình thức"><select value={pay.method} onChange={(e) => setPay({ ...pay, method: e.target.value })} className={inp}>{PAY_METHODS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
              <div className="sm:col-span-2"><Field label="Ghi chú"><input value={pay.note} onChange={(e) => setPay({ ...pay, note: e.target.value })} className={inp} /></Field></div>
            </div>
            <div className="flex justify-end gap-2"><button onClick={() => setPay(null)} className={btn2}>Hủy</button><button onClick={apply} className={btn}>Ghi nhận</button></div>
          </div>
        </Modal>)}
    </div>
  )
}

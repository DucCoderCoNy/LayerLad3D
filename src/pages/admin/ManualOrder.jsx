import { useMemo, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { formatVND } from '../../data/products.js'
import { useStore } from '../../lib/store.js'
import { FLOW, ORDER_STATUS, Field, Modal, btn, btn2, inp } from '../../components/ui.jsx'
import { PAY_METHODS, payState } from '../../lib/receivables.js'

const SOURCES = ['Zalo', 'Facebook/Messenger', 'Shopee', 'Trực tiếp', 'Khách quen', 'Khác']
const blank = () => ({ id: '', name: '', color: '', qty: 1, price: 0 })

/** Tạo đơn thay khách (khách nhắn Zalo/Facebook, mua trực tiếp…). Đơn vào cùng danh sách đơn hàng; sản phẩm chọn từ kho sẽ tự trừ tồn. */
export default function ManualOrder({ onClose, onCreate }) {
  const [products] = useStore('products'), [colors] = useStore('colors'), [st] = useStore('settings')
  const [f, setF] = useState({ name: '', phone: '', address: '', source: SOURCES[0], payment: 'cod', status: 'confirmed', ship: 0, discount: 0, paidNow: '', pmethod: 'cash', note: '' })
  const [rows, setRows] = useState([blank()]), [err, setErr] = useState('')
  const set = (k, v) => setF((c) => ({ ...c, [k]: v }))
  const upd = (i, d) => setRows((c) => c.map((r, k) => (k === i ? { ...r, ...d } : r)))
  const active = useMemo(() => products.filter((p) => p.active), [products])
  const subtotal = rows.reduce((s, r) => s + (+r.price || 0) * (+r.qty || 0), 0), total = Math.max(0, subtotal + (+f.ship || 0) - (+f.discount || 0))

  const pickProduct = (i, id) => { const p = products.find((x) => x.id === id); upd(i, p ? { id: p.id, name: p.name, price: p.price } : { id: '', name: '', price: 0 }) }
  const submit = (e) => {
    e.preventDefault(); setErr('')
    if (!/^(0|\+84)\d{9}$/.test(f.phone.replace(/\s/g, ''))) return setErr('Số điện thoại không hợp lệ (để khách tra cứu được đơn)')
    const items = rows.filter((r) => r.name.trim()).map((r, k) => ({ key: `m${k}`, id: r.id || `manual-${k}`, name: r.name.trim(), color: r.color, qty: Math.max(1, Math.round(+r.qty || 1)), price: Math.max(0, Math.round(+r.price || 0)) }))
    if (!items.length) return setErr('Thêm ít nhất 1 món hàng')
    for (const it of items) { const p = products.find((x) => x.id === it.id); if (p && p.stock < it.qty && !confirm(`"${p.name}" chỉ còn ${p.stock} trong kho, bạn đặt ${it.qty}. Vẫn tạo đơn?`)) return }
    const sub = items.reduce((s, i) => s + i.price * i.qty, 0), ship = Math.max(0, Math.round(+f.ship || 0)), disc = Math.max(0, Math.round(+f.discount || 0)), tot = Math.max(0, sub + ship - disc), now = Date.now()
    const got = Math.max(0, Math.round(+f.paidNow || 0)), ps = payState(tot, got)
    onCreate({
      id: 'DH' + now.toString(36).toUpperCase().slice(-5) + Math.random().toString(36).slice(2, 5).toUpperCase(), userId: null, manual: true, source: f.source,
      customer: { name: f.name.trim(), phone: f.phone.trim(), address: f.address.trim() || 'Nhận tại xưởng', note: f.note.trim(), payment: f.payment, zone: '' },
      items, subtotal: sub, ship, discount: disc, total: tot, status: f.status, paid: ps === 'paid', payStatus: ps, paidAmount: got, payments: got > 0 ? [{ t: now, amount: got, method: f.pmethod, note: 'Thu khi tạo đơn' }] : [], createdAt: now,
      history: [{ t: now, text: `Admin tạo đơn thủ công (nguồn: ${f.source})` }],
    })
  }
  return (
    <Modal title="Tạo đơn thủ công" onClose={onClose} wide>
      <form onSubmit={submit} className="space-y-4 text-sm">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Tên khách"><input required value={f.name} onChange={(e) => set('name', e.target.value)} className={inp} /></Field>
          <Field label="Số điện thoại"><input required value={f.phone} onChange={(e) => set('phone', e.target.value)} className={inp} /></Field>
          <div className="sm:col-span-2"><Field label="Địa chỉ giao (để trống = nhận tại xưởng)"><input value={f.address} onChange={(e) => set('address', e.target.value)} className={inp} /></Field></div>
          <Field label="Nguồn đơn"><select value={f.source} onChange={(e) => set('source', e.target.value)} className={inp}>{SOURCES.map((s) => <option key={s}>{s}</option>)}</select></Field>
          <Field label="Phương thức thanh toán"><select value={f.payment} onChange={(e) => set('payment', e.target.value)} className={inp}><option value="cod">COD / tiền mặt</option><option value="bank">Chuyển khoản</option></select></Field>
        </div>
        <div className="space-y-2">
          <p className="text-zinc-400">Món hàng</p>
          {rows.map((r, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 rounded-lg bg-ink-900 p-2">
              <select value={r.id} onChange={(e) => pickProduct(i, e.target.value)} aria-label="Chọn sản phẩm" className={`${inp} col-span-12 sm:col-span-4`}><option value="">— Món tự nhập / in theo yêu cầu —</option>{active.map((p) => <option key={p.id} value={p.id}>{p.name} ({formatVND(p.price)})</option>)}</select>
              <input value={r.name} onChange={(e) => upd(i, { name: e.target.value })} placeholder="Tên món" aria-label="Tên món" className={`${inp} col-span-12 sm:col-span-4`} />
              <select value={r.color} onChange={(e) => upd(i, { color: e.target.value })} aria-label="Màu" className={`${inp} col-span-6 sm:col-span-2`}><option value="">Màu</option>{colors.filter((c) => c.active).map((c) => <option key={c.id}>{c.name}</option>)}</select>
              <input type="number" min="1" value={r.qty} onChange={(e) => upd(i, { qty: e.target.value })} aria-label="Số lượng" className={`${inp} col-span-3 sm:col-span-1`} />
              <button type="button" onClick={() => setRows((c) => (c.length > 1 ? c.filter((_, k) => k !== i) : c))} aria-label="Xóa dòng" className="col-span-3 grid place-items-center text-zinc-500 hover:text-red-400 sm:col-span-1"><Trash2 size={16} /></button>
              <input type="number" min="0" step="1000" value={r.price} onChange={(e) => upd(i, { price: e.target.value })} aria-label="Đơn giá" className={`${inp} col-span-12`} placeholder="Đơn giá (₫)" />
            </div>))}
          <button type="button" onClick={() => setRows((c) => [...c, blank()])} className="flex items-center gap-1 text-accent"><Plus size={14} />Thêm món</button>
        </div>
        <div className="grid gap-3 sm:grid-cols-4">
          <Field label="Phí ship (₫)"><input type="number" min="0" step="1000" value={f.ship} onChange={(e) => set('ship', e.target.value)} className={inp} placeholder={`VD ${st.shipFee || 25000}`} /></Field>
          <Field label="Trạng thái đơn"><select value={f.status} onChange={(e) => set('status', e.target.value)} className={inp}>{FLOW.map((k) => <option key={k} value={k}>{ORDER_STATUS[k][0]}</option>)}</select></Field>
          <Field label="Giảm giá (₫)"><input type="number" min="0" step="1000" value={f.discount} onChange={(e) => set('discount', e.target.value)} className={inp} /></Field>
          <div className="self-end text-right text-lg font-bold text-accent">{formatVND(total)}</div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Khách đã trả (₫) – nhập số cọc nếu có"><input type="number" min="0" step="1000" value={f.paidNow} onChange={(e) => set('paidNow', e.target.value)} className={inp} placeholder="0 = chưa trả" /></Field>
          <Field label="Hình thức đã trả"><select value={f.pmethod} onChange={(e) => set('pmethod', e.target.value)} className={inp}>{PAY_METHODS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
          <p className="self-end pb-2 text-zinc-400">Còn lại: <b className="text-amber-300">{formatVND(Math.max(0, total - (+f.paidNow || 0)))}</b></p>
        </div>
        <Field label="Ghi chú"><input value={f.note} onChange={(e) => set('note', e.target.value)} className={inp} /></Field>
        {err && <p className="text-red-400">{err}</p>}
        <div className="flex justify-end gap-2"><button type="button" onClick={onClose} className={btn2}>Hủy</button><button className={btn}>Tạo đơn</button></div>
      </form>
    </Modal>
  )
}

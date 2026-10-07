import { useState } from 'react'
import { formatVND as $ } from '../../data/products.js'
import { useStore } from '../../lib/store.js'
import { num, today, uid } from '../../lib/workshop.js'
import { DataTable, Field, Modal, btn, btn2, inp, td } from '../../components/ui.jsx'

const CATS = { in: ['Thu đơn hàng', 'Thu khác'], out: ['Mua nhựa', 'Vật tư', 'Tiền điện', 'Phí sàn / ship', 'Thiết bị / linh kiện', 'Quảng cáo', 'Khác'] }
export const sumC = (a) => a.reduce((s, c) => s + c.amount, 0)

export default function WorkshopCash() {
  const [cash, setCash] = useStore('wc')
  const [month, setMonth] = useState(today().slice(0, 7)), [f, setF] = useState(null)
  const l = cash.filter((c) => c.date.startsWith(month)).sort((a, b) => b.date.localeCompare(a.date))
  const inn = sumC(l.filter((c) => c.type === 'in')), out = sumC(l.filter((c) => c.type === 'out'))
  const set = (k, v) => setF((c) => ({ ...c, [k]: v }))
  const save = () => { if (!num(f.amount)) return alert('Nhập số tiền lớn hơn 0.'); setCash((c) => [...c, { id: uid('c'), date: f.date, type: f.type, cat: f.cat, amount: num(f.amount), note: f.note }]); setF(null) }
  const add = (type) => setF({ type, date: today(), cat: CATS[type][0], amount: '', note: '' })
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3"><h1 className="mr-auto font-display text-3xl font-bold text-white">Thu chi</h1>
        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className={`${inp} w-auto`} />
        <button onClick={() => add('in')} className={btn}>+ Khoản thu</button><button onClick={() => add('out')} className={btn2}>+ Khoản chi</button></div>
      <p className="text-sm"><span className="text-emerald-400">Thu {$(inn)}</span> · <span className="text-red-400">Chi {$(out)}</span> · <b className="text-white">Chênh {$(inn - out)}</b></p>
      <DataTable heads={['Ngày', 'Loại', 'Danh mục', 'Ghi chú', 'Số tiền', '']} empty="Chưa có khoản nào trong tháng này.">
        {l.map((c) => (
          <tr key={c.id}><td className={td}>{c.date}</td><td className={`${td} ${c.type === 'in' ? 'text-emerald-400' : 'text-red-400'}`}>{c.type === 'in' ? 'Thu' : 'Chi'}</td>
            <td className={td}>{c.cat}</td><td className={td}>{c.note}</td><td className={`${td} ${c.type === 'in' ? 'text-emerald-400' : 'text-red-400'}`}>{c.type === 'in' ? '+' : '−'}{$(c.amount)}</td>
            <td className={td}><button onClick={() => confirm('Xoá khoản này?') && setCash((x) => x.filter((y) => y.id !== c.id))} className="text-sm text-zinc-500 hover:text-red-400">Xoá</button></td></tr>))}
      </DataTable>
      {f && (
        <Modal title={f.type === 'in' ? 'Khoản thu' : 'Khoản chi'} onClose={() => setF(null)}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Ngày"><input type="date" value={f.date} onChange={(e) => set('date', e.target.value)} className={inp} /></Field>
            <Field label="Danh mục"><select value={f.cat} onChange={(e) => set('cat', e.target.value)} className={inp}>{CATS[f.type].map((c) => <option key={c}>{c}</option>)}</select></Field>
            <Field label="Số tiền (đ)"><input type="number" min="0" step="1000" value={f.amount} onChange={(e) => set('amount', e.target.value)} className={inp} /></Field>
            <Field label="Ghi chú"><input value={f.note} onChange={(e) => set('note', e.target.value)} className={inp} /></Field></div>
          <div className="mt-4 flex gap-2"><button onClick={save} className={btn}>Lưu</button><button onClick={() => setF(null)} className={btn2}>Đóng</button></div>
        </Modal>)}
    </div>
  )
}

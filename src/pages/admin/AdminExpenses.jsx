import { useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { formatVND } from '../../data/products.js'
import { supa, useStore } from '../../lib/store.js'
import { must, useAsync } from '../../lib/useAsync.js'
import { downloadCSV } from '../../lib/export.js'
import { DataTable, Field, Modal, btn, btn2, inp, td } from '../../components/ui.jsx'

const CAT = { filament: 'Tiền nhựa', electricity: 'Điện', maintenance: 'Bảo trì / phụ tùng', shipping: 'Vận chuyển', packaging: 'Đóng gói', other: 'Chi phí khác' }
const today = () => new Date().toISOString().slice(0, 10)
const first = () => today().slice(0, 8) + '01'

/** Sổ chi phí: tiền nhựa, điện, chi phí khác. Có công cụ ước tính tiền điện từ lịch sử in. */
export default function AdminExpenses() {
  const [st] = useStore('settings'), [r, setR] = useState({ from: first(), to: today() }), [cat, setCat] = useState(''), [edit, setEdit] = useState(null), [err, setErr] = useState('')
  const d = useAsync(async () => {
    let q = supa.from('expenses').select('*').gte('spent_on', r.from).lte('spent_on', r.to).order('spent_on', { ascending: false }).limit(1000)
    if (cat) q = q.eq('category', cat)
    const [e, j] = await Promise.all([q, supa.from('print_queue').select('actual_hours,est_hours,printers(power_w)').eq('status', 'done').gte('finished_at', r.from + 'T00:00:00').lte('finished_at', r.to + 'T23:59:59').limit(2000)])
    return { rows: must(e), jobs: must(j) }
  }, [r.from, r.to, cat])
  const rows = d.data?.rows || [], total = rows.reduce((s, x) => s + Number(x.amount), 0), by = {}
  for (const x of rows) by[x.category] = (by[x.category] || 0) + Number(x.amount)
  const kwh = (d.data?.jobs || []).reduce((s, j) => s + (Number(j.actual_hours ?? j.est_hours) || 0) * (Number(j.printers?.power_w) || 150) / 1000, 0), price = Number(st.elecPrice) || 3000
  const save = async (e) => {
    e.preventDefault(); setErr('')
    try { const { id, created_at, order_id, ...x } = edit; x.amount = Math.round(+x.amount); id ? must(await supa.from('expenses').update(x).eq('id', id)) : must(await supa.from('expenses').insert(x)); setEdit(null); d.reload() } catch (ex) { setErr(ex.message) }
  }
  const del = async (x) => { if (confirm('Xóa khoản chi này?')) { must(await supa.from('expenses').delete().eq('id', x.id)); d.reload() } }
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="font-display text-3xl font-bold text-white">Chi phí</h1>
        <div className="flex flex-wrap gap-2"><input type="date" value={r.from} onChange={(e) => setR({ ...r, from: e.target.value })} className={`${inp} w-auto`} /><input type="date" value={r.to} onChange={(e) => setR({ ...r, to: e.target.value })} className={`${inp} w-auto`} />
          <select value={cat} onChange={(e) => setCat(e.target.value)} className={`${inp} w-auto`}><option value="">Mọi loại</option>{Object.entries(CAT).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          <button onClick={() => downloadCSV('chi-phi.csv', [['Ngày', 'Loại', 'Số tiền', 'Ghi chú'], ...rows.map((x) => [x.spent_on, CAT[x.category], x.amount, x.note || ''])])} className={btn2}>Xuất Excel</button>
          <button onClick={() => { setEdit({ spent_on: today(), category: 'other', amount: '', note: '' }); setErr('') }} className={`${btn} flex items-center gap-1`}><Plus size={16} />Thêm</button></div></div>
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4"><div className="rounded-xl border border-white/10 bg-ink-800 p-4"><p className="text-sm text-zinc-400">Tổng chi trong kỳ</p><p className="font-display text-2xl font-bold text-white">{formatVND(total)}</p></div>
        {Object.entries(by).map(([k, v]) => <div key={k} className="rounded-xl border border-white/10 bg-ink-800 p-4"><p className="text-sm text-zinc-400">{CAT[k]}</p><p className="font-display text-xl font-bold text-white">{formatVND(v)}</p></div>)}</div>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-ink-800 p-4 text-sm text-zinc-300">
        <span>Ước tính điện từ lịch in đã xong trong kỳ: <b className="text-white">{kwh.toFixed(1)} kWh</b> × {formatVND(price)}/kWh = <b className="text-white">{formatVND(Math.round(kwh * price))}</b> <span className="text-zinc-500">(giá điện chỉnh ở Cài đặt → elecPrice, mặc định 3.000₫)</span></span>
        <button disabled={!kwh} onClick={() => { setEdit({ spent_on: r.to, category: 'electricity', amount: Math.round(kwh * price), note: `Tiền điện ước tính ${r.from} → ${r.to}` }); setErr('') }} className={btn2}>Ghi vào chi phí</button></div>
      {d.error && <p className="text-red-400">{d.error.message}</p>}
      <DataTable heads={['Ngày', 'Loại', 'Số tiền', 'Ghi chú', '']} empty={d.loading ? 'Đang tải…' : 'Chưa có khoản chi'}>
        {rows.map((x) => (<tr key={x.id}><td className={td}>{x.spent_on}</td><td className={td}>{CAT[x.category]}</td><td className={`${td} font-medium text-white`}>{formatVND(x.amount)}</td><td className={td}>{x.note || '—'}</td>
          <td className={`${td} whitespace-nowrap text-right`}><button onClick={() => { setEdit(x); setErr('') }} className="p-2 text-zinc-400 hover:text-white"><Pencil size={16} /></button><button onClick={() => del(x)} className="p-2 text-zinc-400 hover:text-red-400"><Trash2 size={16} /></button></td></tr>))}
      </DataTable>
      {edit && (
        <Modal title={edit.id ? 'Sửa khoản chi' : 'Thêm khoản chi'} onClose={() => setEdit(null)}>
          <form onSubmit={save} className="space-y-4">
            <div className="grid grid-cols-2 gap-3"><Field label="Ngày"><input type="date" required value={edit.spent_on} onChange={(e) => setEdit({ ...edit, spent_on: e.target.value })} className={inp} /></Field>
              <Field label="Loại"><select value={edit.category} onChange={(e) => setEdit({ ...edit, category: e.target.value })} className={inp}>{Object.entries(CAT).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field></div>
            <Field label="Số tiền (₫)"><input required type="number" min="0" step="1000" value={edit.amount} onChange={(e) => setEdit({ ...edit, amount: e.target.value })} className={inp} /></Field>
            <Field label="Ghi chú"><input value={edit.note || ''} onChange={(e) => setEdit({ ...edit, note: e.target.value })} className={inp} /></Field>
            {err && <p className="text-sm text-red-400">{err}</p>}
            <div className="flex justify-end gap-2"><button type="button" onClick={() => setEdit(null)} className={btn2}>Hủy</button><button className={btn}>Lưu</button></div>
          </form>
        </Modal>)}
    </div>
  )
}

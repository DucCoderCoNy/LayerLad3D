import { useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { formatVND } from '../../data/products.js'
import { supa } from '../../lib/store.js'
import { must, useAsync } from '../../lib/useAsync.js'
import { DataTable, Field, Modal, btn, btn2, inp, td } from '../../components/ui.jsx'

const EMPTY = { code: '', kind: 'percent', value: 10, min_subtotal: 0, max_discount: '', starts_at: '', ends_at: '', usage_limit: '', active: true, note: '' }
const loc = (iso) => (iso ? new Date(new Date(iso).getTime() - new Date(iso).getTimezoneOffset() * 6e4).toISOString().slice(0, 16) : '')

/** Mã giảm giá: theo % (có thể giới hạn mức giảm tối đa) hoặc số tiền cố định; đơn tối thiểu, thời hạn, số lượt dùng */
export default function AdminVouchers() {
  const [edit, setEdit] = useState(null), [err, setErr] = useState('')
  const d = useAsync(async () => must(await supa.from('vouchers').select('*').order('created_at', { ascending: false })), [])
  const set = (k, v) => setEdit((c) => ({ ...c, [k]: v }))
  const save = async (e) => {
    e.preventDefault(); setErr('')
    try {
      const { id, created_at, used_count, ...r } = edit
      const row = { ...r, code: r.code.trim().toUpperCase(), value: Math.round(+r.value), min_subtotal: Math.round(+r.min_subtotal || 0), max_discount: r.max_discount === '' || r.max_discount == null ? null : Math.round(+r.max_discount),
        usage_limit: r.usage_limit === '' || r.usage_limit == null ? null : Math.round(+r.usage_limit), starts_at: r.starts_at ? new Date(r.starts_at).toISOString() : null, ends_at: r.ends_at ? new Date(r.ends_at).toISOString() : null }
      if (row.kind === 'percent' && (row.value < 1 || row.value > 100)) return setErr('Phần trăm giảm phải từ 1 đến 100')
      id ? must(await supa.from('vouchers').update(row).eq('id', id)) : must(await supa.from('vouchers').insert(row))
      setEdit(null); d.reload()
    } catch (x) { setErr(/duplicate/.test(x.message) ? 'Mã này đã tồn tại' : /check/.test(x.message) ? 'Mã chỉ gồm chữ HOA, số, gạch (3–30 ký tự)' : x.message) }
  }
  const del = async (v) => { if (confirm(`Xóa mã ${v.code}?`)) { must(await supa.from('vouchers').delete().eq('id', v.id)); d.reload() } }
  const state = (v) => (!v.active ? 'Tắt' : v.ends_at && new Date(v.ends_at) < new Date() ? 'Hết hạn' : v.usage_limit && v.used_count >= v.usage_limit ? 'Hết lượt' : 'Đang chạy')
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between"><h1 className="font-display text-3xl font-bold text-white">Mã giảm giá</h1>
        <button onClick={() => { setEdit(EMPTY); setErr('') }} className={`${btn} flex items-center gap-1`}><Plus size={16} />Tạo mã</button></div>
      {d.error && <p className="text-red-400">{d.error.message}</p>}
      <DataTable heads={['Mã', 'Giảm', 'Điều kiện', 'Đã dùng', 'Trạng thái', '']} empty={d.loading ? 'Đang tải…' : 'Chưa có mã giảm giá'}>
        {(d.data || []).map((v) => (
          <tr key={v.id}><td className={`${td} font-mono font-medium text-white`}>{v.code}</td>
            <td className={td}>{v.kind === 'percent' ? `${v.value}%${v.max_discount ? ` (tối đa ${formatVND(v.max_discount)})` : ''}` : formatVND(v.value)}</td>
            <td className={td}>{v.min_subtotal ? `Đơn từ ${formatVND(v.min_subtotal)}` : 'Không'}{v.ends_at && <><br /><span className="text-xs text-zinc-500">Đến {new Date(v.ends_at).toLocaleDateString('vi-VN')}</span></>}</td>
            <td className={td}>{v.used_count}{v.usage_limit ? ` / ${v.usage_limit}` : ''}</td><td className={td}>{state(v)}</td>
            <td className={`${td} whitespace-nowrap text-right`}><button onClick={() => { setEdit({ ...v, max_discount: v.max_discount ?? '', usage_limit: v.usage_limit ?? '', starts_at: loc(v.starts_at), ends_at: loc(v.ends_at) }); setErr('') }} className="p-2 text-zinc-400 hover:text-white"><Pencil size={16} /></button>
              <button onClick={() => del(v)} className="p-2 text-zinc-400 hover:text-red-400"><Trash2 size={16} /></button></td></tr>))}
      </DataTable>
      {edit && (
        <Modal title={edit.id ? 'Sửa mã giảm giá' : 'Tạo mã giảm giá'} onClose={() => setEdit(null)} wide>
          <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
            <Field label="Mã (chữ HOA, số, gạch; vd KHAITRUONG10)"><input required value={edit.code} onChange={(e) => set('code', e.target.value.toUpperCase())} className={`${inp} font-mono`} /></Field>
            <Field label="Kiểu giảm"><select value={edit.kind} onChange={(e) => set('kind', e.target.value)} className={inp}><option value="percent">Theo phần trăm (%)</option><option value="fixed">Số tiền cố định (₫)</option></select></Field>
            <Field label={edit.kind === 'percent' ? 'Giảm (%)' : 'Giảm (₫)'}><input required type="number" min="1" value={edit.value} onChange={(e) => set('value', e.target.value)} className={inp} /></Field>
            <Field label="Đơn tối thiểu (₫)"><input type="number" min="0" step="1000" value={edit.min_subtotal} onChange={(e) => set('min_subtotal', e.target.value)} className={inp} /></Field>
            {edit.kind === 'percent' && <Field label="Giảm tối đa (₫, để trống = không giới hạn)"><input type="number" min="0" step="1000" value={edit.max_discount} onChange={(e) => set('max_discount', e.target.value)} className={inp} /></Field>}
            <Field label="Số lượt dùng tối đa (để trống = không giới hạn)"><input type="number" min="1" value={edit.usage_limit} onChange={(e) => set('usage_limit', e.target.value)} className={inp} /></Field>
            <Field label="Bắt đầu"><input type="datetime-local" value={edit.starts_at} onChange={(e) => set('starts_at', e.target.value)} className={inp} /></Field>
            <Field label="Kết thúc"><input type="datetime-local" value={edit.ends_at} onChange={(e) => set('ends_at', e.target.value)} className={inp} /></Field>
            <div className="sm:col-span-2"><Field label="Ghi chú nội bộ"><input value={edit.note || ''} onChange={(e) => set('note', e.target.value)} className={inp} /></Field></div>
            <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={edit.active} onChange={(e) => set('active', e.target.checked)} className="accent-orange-500" />Đang bật</label>
            {err && <p className="text-sm text-red-400 sm:col-span-2">{err}</p>}
            <div className="flex justify-end gap-2 sm:col-span-2"><button type="button" onClick={() => setEdit(null)} className={btn2}>Hủy</button><button className={btn}>Lưu</button></div>
          </form>
        </Modal>)}
    </div>
  )
}

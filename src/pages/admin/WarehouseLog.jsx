import { useMemo, useState } from 'react'
import { useStore } from '../../lib/store.js'
import { downloadCSV } from '../../lib/export.js'
import { dayKey, inRange, presetRange } from '../../lib/finance.js'
import { KIND_LABEL, OUT_REASONS, REASONS } from '../../lib/warehouse.js'
import DateRange from '../../components/DateRange.jsx'
import { DataTable, btn2, inp, td } from '../../components/ui.jsx'

const PAGE = 50

/** Lịch sử xuất nhập kho: mọi lần số lượng nhựa / vật tư / thành phẩm thay đổi, kèm lý do và đơn liên quan. */
export default function WarehouseLog() {
  const [moves] = useStore('wmove')
  const [range, setRange] = useState(() => presetRange('month')), [kind, setKind] = useState(''), [reason, setReason] = useState(''), [q, setQ] = useState(''), [page, setPage] = useState(1)
  const rows = useMemo(() => [...moves].reverse().filter((m) => inRange(dayKey(m.t), range[0], range[1]) && (!kind || m.kind === kind) && (!reason || m.reason === reason)
    && (!q.trim() || `${m.name} ${m.note || ''} ${m.ref || ''}`.toLowerCase().includes(q.trim().toLowerCase()))), [moves, range, kind, reason, q])
  const sum = (f) => rows.filter(f).reduce((t, m) => t + m.delta, 0)
  const inG = sum((m) => m.kind === 'filament' && m.delta > 0), outG = -sum((m) => m.kind === 'filament' && OUT_REASONS.includes(m.reason) && m.reason !== 'In lỗi'), wasteG = -sum((m) => m.reason === 'In lỗi')
  const pages = Math.max(1, Math.ceil(rows.length / PAGE)), cur = Math.min(page, pages)
  const exportCsv = () => downloadCSV('lich-su-kho.csv', [['Thời gian', 'Loại', 'Mục', 'Thay đổi', 'Đơn vị', 'Còn lại sau đó', 'Lý do', 'Tham chiếu', 'Ghi chú'], ...rows.map((m) => [new Date(m.t).toLocaleString('vi-VN'), KIND_LABEL[m.kind], m.name, m.delta, m.unit, m.after ?? '', m.reason, m.ref || '', m.note || ''])])
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3"><h1 className="mr-auto font-display text-3xl font-bold text-white">Lịch sử xuất nhập kho</h1><button onClick={exportCsv} className={btn2}>Xuất Excel (CSV)</button></div>
      <div className="space-y-3 rounded-2xl border border-white/10 bg-ink-800 p-4">
        <DateRange value={range} onChange={(r) => { setRange(r); setPage(1) }} />
        <div className="flex flex-wrap gap-2">
          <select value={kind} onChange={(e) => { setKind(e.target.value); setPage(1) }} aria-label="Lọc theo loại" className={`${inp} w-40`}><option value="">Mọi loại</option>{Object.entries(KIND_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
          <select value={reason} onChange={(e) => { setReason(e.target.value); setPage(1) }} aria-label="Lọc theo lý do" className={`${inp} w-52`}><option value="">Mọi lý do</option>{REASONS.map((r) => <option key={r}>{r}</option>)}</select>
          <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} placeholder="Tìm tên, ghi chú, mã đơn…" aria-label="Tìm trong lịch sử" className={`${inp} w-60`} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[['Số dòng', rows.length, 'text-white'], ['Nhựa nhập vào', `${Math.round(inG)} g`, 'text-emerald-400'], ['Nhựa dùng cho đơn', `${Math.round(outG)} g`, 'text-white'], ['Nhựa hao do in lỗi', `${Math.round(wasteG)} g`, wasteG > 0 ? 'text-red-300' : 'text-white']].map(([l, v, c]) => <div key={l} className="rounded-xl border border-white/10 bg-ink-800 p-4"><p className="text-sm text-zinc-400">{l}</p><p className={`mt-1 font-display text-2xl font-bold ${c}`}>{v}</p></div>)}
      </div>
      <DataTable heads={['Thời gian', 'Loại', 'Mục', 'Thay đổi', 'Còn lại', 'Lý do', 'Ghi chú']} empty="Chưa có ghi nhận nào trong bộ lọc. Lịch sử bắt đầu ghi từ khi cập nhật bản này.">
        {rows.slice((cur - 1) * PAGE, cur * PAGE).map((m) => (
          <tr key={m.id}><td className={`${td} whitespace-nowrap text-zinc-400`}>{new Date(m.t).toLocaleString('vi-VN')}</td><td className={td}>{KIND_LABEL[m.kind]}</td><td className={`${td} text-white`}>{m.name}</td>
            <td className={`${td} whitespace-nowrap font-medium ${m.delta > 0 ? 'text-emerald-400' : 'text-red-300'}`}>{m.delta > 0 ? '+' : ''}{m.delta} {m.unit}</td><td className={td}>{m.after ?? '—'} {m.after != null && m.unit}</td>
            <td className={td}>{m.reason}</td><td className={`${td} max-w-64 truncate text-zinc-500`} title={m.note}>{m.note}{m.ref && <small className="block text-zinc-600">{m.ref}</small>}</td></tr>))}
      </DataTable>
      {pages > 1 && <div className="flex items-center justify-center gap-3 text-sm"><button disabled={cur <= 1} onClick={() => setPage(cur - 1)} className={btn2}>‹</button>Trang {cur}/{pages}<button disabled={cur >= pages} onClick={() => setPage(cur + 1)} className={btn2}>›</button></div>}
    </div>
  )
}

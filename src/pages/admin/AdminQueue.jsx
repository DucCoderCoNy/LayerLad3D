import { useState } from 'react'
import { Pencil } from 'lucide-react'
import { supa } from '../../lib/store.js'
import { must, useAsync } from '../../lib/useAsync.js'
import { DataTable, Field, Modal, btn, btn2, inp, td } from '../../components/ui.jsx'

const JOB = { queued: ['Chờ in', 'bg-sky-500/20 text-sky-300'], printing: ['Đang in', 'bg-accent/20 text-accent'], done: ['Xong', 'bg-emerald-500/20 text-emerald-300'], failed: ['Lỗi', 'bg-red-500/20 text-red-300'], cancelled: ['Hủy', 'bg-zinc-500/20 text-zinc-400'] }
const loc = (iso) => (iso ? new Date(new Date(iso).getTime() - new Date(iso).getTimezoneOffset() * 6e4).toISOString().slice(0, 16) : '')
const mon = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x }
const hm = (iso) => new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })

/** Hàng đợi in + lịch tuần. Việc được thêm từ chi tiết đơn hàng ("Đưa vào hàng đợi in"). */
export default function AdminQueue() {
  const [tab, setTab] = useState('queue'), [week, setWeek] = useState(mon(new Date())), [edit, setEdit] = useState(null), [err, setErr] = useState('')
  const d = useAsync(async () => {
    const [j, p, f] = await Promise.all([
      supa.from('print_queue').select('*, orders(code,customer_name), order_items(name), printers(name)').not('status', 'in', '(done,cancelled)').order('priority', { ascending: false }).order('created_at').limit(300),
      supa.from('printers').select('id,name,status').eq('active', true).order('created_at'),
      supa.from('filament_inventory').select('id,material,color_name,remaining_g').gt('remaining_g', 0).order('material'),
    ])
    return { jobs: must(j), printers: must(p), fil: must(f) }
  }, [])
  const cal = useAsync(async () => {
    const a = week.toISOString(), b = new Date(week.getTime() + 7 * 864e5).toISOString()
    return must(await supa.from('print_queue').select('id,status,scheduled_start,scheduled_end,orders(code),printers(name),order_items(name)').gte('scheduled_end', a).lte('scheduled_start', b).neq('status', 'cancelled'))
  }, [week.getTime()])
  const refresh = () => { d.reload(); cal.reload() }
  const set = (k, v) => setEdit((c) => ({ ...c, [k]: v }))
  const save = async (e) => {
    e.preventDefault(); setErr('')
    try {
      const { id, orders, order_items, printers, created_at, updated_at, ...r } = edit
      const row = { ...r, printer_id: r.printer_id || null, filament_id: r.filament_id || null, est_grams: r.est_grams === '' ? null : r.est_grams, est_hours: r.est_hours === '' ? null : r.est_hours,
        actual_grams: r.actual_grams === '' ? null : r.actual_grams, actual_hours: r.actual_hours === '' ? null : r.actual_hours, priority: +r.priority || 0, due_date: r.due_date || null,
        scheduled_start: r.scheduled_start ? new Date(r.scheduled_start).toISOString() : null, scheduled_end: r.scheduled_end ? new Date(r.scheduled_end).toISOString() : null }
      if (row.status === 'printing' && !row.started_at) row.started_at = new Date().toISOString()
      if (['done', 'failed'].includes(row.status) && !row.finished_at) row.finished_at = new Date().toISOString()
      must(await supa.from('print_queue').update(row).eq('id', id))
      if (row.printer_id) must(await supa.from('printers').update({ status: row.status === 'printing' ? 'printing' : 'idle' }).eq('id', row.printer_id).neq('status', 'maintenance').neq('status', 'offline'))
      setEdit(null); refresh()
    } catch (x) { setErr(x.message) }
  }
  // Xếp lịch tự động: việc chưa có lịch lần lượt vào máy rảnh sớm nhất (theo thời lượng ước tính + 15 phút nghỉ)
  const autoSchedule = async () => {
    const free = Object.fromEntries(d.data.printers.map((p) => [p.id, Date.now()]))
    for (const j of d.data.jobs) if (j.scheduled_end && j.printer_id in free) free[j.printer_id] = Math.max(free[j.printer_id], new Date(j.scheduled_end).getTime())
    for (const j of d.data.jobs.filter((x) => x.status === 'queued' && !x.scheduled_start)) {
      const pid = j.printer_id || Object.entries(free).sort((a, b) => a[1] - b[1])[0]?.[0]; if (!pid) return alert('Chưa có máy in nào đang hoạt động')
      const start = free[pid], end = start + Math.max(0.25, Number(j.est_hours) || 1) * 36e5
      must(await supa.from('print_queue').update({ printer_id: pid, scheduled_start: new Date(start).toISOString(), scheduled_end: new Date(end).toISOString() }).eq('id', j.id)); free[pid] = end + 15 * 6e4
    }
    refresh()
  }
  const days = [...Array(7)].map((_, i) => new Date(week.getTime() + i * 864e5))
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="font-display text-3xl font-bold text-white">Máy in & lịch in</h1>
        <div className="flex gap-2"><button onClick={() => setTab('queue')} className={tab === 'queue' ? btn : btn2}>Hàng đợi</button><button onClick={() => setTab('cal')} className={tab === 'cal' ? btn : btn2}>Lịch tuần</button><button onClick={autoSchedule} className={btn2}>Xếp lịch tự động</button></div></div>
      {(d.error || cal.error) && <p className="text-red-400">{(d.error || cal.error).message}</p>}
      {tab === 'queue' ? (
        <DataTable heads={['Đơn', 'Việc', 'Máy', 'Ước tính', 'Lịch', 'Trạng thái', '']} empty={d.loading ? 'Đang tải…' : 'Hàng đợi trống. Vào Đơn hàng → mở đơn → "Đưa vào hàng đợi in".'}>
          {(d.data?.jobs || []).map((j) => (
            <tr key={j.id}><td className={`${td} font-medium text-white`}>{j.orders?.code}<br /><span className="text-xs text-zinc-500">{j.orders?.customer_name}</span></td><td className={td}>{j.order_items?.name || '—'}</td><td className={td}>{j.printers?.name || 'Chưa gán'}</td>
              <td className={td}>{j.est_grams ? `${j.est_grams}g` : '—'} · {j.est_hours ? `${j.est_hours}h` : '—'}</td><td className={td}>{j.scheduled_start ? `${new Date(j.scheduled_start).toLocaleDateString('vi-VN')} ${hm(j.scheduled_start)}` : '—'}</td>
              <td className={td}><span className={`rounded-full px-2.5 py-1 text-xs ${JOB[j.status][1]}`}>{JOB[j.status][0]}</span></td>
              <td className={`${td} text-right`}><button onClick={() => { setEdit({ ...j, scheduled_start: loc(j.scheduled_start), scheduled_end: loc(j.scheduled_end) }); setErr('') }} className="p-2 text-zinc-400 hover:text-white"><Pencil size={16} /></button></td></tr>))}
        </DataTable>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2"><button onClick={() => setWeek(new Date(week.getTime() - 7 * 864e5))} className={btn2}>← Tuần trước</button><button onClick={() => setWeek(mon(new Date()))} className={btn2}>Tuần này</button><button onClick={() => setWeek(new Date(week.getTime() + 7 * 864e5))} className={btn2}>Tuần sau →</button>
            <span className="text-sm text-zinc-400">{days[0].toLocaleDateString('vi-VN')} – {days[6].toLocaleDateString('vi-VN')}</span></div>
          <div className="grid gap-2 md:grid-cols-7">{days.map((day) => {
            const s = day.getTime(), e = s + 864e5, jobs = (cal.data || []).filter((j) => new Date(j.scheduled_start).getTime() < e && new Date(j.scheduled_end).getTime() > s).sort((a, b) => a.scheduled_start.localeCompare(b.scheduled_start))
            return (<div key={s} className={`min-h-32 rounded-xl border p-2 ${new Date().toDateString() === day.toDateString() ? 'border-accent' : 'border-white/10'} bg-ink-800`}>
              <p className="mb-2 text-xs font-semibold text-zinc-300">{['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'][(day.getDay() + 6) % 7]} {day.getDate()}/{day.getMonth() + 1}</p>
              {jobs.map((j) => <div key={j.id} className={`mb-1 rounded-lg p-1.5 text-[11px] leading-tight ${JOB[j.status][1]}`}><b>{j.orders?.code}</b> · {j.printers?.name || '?'}<br />{hm(j.scheduled_start)}–{hm(j.scheduled_end)}</div>)}</div>)})}</div>
        </div>)}
      {edit && (
        <Modal title={`Việc in – đơn ${edit.orders?.code}`} onClose={() => setEdit(null)} wide>
          <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
            <Field label="Máy in"><select value={edit.printer_id || ''} onChange={(e) => set('printer_id', e.target.value)} className={inp}><option value="">Chưa gán</option>{d.data.printers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
            <Field label="Cuộn nhựa dùng (để tự trừ kho)"><select value={edit.filament_id || ''} onChange={(e) => set('filament_id', e.target.value)} className={inp}><option value="">Chưa chọn</option>{d.data.fil.map((x) => <option key={x.id} value={x.id}>{x.material} {x.color_name} (còn {Math.round(x.remaining_g)}g)</option>)}</select></Field>
            <Field label="Trạng thái"><select value={edit.status} onChange={(e) => set('status', e.target.value)} className={inp}>{Object.entries(JOB).map(([k, v]) => <option key={k} value={k}>{v[0]}</option>)}</select></Field>
            <Field label="Ưu tiên (số lớn in trước)"><input type="number" value={edit.priority} onChange={(e) => set('priority', e.target.value)} className={inp} /></Field>
            <Field label="Bắt đầu theo lịch"><input type="datetime-local" value={edit.scheduled_start} onChange={(e) => set('scheduled_start', e.target.value)} className={inp} /></Field>
            <Field label="Kết thúc theo lịch"><input type="datetime-local" value={edit.scheduled_end} onChange={(e) => set('scheduled_end', e.target.value)} className={inp} /></Field>
            <Field label="Gram ước tính"><input type="number" step="0.1" value={edit.est_grams ?? ''} onChange={(e) => set('est_grams', e.target.value)} className={inp} /></Field>
            <Field label="Giờ ước tính"><input type="number" step="0.1" value={edit.est_hours ?? ''} onChange={(e) => set('est_hours', e.target.value)} className={inp} /></Field>
            <Field label="Gram thực tế (nếu có, dùng để trừ kho)"><input type="number" step="0.1" value={edit.actual_grams ?? ''} onChange={(e) => set('actual_grams', e.target.value)} className={inp} /></Field>
            <Field label="Giờ thực tế"><input type="number" step="0.1" value={edit.actual_hours ?? ''} onChange={(e) => set('actual_hours', e.target.value)} className={inp} /></Field>
            <Field label="Hạn giao"><input type="date" value={edit.due_date || ''} onChange={(e) => set('due_date', e.target.value)} className={inp} /></Field>
            <Field label="Ghi chú"><input value={edit.note || ''} onChange={(e) => set('note', e.target.value)} className={inp} /></Field>
            {err && <p className="text-sm text-red-400 sm:col-span-2">{err}</p>}
            <div className="flex justify-end gap-2 sm:col-span-2"><button type="button" onClick={() => setEdit(null)} className={btn2}>Hủy</button><button className={btn}>Lưu</button></div>
          </form>
        </Modal>)}
    </div>
  )
}

import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { supa } from '../../lib/store.js'
import { must, useAsync } from '../../lib/useAsync.js'
import { Field, Modal, btn, btn2, inp } from '../../components/ui.jsx'

const ST = { new: ['Mới', 'bg-accent/20 text-accent'], read: ['Đã đọc', 'bg-sky-500/20 text-sky-300'], done: ['Đã xử lý', 'bg-emerald-500/20 text-emerald-300'] }
const PAGE = 20

/** Hộp thư liên hệ: tin nhắn khách gửi từ trang Liên hệ */
export default function AdminMessages() {
  const [filter, setFilter] = useState(''), [page, setPage] = useState(0), [sel, setSel] = useState(null), [note, setNote] = useState('')
  const d = useAsync(async () => {
    let q = supa.from('contact_messages').select('*', { count: 'exact' }).order('created_at', { ascending: false }).range(page * PAGE, page * PAGE + PAGE - 1)
    if (filter) q = q.eq('status', filter)
    const { data, error, count } = await q; if (error) throw error
    return { rows: data, count }
  }, [filter, page])
  const rows = d.data?.rows || [], pages = Math.max(1, Math.ceil((d.data?.count || 0) / PAGE))
  const open = async (m) => { setSel(m); setNote(m.admin_note || ''); if (m.status === 'new') { must(await supa.from('contact_messages').update({ status: 'read' }).eq('id', m.id)); d.reload() } }
  const save = async (status) => { must(await supa.from('contact_messages').update({ status, admin_note: note || null }).eq('id', sel.id)); setSel(null); d.reload() }
  const del = async () => { if (confirm('Xóa tin nhắn này?')) { must(await supa.from('contact_messages').delete().eq('id', sel.id)); setSel(null); d.reload() } }
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="font-display text-3xl font-bold text-white">Tin nhắn liên hệ <span className="text-base font-normal text-zinc-500">({d.data?.count ?? '…'})</span></h1>
        <select value={filter} onChange={(e) => { setFilter(e.target.value); setPage(0) }} className={`${inp} w-auto`}><option value="">Tất cả</option>{Object.entries(ST).map(([k, v]) => <option key={k} value={k}>{v[0]}</option>)}</select></div>
      {d.error && <p className="text-red-400">{/relation|schema cache/i.test(d.error.message) ? 'Chưa có bảng tin nhắn: chạy supabase/migrations/005_contact_messages.sql' : d.error.message}</p>}
      <ul className="space-y-2">{rows.map((m) => (
        <li key={m.id}><button onClick={() => open(m)} className="flex w-full items-start justify-between gap-3 rounded-xl border border-white/10 bg-ink-800 p-4 text-left hover:border-accent/60">
          <div className="min-w-0"><p className="font-semibold text-white">{m.name} <span className="font-normal text-zinc-500">· {m.phone || m.email}</span></p><p className="mt-1 line-clamp-2 text-sm text-zinc-400">{m.message}</p></div>
          <div className="shrink-0 text-right"><span className={`rounded-full px-2.5 py-1 text-xs ${ST[m.status][1]}`}>{ST[m.status][0]}</span><p className="mt-1 text-xs text-zinc-500">{new Date(m.created_at).toLocaleString('vi-VN')}</p></div></button></li>))}
        {!rows.length && <li className="py-16 text-center text-zinc-500">{d.loading ? 'Đang tải…' : 'Chưa có tin nhắn'}</li>}</ul>
      <div className="flex items-center justify-center gap-3 text-sm text-zinc-300"><button disabled={page === 0} onClick={() => setPage(page - 1)} className="rounded-lg bg-white/10 px-4 py-2 disabled:opacity-40">← Trước</button><span>Trang {page + 1}/{pages}</span><button disabled={page >= pages - 1} onClick={() => setPage(page + 1)} className="rounded-lg bg-white/10 px-4 py-2 disabled:opacity-40">Sau →</button></div>
      {sel && (
        <Modal title={sel.name} onClose={() => setSel(null)}>
          <div className="space-y-4 text-sm">
            <p className="text-zinc-400">{new Date(sel.created_at).toLocaleString('vi-VN')}{sel.user_id && ' · khách có tài khoản'}</p>
            <p className="whitespace-pre-wrap rounded-xl bg-ink-900 p-4 text-zinc-200">{sel.message}</p>
            <div className="flex flex-wrap gap-2">{sel.phone && <a href={`tel:${sel.phone.replace(/[^\d+]/g, '')}`} className={btn2}>Gọi {sel.phone}</a>}{sel.phone && <a href={`https://zalo.me/${sel.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className={btn2}>Mở Zalo</a>}{sel.email && <a href={`mailto:${sel.email}`} className={btn2}>Gửi email</a>}</div>
            <Field label="Ghi chú nội bộ"><textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} className={inp} /></Field>
            <div className="flex items-center justify-between"><button onClick={del} className="flex items-center gap-1 text-red-400 hover:underline"><Trash2 size={14} />Xóa</button>
              <div className="flex gap-2"><button onClick={() => save('read')} className={btn2}>Lưu</button><button onClick={() => save('done')} className={btn}>Đã xử lý</button></div></div>
          </div>
        </Modal>)}
    </div>
  )
}

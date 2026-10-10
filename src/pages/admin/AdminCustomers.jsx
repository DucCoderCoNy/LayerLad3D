import { useMemo, useState } from 'react'
import { MessageCircle } from 'lucide-react'
import { downloadCSV } from '../../lib/export.js'
import { formatVND } from '../../data/products.js'
import { useStore } from '../../lib/store.js'
import { normPhone } from '../../lib/seo.js'
import { zaloLink } from '../../lib/orderTools.js'
import { dueOf } from '../../lib/receivables.js'
import { rulesOf } from '../../lib/rules.js'
import { Badge, DataTable, Modal, ORDER_STATUS, btn, btn2, inp, td } from '../../components/ui.jsx'

const TAGS = ['', 'Khách quen', 'VIP', 'Cần lưu ý']
const TAG_CLS = { 'Khách quen': 'bg-sky-500/20 text-sky-300', VIP: 'bg-amber-500/20 text-amber-300', 'Cần lưu ý': 'bg-red-500/20 text-red-300' }
const winback = (c) => `Chào ${c.name}, lâu rồi LayerLab 3D chưa được gặp bạn! Bên mình vừa có thêm màu nhựa và mẫu mới, bạn cần in gì cứ nhắn mình nhé. Mình hỗ trợ báo giá nhanh ạ.`

/** Khách hàng: tổng hợp từ đơn hàng theo số điện thoại. Phân loại (quen/VIP/cần lưu ý), ghi chú nội bộ, và danh sách khách lâu chưa mua để chăm sóc lại. */
export default function AdminCustomers() {
  const [orders] = useStore('orders'), [notes, setNotes] = useStore('customers'), [st] = useStore('settings')
  const LAPSED = rulesOf(st).lapsedDays // số ngày không mua được coi là "lâu chưa quay lại" (Cài đặt → Quy tắc)
  const [q, setQ] = useState(''), [sel, setSel] = useState(null), [draft, setDraft] = useState({ note: '', tag: '' }), [filter, setFilter] = useState('all'), [msg, setMsg] = useState('')
  const now = Date.now()
  const noteOf = (p) => notes.find((n) => n.id === p) || {}
  const list = useMemo(() => {
    const m = new Map()
    for (const o of orders) {
      const k = normPhone(o.customer?.phone); if (!k) continue
      const c = m.get(k) || { phone: k, name: o.customer.name, address: o.customer.address, orders: [], spent: 0, due: 0, last: 0 }
      c.orders.push(o); if (o.status !== 'cancelled') c.spent += o.total
      c.due += dueOf(o)
      if (o.createdAt > c.last) { c.last = o.createdAt; c.name = o.customer.name; c.address = o.customer.address }
      m.set(k, c)
    }
    return [...m.values()].map((c) => ({ ...c, days: Math.floor((now - c.last) / 864e5), n: c.orders.filter((o) => o.status !== 'cancelled').length })).sort((a, b) => b.last - a.last)
  }, [orders])
  const tagOf = (c) => noteOf(c.phone).tag || (c.n >= 3 ? 'Khách quen' : '')
  const counts = { all: list.length, vip: list.filter((c) => tagOf(c) === 'VIP').length, regular: list.filter((c) => tagOf(c) === 'Khách quen').length, lapsed: list.filter((c) => c.days >= LAPSED && c.n > 0).length, once: list.filter((c) => c.n === 1).length, due: list.filter((c) => c.due > 0).length }
  const shown = list.filter((c) => (!q.trim() || `${c.name} ${c.phone}`.toLowerCase().includes(q.trim().toLowerCase()))
    && (filter === 'all' || (filter === 'vip' && tagOf(c) === 'VIP') || (filter === 'regular' && tagOf(c) === 'Khách quen') || (filter === 'lapsed' && c.days >= LAPSED && c.n > 0) || (filter === 'once' && c.n === 1) || (filter === 'due' && c.due > 0)))
  const c = list.find((x) => x.phone === sel)
  const save = () => { setNotes((cur) => (cur.some((n) => n.id === sel) ? cur.map((n) => (n.id === sel ? { ...n, ...draft } : n)) : [...cur, { id: sel, ...draft }])); setSel(null) }
  const copyWin = (x) => navigator.clipboard?.writeText(winback(x)).then(() => setMsg(`Đã copy tin nhắn chăm sóc cho ${x.name} – dán vào Zalo.`), () => setMsg('Không copy được.'))
  const FILTERS = [['all', 'Tất cả'], ['vip', 'VIP'], ['regular', 'Khách quen'], ['lapsed', `Lâu chưa mua (>${LAPSED} ngày)`], ['once', 'Mới mua 1 lần'], ['due', 'Còn nợ']]

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-bold text-white">Khách hàng</h1>
        <div className="flex gap-2"><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm tên / SĐT" className={`${inp} w-52`} />
          <button className={btn2} onClick={() => downloadCSV('khach-hang.csv', [['Tên', 'SĐT', 'Địa chỉ gần nhất', 'Số đơn', 'Đã mua (₫)', 'Còn nợ (₫)', 'Mua gần nhất (ngày trước)', 'Phân loại', 'Ghi chú'], ...shown.map((x) => [x.name, x.phone, x.address, x.n, x.spent, x.due, x.days, tagOf(x), noteOf(x.phone).note || ''])])}>Xuất Excel (CSV)</button></div>
      </div>
      <div className="flex flex-wrap gap-2">{FILTERS.map(([k, l]) => <button key={k} onClick={() => setFilter(k)} className={`rounded-full px-3 py-1.5 text-xs ${filter === k ? 'bg-accent font-semibold text-ink-950' : 'bg-white/10 text-zinc-300 hover:bg-white/20'}`}>{l} ({counts[k]})</button>)}</div>
      {filter === 'lapsed' && <p className="rounded-lg bg-ink-800 p-3 text-sm text-zinc-300">Những khách đã mua nhưng hơn {LAPSED} ngày chưa quay lại. Bấm "Nhắn" để copy tin nhắn chăm sóc rồi dán vào Zalo – khách cũ dễ chốt hơn khách mới.</p>}
      {msg && <p className="rounded-lg bg-accent/10 p-3 text-sm text-accent">{msg}</p>}
      <DataTable heads={['Khách', 'SĐT', 'Phân loại', 'Số đơn', 'Đã mua', 'Mua gần nhất', 'Ghi chú', '']} empty="Không có khách nào trong bộ lọc. Danh sách tự tạo từ đơn hàng.">
        {shown.map((x) => { const t = tagOf(x); return (
          <tr key={x.phone} onClick={() => { setSel(x.phone); setDraft({ note: noteOf(x.phone).note || '', tag: noteOf(x.phone).tag || '' }) }} className="cursor-pointer">
            <td className={`${td} font-medium text-white`}>{x.name}{x.due > 0 && <small className="block font-normal text-amber-300">còn nợ {formatVND(x.due)}</small>}</td><td className={td}>{x.phone}</td>
            <td className={td}>{t ? <span className={`rounded px-1.5 text-xs ${TAG_CLS[t] || ''}`}>{t}{!noteOf(x.phone).tag && ' (tự động)'}</span> : <span className="text-zinc-600">—</span>}</td>
            <td className={td}>{x.n}</td><td className={td}>{formatVND(x.spent)}</td>
            <td className={td}>{new Date(x.last).toLocaleDateString('vi-VN')}<small className={`block ${x.days >= LAPSED ? 'text-amber-300' : 'text-zinc-500'}`}>{x.days} ngày trước</small></td>
            <td className={`${td} max-w-40 truncate text-zinc-500`}>{noteOf(x.phone).note}</td>
            <td className={`${td} whitespace-nowrap text-right`} onClick={(e) => e.stopPropagation()}>
              <button onClick={() => copyWin(x)} className={`${btn2} !px-3 !py-1.5 text-xs`}>Nhắn</button>
              <a href={zaloLink(x.phone)} target="_blank" rel="noreferrer" aria-label="Mở Zalo" className="ml-1 inline-block p-2 align-middle text-zinc-400 hover:text-accent"><MessageCircle size={16} /></a></td></tr>) })}
      </DataTable>
      <p className="text-xs text-zinc-500">"Khách quen (tự động)" = từ 3 đơn trở lên. Bạn đặt phân loại thủ công trong chi tiết khách (bấm vào dòng).</p>
      {c && (
        <Modal title={c.name} onClose={() => setSel(null)} wide>
          <div className="space-y-4 text-sm">
            <p className="text-zinc-300">{c.phone} · {c.address}<br />Tổng đã mua <b className="text-accent">{formatVND(c.spent)}</b> trong {c.n} đơn · mua gần nhất {c.days} ngày trước{c.due > 0 && <> · <b className="text-amber-300">còn nợ {formatVND(c.due)}</b></>}</p>
            <ul className="max-h-48 space-y-1 overflow-y-auto">{c.orders.map((o) => <li key={o.id} className="flex items-center justify-between gap-3"><span>{o.id} · {new Date(o.createdAt).toLocaleDateString('vi-VN')}</span><span className="flex items-center gap-2">{formatVND(o.total)}<Badge map={ORDER_STATUS} v={o.status} /></span></li>)}</ul>
            <label className="block text-zinc-400">Phân loại<select value={draft.tag} onChange={(e) => setDraft({ ...draft, tag: e.target.value })} className={`${inp} mt-1`}>{TAGS.map((t) => <option key={t} value={t}>{t || '— tự động / chưa phân loại —'}</option>)}</select></label>
            <label className="block text-zinc-400">Ghi chú nội bộ (khách không thấy)<textarea rows={3} value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} className={`${inp} mt-1`} placeholder="Sở thích màu, hay đặt gấp, lưu ý khi giao…" /></label>
            <div className="flex gap-2"><button onClick={save} className={btn}>Lưu</button><button onClick={() => copyWin(c)} className={btn2}>Copy tin nhắn chăm sóc</button><button onClick={() => setSel(null)} className={btn2}>Đóng</button></div>
          </div>
        </Modal>)}
    </div>
  )
}

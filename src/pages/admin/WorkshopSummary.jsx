import { Link } from 'react-router-dom'
import { formatVND as $ } from '../../data/products.js'
import { useStore } from '../../lib/store.js'
import { fmtDT, isDone, owed, plan, today } from '../../lib/workshop.js'
import { Kpi, Tag, useWset } from './wui.jsx'
import { sumC } from './WorkshopCash.jsx'

export default function WorkshopSummary() {
  const [wo] = useStore('wo'), [ws] = useStore('ws'), [wc] = useStore('wc'), S = useWset()
  const m = today().slice(0, 7), cm = wc.filter((c) => c.date.startsWith(m))
  const inn = sumC(cm.filter((c) => c.type === 'in')), out = sumC(cm.filter((c) => c.type === 'out'))
  const bal = sumC(wc.filter((c) => c.type === 'in')) - sumC(wc.filter((c) => c.type === 'out'))
  const mo = wo.filter((o) => o.date.startsWith(m) && o.status !== 'Huỷ'), done = mo.filter(isDone)
  const p = plan(wo, S), low = ws.filter((s) => s.min > 0 && s.qty <= s.min)
  const act = wo.filter((o) => ['Báo giá', 'Đã cọc', 'Chờ in', 'Đang in'].includes(o.status))
  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between"><h2 className="text-lg font-semibold text-white">Xưởng in (tháng {m})</h2><Link to="/admin/workshop" className="text-sm text-accent">Đơn xưởng</Link></div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi big l="Số dư tiền" v={$(bal)} /><Kpi l="Thu trong tháng" v={$(inn)} cls="text-emerald-400" /><Kpi l="Chi trong tháng" v={$(out)} cls="text-red-400" />
        <Kpi l="Khách còn nợ" v={$(wo.reduce((s, o) => s + owed(o), 0))} cls="text-amber-400" />
        <Kpi l={`Lãi gộp (${done.length}/${mo.length} đơn xong)`} v={$(done.reduce((s, o) => s + o.price - o.cost, 0))} />
        <Kpi l="Máy rảnh sớm nhất" v={p.length ? fmtDT(Math.max(...p.map((x) => x.e)) + S.buf * 6e4) : 'Đang rảnh'} />
        <Kpi l="Đơn đang xử lý" v={act.length} /><Kpi l="Đơn trễ hạn" v={p.filter((x) => x.late).length} cls={p.some((x) => x.late) ? 'text-red-400' : ''} />
      </div>
      {act.length > 0 && <ul className="space-y-1 text-sm">{act.slice(0, 5).map((o) => <li key={o.id} className="flex items-center gap-3"><Tag s={o.status} /><span className="text-zinc-300">{o.cust} · {o.name}</span><span className="ml-auto text-zinc-500">còn thu {$(owed(o))}</span></li>)}</ul>}
      {low.length > 0 && <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">Kho dưới ngưỡng: {low.map((s) => `${s.name} (${s.qty}${s.unit})`).join(', ')}</div>}
    </div>
  )
}

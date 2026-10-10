// Công cụ cho xưởng in: tiến độ máy, giờ in & nhắc bảo trì, nhu cầu nhựa của hàng đợi, thống kê in lỗi.
import { isDone, num, plan, planAll, printerOf } from './workshop.js'

export const WASTE_REASONS = ['Bong tróc khỏi bàn in', 'Spaghetti / đứt nhựa giữa chừng', 'Tắc / nghẹt đầu phun', 'Hết nhựa giữa chừng', 'Lỗi file / sai thông số', 'Mất điện / treo máy', 'In thử / canh chỉnh máy', 'Khác']
export const CHK = [['file', 'Đã kiểm tra file'], ['color', 'Đúng màu / loại nhựa'], ['test', 'Đã slice & in thử (nếu cần)'], ['qc', 'Kiểm tra chất lượng thành phẩm'], ['pack', 'Đã đóng gói'], ['photo', 'Đã chụp ảnh gửi khách']]
export const chkDone = (o) => CHK.filter(([k]) => o.chk?.[k]).length
export const BOARD = ['Báo giá', 'Đã cọc', 'Chờ in', 'Đang in', 'Hoàn thành', 'Đã giao']
export const ACTIVE_WO = ['Đã cọc', 'Chờ in', 'Đang in']

export const fmtDur = (ms) => { const m = Math.max(0, Math.round(ms / 6e4)), h = Math.floor(m / 60); return h ? `${h}g${String(m % 60).padStart(2, '0')}p` : `${m} phút` }

/** Tiến độ đơn đang in theo giờ dự kiến: { pct 0..1, left ms, over: đã quá giờ dự kiến } */
export function progress(o, now = Date.now()) {
  const total = Math.max(num(o.h), 0.1) * 36e5, el = now - (o.startedAt || now)
  return { pct: Math.min(1, el / total), left: Math.max(0, total - el), over: el > total * 1.15 }
}

/** Tổng giờ máy đã chạy = đơn xong (giờ thực nếu có) + đang in + giờ in lỗi + phần điều chỉnh tay (hoursAdjust: giờ đã in trước khi dùng hệ thống hoặc sửa sai) */
export function printerHours(pr, orders, wlog, printers, now = Date.now()) {
  const mine = orders.filter((o) => printerOf(o, printers) === pr.id)
  const done = mine.filter(isDone).reduce((t, o) => t + (num(o.hReal) || num(o.h)), 0)
  const run = mine.filter((o) => o.status === 'Đang in').reduce((t, o) => t + Math.min(Math.max(0, now - (o.startedAt || now)) / 36e5, num(o.h) * 1.5), 0)
  const waste = wlog.filter((w) => w.printer === pr.id).reduce((t, w) => t + num(w.h), 0)
  return Math.max(0, done + run + waste + num(pr.hoursAdjust))
}
/** Tình trạng bảo dưỡng của máy. Đến hạn khi: đủ số giờ in kể từ lần cuối, hoặc đủ số ngày, hoặc tới ngày hẹn bảo dưỡng ghi ở lần trước.
 *  maintEvery = 0 hoặc maintEveryDays = 0/trống nghĩa là không nhắc theo tiêu chí đó. */
export function maintStatus(pr, hours, now = Date.now()) {
  const every = pr.maintEvery === 0 ? 0 : num(pr.maintEvery) || 100, days = num(pr.maintEveryDays)
  const last = pr.maint?.length ? [...pr.maint].sort((a, b) => (a.t || 0) - (b.t || 0))[pr.maint.length - 1] : null
  const since = Math.max(0, hours - (last?.atHours || 0) - num(pr.skipMaintHours)), todayK = new Date(now).toISOString().slice(0, 10)
  const lastDate = last?.date || (last?.t ? new Date(last.t).toISOString().slice(0, 10) : pr.purchaseDate || '')
  const daysSince = lastDate ? Math.floor((now - new Date(lastDate).getTime()) / 864e5) : null
  const dueH = every > 0 && since >= every, dueD = days > 0 && daysSince != null && daysSince >= days, dueDate = !!last?.nextDate && last.nextDate <= todayK
  const soonH = every > 0 && since >= every * 0.8, soonD = days > 0 && daysSince != null && daysSince >= days * 0.85
  const reason = dueH ? `đã in ${Math.round(since)} giờ từ lần bảo dưỡng cuối` : dueD ? `${daysSince} ngày chưa bảo dưỡng` : dueDate ? `đến ngày hẹn bảo dưỡng (${last.nextDate.split('-').reverse().join('/')})` : ''
  return { every, days, since, daysSince, pct: every > 0 ? Math.min(1, since / every) : days > 0 && daysSince != null ? Math.min(1, daysSince / days) : 0, due: dueH || dueD || dueDate, soon: !(dueH || dueD || dueDate) && (soonH || soonD), reason, last }
}

/** Nhựa cần cho hàng đợi so với tồn: theo cuộn đã chọn trên đơn. Đơn đang in chỉ tính phần còn lại. */
export function materialNeeds(orders, stock, now = Date.now()) {
  const act = orders.filter((o) => ACTIVE_WO.includes(o.status)), by = new Map(); let loose = 0, looseOrders = 0
  for (const o of act) {
    const need = o.status === 'Đang in' ? num(o.g) * (1 - progress(o, now).pct) : num(o.g)
    if (need <= 0) continue
    const sp = stock.find((s) => s.id === o.spool && s.kind === 'filament')
    if (!sp) { loose += need; looseOrders++; continue }
    const r = by.get(sp.id) || { sp, need: 0, orders: 0 }; r.need += need; r.orders++; by.set(sp.id, r)
  }
  return { rows: [...by.values()].map((r) => ({ ...r, short: Math.max(0, Math.ceil(r.need - r.sp.qty)) })).sort((a, b) => b.short - a.short || b.need - a.need), loose: Math.round(loose), looseOrders }
}

export function wasteStats(wlog, days = 30, now = Date.now()) {
  const l = wlog.filter((w) => now - w.t <= days * 864e5), reasons = {}
  l.forEach((w) => { reasons[w.reason] = (reasons[w.reason] || 0) + 1 })
  return { n: l.length, g: l.reduce((t, w) => t + num(w.g), 0), cost: l.reduce((t, w) => t + num(w.cost), 0), top: Object.entries(reasons).sort((a, b) => b[1] - a[1]).slice(0, 3) }
}

/** Những việc xưởng cần chú ý, xếp theo mức khẩn */
export function attention({ orders, printers, wlog, stock, wset }, now = Date.now()) {
  const out = [], add = (level, text, to) => out.push({ level, text, to }), todayKey = new Date(now).toISOString().slice(0, 10), tomorrow = new Date(now + 864e5).toISOString().slice(0, 10)
  const all = planAll(orders, wset, printers)
  const late = all.flatMap((x) => x.plan).filter((x) => x.late)
  if (late.length) add('high', `${late.length} đơn dự kiến trễ hạn giao: ${late.slice(0, 2).map((x) => x.o.cust || x.o.name).join(', ')}${late.length > 2 ? '…' : ''}`, '/admin/queue')
  const over = orders.filter((o) => o.status === 'Đang in' && progress(o, now).over)
  if (over.length) add('high', `${over.length} đơn đang in đã quá giờ dự kiến – kiểm tra máy hoặc bấm "Xong" nếu in xong`, '/admin/workshop-home')
  const dueSoon = orders.filter((o) => o.due && [todayKey, tomorrow].includes(o.due) && !isDone(o) && o.status !== 'Huỷ' && o.status !== 'Đã giao')
  if (dueSoon.length) add('mid', `${dueSoon.length} đơn đến hạn giao hôm nay/ngày mai`, '/admin/workshop-board')
  printers.filter((p) => p.active).forEach((p) => { const m = maintStatus(p, printerHours(p, orders, wlog, printers, now)); if (m.due) add('mid', `Máy "${p.name}" đến hạn bảo dưỡng: ${m.reason}`, '/admin/printers'); else if (m.soon) add('low', `Máy "${p.name}" sắp tới kỳ bảo dưỡng`, '/admin/printers') })
  const needs = materialNeeds(orders, stock, now)
  const shortRows = needs.rows.filter((r) => r.short > 0)
  if (shortRows.length) add('high', `Thiếu nhựa cho hàng đợi: ${shortRows.slice(0, 2).map((r) => `${r.sp.name} (thiếu ${r.short}g)`).join(', ')}`, '/admin/stock')
  const noHours = orders.filter((o) => ['Đã cọc', 'Chờ in'].includes(o.status) && !(num(o.h) > 0))
  if (noHours.length) add('low', `${noHours.length} đơn chờ in chưa nhập giờ in nên lịch chưa chính xác`, '/admin/workshop')
  if (needs.looseOrders) add('low', `${needs.looseOrders} đơn chưa chọn cuộn nhựa (~${needs.loose}g) nên chưa kiểm tra được tồn kho`, '/admin/workshop')
  const rank = { high: 0, mid: 1, low: 2 }
  return out.sort((a, b) => rank[a.level] - rank[b.level])
}
export { plan }

const esc = (x) => String(x ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
/** In phiếu xưởng (phiếu công việc) cho người vận hành máy: thông tin mẫu in, thông số, hạn giao và ô tick các bước */
export function printJobSheet(o, printerName = '') {
  const w = window.open('', '_blank'); if (!w) return alert('Trình duyệt đang chặn cửa sổ in. Hãy cho phép popup rồi thử lại.')
  const row = (l, v) => `<tr><th>${l}</th><td>${esc(v) || '—'}</td></tr>`
  w.document.write(`<!doctype html><meta charset="utf-8"><title>Phiếu xưởng ${esc(o.cust)}</title><style>body{font:14px/1.5 system-ui,sans-serif;margin:24px;color:#111}h1{font-size:20px;margin:0 0 4px}table{border-collapse:collapse;width:100%;margin:12px 0}th,td{border:1px solid #bbb;padding:6px 10px;text-align:left;vertical-align:top}th{width:34%;background:#f3f3f3;font-weight:600}.box{display:inline-block;width:14px;height:14px;border:1.5px solid #111;margin-right:8px;vertical-align:-2px}.big{font-size:12px;color:#555}</style>
<h1>PHIẾU XƯỞNG IN 3D ${o.prio == 1 ? '— GẤP' : ''}</h1><p class="big">Ngày ${esc(o.date)} · Mã ${esc(o.id)}</p>
<table>${row('Khách hàng', `${o.cust}${o.phone ? ' · ' + o.phone : ''}`)}${row('Tên mẫu', o.name)}${row('File in', o.file)}${row('Màu in', o.colors)}${row('Layer / Infill', `${o.layer} mm / ${o.infill}%`)}${row('Nhựa dự kiến', `${o.g} g`)}${row('Thời gian in dự kiến', `${o.h} giờ`)}${row('Máy in', printerName)}${row('Hạn giao', o.due ? o.due.split('-').reverse().join('/') : '')}${row('Ghi chú', o.note)}</table>
<p>${CHK.map(([, l]) => `<span class="box"></span>${esc(l)}<br>`).join('')}</p><p class="big">Nhựa thực tế dùng: ........ g &nbsp; Giờ in thực tế: ........ h &nbsp; Người thực hiện: ................</p><script>onload=()=>setTimeout(print,200)</script>`)
  w.document.close()
}

/** Soạn tin báo giá gửi khách (copy dán vào Zalo/Messenger) */
export function quoteText(o, price, S = {}) {
  const fmt = (n) => Math.round(n).toLocaleString('vi-VN') + '₫', dep = Math.round((price * 0.5) / 1000) * 1000
  return `Chào ${o.cust || 'bạn'}, LayerLab 3D báo giá mẫu "${o.name}":\n• Vật liệu/màu: ${o.colors || 'theo yêu cầu'} · layer ${o.layer}mm · infill ${o.infill}%\n• Khối lượng ~${o.g}g · thời gian in ~${o.h} giờ\n• Giá: ${fmt(price)}\n• Đặt cọc 50% (${fmt(dep)}) để bên mình vào lịch in${o.due ? ` · hạn giao bạn cần: ${o.due.split('-').reverse().join('/')}` : ''}.\nBạn xác nhận giúp mình nhé!`
}

/** Trạng thái hạn giao: 'late' (quá hạn) | 'today' | 'soon' (≤2 ngày) | '' */
export function dueState(o, now = Date.now()) {
  if (!o.due || ['Hoàn thành', 'Đã giao', 'Huỷ'].includes(o.status)) return ''
  const days = Math.floor((new Date(o.due + 'T23:59:59').getTime() - now) / 864e5)
  return days < 0 ? 'late' : days === 0 ? 'today' : days <= 2 ? 'soon' : ''
}

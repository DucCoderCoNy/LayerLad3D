// Số liệu doanh thu / chi phí / lợi nhuận theo khoảng thời gian (dùng cho Tổng quan & Báo cáo)
import { payStatusOf } from '../components/ui.jsx'
import { orderCost } from './orderTools.js'
import { paidOf } from './receivables.js'

export const dayKey = (t) => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
export const inRange = (key, from, to) => (!from || key >= from) && (!to || key <= to)
export const sum = (a, f) => a.reduce((s, x) => s + f(x), 0)
export const ACTIVE = ['new', 'confirmed', 'preparing', 'printing', 'finishing', 'shipping'] // đơn đang xử lý

const n = (x) => Number(x) || 0
/** Nhóm chi phí cố định hàng tháng (thuê chỗ, internet, lương…) – tách riêng khỏi chi phí vận hành khác */
export const FIXED_CATS = ['Thuê mặt bằng', 'Internet / phần mềm', 'Lương / thuê ngoài', 'Chi phí cố định khác']

/** from/to dạng 'YYYY-MM-DD' (bao gồm hai đầu).
 *  Doanh thu = đơn web không hủy + đơn xưởng không huỷ (đơn web đã chuyển sang xưởng chỉ tính 1 lần).
 *  Hai cách nhìn tiền – TÁCH RIÊNG để không nhầm:
 *   • Lãi ròng ước tính (dồn tích) = doanh thu − giá vốn hàng đã bán (nhựa + điện + máy thực dùng, ước tính) − phí ship thực trả − chi phí cố định − chi phí vận hành khác.
 *   • Dòng tiền ròng = tiền đã thu − MỌI khoản đã chi (kể cả mua cuộn nhựa dự trữ chưa dùng hết).
 *  Mua nhựa dự trữ là tài sản (nằm trong kho), không phải chi phí của đơn đã bán; chỉ phần nhựa dùng cho đơn mới thành giá vốn.
 *  Phí ship thực trả (o.shipCost) nhập ở đơn web; đừng ghi trùng khoản này vào Thu chi. */
export function periodStats({ orders, wo, wc, products = [], wset = {}, ws = [] }, from, to) {
  const web = orders.filter((o) => o.status !== 'cancelled' && inRange(dayKey(o.createdAt), from, to) && !o.wo)
  const shop = wo.filter((o) => o.status !== 'Huỷ' && inRange(o.date || '', from, to))
  const out = wc.filter((c) => c.type === 'out' && inRange(c.date || '', from, to))
  const cat = (re) => sum(out.filter((c) => re.test(c.cat || '')), (c) => c.amount)
  const revenue = sum(web, (o) => o.total) + sum(shop, (o) => o.price)
  const filament = cat(/nhựa/i), power = cat(/điện/i), expense = sum(out, (c) => c.amount)
  const fixed = sum(out.filter((c) => FIXED_CATS.includes(c.cat)), (c) => c.amount), other = expense - filament - power - fixed
  const shipCost = sum(web, (o) => n(o.shipCost)), shipPaid = sum(web, (o) => n(o.ship))
  const webCosts = web.map((o) => orderCost(o, products, wset, ws))
  const cogs = sum(shop, (o) => o.cost || 0) + sum(webCosts, (c) => c?.cost || 0)
  const noCost = web.filter((_, i) => !webCosts[i]).length + shop.filter((o) => !(o.cost > 0)).length
  const collected = sum(web, (o) => paidOf(o)) + sum(shop, (o) => o.paid || 0)
  const byCat = {}; out.forEach((c) => { byCat[c.cat || 'Khác'] = (byCat[c.cat || 'Khác'] || 0) + c.amount })
  const bySource = {}; web.forEach((o) => { const k = o.source || 'Website'; bySource[k] = (bySource[k] || 0) + n(o.total) }); shop.forEach((o) => { const k = `Xưởng (${o.src || 'khác'})`; bySource[k] = (bySource[k] || 0) + n(o.price) })
  const gross = revenue - cogs
  return {
    revenue, orders: web.length + shop.length, collected, filament, power, other, expense, cogs, noCost, gross, fixed, shipCost, shipPaid, byCat, bySource,
    profit: gross - shipCost - fixed - other, cashflow: collected - expense,
    stockValue: sum(ws.filter((s) => s.kind === 'filament'), (s) => (s.qty * s.price) / 1000),
    processing: orders.filter((o) => ACTIVE.includes(o.status)).length,
  }
}

/** Kỳ liền trước để so sánh: tháng trọn vẹn → tháng trước; năm trọn vẹn → năm trước; còn lại → khoảng liền trước có cùng số ngày. null nếu chưa đủ hai đầu */
export function prevRange(from, to) {
  if (!from || !to) return null
  const d = (k) => new Date(k + 'T12:00:00'), a = d(from), z = d(to)
  const monthEnd = new Date(a.getFullYear(), a.getMonth() + 1, 0)
  if (a.getDate() === 1 && dayKey(monthEnd) === to) return [dayKey(new Date(a.getFullYear(), a.getMonth() - 1, 1)), dayKey(new Date(a.getFullYear(), a.getMonth(), 0))]
  if (a.getMonth() === 0 && a.getDate() === 1 && z.getMonth() === 11 && z.getDate() === 31 && a.getFullYear() === z.getFullYear()) return [`${a.getFullYear() - 1}-01-01`, `${a.getFullYear() - 1}-12-31`]
  const len = Math.round((z - a) / 864e5) + 1, pt = new Date(a.getTime() - 864e5), pf = new Date(pt.getTime() - (len - 1) * 864e5)
  return [dayKey(pf), dayKey(pt)]
}
/** Phần trăm thay đổi so với kỳ trước (null nếu kỳ trước bằng 0) */
export const pctChange = (cur, prev) => (prev ? Math.round(((cur - prev) / Math.abs(prev)) * 100) : null)

/** Thống kê từng tháng trong `months` tháng gần nhất (cũ → mới) */
export function monthlyStats(data, months = 12) {
  const now = new Date()
  return [...Array(months)].map((_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (months - 1) + i, 1), m = dayKey(d).slice(0, 7), last = dayKey(new Date(d.getFullYear(), d.getMonth() + 1, 0))
    return { m, ...periodStats(data, `${m}-01`, last) }
  })
}

/** Mốc nhanh cho bộ lọc ngày */
export function presetRange(p) {
  const now = new Date(), d = (y, m, day) => dayKey(new Date(y, m, day))
  if (p === 'today') return [dayKey(now), dayKey(now)]
  if (p === '7d') return [dayKey(new Date(now.getTime() - 6 * 864e5)), dayKey(now)]
  if (p === 'month') return [d(now.getFullYear(), now.getMonth(), 1), d(now.getFullYear(), now.getMonth() + 1, 0)]
  if (p === 'lastmonth') return [d(now.getFullYear(), now.getMonth() - 1, 1), d(now.getFullYear(), now.getMonth(), 0)]
  if (p === 'year') return [d(now.getFullYear(), 0, 1), d(now.getFullYear(), 11, 31)]
  return ['', '']
}

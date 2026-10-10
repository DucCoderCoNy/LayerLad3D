// Số liệu doanh thu / chi phí / lợi nhuận theo khoảng thời gian (dùng cho Tổng quan & Báo cáo)
import { payStatusOf } from '../components/ui.jsx'
import { orderCost } from './orderTools.js'
import { paidOf } from './receivables.js'

export const dayKey = (t) => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
export const inRange = (key, from, to) => (!from || key >= from) && (!to || key <= to)
export const sum = (a, f) => a.reduce((s, x) => s + f(x), 0)
export const ACTIVE = ['new', 'confirmed', 'preparing', 'printing', 'finishing', 'shipping'] // đơn đang xử lý

/** from/to dạng 'YYYY-MM-DD' (bao gồm hai đầu).
 *  Doanh thu = đơn web không hủy + đơn xưởng không huỷ (đơn web đã chuyển sang xưởng chỉ tính 1 lần).
 *  Hai cách nhìn tiền – TÁCH RIÊNG để không nhầm:
 *   • Lãi ước tính (dồn tích) = doanh thu − giá vốn hàng đã bán (nhựa + điện + máy thực dùng, ước tính) − chi phí vận hành khác.
 *   • Dòng tiền ròng = tiền đã thu − MỌI khoản đã chi (kể cả mua cuộn nhựa dự trữ chưa dùng hết).
 *  Mua nhựa dự trữ là tài sản (nằm trong kho), không phải chi phí của đơn đã bán; chỉ phần nhựa dùng cho đơn mới thành giá vốn. */
export function periodStats({ orders, wo, wc, products = [], wset = {}, ws = [] }, from, to) {
  const web = orders.filter((o) => o.status !== 'cancelled' && inRange(dayKey(o.createdAt), from, to) && !o.wo)
  const shop = wo.filter((o) => o.status !== 'Huỷ' && inRange(o.date || '', from, to))
  const out = wc.filter((c) => c.type === 'out' && inRange(c.date || '', from, to))
  const cat = (re) => sum(out.filter((c) => re.test(c.cat || '')), (c) => c.amount)
  const revenue = sum(web, (o) => o.total) + sum(shop, (o) => o.price)
  const filament = cat(/nhựa/i), power = cat(/điện/i), expense = sum(out, (c) => c.amount), other = expense - filament - power
  const webCosts = web.map((o) => orderCost(o, products, wset, ws))
  const cogs = sum(shop, (o) => o.cost || 0) + sum(webCosts, (c) => c?.cost || 0)
  const noCost = web.filter((_, i) => !webCosts[i]).length + shop.filter((o) => !(o.cost > 0)).length
  const collected = sum(web, (o) => paidOf(o)) + sum(shop, (o) => o.paid || 0)
  return {
    revenue, orders: web.length + shop.length, collected, filament, power, other, expense, cogs, noCost,
    profit: revenue - cogs - other, cashflow: collected - expense,
    stockValue: sum(ws.filter((s) => s.kind === 'filament'), (s) => (s.qty * s.price) / 1000),
    processing: orders.filter((o) => ACTIVE.includes(o.status)).length,
  }
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

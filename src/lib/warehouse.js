// Kho: nhật ký xuất nhập (wmove), dự báo dùng nhựa, danh sách cần mua.
// Mỗi lần số lượng trong kho đổi (nhập, xuất cho đơn, in lỗi, kiểm kho, sản xuất thành phẩm…) đều ghi 1 dòng để truy vết.
import { getStore, uid, write } from './store.js'

export const REASONS = ['Nhập kho', 'Xuất cho đơn xưởng', 'Xuất cho đơn web', 'In lỗi', 'Sản xuất thành phẩm', 'Kiểm kho', 'Điều chỉnh', 'Hoàn lại', 'Xóa khỏi kho']
export const KIND_LABEL = { filament: 'Nhựa', supply: 'Vật tư', product: 'Thành phẩm' }
export const OUT_REASONS = ['Xuất cho đơn xưởng', 'Xuất cho đơn web', 'In lỗi']
const n = (x) => Number(x) || 0
export const groupKey = (s) => `${s.material || ''}|${s.color || ''}`
export const groupLabel = (k) => { const [m, c] = k.split('|'); return [m, c].filter(Boolean).join(' · ') || 'Chưa phân loại' }

/** Dựng 1 dòng nhật ký cho nhựa / vật tư (s là mục kho ws). after = số còn lại sau khi đổi */
export const stockMove = (s, delta, reason, after, extra = {}) => ({ kind: s.kind || 'filament', item: s.id, name: [s.brand, s.name].filter(Boolean).join(' ') || s.name, group: s.kind === 'filament' ? groupKey(s) : '', unit: s.kind === 'supply' ? s.unit || 'cái' : 'g', delta, after, reason, ...extra })
/** Dòng nhật ký cho thành phẩm (sản phẩm trong cửa hàng) */
export const prodMove = (p, delta, reason, after, extra = {}) => ({ kind: 'product', item: p.id, name: p.name, group: '', unit: 'cái', delta, after, reason, ...extra })

/** Ghi nhiều dòng nhật ký (bỏ qua dòng delta = 0). Giữ tối đa 3000 dòng gần nhất. */
export function logMoves(list) {
  const t = Date.now(), add = (list || []).filter((m) => m && n(m.delta)).map((m) => ({ id: uid('mv'), t, ...m, delta: Math.round(n(m.delta) * 10) / 10 }))
  if (add.length) write('wmove', [...getStore('wmove'), ...add].slice(-3000))
}

/** Lượng nhựa dùng trung bình mỗi ngày của từng nhóm (loại|màu) trong `days` ngày gần nhất, tính từ nhật ký xuất */
export function dailyUse(moves, days = 30, now = Date.now()) {
  const m = {}
  for (const x of moves) if (x.kind === 'filament' && OUT_REASONS.includes(x.reason) && n(x.delta) < 0 && now - x.t <= days * 864e5) m[x.group || '|'] = (m[x.group || '|'] || 0) + Math.abs(x.delta)
  return Object.fromEntries(Object.entries(m).map(([k, v]) => [k, v / days]))
}

/** Danh sách nhựa cần mua theo từng nhóm loại|màu. Một nhóm cần mua khi tổng còn < mức tối thiểu hoặc dự kiến hết trong <14 ngày. */
export function reorderList({ ws, moves, suppliers = [], min = 1000, now = Date.now() }) {
  const use = dailyUse(moves, 30, now), by = {}
  for (const s of ws.filter((x) => x.kind === 'filament')) (by[groupKey(s)] ||= []).push(s)
  const out = []
  for (const [k, list] of Object.entries(by)) {
    const total = list.reduce((t, s) => t + s.qty, 0), perDay = use[k] || 0, daysLeft = perDay > 0 ? total / perDay : null
    const low = total < min || (daysLeft != null && daysLeft < 14)
    if (!low) continue
    const target = Math.max(min * 2, perDay * 30), buy = Math.max(1, Math.ceil((target - total) / 1000))
    const priced = list.filter((s) => s.price > 0).sort((a, b) => a.price - b.price), best = priced[0] || list[0]
    const brand = (best?.brand || '').trim(), sup = suppliers.find((p) => brand && (p.brands || '').toLowerCase().split(',').map((x) => x.trim()).includes(brand.toLowerCase()))
    out.push({ key: k, label: groupLabel(k), total, spools: list.filter((s) => s.qty > 0).length, perDay, daysLeft, buy, brand, price: best?.price || 0, supplier: sup || null, cost: buy * (best?.price || 0) * ((best ? Math.max(Number(best.cap) || 1000, 1) : 1000) / 1000) })
  }
  return out.sort((a, b) => (a.daysLeft ?? 1e9) - (b.daysLeft ?? 1e9) || a.total - b.total)
}

/** Nội dung đặt hàng gửi nhà cung cấp (copy) */
export function reorderText(items, store = 'LayerLab 3D') {
  return `${store} đặt hàng nhựa:\n${items.map((r) => `• ${r.label}${r.brand ? ` (${r.brand})` : ''}: ${r.buy} cuộn`).join('\n')}\nBạn báo giá và thời gian giao giúp mình nhé. Cảm ơn!`
}

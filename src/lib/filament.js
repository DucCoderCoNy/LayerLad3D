// Trừ / hoàn nhựa trong kho (collection `ws`, mục kind='filament') theo đơn hàng web.
// Mỗi cuộn có thể có material ('PLA'|'PETG'|'ABS') và color (tên màu) để hệ thống tự chọn cuộn phù hợp.
import { getStore, write } from './store.js'

/** Lượng nhựa mỗi đơn cần: món in theo yêu cầu (grams × SL) + sản phẩm có khai báo "nhựa/1 sản phẩm" */
export function usageOf(order, products = getStore('products')) {
  const out = []
  for (const i of order.items || []) {
    if (i.cfg?.material && i.cfg.grams > 0) out.push({ name: i.name, material: i.cfg.material, color: i.color, grams: i.cfg.grams * i.qty })
    else {
      const p = products.find((x) => x.id === i.id)
      if (p?.grams > 0) out.push({ name: i.name, material: p.material || 'PLA', color: i.color, grams: p.grams * i.qty })
    }
  }
  return out
}

const fits = (s, u) => s.kind === 'filament' && s.qty > 0 && (!s.material || s.material === u.material) && (!s.color || !u.color || s.color === u.color)

/** Trừ nhựa. Trả về { log:[{spool,name,g}], missing:[tên món không tìm được cuộn phù hợp] }. Chỉ trừ 1 lần cho mỗi đơn (order.deducted). */
export function deductForOrder(order) {
  if (order.deducted) return { log: order.deductLog || [], missing: [], already: true }
  const stock = getStore('ws').map((s) => ({ ...s })), log = [], missing = []
  for (const u of usageOf(order)) {
    let need = u.grams
    const pool = stock.filter((s) => fits(s, u)).sort((a, b) => (a.color === u.color ? 0 : 1) - (b.color === u.color ? 0 : 1) || a.qty - b.qty)
    for (const s of pool) { if (need <= 0) break; const g = Math.min(s.qty, need); s.qty -= g; need -= g; log.push({ spool: s.id, name: s.name, g: Math.round(g) }) }
    if (need > 0.5) missing.push(`${u.name} (${u.material} ${u.color || ''}: thiếu ${Math.round(need)}g)`)
  }
  if (log.length) write('ws', stock)
  return { log, missing }
}

/** Hoàn nhựa đã trừ (khi đơn bị chuyển khỏi "Hoàn thành" hoặc bị hủy) */
export function restoreForOrder(order) {
  if (!order.deducted || !order.deductLog?.length) return
  const back = {}; order.deductLog.forEach((l) => { back[l.spool] = (back[l.spool] || 0) + l.g })
  write('ws', getStore('ws').map((s) => (back[s.id] ? { ...s, qty: s.qty + back[s.id] } : s)))
}

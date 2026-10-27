// Sổ tiền thống nhất: gộp sổ Thu chi (wc) với tiền thu/hoàn của đơn web (ghi trong từng đơn) để mọi trang nhìn cùng một số.
import { dayKey } from './finance.js'

export const ACCOUNTS = [['cash', 'Tiền mặt'], ['bank', 'Ngân hàng']]
export const accountLabel = (k) => ACCOUNTS.find(([x]) => x === k)?.[1] || 'Tiền mặt'
/** COD và tiền mặt coi là "Tiền mặt"; chuyển khoản là "Ngân hàng" */
export const accountOfMethod = (m) => (m === 'bank' ? 'bank' : 'cash')
const n = (x) => Number(x) || 0

/** Danh sách dòng tiền mới → cũ. Dòng từ đơn web có src:'web' (tự động, không sửa ở sổ Thu chi).
 *  Đơn web đã chuyển sang xưởng (o.wo) được bỏ qua vì tiền của chúng đã đi vào sổ Thu chi qua đơn xưởng (tránh tính 2 lần). */
export function buildLedger({ orders = [], wc = [] }) {
  const rows = wc.map((c) => ({ id: c.id, date: c.date || '', type: c.type, cat: c.cat, amount: n(c.amount), note: c.note || '', account: c.account || 'cash', src: 'manual', recur: !!c.recurId, raw: c }))
  for (const o of orders) {
    if (o.wo) continue
    const who = `${o.id} · ${o.customer?.name || ''}`
    if (o.payments?.length) {
      for (const p of o.payments) if (n(p.amount)) rows.push({ id: `${o.id}:${p.t}`, date: dayKey(p.t), type: p.amount >= 0 ? 'in' : 'out', cat: p.amount >= 0 ? 'Thu đơn web' : 'Hoàn tiền khách', amount: Math.abs(n(p.amount)), note: `${who}${p.note ? ` – ${p.note}` : ''}`, account: accountOfMethod(p.method), src: 'web', orderId: o.id })
    } else if (o.paidAmount == null && o.paid) { // đơn cũ chỉ có cờ "đã thanh toán"
      rows.push({ id: `${o.id}:legacy`, date: dayKey(o.createdAt), type: 'in', cat: 'Thu đơn web', amount: n(o.total), note: who, account: o.customer?.payment === 'bank' ? 'bank' : 'cash', src: 'web', orderId: o.id })
    }
  }
  return rows.sort((a, b) => (b.date || '').localeCompare(a.date || ''))
}

/** Số dư từng tài khoản = số dư đầu kỳ + tổng thu − tổng chi (toàn thời gian) */
export function balances(rows, st = {}) {
  const b = { cash: n(st.openCash), bank: n(st.openBank) }
  for (const r of rows) b[r.account === 'bank' ? 'bank' : 'cash'] += r.type === 'in' ? r.amount : -r.amount
  return { ...b, total: b.cash + b.bank }
}

/** Các khoản chi phí định kỳ đến hạn mà chưa được ghi vào sổ (xét tối đa `back` tháng gần nhất, tới ngày hôm nay) */
export function dueRecurring(recurring = [], wc = [], now = new Date(), back = 3) {
  const out = [], today = dayKey(now)
  for (let i = back - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1), m = dayKey(d).slice(0, 7)
    for (const r of recurring) {
      if (!r.active || (r.from && m < r.from)) continue
      const day = Math.min(28, Math.max(1, Math.round(n(r.day)) || 1)), date = `${m}-${String(day).padStart(2, '0')}`
      if (date > today || wc.some((c) => c.recurId === r.id && c.recurMonth === m)) continue
      out.push({ r, m, date })
    }
  }
  return out
}

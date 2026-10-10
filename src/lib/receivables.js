// Thanh toán một phần (đặt cọc) và công nợ. Trạng thái thanh toán tách riêng với trạng thái đơn.
import { payStatusOf } from '../components/ui.jsx'
import { formatVND } from '../data/products.js'

const n = (x) => Number(x) || 0
export const PAY_METHODS = [['cash', 'Tiền mặt'], ['bank', 'Chuyển khoản'], ['cod', 'COD (đơn vị vận chuyển thu hộ)'], ['other', 'Khác']]
export const methodLabel = (k) => PAY_METHODS.find(([x]) => x === k)?.[1] || k

/** Số tiền đã thu của đơn (đơn cũ chỉ có cờ paid thì coi như thu đủ) */
export const paidOf = (o) => (o.paidAmount != null ? n(o.paidAmount) : payStatusOf(o) === 'paid' ? n(o.total) : 0)
/** Số tiền còn phải thu (đơn hủy / đã hoàn tiền = 0) */
export const dueOf = (o) => (o.status === 'cancelled' || payStatusOf(o) === 'refunded' ? 0 : Math.max(0, n(o.total) - paidOf(o)))
export const payState = (total, paid) => (n(total) > 0 && paid >= n(total) ? 'paid' : paid > 0 ? 'partial' : 'unpaid')

/** Phần cập nhật khi ghi nhận thu thêm `amount` (số âm = hoàn lại / chỉnh sai) */
export function addPayment(o, { amount, method = 'cash', note = '' }, now = Date.now()) {
  const amt = Math.round(n(amount)), paid = Math.max(0, paidOf(o) + amt), st = payState(o.total, paid)
  return { payments: [...(o.payments || []), { t: now, amount: amt, method, note: String(note).slice(0, 200) }].slice(-50), paidAmount: paid, payStatus: st, paid: st === 'paid' }
}
/** Tính lại trạng thái thanh toán sau khi tổng đơn đổi (giảm giá, chốt giá) */
export const resync = (o, total) => { if (payStatusOf(o) === 'refunded') return {}; const st = payState(total, paidOf(o)); return { payStatus: st, paid: st === 'paid' } }

/** Phân loại khoản còn phải thu */
export function receivableKind(o) {
  if (o.status === 'done') return 'delivered'            // đã giao/hoàn thành mà chưa thu đủ – cần xử lý ngay
  if (paidOf(o) > 0) return 'partial'                     // đã cọc, còn thiếu
  if (o.customer?.payment === 'bank') return 'bank'       // chờ chuyển khoản
  return 'cod'                                            // COD: thu khi giao
}
export const KIND = { delivered: 'Đã giao, chưa thu đủ', partial: 'Còn thiếu sau đặt cọc', bank: 'Chờ chuyển khoản', cod: 'COD – thu khi giao' }

/** Tin nhắn nhắc thanh toán gửi khách */
export function reminderText(o, st = {}) {
  const name = o.customer?.name || 'bạn', due = formatVND(dueOf(o)), bank = `${st.bankHolder || ''} – STK ${st.bankAccount || ''} – nội dung: ${o.id}`
  if (receivableKind(o) === 'cod') return `Chào ${name}, đơn ${o.id} thanh toán khi nhận hàng, số tiền ${due}. Bạn chuẩn bị giúp mình khi shipper giao nhé. Cảm ơn bạn!`
  return `Chào ${name}, đơn ${o.id} của bạn còn thiếu ${due}${paidOf(o) > 0 ? ` (đã nhận ${formatVND(paidOf(o))})` : ''}. Bạn chuyển khoản giúp mình: ${bank}. Nếu đã chuyển rồi, bạn gửi ảnh biên lai để mình đối chiếu nhé. Cảm ơn bạn!`
}

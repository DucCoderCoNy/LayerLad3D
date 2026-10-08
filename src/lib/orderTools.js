// Công cụ hỗ trợ quản lý đơn: việc cần làm, tin nhắn mẫu cho khách, giá vốn ước tính từng đơn.
import { formatVND } from '../data/products.js'
import { payStatusOf } from '../components/ui.jsx'
import { DEFSET, calc, plan, printerOf } from './workshop.js'

const HOUR = 36e5
const needsPriceConfirm = (o) => !['cancelled', 'done'].includes(o.status) && o.items?.some((i) => i.cfg?.estimate)
export { needsPriceConfirm }

/** Danh sách việc cần xử lý hôm nay, sắp theo mức khẩn. level: 'high' | 'mid' | 'low' */
export function todoItems({ orders, products, ws, wo, printers, wset }) {
  const out = [], now = Date.now()
  const live = orders.filter((o) => o.status !== 'cancelled')
  const add = (level, text, to) => out.push({ level, text, to })

  const fresh = live.filter((o) => o.status === 'new')
  if (fresh.length) add('high', `${fresh.length} đơn mới chưa xác nhận`, '/admin/orders?status=new')
  const est = live.filter(needsPriceConfirm)
  if (est.length) add('high', `${est.length} đơn có món in theo yêu cầu cần kiểm tra file & xác nhận giá`, '/admin/orders?need=price')
  const bank = live.filter((o) => o.customer?.payment === 'bank' && payStatusOf(o) === 'unpaid' && now - o.createdAt > 12 * HOUR)
  if (bank.length) add('mid', `${bank.length} đơn chuyển khoản quá 12 giờ chưa thấy tiền – kiểm tra sao kê`, '/admin/orders?pay=unpaid')
  const codDone = live.filter((o) => o.status === 'done' && payStatusOf(o) === 'unpaid')
  if (codDone.length) add('mid', `${codDone.length} đơn đã hoàn thành nhưng chưa ghi nhận thanh toán`, '/admin/orders?status=done&pay=unpaid')
  const stuck = live.filter((o) => o.status === 'shipping' && now - o.createdAt > 7 * 24 * HOUR)
  if (stuck.length) add('mid', `${stuck.length} đơn đang giao hơn 7 ngày – nên kiểm tra với đơn vị vận chuyển`, '/admin/orders?status=shipping')

  const late = printers.filter((p) => p.active).flatMap((pr) => plan(wo.filter((o) => printerOf(o, printers) === pr.id), wset)).filter((x) => x.late)
  if (late.length) add('high', `${late.length} đơn xưởng dự kiến trễ hạn giao theo lịch in`, '/admin/queue')
  const noHours = wo.filter((o) => ['Đã cọc', 'Chờ in'].includes(o.status) && !(o.h > 0))
  if (noHours.length) add('low', `${noHours.length} đơn xưởng chưa nhập giờ in nên lịch in chưa chính xác`, '/admin/workshop')

  const fil = ws.filter((s) => s.kind === 'filament' && s.min > 0 && s.qty <= s.min)
  if (fil.length) add('mid', `Nhựa sắp hết: ${fil.map((s) => `${s.name} (${Math.round(s.qty)}g)`).join(', ')}`, '/admin/stock')
  const low = products.filter((p) => p.active && p.stock <= 5)
  if (low.length) add('low', `${low.length} sản phẩm sắp hết hàng: ${low.slice(0, 3).map((p) => p.name).join(', ')}${low.length > 3 ? '…' : ''}`, '/admin/products')
  const rank = { high: 0, mid: 1, low: 2 }
  return out.sort((a, b) => rank[a.level] - rank[b.level])
}

/** Tin nhắn mẫu gửi khách (copy hoặc mở Zalo). Chỉ là gợi ý, admin sửa lại trước khi gửi */
export function templates(o, st) {
  const c = o.customer || {}, name = c.name || 'bạn', shop = st.storeName || 'LayerLab 3D'
  const items = (o.items || []).map((i) => `• ${i.name}${i.color ? ` (${i.color})` : ''} × ${i.qty}`).join('\n')
  const bank = `${st.bankHolder} – STK ${st.bankAccount} – nội dung: ${o.id}`
  const est = needsPriceConfirm(o)
  return [
    { label: 'Xác nhận đơn', text: `Chào ${name}, ${shop} đã nhận đơn ${o.id}:\n${items}\nTổng thanh toán: ${formatVND(o.total)} (đã gồm ship ${formatVND(o.ship)}).\n${c.payment === 'bank' ? `Bạn vui lòng chuyển khoản: ${bank}.\n` : 'Thanh toán khi nhận hàng (COD).\n'}Cảm ơn bạn đã đặt hàng!` },
    ...(est ? [{ label: 'Báo giá in theo yêu cầu', text: `Chào ${name}, ${shop} đã kiểm tra file của đơn ${o.id}.\n${items}\nGiá chốt: ${formatVND(o.total)} (gồm ship ${formatVND(o.ship)}). Bạn đồng ý để bên mình tiến hành in nhé?` }] : []),
    { label: 'Nhắc chuyển khoản', text: `Chào ${name}, đơn ${o.id} của bạn (${formatVND(o.total)}) bên mình chưa nhận được tiền. Bạn chuyển khoản giúp: ${bank}. Nếu đã chuyển rồi, bạn gửi giúp mình ảnh biên lai nhé. Cảm ơn bạn!` },
    { label: 'Đã gửi hàng', text: `Chào ${name}, đơn ${o.id} đã được gửi${o.shipProvider ? ` qua ${o.shipProvider}` : ''}${o.trackingCode ? `, mã vận đơn: ${o.trackingCode}` : ''}${o.trackingUrl ? `\nTheo dõi hành trình: ${o.trackingUrl}` : ''}\nBạn để ý điện thoại để nhận hàng nhé!${c.payment === 'cod' && payStatusOf(o) !== 'paid' ? ` Bạn thanh toán ${formatVND(o.total)} khi nhận hàng.` : ''}` },
    { label: 'Cảm ơn & xin đánh giá', text: `Cảm ơn ${name} đã ủng hộ ${shop}! Nếu hài lòng, bạn gửi giúp mình vài tấm ảnh sản phẩm hoặc đánh giá để bên mình hoàn thiện hơn nhé. Cần in thêm cứ nhắn mình ạ.` },
  ]
}
export const zaloLink = (phone) => `https://zalo.me/${String(phone || '').replace(/\D/g, '').replace(/^84/, '0')}`

/** Giá vốn ước tính của đơn web (chỉ tính được cho món in theo yêu cầu và sản phẩm có khai báo gram). Trả về null nếu không có dữ liệu */
export function orderCost(o, products, wsetRaw, stock = []) {
  const S = { ...DEFSET, ...wsetRaw }; let cost = 0, known = 0
  for (const i of o.items || []) {
    const p = products.find((x) => x.id === i.id)
    const g = i.cfg?.grams ?? p?.grams ?? 0, h = i.cfg?.hours ?? 0
    if (!(g > 0)) continue
    cost += calc({ g: g * i.qty, h: h * i.qty, min: 15, pkg: 'ext', spool: '', paint: 0 }, S, stock).cost - S.pack; known += i.price * i.qty
  }
  if (!known) return null
  cost += S.pack
  return { cost: Math.round(cost), profit: Math.round(o.subtotal - cost), partial: known < (o.subtotal || 0) }
}

// Công cụ hỗ trợ quản lý đơn: việc cần làm, tin nhắn mẫu cho khách, giá vốn ước tính từng đơn.
import { formatVND } from '../data/products.js'
import { payStatusOf } from '../components/ui.jsx'
import { DEFSET, calc, plan, printerOf } from './workshop.js'
import { dueOf, paidOf } from './receivables.js'
import { RULE_DEFAULTS } from './rules.js'

const HOUR = 36e5
const needsPriceConfirm = (o) => !['cancelled', 'done'].includes(o.status) && o.items?.some((i) => i.cfg?.estimate)
export { needsPriceConfirm }

/** Danh sách việc cần xử lý hôm nay, sắp theo mức khẩn. level: 'high' | 'mid' | 'low' */
export function todoItems({ orders, products, ws, wo, printers, wset, rules = RULE_DEFAULTS }) {
  const out = [], now = Date.now()
  const live = orders.filter((o) => o.status !== 'cancelled')
  const add = (level, text, to) => out.push({ level, text, to })

  const fresh = live.filter((o) => o.status === 'new')
  if (fresh.length) add('high', `${fresh.length} đơn mới chưa xác nhận`, '/admin/orders?status=new')
  const est = live.filter(needsPriceConfirm)
  if (est.length) add('high', `${est.length} đơn có món in theo yêu cầu cần kiểm tra file & xác nhận giá`, '/admin/orders?need=price')
  const bank = live.filter((o) => o.customer?.payment === 'bank' && payStatusOf(o) === 'unpaid' && now - o.createdAt > rules.bankHours * HOUR)
  if (bank.length) add('mid', `${bank.length} đơn chuyển khoản quá ${rules.bankHours} giờ chưa thấy tiền – kiểm tra sao kê`, '/admin/orders?pay=unpaid')
  const codDone = live.filter((o) => o.status === 'done' && dueOf(o) > 0)
  if (codDone.length) add('high', `${codDone.length} đơn đã hoàn thành nhưng chưa thu đủ tiền (còn ${codDone.reduce((t, o) => t + dueOf(o), 0).toLocaleString('vi-VN')}₫)`, '/admin/receivables')
  const stuck = live.filter((o) => o.status === 'shipping' && now - o.createdAt > rules.shippingDays * 24 * HOUR)
  if (stuck.length) add('mid', `${stuck.length} đơn đang giao hơn ${rules.shippingDays} ngày – nên kiểm tra với đơn vị vận chuyển`, '/admin/orders?status=shipping')

  const late = printers.filter((p) => p.active).flatMap((pr) => plan(wo.filter((o) => printerOf(o, printers) === pr.id), wset)).filter((x) => x.late)
  if (late.length) add('high', `${late.length} đơn xưởng dự kiến trễ hạn giao theo lịch in`, '/admin/queue')
  const noHours = wo.filter((o) => ['Đã cọc', 'Chờ in'].includes(o.status) && !(o.h > 0))
  if (noHours.length) add('low', `${noHours.length} đơn xưởng chưa nhập giờ in nên lịch in chưa chính xác`, '/admin/workshop')

  const fil = ws.filter((s) => s.kind === 'filament' && s.min > 0 && s.qty <= s.min)
  if (fil.length) add('mid', `Nhựa sắp hết: ${fil.map((s) => `${s.name} (${Math.round(s.qty)}g)`).join(', ')}`, '/admin/stock')
  const low = products.filter((p) => p.active && p.stock <= rules.lowStock)
  if (low.length) add('low', `${low.length} sản phẩm sắp hết hàng: ${low.slice(0, 3).map((p) => p.name).join(', ')}${low.length > 3 ? '…' : ''}`, '/admin/products')
  const rank = { high: 0, mid: 1, low: 2 }
  return out.sort((a, b) => rank[a.level] - rank[b.level])
}

/** Các mẫu tin nhắn gửi khách. Có thể sửa trong Cài đặt → Tin nhắn mẫu; dùng {biến} để chèn thông tin đơn. */
export const TEMPLATE_DEFS = [
  ['confirm', 'Xác nhận đơn', 'Chào {ten}, {cua_hang} đã nhận đơn {ma}:\n{mon}\n{chi_tiet_tien}\n{huong_dan_tt}\nCảm ơn bạn đã đặt hàng!'],
  ['quote', 'Báo giá in theo yêu cầu', 'Chào {ten}, {cua_hang} đã kiểm tra file của đơn {ma}.\n{mon}\nGiá chốt: {tong} (gồm ship {ship}). Bạn đồng ý để bên mình tiến hành in nhé?'],
  ['remind', 'Nhắc chuyển khoản', 'Chào {ten}, đơn {ma} của bạn còn thiếu {con_lai}{da_nhan_text}. Bạn chuyển khoản giúp: {stk}. Nếu đã chuyển rồi, bạn gửi giúp mình ảnh biên lai nhé. Cảm ơn bạn!'],
  ['shipped', 'Đã gửi hàng', 'Chào {ten}, đơn {ma} đã được gửi{dvvc_text}{mvd_text}{link_text}\nBạn để ý điện thoại để nhận hàng nhé!{cod_text}'],
  ['thanks', 'Cảm ơn & xin đánh giá', 'Cảm ơn {ten} đã ủng hộ {cua_hang}! Nếu hài lòng, bạn gửi giúp mình vài tấm ảnh sản phẩm hoặc đánh giá để bên mình hoàn thiện hơn nhé. Cần in thêm cứ nhắn mình ạ.'],
]
export const TEMPLATE_VARS = [['ten', 'Tên khách'], ['ma', 'Mã đơn'], ['cua_hang', 'Tên cửa hàng'], ['mon', 'Danh sách món'], ['tong', 'Tổng tiền'], ['ship', 'Phí ship'], ['da_thu', 'Đã thu'], ['con_lai', 'Còn lại'], ['stk', 'Thông tin chuyển khoản'], ['chi_tiet_tien', 'Dòng tổng tiền (tự có giảm giá/đã thu)'], ['huong_dan_tt', 'Hướng dẫn thanh toán'], ['ma_van_don', 'Mã vận đơn'], ['don_vi_vc', 'Đơn vị vận chuyển'], ['link_theo_doi', 'Link theo dõi hành trình']]
/** Thay {biến} bằng giá trị; biến lạ giữ nguyên để người dùng thấy lỗi gõ */
export const fillTemplate = (tpl, vars) => String(tpl).replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m))

export function templateVars(o, st) {
  const c = o.customer || {}, due = dueOf(o), paid = paidOf(o)
  const bank = `${st.bankHolder || ''} – STK ${st.bankAccount || ''} – nội dung: ${o.id}`
  return {
    ten: c.name || 'bạn', ma: o.id, cua_hang: st.storeName || 'LayerLab 3D', tong: formatVND(o.total), ship: formatVND(o.ship), da_thu: formatVND(paid), con_lai: formatVND(due), stk: bank,
    mon: (o.items || []).map((i) => `• ${i.name}${i.color ? ` (${i.color})` : ''} × ${i.qty}`).join('\n'),
    chi_tiet_tien: `Tổng thanh toán: ${formatVND(o.total)} (đã gồm ship ${formatVND(o.ship)}${o.discount > 0 ? `, đã giảm ${formatVND(o.discount)}` : ''}).${paid > 0 ? ` Đã nhận ${formatVND(paid)}, còn lại ${formatVND(due)}.` : ''}`,
    huong_dan_tt: c.payment === 'bank' ? `Bạn vui lòng chuyển khoản: ${bank}.` : 'Thanh toán khi nhận hàng (COD).',
    da_nhan_text: paid > 0 ? ` (đã nhận ${formatVND(paid)})` : '',
    ma_van_don: o.trackingCode || '', don_vi_vc: o.shipProvider || '', link_theo_doi: o.trackingUrl || '',
    dvvc_text: o.shipProvider ? ` qua ${o.shipProvider}` : '', mvd_text: o.trackingCode ? `, mã vận đơn: ${o.trackingCode}` : '', link_text: o.trackingUrl ? `\nTheo dõi hành trình: ${o.trackingUrl}` : '',
    cod_text: c.payment === 'cod' && due > 0 ? ` Bạn thanh toán ${formatVND(due)} khi nhận hàng.` : '',
  }
}

/** Tin nhắn mẫu gửi khách (copy hoặc mở Zalo). Dùng mẫu tùy chỉnh trong Cài đặt nếu có. Chỉ là gợi ý, admin sửa lại trước khi gửi */
export function templates(o, st) {
  const v = templateVars(o, st), est = needsPriceConfirm(o)
  return TEMPLATE_DEFS.filter(([k]) => k !== 'quote' || est).map(([k, label, def]) => ({ label, text: fillTemplate(st.msgTemplates?.[k]?.trim() ? st.msgTemplates[k] : def, v) }))
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

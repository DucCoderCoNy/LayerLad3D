// Logic quản lý xưởng in 3D (tính giá, giá vốn, xếp lịch máy) – chuyển từ file quan-ly-in3d.html
export const ST = ['Báo giá', 'Đã cọc', 'Chờ in', 'Đang in', 'Hoàn thành', 'Đã giao', 'Huỷ']
export const SRC = ['Theo yêu cầu', 'Website', 'Shopee', 'Facebook/Zalo', 'Đơn ngoài khác']
export const PKG = { std: ['Tiêu chuẩn', 'pStd'], str: ['Chịu lực', 'pStr'], hi: ['Độ nét cao', 'pHi'], ext: ['Đơn ngoài / nhập giá tay', null] }
export const DEFSET = { pStd: 1100, pStr: 1600, pHi: 2200, setup: 50000, perG: 350, perH: 5000, min: 70000,
  matG: 175, power: 150, elec: 4000, machine: 7000000, life: 4500, maint: 500, risk: 10, labor: 50000, pack: 5000, buf: 15 }
export const SET_FIELDS = [['pStd', 'Giá gói Tiêu chuẩn (đ/g)'], ['pStr', 'Giá gói Chịu lực (đ/g)'], ['pHi', 'Giá gói Độ nét cao (đ/g)'], ['setup', 'Phí setup (đ)'],
  ['perG', 'Công thức: đ/gram'], ['perH', 'Công thức: đ/giờ in'], ['min', 'Đơn tối thiểu (đ)'], ['matG', 'Giá nhựa mặc định (đ/g)'], ['power', 'Công suất TB máy (W)'],
  ['elec', 'Giá điện (đ/kWh)'], ['machine', 'Giá máy (đ)'], ['life', 'Tuổi thọ máy (giờ)'], ['maint', 'Bảo dưỡng (đ/giờ)'], ['risk', 'Rủi ro hỏng (%)'],
  ['labor', 'Công làm tay (đ/giờ)'], ['pack', 'Đóng gói / đơn (đ)'], ['buf', 'Nghỉ giữa 2 lần in (phút)']]

export const num = (v) => parseFloat(v) || 0
export const today = () => new Date().toISOString().slice(0, 10)
export const owed = (o) => (o.status === 'Huỷ' ? 0 : Math.max(0, o.price - o.paid))
export const isDone = (o) => ['Hoàn thành', 'Đã giao'].includes(o.status)
export const uid = (p) => p + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5)

export const BLANK = { src: SRC[0], cust: '', name: '', pkg: 'std', g: 0, h: 0, min: 30, col: 0, rush: 0, paint: 0, other: 0, price: 0, paid: 0,
  status: 'Báo giá', spool: '', date: today(), note: '', file: '', colors: '', layer: '0.2', infill: 15, due: '', prio: '0', printer: '' }

/**
 * Tính giá: lấy số CAO NHẤT trong (theo gram, theo công thức setup+gram+giờ, tối thiểu) + phụ phí.
 * Giá vốn = (nhựa + khấu hao/điện/bảo dưỡng máy) × (1+rủi ro) + công làm tay + đóng gói + sơn×0.4
 */
export function calc(f, s, stock) {
  const g = num(f.g), h = num(f.h), rate = PKG[f.pkg]?.[1] ? s[PKG[f.pkg][1]] : 0
  const byG = g * rate, byF = s.setup + s.perG * g + s.perH * h
  const base = Math.max(byG, byF, s.min)
  const extra = num(f.col) + num(f.rush) + num(f.paint) + num(f.other)
  const sp = stock.find((x) => x.id === f.spool)
  const matG = sp && sp.kind === 'filament' ? sp.price / 1000 : s.matG
  const mach = h * ((s.power / 1000) * s.elec + s.machine / s.life + s.maint)
  const cost = (g * matG + mach) * (1 + s.risk / 100) + (num(f.min) / 60) * s.labor + s.pack + num(f.paint) * 0.4
  return { byG, byF, base, extra, sug: Math.round((base + extra) / 1000) * 1000, cost }
}

/** Hàng đợi 1 máy: Đang in chạy trước, sau đó các đơn Đã cọc/Chờ in theo thứ tự q. Trả về lịch dự kiến từng đơn */
const QS = ['Đang in', 'Chờ in', 'Đã cọc']
export const waitList = (orders) => orders.filter((o) => o.status !== 'Đang in' && QS.includes(o.status)).sort((a, b) => (a.q || 0) - (b.q || 0))
export function plan(orders, s) {
  const now = Date.now(), buf = s.buf * 60000, out = []
  let cur = now
  orders.filter((o) => o.status === 'Đang in').sort((a, b) => a.startedAt - b.startedAt).forEach((o) => {
    const st = o.startedAt || now, e = Math.max(st + o.h * 36e5, now)
    out.push({ o, s: st, e, run: true }); cur = Math.max(cur, e + buf)
  })
  waitList(orders).forEach((o) => { const st = cur, e = st + Math.max(o.h, 0) * 36e5; out.push({ o, s: st, e }); cur = e + buf })
  out.forEach((x) => { x.late = !!x.o.due && x.e > new Date(x.o.due + 'T23:59:59').getTime() })
  return out
}
export const fmtDT = (t) => new Date(t).toLocaleString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
export const stockCost = (s, q) => (s.kind === 'filament' ? (s.price * q) / 1000 : s.price * q)

/** Máy được gán cho đơn (chưa gán = máy đầu tiên đang hoạt động) */
export const printerOf = (o, printers) => (printers.some((p) => p.id === o.printer) ? o.printer : printers.find((p) => p.active)?.id || printers[0]?.id || '')
/** Lịch dự kiến của TẤT CẢ máy: [{ printer, plan:[{o,s,e,run,late}] }] – mỗi máy chạy hàng đợi riêng */
export const planAll = (orders, s, printers) => printers.filter((p) => p.active).map((pr) => ({ printer: pr, plan: plan(orders.filter((o) => printerOf(o, printers) === pr.id), s) }))

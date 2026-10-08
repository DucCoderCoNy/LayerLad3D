// Ước tính khối lượng, thời gian in và giá cho "In theo yêu cầu".
// ⚠ Đây là ƯỚC TÍNH (không phải slicer). Công thức giá PHẢI khớp hàm place_order trong supabase/migrations/003_*.sql (server tính lại giá).
export const MATERIALS = {
  PLA: { d: 1.24, k: 1, note: 'Dễ in, bền vừa, phù hợp đa số mô hình.' },
  PETG: { d: 1.27, k: 1.1, note: 'Dai hơn, chịu ẩm/nhiệt tốt hơn PLA.' },
  ABS: { d: 1.04, k: 1.2, note: 'Chịu nhiệt cao nhưng khó in, dễ cong vênh – LayerLab sẽ xác nhận lại khả năng in.' },
}
export const LAYERS = [
  { v: '0.12', label: '0.12 mm – rất mịn', k: 1.3, perHour: 4.3 }, { v: '0.16', label: '0.16 mm – mịn', k: 1.15, perHour: 5.8 },
  { v: '0.2', label: '0.20 mm – tiêu chuẩn', k: 1, perHour: 7.2 }, { v: '0.28', label: '0.28 mm – nhanh', k: 0.85, perHour: 10.1 },
]
export const INFILLS = [10, 15, 20, 30, 50, 80, 100]
export const MAX_QTY = 99

export const matMult = (st, m) => st.materialMult?.[m] ?? MATERIALS[m]?.k ?? 1
export const layerMult = (st, lh) => st.layerMult?.[lh] ?? LAYERS.find((l) => l.v === lh)?.k ?? 1

/** Khối lượng (g) và giờ in cho 1 sản phẩm, từ thể tích đã đo. Vỏ ~35% + phần infill. */
export function estimateOne(model, o) {
  const d = MATERIALS[o.material]?.d || 1.24, fill = 0.35 + 0.65 * (o.infill / 100)
  const grams = model.volumeCm3 * d * fill
  const mm3 = (grams / d) * 1000, flow = LAYERS.find((l) => l.v === o.layer)?.perHour ?? 7.2 // mm³/s
  const layers = (model.dims?.[2] || 0) / parseFloat(o.layer)
  const hours = ((mm3 / flow + layers * 6) / 3600) * 1.1 + 0.15
  return { grams: Math.max(1, Math.round(grams)), hours: Math.max(0.25, Math.round(hours * 10) / 10) }
}

/** Giá cho 1 sản phẩm (đã làm tròn 1.000₫) – cùng công thức với server */
export function unitPrice(o, st) {
  const mat = o.material, raw = o.grams * (st.pricePerGram || 1500) * matMult(st, mat) + o.hours * (st.pricePerHour || 8000) * layerMult(st, o.layer) + (o.design ? st.designFee || 0 : 0)
  const price = Math.max(Math.round(raw / 1000) * 1000, st.minCustomPrice || 0)
  return { price, byGrams: o.grams * (st.pricePerGram || 1500) * matMult(st, mat), byHours: o.hours * (st.pricePerHour || 8000) * layerMult(st, o.layer), design: o.design ? st.designFee || 0 : 0 }
}

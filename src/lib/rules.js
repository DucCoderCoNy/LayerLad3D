// Các ngưỡng cảnh báo có thể chỉnh trong Cài đặt → Quy tắc & cảnh báo
export const RULE_DEFAULTS = { bankHours: 12, shippingDays: 7, lapsedDays: 60, lowStock: 5 }
export const rulesOf = (st = {}) => {
  const r = { ...RULE_DEFAULTS }
  for (const k of Object.keys(r)) { const v = Number(st?.rules?.[k]); if (Number.isFinite(v) && v > 0) r[k] = v }
  return r
}

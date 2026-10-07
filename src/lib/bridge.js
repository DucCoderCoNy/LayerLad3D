import { getStore, write } from './store.js'
import { BLANK, DEFSET, calc, uid } from './workshop.js'

/** Tạo đơn xưởng từ đơn web / yêu cầu in. Nếu đã thu tiền thì ghi luôn vào Thu chi. */
export function addWorkshopOrder(d) {
  const o = { ...BLANK, id: uid('wo'), deducted: false, q: Date.now(), ...d }
  o.cost = calc(o, { ...DEFSET, ...getStore('wset') }, getStore('ws')).cost
  write('wo', [o, ...getStore('wo')])
  if (o.paid > 0) write('wc', [...getStore('wc'), { id: uid('c'), date: o.date, type: 'in', cat: 'Thu đơn hàng', amount: o.paid, note: `${o.cust} · ${o.name}`, orderId: o.id }])
  return o
}

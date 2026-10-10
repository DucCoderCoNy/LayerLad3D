/** Món làm riêng theo yêu cầu (in theo file; các loại cũ keychain/timetable vẫn được nhận diện cho giỏ hàng đã lưu): cần chuyển khoản 100% trước khi in */
export const isCustomItem = (i) => String(i.id || '').startsWith('cfg-') || ['keychain', 'timetable', 'custom_print'].includes(i.kind)

/** Còn thiếu bao nhiêu để được miễn phí ship (0 = đã đủ, null = shop không đặt mức miễn phí) */
export const freeShipGap = (st, subtotal) => (st.freeShipOver > 0 ? Math.max(0, st.freeShipOver - subtotal) : null)

const KEY = 'll3d:addr'
/** Nhớ thông tin giao hàng lần trước trên máy khách để lần sau không phải gõ lại */
export const loadAddr = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}') } catch { return {} } }
export const saveAddr = (a) => { try { localStorage.setItem(KEY, JSON.stringify(a)) } catch { /* bỏ qua */ } }

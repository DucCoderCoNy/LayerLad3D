// Bộ chuyển đổi: bảng quan hệ (migration 001/002) <-> dạng dữ liệu cũ mà các trang đang dùng. Chỉ chạy khi REL = true.
import { supa } from './supa.js'
import { slugify } from './seo.js'
import { must } from './useAsync.js'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const ms = (t) => (t ? Date.parse(t) : Date.now())
const J = JSON.stringify

/* ---------- Chuyển dòng DB -> dạng cũ ---------- */
export const productOut = (r) => {
  const images = [...(r.product_images || [])].sort((a, b) => a.sort_order - b.sort_order).map((i) => i.url)
  return {
    id: r.slug, uuid: r.id, name: r.name, desc: r.description || '', category: r.categories?.slug || '', price: Number(r.price), stock: r.stock,
    hot: r.hot, active: r.active, images, image: images[0] || '',
    colors: (r.product_colors || []).filter((pc) => pc.colors && pc.colors.active !== false).map((pc) => ({ id: pc.colors.id, name: pc.colors.name, hex: pc.colors.hex, delta: Number(pc.price_delta) })),
  }
}
export const orderOut = (r) => ({
  id: r.code, uuid: r.id, userId: r.user_id, status: r.status, paid: r.payment_status === 'paid', payment_status: r.payment_status,
  customer: { name: r.customer_name, phone: r.phone, address: r.address, note: r.note, payment: r.payment_method, zone: r.zone_id, email: r.email },
  items: (r.order_items || []).map((i) => ({ key: i.id, id: i.product_id || i.kind, name: i.name, color: i.color || '', qty: i.qty, price: Number(i.unit_price), kind: i.kind, options: i.options })),
  subtotal: Number(r.subtotal), ship: Number(r.ship_fee), discount: Number(r.discount || 0), total: Number(r.total), createdAt: ms(r.created_at), tracking_code: r.tracking_code, shipping_provider: r.shipping_provider,
})
const trackOut = (t) => ({
  id: t.code, status: t.status, paid: t.payment_status === 'paid', payment_status: t.payment_status,
  customer: { name: t.customer_name, payment: t.payment_method }, subtotal: Number(t.subtotal), ship: Number(t.ship_fee), discount: Number(t.discount || 0), total: Number(t.total), createdAt: ms(t.created_at),
  tracking_code: t.tracking_code, shipping_provider: t.shipping_provider,
  items: (t.items || []).map((i, k) => ({ key: k, kind: i.kind, name: i.name, color: i.color || '', qty: i.qty, price: Number(i.unit_price) })),
})

/* ---------- Đọc ---------- */
export const relLoad = {
  async products() {
    return must(await supa.from('products').select('*, categories(slug), product_images(url,sort_order), product_colors(price_delta, colors(id,name,hex,active))').order('created_at', { ascending: false })).map(productOut)
  },
  async categories() { return must(await supa.from('categories').select('*').order('sort_order').order('created_at')).map((r) => ({ id: r.slug, uuid: r.id, label: r.name })) },
  async colors() { return must(await supa.from('colors').select('*').order('sort_order').order('created_at')).map((r) => ({ id: r.id, name: r.name, hex: r.hex, active: r.active })) },
  async posts() {
    return must(await supa.from('blog_posts').select('*').order('created_at', { ascending: false })).map((r) => ({
      id: r.slug, uuid: r.id, title: r.title, excerpt: r.excerpt || '', content: r.content || '', cover: r.cover_url || '', category: r.category || 'tin-xuong', published: r.published, createdAt: ms(r.published_at || r.created_at) }))
  },
  async showcase() {
    return must(await supa.from('reviews').select('*').order('created_at', { ascending: false })).map((r) => ({
      id: r.id, title: r.title || '', image: r.image_url || '', customer: r.name || '', quote: r.comment || '', rating: r.rating, active: r.status === 'approved', pending: r.status === 'pending' }))
  },
  async settings(def) { const d = must(await supa.from('settings').select('value').eq('key', 'main').maybeSingle()); return { ...def, ...(d?.value || {}) } },
  async orders() { // đơn của chính người đăng nhập (admin dùng trang Đơn hàng riêng, có phân trang)
    const { data: s } = await supa.auth.getSession(), uid = s.session?.user.id
    if (!uid) return []
    return must(await supa.from('orders').select('*, order_items(*)').eq('user_id', uid).order('created_at', { ascending: false }).limit(100)).map(orderOut)
  },
}

/* ---------- Ghi (so sánh cũ/mới rồi insert/update/delete) ---------- */
const diff = (old, nv, key = 'id') => {
  const om = new Map(old.map((x) => [x[key], x])), ids = new Set(nv.map((x) => x[key]))
  return { om, removed: old.filter((x) => !ids.has(x[key])) }
}
export const relSave = {
  async categories(old, nv) {
    const { om, removed } = diff(old, nv)
    for (const [i, c] of nv.entries()) {
      const o = om.get(c.id)
      if (!o) must(await supa.from('categories').insert({ slug: c.id, name: c.label, sort_order: i }))
      else if (o.label !== c.label) must(await supa.from('categories').update({ name: c.label }).eq('slug', c.id))
    }
    for (const o of removed) must(await supa.from('categories').delete().eq('slug', o.id))
  },
  async colors(old, nv) {
    const { om, removed } = diff(old, nv)
    for (const [i, c] of nv.entries()) {
      const row = { name: c.name.trim(), hex: c.hex, active: c.active !== false, sort_order: i }, o = om.get(c.id)
      if (!o || !UUID.test(c.id)) must(await supa.from('colors').insert(row))
      else if (J(o) !== J(c)) must(await supa.from('colors').update(row).eq('id', c.id))
    }
    for (const o of removed) if (UUID.test(o.id)) must(await supa.from('colors').delete().eq('id', o.id))
  },
  async products(old, nv) {
    const cats = new Map(must(await supa.from('categories').select('id,slug')).map((c) => [c.slug, c.id]))
    const { om, removed } = diff(old, nv)
    for (const p of nv) {
      const o = om.get(p.id)
      if (o && J(o) === J(p)) continue
      const row = { name: p.name, description: p.desc || '', price: Math.round(+p.price || 0), hot: !!p.hot, active: p.active !== false, category_id: cats.get(p.category) || null }
      if (!o || o.stock !== p.stock) row.stock = Math.max(0, Math.round(+p.stock || 0)) // không ghi đè tồn kho nếu admin không sửa
      let uuid = o?.uuid
      if (uuid) must(await supa.from('products').update(row).eq('id', uuid))
      else {
        const base = (/^sp-/.test(p.id) ? slugify(p.name) : p.id) || 'sp'
        let slug = base, n = 1
        while (must(await supa.from('products').select('id').eq('slug', slug).maybeSingle())) slug = `${base}-${++n}`
        uuid = must(await supa.from('products').insert({ stock: 0, ...row, slug }).select('id').single()).id
      }
      if (!o || J(o.images) !== J(p.images || [])) {
        must(await supa.from('product_images').delete().eq('product_id', uuid))
        if (p.images?.length) must(await supa.from('product_images').insert(p.images.map((url, i) => ({ product_id: uuid, url, sort_order: i }))))
      }
      if (!o || J(o.colors) !== J(p.colors || [])) {
        must(await supa.from('product_colors').delete().eq('product_id', uuid))
        if (p.colors?.length) must(await supa.from('product_colors').insert(p.colors.map((c) => ({ product_id: uuid, color_id: c.id, price_delta: Math.round(+c.delta || 0) }))))
      }
    }
    for (const o of removed) if (o.uuid) must(await supa.from('products').delete().eq('id', o.uuid))
  },
  async posts(old, nv) {
    const { om, removed } = diff(old, nv)
    const row = (p) => ({ title: p.title, excerpt: p.excerpt, content: p.content, cover_url: p.cover || null, category: p.category, published: !!p.published, published_at: p.published ? new Date(p.createdAt).toISOString() : null })
    for (const p of nv) {
      const o = om.get(p.id)
      if (!o) must(await supa.from('blog_posts').insert({ ...row(p), slug: p.id }))
      else if (J(o) !== J(p)) must(await supa.from('blog_posts').update(row(p)).eq('slug', p.id))
    }
    for (const o of removed) must(await supa.from('blog_posts').delete().eq('slug', o.id))
  },
  async showcase(old, nv) {
    const { om, removed } = diff(old, nv)
    const row = (x) => ({ title: x.title, name: x.customer || null, rating: +x.rating || 5, comment: x.quote || null, image_url: x.image || null, status: x.active ? 'approved' : 'hidden' })
    for (const x of nv) {
      const o = om.get(x.id)
      if (!o || !UUID.test(x.id)) must(await supa.from('reviews').insert(row(x)))
      else if (J(o) !== J(x)) must(await supa.from('reviews').update(row(x)).eq('id', x.id))
    }
    for (const o of removed) if (UUID.test(o.id)) must(await supa.from('reviews').delete().eq('id', o.id))
  },
  async settings(_old, nv) { must(await supa.from('settings').upsert({ key: 'main', value: nv })) },
  async orders() { throw new Error('Đơn hàng được quản lý ở trang Đơn hàng (admin), không sửa trực tiếp ở đây') },
}

/* ---------- Đặt hàng / tra cứu ---------- */
export async function trackRel(code, phone) {
  const t = must(await supa.rpc('track_order_v2', { p_code: code, p_phone: phone }))
  return t ? trackOut(t) : null
}
export async function placeOrderRel(o) {
  const items = o.items.map((i) => {
    if (i.id === 'cfg-keychain') return { kind: 'keychain', qty: i.qty, options: i.cfg }
    if (i.id === 'cfg-timetable') return { kind: 'timetable', qty: i.qty, options: i.cfg }
    if (i.id === 'cfg-custom') return { kind: 'custom_print', qty: i.qty, options: i.cfg }
    return { kind: 'product', product_id: i.uuid, color: i.color, qty: i.qty }
  })
  const c = o.customer
  const { data, error } = await supa.rpc('place_order_v2', { payload: { customer: { name: c.name, phone: c.phone, email: c.email || '', address: c.address, note: c.note, zone: c.zone }, payment_method: c.payment, voucher: o.voucher || '', items } })
  if (error) throw new Error(error.message)
  let order = null
  try { order = await trackRel(data.code, c.phone) } catch { /* dùng dữ liệu tạm bên dưới */ }
  return order || { id: data.code, status: 'new', paid: false, customer: { ...c }, items: o.items.map(({ image, ...i }) => i), subtotal: data.subtotal, ship: data.ship_fee, discount: data.discount, total: data.total, createdAt: Date.now() }
}

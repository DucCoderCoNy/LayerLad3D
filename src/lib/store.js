// Kho dữ liệu dùng chung. Không có .env -> lưu localStorage (1 máy). Có .env -> lưu Supabase (nhiều máy, realtime).
// API không đổi: const [items, setItems] = useStore('products')
import { useSyncExternalStore } from 'react'
import { createClient } from '@supabase/supabase-js'
import { PRODUCTS, CATEGORIES } from '../data/products.js'
import { POSTS } from '../data/posts.js'
import { DEFSET } from './workshop.js'
import { slugify } from './slug.js'
import { DEFAULT_COLORS } from '../data/colors.js'

const URL = import.meta.env.VITE_SUPABASE_URL, KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
export const supa = URL && KEY ? createClient(URL, KEY) : null

const PFX = 'll3d:'
const SEED = {
  products: PRODUCTS.map((p) => ({ ...p, slug: slugify(p.name), stock: 50, active: true, image: '', images: [], colorIds: [] })),
  categories: CATEGORIES.filter((c) => c.id !== 'all'),
  posts: POSTS,
  showcase: [], // thư viện ảnh + đánh giá khách (quản lý trong Admin)
  colors: DEFAULT_COLORS,   // màu nhựa dùng chung (Admin: Quản lý màu)
  printers: [{ id: 'pr-1', name: 'Anycubic Kobra X', model: 'Kobra X', status: 'idle', note: '', active: true }], // máy in (Admin: Máy in)
  customers: [],            // ghi chú nội bộ theo khách (id = số điện thoại chuẩn hóa); lịch sử mua tính từ đơn hàng
  orders: [],
  requests: [],
  wo: [], ws: [], wc: [], wset: { ...DEFSET }, // xưởng: đơn, kho, thu chi, thông số giá vốn
  users: [{ id: 'u-admin', name: 'Quản trị viên', email: 'admin@layerlab3d.vn', password: 'admin123', phone: '', role: 'admin', banned: false, createdAt: Date.now() }],
  settings: {
    storeName: 'LayerLab 3D', phone: '0900 000 000', email: 'hello@layerlab3d.vn',
    bankId: '970422', bankAccount: '0123456789', bankHolder: 'NGUYEN VAN A', // 970422 = MB Bank
    pricePerGram: 1500, pricePerHour: 8000, designFee: 50000, shipFee: 25000, freeShipOver: 300000,
    zalo: 'https://zalo.me/0900000000', messenger: '', address: '', hours: '8:00 – 21:00 (T2 – CN)',
    keychainBase: 25000, keychainPerChar: 3000, ttBase: 10000, ttPerCell: 3400, // công cụ tùy biến (server tự tính lại giá)
    shipZones: [{ id: 'z1', name: 'Nội thành Hà Nội / TP.HCM', fee: 20000 }, { id: 'z2', name: 'Các tỉnh/thành khác', fee: 30000 }, { id: 'z3', name: 'Vùng xa, hải đảo', fee: 45000 }],
  },
}
const OBJ = ['settings', 'wset']                 // bộ sưu tập dạng 1 object (lưu id 'main')
const DESC = ['orders', 'requests', 'wo', 'wc']  // mới nhất lên đầu
export const KEYS = Object.keys(SEED).filter((k) => !(supa && k === 'users')) // users chỉ có ở chế độ local
// Chế độ server: khách chỉ tải dữ liệu công khai; đơn/yêu cầu của chính mình khi đã đăng nhập; phần còn lại chỉ admin (tránh tải thừa + RLS vẫn chặn ở server)
const PUBLIC_KEYS = ['products', 'categories', 'posts', 'showcase', 'colors', 'settings']
const USER_KEYS = ['orders', 'requests']
let role = null // null = chưa đăng nhập, 'customer', 'admin'
const keysFor = () => (!supa ? KEYS : role === 'admin' ? KEYS : role ? [...PUBLIC_KEYS, ...USER_KEYS] : PUBLIC_KEYS)
export function setRole(r) { const changed = role !== (r || null); role = r || null; if (changed && supa) { Object.keys(cache).forEach((k) => { if (!keysFor().includes(k)) delete cache[k] }); reloadAll() } }
const listeners = new Set(), cache = {}
let loaded = !supa
const emit = () => listeners.forEach((f) => f())

function read(k) {
  if (!(k in cache)) {
    if (supa) cache[k] = OBJ.includes(k) ? SEED[k] : []
    else { try { const v = localStorage.getItem(PFX + k); cache[k] = v ? (OBJ.includes(k) ? { ...SEED[k], ...JSON.parse(v) } : JSON.parse(v)) : SEED[k] } catch { cache[k] = SEED[k] } }
  }
  return cache[k]
}

/* ---------- Supabase: ghi theo từng bản ghi (so sánh cũ/mới) ---------- */
const rowOf = (k, it) => ({ collection: k, id: OBJ.includes(k) ? 'main' : it.id, data: it, owner: OBJ.includes(k) ? null : it.userId || null })
async function persist(k, old, nv) {
  try {
    if (OBJ.includes(k)) { const { error } = await supa.from('records').upsert(rowOf(k, nv)); if (error) throw error; return }
    const oldMap = new Map(old.map((x) => [x.id, JSON.stringify(x)])), ids = new Set(nv.map((x) => x.id))
    const adds = nv.filter((x) => !oldMap.has(x.id))
    const upd = nv.filter((x) => oldMap.has(x.id) && oldMap.get(x.id) !== JSON.stringify(x))
    const del = old.filter((x) => !ids.has(x.id)).map((x) => x.id)
    if (adds.length) { const { error } = await supa.from('records').insert(adds.map((x) => rowOf(k, x))); if (error) throw error }
    for (const x of upd) { const { error } = await supa.from('records').update({ data: x, updated_at: new Date().toISOString() }).eq('collection', k).eq('id', x.id); if (error) throw error }
    if (del.length) { const { error } = await supa.from('records').delete().eq('collection', k).in('id', del); if (error) throw error }
  } catch (e) {
    console.error(e); alert('Lưu lên server thất bại: ' + (e.message || e) + '\nDữ liệu sẽ được tải lại từ server.'); loadCollection(k)
  }
}
async function loadCollection(k) {
  const { data, error } = await supa.from('records').select('id,data').eq('collection', k).order('created_at', { ascending: !DESC.includes(k) }).limit(5000)
  if (error) return console.error(error)
  if (OBJ.includes(k)) { if (data[0]) cache[k] = { ...SEED[k], ...data[0].data } } else cache[k] = data.map((r) => r.data)
  emit()
}
export async function reloadAll() { if (!supa) return; await Promise.all(keysFor().map(loadCollection)); loaded = true; emit() }

/** Ghi giá trị mới cho 1 bộ sưu tập (cập nhật giao diện ngay, rồi đồng bộ lên server) */
export function write(k, v) {
  const old = read(k); cache[k] = v; emit()
  if (supa) persist(k, old, v); else localStorage.setItem(PFX + k, JSON.stringify(v))
}
export const getStore = read
export function useStore(k) {
  const v = useSyncExternalStore((cb) => { listeners.add(cb); return () => listeners.delete(cb) }, () => read(k))
  return [v, (nv) => write(k, typeof nv === 'function' ? nv(read(k)) : nv)]
}
export const useLoaded = () => useSyncExternalStore((cb) => { listeners.add(cb); return () => listeners.delete(cb) }, () => loaded)
export const uid = (p) => p + '-' + Math.random().toString(36).slice(2, 8)

/** Đặt hàng: remote -> hàm place_order trên server (tính lại giá, trừ kho). local -> ghi trực tiếp */
export async function placeOrder(o) {
  if (!supa) {
    write('orders', [o, ...read('orders')])
    write('products', read('products').map((p) => { const q = o.items.filter((i) => i.id === p.id).reduce((s, i) => s + i.qty, 0); return q ? { ...p, stock: Math.max(0, p.stock - q) } : p }))
    return o
  }
  const { data, error } = await supa.rpc('place_order', { o })
  if (error) throw new Error(error.message)
  const mine = JSON.parse(localStorage.getItem(PFX + 'mine') || '[]') // khách chưa đăng nhập vẫn xem lại được đơn của mình
  localStorage.setItem(PFX + 'mine', JSON.stringify([data, ...mine].slice(0, 20)))
  loadCollection('products'); loadCollection('orders')
  return data
}
export const findOrder = (id) => read('orders').find((x) => x.id === id) || JSON.parse(localStorage.getItem(PFX + 'mine') || '[]').find((x) => x.id === id)

/** Nạp sản phẩm mẫu + cài đặt mặc định lên server (chỉ admin, dùng 1 lần đầu) */
export async function seedRemote() {
  if (read('products').length && !confirm('Server đã có sản phẩm. Vẫn nạp thêm sản phẩm mẫu?')) return
  const have = new Set(read('products').map((p) => p.id))
  write('products', [...read('products'), ...SEED.products.filter((p) => !have.has(p.id))])
  const hc = new Set(read('categories').map((c) => c.id)), hp = new Set(read('posts').map((c) => c.id))
  write('categories', [...read('categories'), ...SEED.categories.filter((c) => !hc.has(c.id))])
  write('posts', [...read('posts'), ...SEED.posts.filter((c) => !hp.has(c.id))])
  write('settings', { ...SEED.settings, ...read('settings') }); write('wset', { ...SEED.wset, ...read('wset') })
}
export function resetAll() { Object.keys(SEED).forEach((k) => localStorage.removeItem(PFX + k)); localStorage.removeItem('ll3d:session'); localStorage.removeItem('ll3d:cart'); location.href = '/' }

/* ---------- Khởi động chế độ server: tải dữ liệu + nhận cập nhật realtime từ máy khác ---------- */
if (supa) {
  reloadAll()
  supa.channel('records').on('postgres_changes', { event: '*', schema: 'public', table: 'records' }, (p) => {
    const row = p.eventType === 'DELETE' ? p.old : p.new, k = row?.collection
    if (!k || !keysFor().includes(k)) return
    if (OBJ.includes(k)) { if (p.eventType !== 'DELETE') cache[k] = { ...SEED[k], ...p.new.data } }
    else {
      const arr = [...read(k)], i = arr.findIndex((x) => x.id === row.id)
      if (p.eventType === 'DELETE') { if (i >= 0) arr.splice(i, 1) }
      else if (i >= 0) arr[i] = p.new.data
      else DESC.includes(k) ? arr.unshift(p.new.data) : arr.push(p.new.data)
      cache[k] = arr
    }
    emit()
  }).subscribe()
  document.addEventListener('visibilitychange', () => !document.hidden && reloadAll())
}

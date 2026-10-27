import { supa, uid } from './store.js'

/** Thu nhỏ ảnh về tối đa `max` px cạnh dài, xuất JPEG */
const resize = (file, max) => new Promise((res, rej) => {
  const img = new Image(), url = URL.createObjectURL(file)
  img.onload = () => {
    const s = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement('canvas')
    c.width = Math.round(img.width * s); c.height = Math.round(img.height * s)
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url)
    c.toBlob((b) => (b ? res(b) : rej(new Error('Không xử lý được ảnh'))), 'image/jpeg', 0.82)
  }
  img.onerror = () => rej(new Error('File không phải ảnh hợp lệ'))
  img.src = url
})
const toDataUrl = (blob) => new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(blob) })

/** Chế độ server: tải lên Supabase Storage (bucket public-images) và trả về URL.
 *  Chế độ 1 máy: trả về base64 nhỏ (lưu localStorage). */
export async function uploadImage(file, folder = 'misc') {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error('Chỉ nhận ảnh JPG, PNG hoặc WebP')
  if (file.size > 15 * 1024 * 1024) throw new Error('Ảnh quá lớn (tối đa 15 MB trước khi nén)')
  const blob = await resize(file, supa ? 1280 : 640)
  if (!supa) return toDataUrl(blob)
  const path = `${folder}/${uid('img')}.jpg`
  const { error } = await supa.storage.from('public-images').upload(path, blob, { contentType: 'image/jpeg', cacheControl: '31536000' })
  if (error) throw new Error(explainStorageError(error))
  return supa.storage.from('public-images').getPublicUrl(path).data.publicUrl
}

/** Dịch lỗi Supabase Storage sang hướng dẫn tiếng Việt (kèm lỗi gốc trong ngoặc để tra cứu) */
export function explainStorageError(err) {
  const m = String(err?.message || err || ''), raw = ` (lỗi gốc: ${m})`
  if (/bucket not found/i.test(m)) return 'Chưa có kho ảnh "public-images" trên Supabase. Mở SQL Editor, chạy file supabase/migrations/004_fix_image_storage.sql rồi thử lại.' + raw
  if (/row-level security|violates|permission|not authori[sz]ed|unauthori[sz]ed|forbidden/i.test(m)) return 'Không có quyền tải ảnh: tài khoản cần vai trò admin (bảng profiles) và kho ảnh cần có chính sách cho admin. Chạy 004_fix_image_storage.sql và kiểm tra cột role = admin.' + raw
  if (/jwt|token|expired|not authenticated|invalid claim/i.test(m)) return 'Phiên đăng nhập đã hết hạn. Hãy đăng xuất rồi đăng nhập lại.' + raw
  if (/exceed|too large|payload|maximum allowed|entity too large/i.test(m)) return 'Ảnh vượt giới hạn dung lượng của kho ảnh. Thử ảnh nhỏ hơn hoặc nâng giới hạn bằng 004_fix_image_storage.sql.' + raw
  if (/mime|not supported|invalid.*type/i.test(m)) return 'Kho ảnh không chấp nhận định dạng này. Chỉ dùng JPG, PNG hoặc WebP.' + raw
  if (/failed to fetch|networkerror|network|load failed|cors/i.test(m)) return 'Không kết nối được tới Supabase. Kiểm tra mạng và biến môi trường VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY ở nơi deploy (Vercel/Netlify) rồi deploy lại.' + raw
  return 'Tải ảnh lên thất bại.' + raw
}

/** Chẩn đoán kho ảnh từng bước (dùng ở Cài đặt → Tài khoản & dữ liệu). Trả về [{ ok, label, detail }] */
export async function checkImageStorage() {
  const out = [], add = (ok, label, detail = '') => { out.push({ ok, label, detail }); return ok }
  if (!add(!!supa, 'Kết nối Supabase', supa ? '' : 'Web đang chạy chế độ 1 máy (chưa có VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY khi build). Đặt biến môi trường ở Vercel/Netlify rồi deploy lại.')) return out
  const { data: sess } = await supa.auth.getSession()
  if (!add(!!sess?.session, 'Đã đăng nhập', sess?.session ? sess.session.user.email : 'Chưa có phiên đăng nhập. Đăng nhập lại.')) return out
  const { data: prof, error: pe } = await supa.from('profiles').select('role,banned').eq('id', sess.session.user.id).maybeSingle()
  add(prof?.role === 'admin' && !prof?.banned, 'Vai trò admin trong bảng profiles', pe ? `Không đọc được hồ sơ: ${pe.message}` : prof ? `role = ${prof.role}${prof.banned ? ' (đang bị khóa)' : ''}` : 'Chưa có dòng hồ sơ. Chạy schema.sql rồi đặt role = admin cho tài khoản này.')
  // Tải thử một ảnh nhỏ rồi xóa
  const blob = await new Promise((res) => { const c = document.createElement('canvas'); c.width = c.height = 8; c.getContext('2d').fillRect(0, 0, 8, 8); c.toBlob(res, 'image/jpeg', 0.8) })
  const path = `_check/${uid('chk')}.jpg`, { error } = await supa.storage.from('public-images').upload(path, blob, { contentType: 'image/jpeg' })
  if (!add(!error, 'Tải thử một ảnh lên kho "public-images"', error ? explainStorageError(error) : '')) return out
  const url = supa.storage.from('public-images').getPublicUrl(path).data.publicUrl
  let readable = false; try { readable = (await fetch(url, { method: 'HEAD' })).ok } catch { /* bị chặn mạng */ }
  add(readable, 'Ảnh vừa tải mở được công khai', readable ? '' : 'Kho ảnh chưa ở chế độ public nên khách sẽ không thấy ảnh. Chạy 004_fix_image_storage.sql.')
  const { error: de } = await supa.storage.from('public-images').remove([path])
  add(!de, 'Xóa ảnh thử', de ? explainStorageError(de) : '')
  return out
}

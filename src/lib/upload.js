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
  if (error) throw new Error('Tải ảnh lên thất bại: ' + error.message)
  return supa.storage.from('public-images').getPublicUrl(path).data.publicUrl
}

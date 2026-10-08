// Công cụ 1 lần: chuyển ảnh base64 (lưu trong bảng records cũ) sang Supabase Storage + gắn vào bảng quan hệ mới.
import { supa } from './supa.js'
import { uploadImage } from './upload.js'
import { must } from './useAsync.js'

const toFile = async (dataUrl) => { const b = await (await fetch(dataUrl)).blob(); return new File([b], 'img', { type: b.type || 'image/jpeg' }) }
export async function migrateBase64Images(log) {
  const rows = must(await supa.from('records').select('id,collection,data').in('collection', ['products', 'posts', 'showcase']))
  let done = 0, failed = 0
  for (const r of rows) {
    const field = r.collection === 'posts' ? 'cover' : 'image', v = r.data?.[field]
    if (!v || !String(v).startsWith('data:')) continue
    try {
      const url = await uploadImage(await toFile(v), r.collection)
      if (r.collection === 'products') {
        const p = must(await supa.from('products').select('id').eq('legacy_id', r.id).maybeSingle())
        if (p && !must(await supa.from('product_images').select('id').eq('product_id', p.id).limit(1)).length) must(await supa.from('product_images').insert({ product_id: p.id, url, sort_order: 0 }))
      } else if (r.collection === 'posts') must(await supa.from('blog_posts').update({ cover_url: url }).eq('legacy_id', r.id).is('cover_url', null))
      else must(await supa.from('reviews').update({ image_url: url }).eq('legacy_id', r.id).is('image_url', null))
      done++; log?.(`Đã chuyển ảnh: ${r.collection}/${r.id}`)
    } catch (e) { failed++; log?.(`LỖI ${r.collection}/${r.id}: ${e.message}`) }
  }
  return { done, failed }
}

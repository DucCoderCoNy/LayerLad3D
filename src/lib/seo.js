import { useEffect } from 'react'

const SITE_NAME = 'LayerLab 3D'
const DEFAULT_TITLE = 'LayerLab 3D – In 3D theo yêu cầu, móc khóa & thời khóa biểu module'
const DEFAULT_DESC = 'LayerLab 3D: in 3D FDM theo yêu cầu, móc khóa tên cá nhân hóa, thời khóa biểu module. Báo giá ngay, giao toàn quốc.'

const setMeta = (attr, key, content) => {
  if (content == null) return
  let el = document.head.querySelector(`meta[${attr}="${key}"]`)
  if (!el) { el = document.createElement('meta'); el.setAttribute(attr, key); document.head.appendChild(el) }
  el.setAttribute('content', content)
}
const setLink = (rel, href) => {
  let el = document.head.querySelector(`link[rel="${rel}"]`)
  if (!el) { el = document.createElement('link'); el.setAttribute('rel', rel); document.head.appendChild(el) }
  el.setAttribute('href', href)
}

/** Đặt tiêu đề tab, meta description, Open Graph, canonical và (tùy chọn) dữ liệu có cấu trúc JSON-LD cho từng trang.
 *  opts = { image, type: 'website'|'article'|'product', jsonLd: object, noindex: bool }
 *  Lưu ý: web là SPA nên các thẻ này do JavaScript tạo; Google đọc được, nhưng trình xem trước của Zalo/Facebook thì cần prerender (xem README). */
export function useTitle(title, desc, opts = {}) {
  const { image, type = 'website', jsonLd, noindex } = opts
  useEffect(() => {
    const t = title ? `${title} – ${SITE_NAME}` : DEFAULT_TITLE, d = desc || DEFAULT_DESC
    const url = location.origin + location.pathname
    document.title = t
    setMeta('name', 'description', d)
    setMeta('name', 'robots', noindex ? 'noindex,nofollow' : 'index,follow')
    setMeta('property', 'og:title', t); setMeta('property', 'og:description', d); setMeta('property', 'og:type', type)
    setMeta('property', 'og:url', url); setMeta('property', 'og:site_name', SITE_NAME); setMeta('property', 'og:locale', 'vi_VN')
    if (image) { setMeta('property', 'og:image', image.startsWith('http') ? image : location.origin + image); setMeta('name', 'twitter:card', 'summary_large_image') }
    else setMeta('name', 'twitter:card', 'summary')
    setLink('canonical', url)
    const old = document.getElementById('ld-json'); if (old) old.remove()
    if (jsonLd) { const s = document.createElement('script'); s.type = 'application/ld+json'; s.id = 'ld-json'; s.textContent = JSON.stringify(jsonLd); document.head.appendChild(s) }
    return () => document.getElementById('ld-json')?.remove()
  }, [title, desc, image, type, noindex, JSON.stringify(jsonLd || null)])
}
export { slugify } from './slug.js'
export const normPhone = (s) => String(s || '').replace(/\D/g, '').replace(/^84/, '0')
/** Đường dẫn có slug (đơn cũ chưa có slug vẫn dùng id) */
export const productPath = (p) => `/shop/${p.slug || p.id}`
export const postPath = (p) => `/tin-tuc/${p.slug || p.id}`
export const findBySlug = (list, key) => list.find((x) => x.slug === key || x.id === key)

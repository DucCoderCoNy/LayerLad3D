// Tạo public/sitemap.xml + public/robots.txt trước khi build. Chạy tự động qua `npm run build`.
// Cần biến môi trường SITE_URL (vd https://layerlab3d.vn). Có VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY thì thêm cả sản phẩm và bài viết đã đăng.
// Không bao giờ làm hỏng build: lỗi mạng chỉ in cảnh báo và dùng danh sách trang tĩnh.
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs'

const env = { ...Object.fromEntries(existsSync('.env') ? readFileSync('.env', 'utf8').split(/\r?\n/).filter((l) => /^\w+=/.test(l)).map((l) => [l.split('=')[0], l.slice(l.indexOf('=') + 1).trim()]) : []), ...process.env }
const site = (env.SITE_URL || env.VITE_SITE_URL || (env.VERCEL_PROJECT_PRODUCTION_URL ? 'https://' + env.VERCEL_PROJECT_PRODUCTION_URL : '')).replace(/\/$/, '')
mkdirSync('public', { recursive: true })

const robots = (sitemap) => `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /checkout\nDisallow: /order/\nDisallow: /account\nDisallow: /login\n${sitemap ? `\nSitemap: ${site}/sitemap.xml\n` : ''}`
if (!site) {
  writeFileSync('public/robots.txt', robots(false))
  console.warn('[sitemap] Chưa đặt SITE_URL nên bỏ qua sitemap.xml. Đặt SITE_URL=https://ten-mien-cua-ban.vn trong biến môi trường khi deploy.')
  process.exit(0)
}

const pages = ['/', '/shop', '/custom', '/thiet-ke', '/thiet-ke/moc-khoa', '/thiet-ke/thoi-khoa-bieu', '/tin-tuc', '/thu-vien', '/faq', '/lien-he', '/tra-cuu', '/chinh-sach/doi-tra', '/chinh-sach/bao-hanh', '/chinh-sach/van-chuyen']
const urls = pages.map((p) => ({ loc: p, pri: p === '/' ? '1.0' : '0.7' }))

async function rows(collection) {
  const r = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/records?collection=eq.${collection}&select=id,data,updated_at&limit=1000`, { headers: { apikey: env.VITE_SUPABASE_ANON_KEY, Authorization: `Bearer ${env.VITE_SUPABASE_ANON_KEY}` } })
  if (!r.ok) throw new Error(`${collection}: HTTP ${r.status}`)
  return r.json()
}
if (env.VITE_SUPABASE_URL && env.VITE_SUPABASE_ANON_KEY) {
  try {
    for (const r of await rows('products')) if (r.data.active !== false) urls.push({ loc: `/shop/${r.data.slug || r.id}`, pri: '0.8', mod: r.updated_at })
    for (const r of await rows('posts')) if (r.data.published) urls.push({ loc: `/tin-tuc/${r.data.slug || r.id}`, pri: '0.6', mod: r.updated_at })
  } catch (e) { console.warn('[sitemap] Không đọc được Supabase, chỉ ghi trang tĩnh:', e.message) }
}
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')
writeFileSync('public/sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${esc(site + u.loc)}</loc>${u.mod ? `<lastmod>${u.mod.slice(0, 10)}</lastmod>` : ''}<priority>${u.pri}</priority></url>`).join('\n')}\n</urlset>\n`)
writeFileSync('public/robots.txt', robots(true))
console.log(`[sitemap] ${urls.length} URL → public/sitemap.xml`)

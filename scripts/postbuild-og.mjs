// Chạy tự động sau `npm run build` (script "postbuild"): thay __SITE_URL__ trong dist/index.html bằng địa chỉ site thật.
// Ảnh chia sẻ Open Graph cần link tuyệt đối. Địa chỉ lấy từ SITE_URL (hoặc biến URL do Netlify cung cấp). Không bao giờ làm hỏng build.
import { readFile, writeFile } from 'node:fs/promises'

const SITE = (process.env.SITE_URL || process.env.URL || process.env.DEPLOY_PRIME_URL || '').replace(/\/$/, '')
try {
  const html = await readFile('dist/index.html', 'utf8')
  await writeFile('dist/index.html', html.replaceAll('__SITE_URL__', SITE))
  if (!SITE) console.warn('[og] Chưa có SITE_URL: thẻ og:image sẽ là đường dẫn tương đối (nhiều nơi chia sẻ không đọc được). Đặt SITE_URL=https://ten-mien.vn khi build.')
} catch (e) { console.warn('[og] bỏ qua:', e.message) }

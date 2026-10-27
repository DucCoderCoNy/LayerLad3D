/** Copy văn bản vào clipboard, có dự phòng cho trình duyệt/trang không cho dùng Clipboard API (http, iOS cũ…).
 *  Trả về Promise<boolean>: true nếu copy được. Không bao giờ ném lỗi và không bao giờ treo quá 1,5 giây. */
export function copyText(text) {
  const legacy = () => {
    try {
      const ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0'
      document.body.appendChild(ta); ta.select(); ta.setSelectionRange(0, text.length)
      const ok = document.execCommand('copy'); ta.remove(); return ok
    } catch { return false }
  }
  const modern = navigator.clipboard?.writeText ? navigator.clipboard.writeText(text).then(() => true, () => false) : Promise.resolve(false)
  return Promise.race([modern, new Promise((r) => setTimeout(() => r(false), 1500))]).then((ok) => ok || legacy())
}

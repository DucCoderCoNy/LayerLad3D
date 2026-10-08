// Xuất phiếu giao hàng (in / lưu PDF qua hộp thoại in của trình duyệt) và xuất Excel (CSV mở bằng Excel)
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
const vnd = (n) => new Intl.NumberFormat('vi-VN').format(n || 0) + '₫'

/** Mở cửa sổ in chứa mỗi đơn 1 phiếu giao hàng (khổ A5). Chọn "Lưu dưới dạng PDF" trong hộp thoại in để có file PDF */
export function printSlips(orders, st) {
  if (!orders.length) return alert('Không có đơn nào để in')
  const w = window.open('', '_blank')
  if (!w) return alert('Trình duyệt đang chặn cửa sổ mới – hãy cho phép popup rồi thử lại')
  const slips = orders.map((o) => {
    const c = o.customer || {}, cod = c.payment === 'cod' && !o.paid ? o.total : 0
    return `<section class="slip">
      <header><div><b class="shop">${esc(st.storeName)}</b><br>${esc(st.phone)}${st.address ? '<br>' + esc(st.address) : ''}</div><div class="id">PHIẾU GIAO HÀNG<br><b>${esc(o.id)}</b><br>${new Date(o.createdAt).toLocaleDateString('vi-VN')}</div></header>
      <div class="box"><small>NGƯỜI NHẬN</small><br><b class="big">${esc(c.name)}</b> · <b>${esc(c.phone)}</b><br>${esc(c.address)}</div>
      <table><thead><tr><th>Sản phẩm</th><th>Màu / tùy chọn</th><th>SL</th><th class="r">Thành tiền</th></tr></thead><tbody>
        ${(o.items || []).map((i) => `<tr><td>${esc(i.name)}</td><td>${esc(i.color)}</td><td>${i.qty}</td><td class="r">${vnd(i.price * i.qty)}</td></tr>`).join('')}
      </tbody></table>
      <p class="r">Phí giao hàng: ${o.ship ? vnd(o.ship) : 'Miễn phí'}</p>
      <div class="cod">${cod ? `THU HỘ (COD): <b>${vnd(cod)}</b>` : 'ĐÃ THANH TOÁN – KHÔNG THU TIỀN'}</div>
      ${c.note ? `<p><small>Ghi chú của khách:</small> ${esc(c.note)}</p>` : ''}
    </section>`
  }).join('')
  w.document.write(`<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>Phiếu giao hàng</title><style>
    @page{size:A5;margin:8mm} body{font:13px/1.45 system-ui,Arial,sans-serif;color:#000;margin:0}
    .slip{page-break-after:always;padding:4mm} .slip:last-child{page-break-after:auto}
    header{display:flex;justify-content:space-between;gap:12px;border-bottom:2px solid #000;padding-bottom:8px;margin-bottom:10px}
    .shop{font-size:16px} .id{text-align:right} .big{font-size:16px} .box{border:1px solid #000;padding:8px;border-radius:6px;margin-bottom:10px}
    table{width:100%;border-collapse:collapse;margin-bottom:6px} th,td{border-bottom:1px solid #999;padding:4px;text-align:left} .r{text-align:right}
    .cod{border:2px solid #000;padding:8px;text-align:center;font-size:15px;margin:8px 0;border-radius:6px} small{color:#444}
  </style></head><body>${slips}<script>window.onload=function(){setTimeout(function(){window.print()},300)}<\/script></body></html>`)
  w.document.close()
}

/** Tải file .csv (UTF-8 có BOM, mở thẳng bằng Excel được tiếng Việt). Ô bắt đầu bằng = + - @ được thêm ' để tránh chạy công thức */
export function downloadCSV(name, rows) {
  const cell = (c) => { let s = String(c ?? ''); if (typeof c === 'string' && /^[=+\-@]/.test(s)) s = "'" + s; return '"' + s.replace(/"/g, '""') + '"' }
  const csv = '\ufeffsep=,\r\n' + rows.map((r) => r.map(cell).join(',')).join('\r\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); a.download = name
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

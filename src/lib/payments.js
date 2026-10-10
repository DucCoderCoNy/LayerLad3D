// Danh sách phương thức thanh toán & đơn vị vận chuyển. Thêm cổng mới = thêm 1 mục ở đây, giao diện checkout/admin tự cập nhật.
//
// Cách tích hợp MoMo / VNPay sau này (cần tài khoản merchant, KHÔNG làm trên frontend vì có khóa bí mật):
//   1. Tạo Supabase Edge Function `create-payment` nhận mã đơn → gọi API cổng với khóa bí mật (lưu trong secrets) → trả về payUrl.
//   2. Tạo Edge Function `payment-webhook` (IPN) kiểm tra chữ ký rồi đặt payStatus='paid' cho đơn.
//   3. Đổi enabled:true và thêm 'momo'/'vnpay' vào kiểm tra payment trong hàm place_order (supabase/migrations/003…).
export const PAYMENT_METHODS = [
  { id: 'cod', label: 'Thanh toán khi nhận hàng (COD)', enabled: true },
  { id: 'bank', label: 'Chuyển khoản ngân hàng (có mã QR VietQR)', enabled: true },
  { id: 'momo', label: 'Ví MoMo', enabled: false, soon: true },
  { id: 'vnpay', label: 'VNPay (thẻ / QR)', enabled: false, soon: true },
]
export const paymentLabel = (id) => PAYMENT_METHODS.find((m) => m.id === id)?.label.split(' (')[0] || id

// Phí ship hiện tính theo khu vực cấu hình trong Admin → Cài đặt. Khi nối GHN/GHTK: thêm hàm quote(order) gọi qua Edge Function.
export const SHIPPING_PROVIDERS = [
  { id: '', label: '—' }, { id: 'Tự giao', label: 'Tự giao' },
  { id: 'GHN', label: 'GHN', soon: true }, { id: 'GHTK', label: 'GHTK', soon: true }, { id: 'Viettel Post', label: 'Viettel Post' }, { id: 'J&T', label: 'J&T' },
]

/** Link ảnh QR chuyển khoản VietQR (cần Internet). Nội dung CK = mã đơn */
export const qrUrl = (st, amount, memo) =>
  `https://img.vietqr.io/image/${st.bankId}-${st.bankAccount}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(memo)}&accountName=${encodeURIComponent(st.bankHolder)}`

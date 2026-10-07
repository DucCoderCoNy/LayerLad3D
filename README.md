# LayerLab 3D – Website cửa hàng in 3D (có trang quản trị)

```bash
npm install
npm run dev      # http://localhost:5173
npm run build
```

**Admin:** vào `/login`, đăng nhập `admin@layerlab3d.vn` / `admin123`, rồi mở `/admin`.
Đổi mật khẩu bằng cách tạo tài khoản mới, nâng quyền Admin ở mục Người dùng, rồi xóa tài khoản mặc định.

**Lưu ý:** dữ liệu lưu trong localStorage của từng trình duyệt (chưa có backend), mật khẩu lưu thô.
Chỉ dùng để chạy thử/demo. Muốn bán thật cần backend (Supabase, Firebase, Node + DB…).

- Cài đặt cửa hàng, giá in, tài khoản QR: trang Admin → Cài đặt
- Màu, font: `tailwind.config.js`
# LayerLad3d

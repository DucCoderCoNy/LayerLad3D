# LayerLab 3D – Website cửa hàng in 3D + quản lý xưởng

```bash
npm install
npm run dev      # http://localhost:5173
npm run build
```

## Chế độ 1 máy (demo)
Không có file `.env` -> dữ liệu lưu trong trình duyệt. Admin mặc định: `admin@layerlab3d.vn` / `admin123`.

## Chế độ nhiều máy (Supabase) – nên dùng khi đưa lên mạng
1. Tạo project tại https://supabase.com
2. SQL Editor -> dán toàn bộ `supabase/schema.sql` -> Run
3. Authentication -> Providers -> Email -> tắt "Confirm email"
4. Project Settings -> API -> copy "Project URL" và "anon public key" vào file `.env` (mẫu: `.env.example`)
5. `npm run dev`, đăng ký 1 tài khoản trên web, rồi chạy trong SQL Editor:
   `update profiles set role = 'admin' where email = 'email-cua-ban@...';`
6. Đăng nhập lại -> /admin -> Cài đặt -> "Nạp sản phẩm mẫu lên server"

## Đưa lên mạng
Vercel/Netlify: đẩy code lên GitHub, import repo, thêm 2 biến môi trường `VITE_SUPABASE_URL` và `VITE_SUPABASE_ANON_KEY`, Deploy.

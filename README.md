# LayerLab 3D – Website cửa hàng in 3D + quản lý xưởng

```bash
npm install
npm run dev      # http://localhost:5173
npm run build
```

## Tính năng
**Khách:** cửa hàng + danh mục (phân trang, URL có slug, nhiều ảnh, chọn màu), giỏ hàng, thanh toán COD / VietQR, phí ship theo khu vực, **tùy biến móc khóa** (xem trước), **thời khóa biểu module**, **In theo yêu cầu**: tải STL/3MF (tự đọc thể tích, kích thước, ước tính gram + giờ in + giá; chọn PLA/PETG/ABS, màu, layer height, infill, số lượng; thêm vào giỏ cùng sản phẩm khác; file lưu vào Supabase Storage gắn với đơn), **tra cứu đơn** (mã đơn + SĐT), tin tức, thư viện ảnh + đánh giá, FAQ, chính sách, liên hệ, nút Zalo/Messenger/gọi nổi.

**Admin (`/admin`):** **Tổng quan** (doanh thu, chi phí, lợi nhuận, số đơn, đơn đang xử lý, lọc theo ngày/tháng/khoảng tùy chọn), sản phẩm (nhiều ảnh, slug, màu theo sản phẩm, lượng nhựa/sp), danh mục, **màu nhựa** (thêm/sửa/xóa), đơn hàng (Mới → Đã xác nhận → Đang chuẩn bị → Đang in → Hoàn thiện → Đang giao → Hoàn thành; **trạng thái thanh toán tách riêng**; lọc theo ngày; tải file STL/3MF khách gửi; mã vận đơn; hủy đơn tự hoàn kho; **hoàn thành đơn tự trừ nhựa**; in phiếu giao/PDF; xuất Excel), **khách hàng** (lịch sử, tổng đã mua, ghi chú), **máy in** + **hàng đợi theo máy** + **lịch in dạng tháng**, kho nhựa (loại/màu/gram, cảnh báo sắp hết), thu chi, giá vốn, báo cáo tháng, bài viết, thư viện & đánh giá, người dùng, cài đặt (có hệ số giá in theo vật liệu/layer).

## Chế độ 1 máy (demo)
Không có file `.env` -> dữ liệu lưu trong trình duyệt. Admin mặc định: `admin@layerlab3d.vn` / `admin123`.
**Bản build production không có Supabase sẽ tự khóa /admin** (đặt `VITE_ALLOW_DEMO=true` nếu cố ý bỏ qua).

## Chế độ nhiều máy (Supabase) – dùng khi đưa lên mạng
1. Tạo project tại https://supabase.com
2. SQL Editor -> dán toàn bộ `supabase/schema.sql` -> Run, **rồi chạy tiếp `supabase/migrations/003_custom_print_colors_storage.sql`** (cần cho In theo yêu cầu, màu, và siết quyền upload file). Cả hai chạy lại nhiều lần vẫn an toàn. 001/002 là schema quan hệ cho giai đoạn sau, chưa bắt buộc (xem `supabase/MIGRATIONS.md`).
3. Authentication -> Providers -> Email -> tắt "Confirm email"
4. Project Settings -> API -> copy "Project URL" và "anon public key" vào `.env` (mẫu: `.env.example`)
5. `npm run dev`, đăng ký 1 tài khoản, rồi chạy trong SQL Editor:
   `update profiles set role = 'admin' where email = 'email-cua-ban@...';`
6. Đăng nhập lại -> /admin -> Cài đặt -> "Nạp sản phẩm mẫu lên server" (nạp cả danh mục và bài viết mẫu)

## Công cụ quản lý cho chủ xưởng (Admin)
- **Việc cần làm hôm nay** (đầu trang Tổng quan): đơn mới chưa xác nhận, đơn in theo yêu cầu chưa chốt giá, chuyển khoản quá 12 giờ chưa thấy tiền, đơn hoàn thành chưa ghi thanh toán, đơn giao quá 7 ngày, đơn xưởng trễ hạn, nhựa/sản phẩm sắp hết. Bấm "Xử lý" nhảy thẳng tới danh sách đã lọc.
- **Theo dõi vận chuyển cho khách**: trong chi tiết đơn → khung "Vận chuyển" nhập đơn vị, mã vận đơn, link theo dõi của đơn vị vận chuyển và ghi chú. Khách thấy ngay ở Tài khoản (bấm vào đơn), trang Tra cứu đơn và trang đơn hàng. Chỉ chấp nhận link http/https.
- **Tiền: lãi vs dòng tiền** (Tổng quan): *Lãi ước tính* = doanh thu − giá vốn hàng đã bán − chi phí vận hành khác; *Dòng tiền ròng* = tiền đã thu − mọi khoản chi (kể cả mua cuộn nhựa dự trữ). Mua nhựa dự trữ làm dòng tiền giảm nhưng không làm lãi giảm; có thêm ô "Nhựa còn trong kho" (giá trị tài sản). Biểu đồ có trục tiền và số tiền trên đầu cột.
- **Phân tích bán hàng** (Bán hàng → Phân tích): sản phẩm/màu bán chạy, khách mua nhiều, khách quay lại, giá trị đơn trung bình, tỉ lệ hủy, cơ cấu thanh toán – theo khoảng ngày.
- **Tạo đơn thủ công** (Đơn hàng → "+ Tạo đơn thủ công"): nhập đơn từ Zalo/Facebook/trực tiếp; chọn sản phẩm từ kho (tự trừ tồn) hoặc nhập món tự do; khách tra cứu được bằng mã đơn + SĐT.
- **Nhập/xuất sản phẩm CSV** (Sản phẩm): tải file mẫu, xem trước và báo lỗi từng dòng trước khi nhập; chọn cập nhật hoặc bỏ qua sản phẩm trùng.
- **Chốt giá in theo yêu cầu**: trong chi tiết đơn, kiểm tra file rồi nhập giá chốt / sản phẩm; tổng đơn tự tính lại và khách thấy giá không còn là "ước tính".
- **Tin nhắn mẫu**: xác nhận đơn, báo giá, nhắc chuyển khoản, đã gửi hàng, xin đánh giá – bấm Copy hoặc mở Zalo của khách.
- **Lịch sử đơn**: ghi lại đổi trạng thái, đổi thanh toán, chốt giá.
- **Giá vốn & lãi gộp ước tính** từng đơn (món có khai báo gram), cảnh báo đơn đang lỗ.
- **Chọn nhiều đơn** để đổi trạng thái hàng loạt hoặc in phiếu giao.
- **Chuông báo đơn mới** + số đơn trên menu và tiêu đề tab (bật/tắt ở cuối menu; trình duyệt chỉ phát tiếng sau khi bạn bấm vào trang ít nhất 1 lần).

## SEO
- Mỗi trang có title/meta/Open Graph/canonical (hook `useTitle` trong `src/lib/seo.js`); sản phẩm có dữ liệu có cấu trúc (JSON-LD). URL sản phẩm dạng `/shop/ten-san-pham`.
- `npm run build` tự tạo `public/sitemap.xml` và `public/robots.txt` (đặt biến `SITE_URL=https://ten-mien.vn`; có Supabase thì thêm cả sản phẩm + bài viết). Nhớ gửi sitemap lên Google Search Console.
- ⚠ Web là SPA: Google đọc được thẻ meta do JS tạo, nhưng **bản xem trước khi dán link vào Zalo/Facebook** chỉ đọc `index.html` tĩnh. Muốn xem trước đúng từng sản phẩm cần prerender/SSR (làm sau).

## Giới hạn cần biết (ghi rõ để khỏi hiểu nhầm)
- **Giá in theo yêu cầu chỉ là ước tính**: thể tích đọc từ file, thời gian in dựa trên công thức, không phải slicer. Server tính lại giá từ gram/giờ khách gửi nhưng *không tự kiểm chứng được gram/giờ*, nên admin phải kiểm tra file trước khi in (đơn đã ghi "giá ước tính").
- Khách chưa đăng nhập vẫn tải được file STL/3MF (tối đa 50MB, chỉ đuôi .stl/.3mf, đường dẫn đúng dạng) để đặt hàng; file bỏ dở trong giỏ không tự xóa. Dùng hàm admin `list_orphan_uploads(7)` để xem file mồ côi và xóa trong Supabase Storage.
- Trừ nhựa tự động cần mỗi cuộn trong Kho nhựa có **loại nhựa + màu**, và sản phẩm thường cần khai báo "nhựa/1 sản phẩm"; không khớp cuộn nào thì hệ thống báo thiếu chứ không tự trừ bậy.
- Thanh toán MoMo/VNPay và ship GHN/GHTK: đã chừa chỗ trong `src/lib/payments.js` (hướng dẫn tích hợp ở đầu file) nhưng **chưa nối**.

## Việc cần làm trước khi mở bán
- Sửa nội dung **chính sách** và **FAQ** trong `src/data/pages.js` cho đúng thực tế (đang là nội dung mẫu).
- Điền Zalo/Messenger/địa chỉ, giá móc khóa/thời khóa biểu, phí ship theo khu vực ở Admin -> Cài đặt.
- Bài viết mẫu ở Tin tức: đọc lại, chỉnh theo khả năng máy của xưởng (đặc biệt phần ABS).

## Đưa lên mạng
Vercel/Netlify: đẩy code lên GitHub, import repo, thêm 2 biến môi trường `VITE_SUPABASE_URL` và `VITE_SUPABASE_ANON_KEY`, Deploy.

## Chưa có (cần tài khoản đối tác, làm khi bạn sẵn sàng)
MoMo/VNPay, tính ship tự động GHN/GHTK, tự xác nhận chuyển khoản (SePay/Casso), thông báo đơn mới qua Telegram/email, captcha cho form báo giá.

# Migration sang database quan hệ (Giai đoạn 1)

Các file trong `supabase/migrations/`:
| File | Việc |
|---|---|
| `001_relational_schema.sql` | Tạo bảng, RLS, hàm đặt hàng/tra cứu/đổi trạng thái, bucket ảnh. **Chỉ thêm mới.** |
| `002_backfill_from_records.sql` | Copy dữ liệu cũ (`records`) sang bảng mới. Không sửa `records`. |
| `003_custom_print_colors_storage.sql` | **Cần cho web hiện tại** (đang chạy bằng bảng `records`): đặt hàng có món In theo yêu cầu + kiểm tra màu, cho khách đọc bộ `colors`, siết upload `stl-files`, hàm liệt kê file mồ côi. Không xóa/sửa dữ liệu. |
| `999_rollback.sql` | Gỡ phần quan hệ mới (001 + 002). Không đụng 003. |

## Cách chạy (làm đúng thứ tự)
1. **Sao lưu**: Supabase → Database → Backups (hoặc Database → Backups → tạo bản mới); với dữ liệu quan trọng nên xuất thêm CSV của bảng `records`.
2. **Thử trước trên một project Supabase khác** (tạo project mới miễn phí, chạy `schema.sql` rồi 001, 002). SQL này chưa được kiểm thử trên Postgres thật nên mục đích là bắt lỗi trước khi động vào dữ liệu thật.
3. Project thật: SQL Editor → chạy `001` → chạy `002`.
4. Chạy các câu kiểm tra ở cuối file 002 (đang để dạng comment): số dòng cũ/mới phải khớp.
5. Mở web hiện tại, thử đặt hàng, vào admin: mọi thứ phải chạy như trước (frontend chưa đổi gì ở giai đoạn này).

Gặp lỗi: copy nguyên thông báo lỗi + tên file/dòng gửi lại để sửa. Không chạy tiếp 002 nếu 001 báo lỗi.

## Bảng mới và cách khách / admin truy cập
- Công khai (chỉ đọc): `categories`, `colors`, `products`, `product_images`, `product_colors`, `blog_posts` (đã đăng), `reviews` (đã duyệt), `settings` (trừ khóa bắt đầu bằng `private.`).
- Khách đăng nhập: chỉ thấy **đơn, dòng đơn, file của chính mình**; gửi đánh giá (chờ duyệt).
- Khách vãng lai: đặt hàng bằng hàm `place_order_v2`, tra cứu bằng `track_order_v2` (cần mã đơn + số điện thoại).
- Chỉ admin: `customers`, `filament_inventory`, `printers`, `print_queue`, `expenses`, và mọi thao tác ghi.
- Không có bảng nào cho phép khách tự insert/update trực tiếp; mọi giá tiền do server tính lại.
- Không dùng Service Role Key ở frontend.

## Trạng thái frontend
Frontend vẫn dùng bảng `records` (kèm các bộ mới: `colors`, `printers`, `customers`) — **chưa chuyển sang bảng quan hệ 001**. Lý do: 001/002 chưa được kiểm thử trên Postgres thật; đổi cả frontend cùng lúc sẽ rủi ro mất đơn. Khi 001/002 đã chạy thử ổn, chuyển dần từng nhóm (sản phẩm → đơn → kho).

## Chưa làm ở giai đoạn này (để giai đoạn sau)
- Frontend chưa dùng bảng mới (web vẫn chạy bằng `records` + `place_order` cũ).
- Chuyển ảnh base64 sang Storage; siết chính sách bucket `stl-files` (chỉ .stl/.3mf, thư mục tạm); chuyển `requests` cũ và dữ liệu xưởng (`wo/ws/wc`).

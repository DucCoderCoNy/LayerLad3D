-- =====================================================================
-- Migration 003 – SIẾT bucket stl-files. CHỈ CHẠY SAU KHI đã bật VITE_RELATIONAL=true và deploy bản web mới.
-- Trang In theo yêu cầu cũ (upload .obj, tên thư mục khác) sẽ không tải lên được nữa sau khi chạy file này.
-- Khách (kể cả chưa đăng nhập) chỉ được tải lên file .stl / .3mf, đúng dạng "thư mục-ngẫu-nhiên/tên-file", tối đa 50MB (giới hạn bucket).
-- =====================================================================
update storage.buckets set file_size_limit = 52428800 where id = 'stl-files';
drop policy if exists "stl_upload" on storage.objects;
create policy "stl_upload" on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'stl-files'
              and name ~ '^[A-Za-z0-9_-]{3,40}/[A-Za-z0-9._-]{1,120}$'
              and lower(name) ~ '\.(stl|3mf)$');

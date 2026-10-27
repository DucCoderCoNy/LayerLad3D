-- =====================================================================
-- LayerLab 3D – Migration 004: sửa/khởi tạo kho ảnh công khai (public-images)
-- Dùng khi trên web online không thêm được ảnh sản phẩm / bài viết (lỗi "Bucket not found", "row-level security"...).
-- Chạy lại nhiều lần vẫn an toàn. Không xóa/sửa dữ liệu. Chưa được kiểm thử trên Postgres thật.
-- =====================================================================
do $$ begin
  if to_regprocedure('public.is_admin()') is null then
    raise exception 'Chưa có hàm is_admin(): hãy chạy supabase/schema.sql trước';
  end if;
end $$;

-- 1) Kho ảnh: công khai để khách xem, tối đa 5MB, chỉ JPG/PNG/WebP
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('public-images', 'public-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = true, file_size_limit = 5242880, allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

-- 2) Chính sách: chỉ admin được tải lên / sửa / xóa (xem ảnh không cần chính sách vì kho là public)
drop policy if exists "img_insert" on storage.objects;
drop policy if exists "img_update" on storage.objects;
drop policy if exists "img_delete" on storage.objects;
create policy "img_insert" on storage.objects for insert to authenticated with check (bucket_id = 'public-images' and public.is_admin());
create policy "img_update" on storage.objects for update to authenticated using (bucket_id = 'public-images' and public.is_admin());
create policy "img_delete" on storage.objects for delete to authenticated using (bucket_id = 'public-images' and public.is_admin());

-- 3) KIỂM TRA tài khoản của bạn có phải admin không (chạy riêng câu lệnh dưới đây, thay email):
--    select id, email, role, banned from public.profiles where email = 'email-cua-ban@gmail.com';
--    Nếu role chưa là 'admin':
--    update public.profiles set role = 'admin' where email = 'email-cua-ban@gmail.com';

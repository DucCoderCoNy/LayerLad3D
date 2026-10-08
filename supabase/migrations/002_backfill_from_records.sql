-- =====================================================================
-- LayerLab 3D – Migration 002: COPY dữ liệu từ bảng `records` (cũ) sang các bảng quan hệ mới.
-- Không sửa, không xóa gì trong `records`. Chạy SAU 001. Chạy lại không nhân đôi dữ liệu (dùng on conflict / not exists).
-- Không chuyển: requests (yêu cầu in cũ), wo/ws/wc/wset (xưởng) -> giữ nguyên trong `records` cho tới giai đoạn sau.
-- Ảnh base64 KHÔNG được copy (quá nặng) -> sẽ được chuyển lên Storage ở giai đoạn 2.
-- =====================================================================

-- 1) Danh mục (mặc định + danh mục đã tạo trong admin)
insert into public.categories (slug, name, sort_order, legacy_id) values
  ('keychain', 'Móc khóa', 1, 'keychain'), ('study', 'Đồ dùng học tập', 2, 'study'), ('toy', 'Đồ chơi / Clicker', 3, 'toy')
on conflict (slug) do nothing;
insert into public.categories (slug, name, sort_order, legacy_id)
select r.id, coalesce(r.data->>'label', r.id), 10 + (row_number() over (order by r.created_at))::int, r.id
from public.records r where r.collection = 'categories'
on conflict (slug) do nothing;

-- 2) Màu mặc định
insert into public.colors (name, hex, sort_order) values
  ('Trắng', '#f4f4f5', 1), ('Đen', '#18181b', 2), ('Đỏ', '#ef4444', 3), ('Cam', '#ff6a13', 4), ('Vàng', '#facc15', 5),
  ('Xanh lá', '#22c55e', 6), ('Xanh dương', '#3b82f6', 7), ('Tím', '#8b5cf6', 8), ('Hồng', '#ec4899', 9)
on conflict (name) do nothing;

-- 3) Sản phẩm
insert into public.products (slug, category_id, name, description, price, stock, hot, active, legacy_id, created_at)
select r.id, c.id, coalesce(r.data->>'name', r.id), r.data->>'desc',
       greatest(0, coalesce((r.data->>'price')::numeric, 0)), greatest(0, coalesce((r.data->>'stock')::numeric, 0))::int,
       coalesce((r.data->>'hot')::boolean, false), coalesce((r.data->>'active')::boolean, true), r.id, r.created_at
from public.records r left join public.categories c on c.slug = r.data->>'category'
where r.collection = 'products'
on conflict (slug) do nothing;

-- 4) Ảnh sản phẩm (chỉ ảnh đã là URL) + màu mặc định cho sản phẩm chưa có màu (giữ hành vi cũ: Trắng / Đen / Đỏ)
insert into public.product_images (product_id, url, sort_order)
select p.id, r.data->>'image', 0
from public.records r join public.products p on p.legacy_id = r.id
where r.collection = 'products' and coalesce(r.data->>'image', '') ~ '^https?://'
  and not exists (select 1 from public.product_images i where i.product_id = p.id);

insert into public.product_colors (product_id, color_id)
select p.id, c.id from public.products p cross join public.colors c
where c.name in ('Trắng', 'Đen', 'Đỏ') and not exists (select 1 from public.product_colors x where x.product_id = p.id)
on conflict do nothing;

-- 5) Đơn hàng
insert into public.orders (code, user_id, customer_name, phone, phone_norm, email, address, zone_id, note, payment_method, payment_status,
                           status, subtotal, ship_fee, total, created_at, legacy_id)
select r.id,
       (select u.id from auth.users u where u.id::text = r.data->>'userId'),
       coalesce(nullif(r.data->'customer'->>'name', ''), '(không tên)'),
       coalesce(r.data->'customer'->>'phone', ''), public.normalize_phone(r.data->'customer'->>'phone'),
       nullif(r.data->'customer'->>'email', ''), coalesce(r.data->'customer'->>'address', ''), r.data->'customer'->>'zone',
       r.data->'customer'->>'note',
       case when r.data->'customer'->>'payment' = 'bank' then 'bank' else 'cod' end,
       case when r.data->>'paid' = 'true' then 'paid' else 'unpaid' end,
       case when r.data->>'status' in ('new','confirmed','printing','finishing','shipping','done','cancelled') then r.data->>'status' else 'new' end,
       coalesce((r.data->>'subtotal')::numeric, 0), coalesce((r.data->>'ship')::numeric, 0), coalesce((r.data->>'total')::numeric, 0),
       to_timestamp(coalesce((r.data->>'createdAt')::bigint, (extract(epoch from r.created_at) * 1000)::bigint) / 1000.0), r.id
from public.records r where r.collection = 'orders'
on conflict (code) do nothing;

insert into public.order_items (order_id, product_id, kind, name, color, qty, unit_price, options)
select o.id, p.id,
       case it.j->>'id' when 'cfg-keychain' then 'keychain' when 'cfg-timetable' then 'timetable' else 'product' end,
       coalesce(it.j->>'name', '(sản phẩm)'), it.j->>'color',
       least(99, greatest(1, coalesce((it.j->>'qty')::int, 1))), greatest(0, coalesce((it.j->>'price')::numeric, 0)),
       coalesce(it.j->'cfg', '{}'::jsonb)
from public.records r
join public.orders o on o.legacy_id = r.id
cross join lateral jsonb_array_elements(coalesce(r.data->'items', '[]'::jsonb)) as it(j)
left join public.products p on p.legacy_id = it.j->>'id'
where r.collection = 'orders' and not exists (select 1 from public.order_items x where x.order_id = o.id);

-- 6) Khách hàng (gộp theo số điện thoại) + gắn vào đơn
insert into public.customers (user_id, name, phone, phone_norm, email, address)
select distinct on (o.phone_norm) o.user_id, o.customer_name, o.phone, o.phone_norm, o.email, o.address
from public.orders o where o.phone_norm <> ''
order by o.phone_norm, o.created_at desc
on conflict (phone_norm) do nothing;
update public.orders o set customer_id = c.id from public.customers c where c.phone_norm = o.phone_norm and o.customer_id is null;

-- 7) Bài viết, thư viện/đánh giá, cài đặt
insert into public.blog_posts (slug, title, excerpt, content, cover_url, category, published, published_at, legacy_id, created_at)
select r.id, coalesce(r.data->>'title', r.id), r.data->>'excerpt', coalesce(r.data->>'content', ''),
       case when coalesce(r.data->>'cover', '') ~ '^https?://' then r.data->>'cover' end, r.data->>'category',
       coalesce((r.data->>'published')::boolean, false),
       case when r.data->>'published' = 'true' then to_timestamp(coalesce((r.data->>'createdAt')::bigint, (extract(epoch from r.created_at) * 1000)::bigint) / 1000.0) end,
       r.id, r.created_at
from public.records r where r.collection = 'posts'
on conflict (slug) do nothing;

insert into public.reviews (title, name, rating, comment, image_url, status, legacy_id, created_at)
select r.data->>'title', r.data->>'customer', least(5, greatest(1, coalesce((r.data->>'rating')::int, 5))), nullif(r.data->>'quote', ''),
       case when coalesce(r.data->>'image', '') ~ '^https?://' then r.data->>'image' end,
       case when r.data->>'active' = 'true' then 'approved' else 'hidden' end, r.id, r.created_at
from public.records r where r.collection = 'showcase'
on conflict (legacy_id) do nothing;

insert into public.settings (key, value)
select 'main', r.data from public.records r where r.collection = 'settings' and r.id = 'main'
on conflict (key) do nothing;

-- 8) Máy in mặc định (sửa/xóa trong Admin sau)
insert into public.printers (name, model) values ('BIQU B1', 'BIQU B1'), ('Anycubic Kobra X', 'Anycubic Kobra X')
on conflict (name) do nothing;

-- ---------- Kiểm tra sau khi chạy: số dòng cũ phải khớp số dòng mới ----------
-- select 'products' t, (select count(*) from records where collection='products') cu, (select count(*) from products) moi
-- union all select 'orders', (select count(*) from records where collection='orders'), (select count(*) from orders)
-- union all select 'posts', (select count(*) from records where collection='posts'), (select count(*) from blog_posts)
-- union all select 'showcase', (select count(*) from records where collection='showcase'), (select count(*) from reviews);
-- Ảnh base64 chưa được chuyển (xử lý ở giai đoạn 2):
-- select count(*) from records where collection='products' and data->>'image' like 'data:%';

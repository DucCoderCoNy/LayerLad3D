-- Chạy toàn bộ file này trong Supabase: SQL Editor -> New query -> Run. Chạy lại nhiều lần vẫn an toàn.

-- 1) Hồ sơ người dùng (gắn với tài khoản đăng nhập của Supabase Auth)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text, name text, phone text,
  role text not null default 'customer',
  banned boolean not null default false,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin() returns boolean
language sql security definer stable set search_path = public as
$$ select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin' and not banned) $$;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id, email, name, phone)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'name',''), coalesce(new.raw_user_meta_data->>'phone',''));
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
drop policy if exists "profiles_select" on public.profiles;
drop policy if exists "profiles_update" on public.profiles;
drop policy if exists "profiles_delete" on public.profiles;
create policy "profiles_select" on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy "profiles_update" on public.profiles for update using (public.is_admin());
create policy "profiles_delete" on public.profiles for delete using (public.is_admin());

-- 2) Bảng dữ liệu chung: mỗi dòng = 1 bản ghi (sản phẩm, đơn, yêu cầu, đơn xưởng, kho, thu chi, cài đặt)
create table if not exists public.records (
  collection text not null,
  id text not null,
  data jsonb not null,
  owner uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (collection, id)
);
alter table public.records enable row level security;
drop policy if exists "rec_select" on public.records;
drop policy if exists "rec_insert" on public.records;
drop policy if exists "rec_update" on public.records;
drop policy if exists "rec_delete" on public.records;
-- Ai cũng xem được sản phẩm, cài đặt, danh mục, thư viện và bài viết đã đăng (nháp chỉ admin xem). Khách chỉ xem đơn/yêu cầu của chính mình. Admin xem tất cả.
create policy "rec_select" on public.records for select using (
  collection in ('products','settings','categories','showcase') or (collection = 'posts' and data->>'published' = 'true') or public.is_admin()
  or (collection in ('orders','requests') and owner = auth.uid()));
-- Khách chỉ được gửi yêu cầu in. Đơn hàng đi qua hàm place_order bên dưới. Còn lại chỉ admin.
create policy "rec_insert" on public.records for insert with check (
  public.is_admin() or (collection = 'requests' and (owner is null or owner = auth.uid())));
create policy "rec_update" on public.records for update using (public.is_admin()) with check (public.is_admin());
create policy "rec_delete" on public.records for delete using (public.is_admin());

-- 3) Đặt hàng: server tự tính lại giá (sản phẩm, móc khóa/thời khóa biểu tùy biến, phí ship theo khu vực), khóa dòng tồn kho để không bán lố
create or replace function public.place_order(o jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare it jsonb; p record; st jsonb; r jsonb := o; sub numeric := 0; ship numeric; zfee numeric; items jsonb := '[]'::jsonb;
        q int; pr numeric; nm text; cfg jsonb; oid text; n int; cols int; rws int;
begin
  if auth.uid() is not null and exists(select 1 from public.profiles where id = auth.uid() and banned) then raise exception 'Tài khoản đã bị khóa'; end if;
  oid := coalesce(o->>'id', '');
  if oid !~ '^[A-Za-z0-9-]{6,24}$' then raise exception 'Mã đơn không hợp lệ'; end if;
  n := jsonb_array_length(coalesce(o->'items', '[]'::jsonb));
  if n < 1 or n > 30 then raise exception 'Giỏ hàng không hợp lệ'; end if;
  select data into st from public.records where collection = 'settings' and id = 'main';
  for it in select * from jsonb_array_elements(o->'items') loop
    q := least(99, greatest(1, coalesce((it->>'qty')::int, 1)));
    cfg := it->'cfg';
    if it->>'id' = 'cfg-keychain' then
      if length(trim(coalesce(cfg->>'text', ''))) not between 1 and 20 then raise exception 'Tên trên móc khóa không hợp lệ'; end if;
      pr := coalesce((st->>'keychainBase')::numeric, 25000) + coalesce((st->>'keychainPerChar')::numeric, 3000) * length(replace(trim(cfg->>'text'), ' ', ''));
      nm := 'Móc khóa: ' || trim(cfg->>'text');
    elsif it->>'id' = 'cfg-timetable' then
      cols := coalesce((cfg->>'cols')::int, 0); rws := coalesce((cfg->>'rows')::int, 0);
      if cols not between 1 and 10 or rws not between 1 and 12 then raise exception 'Kích thước thời khóa biểu không hợp lệ'; end if;
      pr := coalesce((st->>'ttBase')::numeric, 10000) + coalesce((st->>'ttPerCell')::numeric, 3400) * cols * rws;
      nm := 'Thời khóa biểu module ' || cols || '×' || rws;
    else
      select * into p from public.records where collection = 'products' and id = it->>'id' for update;
      if not found or (p.data->>'active') = 'false' then raise exception 'Sản phẩm không còn bán'; end if;
      if (p.data->>'stock')::int < q then raise exception 'Hết hàng: %', p.data->>'name'; end if;
      pr := (p.data->>'price')::numeric; nm := p.data->>'name';
      update public.records set data = jsonb_set(data, '{stock}', to_jsonb((data->>'stock')::int - q))
        where collection = 'products' and id = p.id;
    end if;
    sub := sub + pr * q;
    items := items || jsonb_build_array(it || jsonb_build_object('price', pr, 'name', nm, 'qty', q));
  end loop;
  select (z->>'fee')::numeric into zfee from jsonb_array_elements(coalesce(st->'shipZones', '[]'::jsonb)) z where z->>'id' = o->'customer'->>'zone' limit 1;
  ship := case when sub >= coalesce((st->>'freeShipOver')::numeric, 300000) then 0
               else coalesce(zfee, (st->>'shipFee')::numeric, 25000) end;
  r := r || jsonb_build_object('items', items, 'subtotal', sub, 'ship', ship, 'total', sub + ship,
                               'status', 'new', 'paid', false, 'userId', auth.uid(),
                               'createdAt', (extract(epoch from now()) * 1000)::bigint);
  insert into public.records(collection, id, data, owner) values ('orders', oid, r, auth.uid());
  return r;
end $$;
grant execute on function public.place_order(jsonb) to anon, authenticated;

-- 3b) Tra cứu đơn cho khách (cần đúng cả mã đơn và số điện thoại)
create or replace function public.track_order(oid text, phone text) returns jsonb
language sql security definer stable set search_path = public as $$
  select data from public.records
  where collection = 'orders' and upper(id) = upper(trim(oid))
    and regexp_replace(regexp_replace(coalesce(data->'customer'->>'phone', ''), '\D', '', 'g'), '^84', '0')
      = regexp_replace(regexp_replace(coalesce(phone, ''), '\D', '', 'g'), '^84', '0')
  limit 1 $$;
grant execute on function public.track_order(text, text) to anon, authenticated;

-- 4) Cập nhật realtime: admin ở máy khác thấy đơn mới ngay không cần tải lại trang
do $$ begin alter publication supabase_realtime add table public.records; exception when duplicate_object then null; end $$;

-- 5) Kho file STL/OBJ/3MF khách tải lên: ai cũng gửi được (tối đa 50MB), chỉ admin tải về được
insert into storage.buckets (id, name, public, file_size_limit) values ('stl-files', 'stl-files', false, 52428800)
  on conflict (id) do update set file_size_limit = 52428800;
drop policy if exists "stl_upload" on storage.objects;
drop policy if exists "stl_read" on storage.objects;
drop policy if exists "stl_delete" on storage.objects;
create policy "stl_upload" on storage.objects for insert to anon, authenticated with check (bucket_id = 'stl-files');
create policy "stl_read" on storage.objects for select to authenticated using (bucket_id = 'stl-files' and public.is_admin());
create policy "stl_delete" on storage.objects for delete to authenticated using (bucket_id = 'stl-files' and public.is_admin());

-- 6) Ảnh công khai (sản phẩm, bài viết, thư viện): ai cũng xem được, chỉ admin tải lên/xóa. Tối đa 2MB, chỉ ảnh.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values ('public-images', 'public-images', true, 2097152, array['image/jpeg','image/png','image/webp'])
  on conflict (id) do update set public = true, file_size_limit = 2097152, allowed_mime_types = array['image/jpeg','image/png','image/webp'];
drop policy if exists "img_insert" on storage.objects;
drop policy if exists "img_update" on storage.objects;
drop policy if exists "img_delete" on storage.objects;
create policy "img_insert" on storage.objects for insert to authenticated with check (bucket_id = 'public-images' and public.is_admin());
create policy "img_update" on storage.objects for update to authenticated using (bucket_id = 'public-images' and public.is_admin());
create policy "img_delete" on storage.objects for delete to authenticated using (bucket_id = 'public-images' and public.is_admin());

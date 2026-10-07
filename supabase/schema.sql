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
-- Ai cũng xem được sản phẩm + cài đặt. Khách chỉ xem đơn/yêu cầu của chính mình. Admin xem tất cả.
create policy "rec_select" on public.records for select using (
  collection in ('products','settings') or public.is_admin()
  or (collection in ('orders','requests') and owner = auth.uid()));
-- Khách chỉ được gửi yêu cầu in. Đơn hàng đi qua hàm place_order bên dưới. Còn lại chỉ admin.
create policy "rec_insert" on public.records for insert with check (
  public.is_admin() or (collection = 'requests' and (owner is null or owner = auth.uid())));
create policy "rec_update" on public.records for update using (public.is_admin()) with check (public.is_admin());
create policy "rec_delete" on public.records for delete using (public.is_admin());

-- 3) Đặt hàng: server tự tính lại giá từ bảng sản phẩm (khách không sửa giá được) và trừ kho
create or replace function public.place_order(o jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare it jsonb; p record; st jsonb; r jsonb := o; sub numeric := 0; ship numeric; items jsonb := '[]'::jsonb; q int;
begin
  select data into st from public.records where collection = 'settings' and id = 'main';
  for it in select * from jsonb_array_elements(o->'items') loop
    select * into p from public.records where collection = 'products' and id = it->>'id';
    if not found or (p.data->>'active') = 'false' then raise exception 'Sản phẩm không còn bán'; end if;
    q := greatest(1, (it->>'qty')::int);
    if (p.data->>'stock')::int < q then raise exception 'Hết hàng: %', p.data->>'name'; end if;
    sub := sub + (p.data->>'price')::numeric * q;
    items := items || jsonb_build_array(it || jsonb_build_object('price', (p.data->>'price')::numeric, 'name', p.data->>'name', 'qty', q));
    update public.records set data = jsonb_set(data, '{stock}', to_jsonb((data->>'stock')::int - q))
      where collection = 'products' and id = p.id;
  end loop;
  ship := case when sub >= coalesce((st->>'freeShipOver')::numeric, 300000) then 0 else coalesce((st->>'shipFee')::numeric, 25000) end;
  r := r || jsonb_build_object('items', items, 'subtotal', sub, 'ship', ship, 'total', sub + ship,
                               'status', 'new', 'paid', false, 'userId', auth.uid());
  insert into public.records(collection, id, data, owner) values ('orders', r->>'id', r, auth.uid());
  return r;
end $$;
grant execute on function public.place_order(jsonb) to anon, authenticated;

-- 4) Cập nhật realtime: admin ở máy khác thấy đơn mới ngay không cần tải lại trang
do $$ begin alter publication supabase_realtime add table public.records; exception when duplicate_object then null; end $$;

-- 5) Kho file STL/OBJ khách tải lên: ai cũng gửi được, chỉ admin tải về được
insert into storage.buckets (id, name, public) values ('stl-files', 'stl-files', false) on conflict (id) do nothing;
drop policy if exists "stl_upload" on storage.objects;
drop policy if exists "stl_read" on storage.objects;
drop policy if exists "stl_delete" on storage.objects;
create policy "stl_upload" on storage.objects for insert to anon, authenticated with check (bucket_id = 'stl-files');
create policy "stl_read" on storage.objects for select to authenticated using (bucket_id = 'stl-files' and public.is_admin());
create policy "stl_delete" on storage.objects for delete to authenticated using (bucket_id = 'stl-files' and public.is_admin());

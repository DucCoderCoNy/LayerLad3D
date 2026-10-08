-- =====================================================================
-- LayerLab 3D – Migration 001: schema quan hệ (CHỈ THÊM MỚI, không đụng bảng `records` / hàm cũ)
-- Web hiện tại tiếp tục chạy bình thường. Các bảng dưới đây sẽ được frontend dùng dần ở các giai đoạn sau.
-- Yêu cầu: đã chạy supabase/schema.sql (cần bảng profiles + hàm is_admin()).
-- Chạy lại nhiều lần vẫn an toàn.  ⚠ Chưa được kiểm thử trên Postgres thật: chạy trên project Supabase thử trước.
-- =====================================================================
do $$ begin
  if to_regclass('public.profiles') is null or to_regprocedure('public.is_admin()') is null then
    raise exception 'Hãy chạy supabase/schema.sql trước (cần bảng profiles và hàm is_admin)';
  end if;
end $$;

-- ---------- Tiện ích ----------
create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create or replace function public.normalize_phone(p text) returns text language sql immutable as $$
  select regexp_replace(regexp_replace(coalesce(p, ''), '\D', '', 'g'), '^84', '0') $$;

-- ---------- Danh mục, màu, sản phẩm ----------
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  sort_order int not null default 0,
  active boolean not null default true,
  legacy_id text unique,
  created_at timestamptz not null default now()
);

create table if not exists public.colors (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  hex text not null check (hex ~ '^#[0-9a-fA-F]{6}$'),
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  description text,
  price numeric(12,0) not null default 0 check (price >= 0),
  stock int not null default 0 check (stock >= 0),
  hot boolean not null default false,
  active boolean not null default true,
  legacy_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists products_category_idx on public.products(category_id);
create index if not exists products_active_idx on public.products(active, created_at desc);

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  url text not null,
  sort_order int not null default 0,   -- 0 = ảnh đại diện
  created_at timestamptz not null default now()
);
create index if not exists product_images_product_idx on public.product_images(product_id, sort_order);

-- Màu nào được dùng cho sản phẩm nào (+ chênh giá nếu màu đó đắt hơn)
create table if not exists public.product_colors (
  product_id uuid not null references public.products(id) on delete cascade,
  color_id uuid not null references public.colors(id) on delete cascade,
  price_delta numeric(12,0) not null default 0,
  primary key (product_id, color_id)
);

-- ---------- Khách hàng, đơn hàng ----------
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  phone text not null,
  phone_norm text not null unique,
  email text,
  address text,
  note text,                            -- ghi chú nội bộ của admin
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,            -- mã khách thấy, vd DH1A2B3C
  user_id uuid references auth.users(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  customer_name text not null,
  phone text not null,
  phone_norm text not null,
  email text,
  address text not null,
  zone_id text,
  note text,
  payment_method text not null default 'cod' check (payment_method in ('cod','bank','momo','vnpay')),
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid','paid','refunded')),
  paid_at timestamptz,
  status text not null default 'new' check (status in ('new','confirmed','preparing','printing','finishing','shipping','done','cancelled')),
  subtotal numeric(12,0) not null default 0,
  ship_fee numeric(12,0) not null default 0,
  discount numeric(12,0) not null default 0,
  total numeric(12,0) not null default 0,
  shipping_provider text,               -- chỗ để nối GHN/GHTK sau này
  tracking_code text,
  restocked boolean not null default false,
  legacy_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists orders_created_idx on public.orders(created_at desc);
create index if not exists orders_status_idx on public.orders(status, created_at desc);
create index if not exists orders_phone_idx on public.orders(phone_norm);
create index if not exists orders_user_idx on public.orders(user_id);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  kind text not null default 'product' check (kind in ('product','custom_print','keychain','timetable')),
  name text not null,
  color text,
  qty int not null default 1 check (qty between 1 and 99),
  unit_price numeric(12,0) not null default 0 check (unit_price >= 0),
  options jsonb not null default '{}'::jsonb,   -- vật liệu, layer height, infill, gram, giờ in, chữ khắc...
  created_at timestamptz not null default now()
);
create index if not exists order_items_order_idx on public.order_items(order_id);

create table if not exists public.uploaded_files (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete cascade,
  order_item_id uuid references public.order_items(id) on delete cascade,
  bucket text not null default 'stl-files',
  path text not null check (lower(path) ~ '\.(stl|3mf)$'),
  original_name text,
  size_bytes bigint check (size_bytes is null or size_bytes <= 52428800),
  created_at timestamptz not null default now()
);
create index if not exists uploaded_files_order_idx on public.uploaded_files(order_id);

-- ---------- Xưởng: kho nhựa, máy in, hàng đợi, chi phí ----------
create table if not exists public.filament_inventory (   -- mỗi dòng = 1 cuộn
  id uuid primary key default gen_random_uuid(),
  material text not null check (material in ('PLA','PETG','ABS','TPU','OTHER')),
  brand text,
  color_id uuid references public.colors(id) on delete set null,
  color_name text,
  initial_g numeric not null default 1000 check (initial_g > 0),
  remaining_g numeric not null default 1000 check (remaining_g >= 0),
  purchase_price numeric(12,0) not null default 0,      -- giá nhập cả cuộn
  low_threshold_g numeric not null default 200,
  purchased_at date,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.printers (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  model text,
  status text not null default 'idle' check (status in ('idle','printing','maintenance','offline')),
  power_w int not null default 150,
  note text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.print_queue (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  order_item_id uuid references public.order_items(id) on delete cascade,
  printer_id uuid references public.printers(id) on delete set null,
  filament_id uuid references public.filament_inventory(id) on delete set null,
  status text not null default 'queued' check (status in ('queued','printing','done','failed','cancelled')),
  priority int not null default 0,
  est_grams numeric, est_hours numeric,
  actual_grams numeric, actual_hours numeric,
  scheduled_start timestamptz, scheduled_end timestamptz,
  started_at timestamptz, finished_at timestamptz,
  due_date date,
  deducted boolean not null default false,     -- đã trừ nhựa trong kho chưa
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists print_queue_sched_idx on public.print_queue(scheduled_start);
create index if not exists print_queue_status_idx on public.print_queue(status);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  spent_on date not null default current_date,
  category text not null default 'other' check (category in ('filament','electricity','maintenance','shipping','packaging','other')),
  amount numeric(12,0) not null check (amount >= 0),
  note text,
  order_id uuid references public.orders(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists expenses_date_idx on public.expenses(spent_on);

-- ---------- Nội dung ----------
create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  excerpt text,
  content text not null default '',
  cover_url text,
  category text,
  published boolean not null default false,
  published_at timestamptz,
  author_id uuid references auth.users(id) on delete set null,
  legacy_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists blog_posts_pub_idx on public.blog_posts(published, published_at desc);

create table if not exists public.reviews (   -- đánh giá khách + thư viện ảnh sản phẩm đã làm
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  title text,
  name text,
  rating int not null default 5 check (rating between 1 and 5),
  comment text,
  image_url text,
  status text not null default 'pending' check (status in ('pending','approved','hidden')),
  legacy_id text unique,
  created_at timestamptz not null default now()
);
create index if not exists reviews_status_idx on public.reviews(status, created_at desc);

create table if not exists public.settings (
  key text primary key,                 -- khóa bắt đầu bằng "private." chỉ admin đọc được
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ---------- Trigger ----------
do $$ declare t text; begin
  foreach t in array array['products','orders','customers','blog_posts','settings','print_queue'] loop
    execute format('drop trigger if exists %I on public.%I', t || '_updated', t);
    execute format('create trigger %I before update on public.%I for each row execute function public.set_updated_at()', t || '_updated', t);
  end loop;
end $$;

create or replace function public.orders_paid_at() returns trigger language plpgsql as $$
begin
  if new.payment_status = 'paid' and (old.payment_status is distinct from 'paid') then new.paid_at := now();
  elsif new.payment_status <> 'paid' then new.paid_at := null; end if;
  return new;
end $$;
drop trigger if exists orders_paid_at_trg on public.orders;
create trigger orders_paid_at_trg before update on public.orders for each row execute function public.orders_paid_at();

-- ---------- Views (chạy với quyền người gọi => vẫn bị RLS chặn) ----------
create or replace view public.customer_stats with (security_invoker = true) as
  select c.*, count(o.id) filter (where o.status <> 'cancelled') as order_count,
         coalesce(sum(o.total) filter (where o.status <> 'cancelled'), 0) as total_spent
  from public.customers c left join public.orders o on o.customer_id = c.id group by c.id;

create or replace view public.filament_stock with (security_invoker = true) as
  select material, coalesce(color_name, '—') as color_name, count(*) filter (where remaining_g > 0) as spools,
         sum(remaining_g) as remaining_g, bool_or(remaining_g <= low_threshold_g) as low
  from public.filament_inventory group by material, color_name;

-- =====================================================================
-- RLS
-- =====================================================================
do $$ declare t text; begin
  foreach t in array array['categories','colors','products','product_images','product_colors','customers','orders','order_items','uploaded_files',
                           'filament_inventory','printers','print_queue','expenses','blog_posts','reviews','settings'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_admin', t);
    execute format('create policy %I on public.%I for all using (public.is_admin()) with check (public.is_admin())', t || '_admin', t);
  end loop;
end $$;

-- Công khai (chỉ đọc)
drop policy if exists categories_read on public.categories;
create policy categories_read on public.categories for select using (active);
drop policy if exists colors_read on public.colors;
create policy colors_read on public.colors for select using (active);
drop policy if exists products_read on public.products;
create policy products_read on public.products for select using (active);
drop policy if exists product_images_read on public.product_images;
create policy product_images_read on public.product_images for select
  using (exists (select 1 from public.products p where p.id = product_id and p.active));
drop policy if exists product_colors_read on public.product_colors;
create policy product_colors_read on public.product_colors for select
  using (exists (select 1 from public.products p where p.id = product_id and p.active));
drop policy if exists blog_posts_read on public.blog_posts;
create policy blog_posts_read on public.blog_posts for select using (published);
drop policy if exists settings_read on public.settings;
create policy settings_read on public.settings for select using (key not like 'private.%');

-- Khách đăng nhập: chỉ thấy đơn / dòng đơn / file của chính mình (khách vãng lai dùng track_order_v2)
drop policy if exists orders_own on public.orders;
create policy orders_own on public.orders for select using (user_id = auth.uid());
drop policy if exists order_items_own on public.order_items;
create policy order_items_own on public.order_items for select
  using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));
drop policy if exists uploaded_files_own on public.uploaded_files;
create policy uploaded_files_own on public.uploaded_files for select
  using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));

-- Đánh giá: ai cũng xem được bài đã duyệt; thành viên gửi đánh giá (luôn ở trạng thái chờ duyệt)
drop policy if exists reviews_read on public.reviews;
create policy reviews_read on public.reviews for select using (status = 'approved' or user_id = auth.uid());
drop policy if exists reviews_insert on public.reviews;
create policy reviews_insert on public.reviews for insert
  with check (auth.uid() is not null and user_id = auth.uid() and status = 'pending');
-- customers, filament_inventory, printers, print_queue, expenses: chỉ admin (policy *_admin ở trên)

-- =====================================================================
-- Hàm nghiệp vụ (security definer – chạy với quyền chủ sở hữu, tự kiểm tra dữ liệu)
-- =====================================================================
create or replace function public.gen_order_code() returns text language plpgsql as $$
declare v_code text;
begin
  loop
    v_code := 'DH' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    exit when not exists (select 1 from public.orders where code = v_code);
  end loop;
  return v_code;
end $$;

/* Đặt hàng. payload = {
     customer: {name, phone, email?, address, note?, zone?}, payment_method: 'cod'|'bank',
     items: [{kind:'product', product_id, color?, qty} |
             {kind:'keychain', qty, options:{text, base, ink, shape}} |
             {kind:'timetable', qty, options:{cols, rows, frame, cell, ink}} |
             {kind:'custom_print', qty, options:{material, layer_height, infill, grams, hours, design?, note?, file_path?, file_name?}}] }
   Giá luôn được tính lại ở server. Giá in theo yêu cầu chỉ là ƯỚC TÍNH (gram/giờ do khách/trình duyệt cung cấp, admin xác nhận lại). */
create or replace function public.place_order_v2(payload jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  st jsonb; cu jsonb := coalesce(payload->'customer', '{}'::jsonb); it jsonb; p record;
  calc jsonb := '[]'::jsonb; n int; q int; pr numeric; nm text; v_kind text; opt jsonb; col text; delta numeric; pid uuid; fsz bigint;
  sub numeric := 0; ship numeric; zfee numeric; pay text; v_code text; oid uuid; cid uuid; ph text; oi uuid; fpath text;
  grams numeric; hrs numeric; mat text; lh text; mmult numeric; lmult numeric; est numeric; cols int; rws int; txt text; infill int;
  v_uid uuid := auth.uid();
begin
  if v_uid is not null and exists (select 1 from profiles where id = v_uid and banned) then raise exception 'Tài khoản đã bị khóa'; end if;
  ph := normalize_phone(cu->>'phone');
  if ph !~ '^0[0-9]{9}$' then raise exception 'Số điện thoại không hợp lệ'; end if;
  if length(trim(coalesce(cu->>'name', ''))) < 2 then raise exception 'Vui lòng nhập họ tên'; end if;
  if length(trim(coalesce(cu->>'address', ''))) < 8 then raise exception 'Vui lòng nhập địa chỉ đầy đủ'; end if;
  pay := coalesce(payload->>'payment_method', 'cod');
  if pay not in ('cod', 'bank') then raise exception 'Phương thức thanh toán không hợp lệ'; end if;
  n := jsonb_array_length(coalesce(payload->'items', '[]'::jsonb));
  if n < 1 or n > 30 then raise exception 'Giỏ hàng không hợp lệ'; end if;
  select value into st from settings where key = 'main';
  st := coalesce(st, '{}'::jsonb);

  for it in select * from jsonb_array_elements(payload->'items') loop
    q := least(99, greatest(1, coalesce((it->>'qty')::int, 1)));
    v_kind := coalesce(it->>'kind', 'product');
    opt := coalesce(it->'options', '{}'::jsonb);
    if length(opt::text) > 3000 then raise exception 'Tùy chọn quá dài'; end if;
    col := nullif(trim(coalesce(it->>'color', '')), '');
    pid := null; fpath := null; fsz := null;

    if v_kind = 'product' then
      select * into p from products where id = (it->>'product_id')::uuid for update;
      if not found or not p.active then raise exception 'Sản phẩm không còn bán'; end if;
      if p.stock < q then raise exception 'Hết hàng: %', p.name; end if;
      delta := 0;
      if col is not null then
        select pc.price_delta into delta from product_colors pc join colors c on c.id = pc.color_id
          where pc.product_id = p.id and c.name = col and c.active;
        if not found then raise exception 'Màu "%" không có cho sản phẩm này', col; end if;
      end if;
      pr := p.price + coalesce(delta, 0); nm := p.name; pid := p.id;
      update products set stock = stock - q where id = p.id;

    elsif v_kind = 'keychain' then
      txt := trim(coalesce(opt->>'text', ''));
      if length(txt) not between 1 and 20 then raise exception 'Tên trên móc khóa không hợp lệ'; end if;
      pr := coalesce((st->>'keychainBase')::numeric, 25000) + coalesce((st->>'keychainPerChar')::numeric, 3000) * length(replace(txt, ' ', ''));
      nm := 'Móc khóa: ' || txt;

    elsif v_kind = 'timetable' then
      cols := coalesce((opt->>'cols')::int, 0); rws := coalesce((opt->>'rows')::int, 0);
      if cols not between 1 and 10 or rws not between 1 and 12 then raise exception 'Kích thước thời khóa biểu không hợp lệ'; end if;
      pr := coalesce((st->>'ttBase')::numeric, 10000) + coalesce((st->>'ttPerCell')::numeric, 3400) * cols * rws;
      nm := 'Thời khóa biểu module ' || cols || '×' || rws;

    elsif v_kind = 'custom_print' then
      mat := upper(coalesce(opt->>'material', 'PLA'));
      if mat not in ('PLA', 'PETG', 'ABS') then raise exception 'Vật liệu không hợp lệ'; end if;
      lh := coalesce(opt->>'layer_height', '0.2');
      if lh not in ('0.12', '0.16', '0.2', '0.28') then raise exception 'Layer height không hợp lệ'; end if;
      grams := coalesce((opt->>'grams')::numeric, 0); hrs := coalesce((opt->>'hours')::numeric, 0);
      if grams <= 0 or grams > 5000 or hrs < 0 or hrs > 500 then raise exception 'Thông số in không hợp lệ'; end if;
      infill := least(100, greatest(5, coalesce((opt->>'infill')::int, 20)));
      mmult := coalesce((st->'materialMult'->>mat)::numeric, case mat when 'PETG' then 1.1 when 'ABS' then 1.2 else 1 end);
      lmult := coalesce((st->'layerMult'->>lh)::numeric, case lh when '0.12' then 1.3 when '0.16' then 1.15 when '0.28' then 0.85 else 1 end);
      est := grams * coalesce((st->>'pricePerGram')::numeric, 1500) * mmult
           + hrs * coalesce((st->>'pricePerHour')::numeric, 8000) * lmult
           + case when coalesce((opt->>'design')::boolean, false) then coalesce((st->>'designFee')::numeric, 50000) else 0 end;
      pr := greatest(round(est / 1000) * 1000, coalesce((st->>'minCustomPrice')::numeric, 0));
      fpath := nullif(opt->>'file_path', '');
      if fpath is null and not coalesce((opt->>'design')::boolean, false) then raise exception 'Vui lòng tải file hoặc chọn hỗ trợ thiết kế'; end if;
      if fpath is not null then
        if fpath !~ '^[A-Za-z0-9_-]{3,40}/[A-Za-z0-9._-]{1,120}$' or lower(fpath) !~ '\.(stl|3mf)$' then raise exception 'Đường dẫn file không hợp lệ'; end if;
        select (metadata->>'size')::bigint into fsz from storage.objects where bucket_id = 'stl-files' and name = fpath;
        if not found then raise exception 'Không tìm thấy file đã tải lên'; end if;
        if fsz > 52428800 then raise exception 'File quá lớn (tối đa 50MB)'; end if;
      end if;
      nm := 'In theo yêu cầu: ' || coalesce(nullif(left(opt->>'file_name', 60), ''), '(chưa có file)') || ' (' || mat || ')';
      opt := jsonb_build_object('material', mat, 'layer_height', lh, 'infill', infill, 'grams', grams, 'hours', hrs,
               'design', coalesce((opt->>'design')::boolean, false), 'note', left(coalesce(opt->>'note', ''), 500),
               'file_name', left(coalesce(opt->>'file_name', ''), 120), 'price_is_estimate', true);
    else
      raise exception 'Loại sản phẩm không hợp lệ';
    end if;

    sub := sub + pr * q;
    calc := calc || jsonb_build_array(jsonb_build_object('kind', v_kind, 'product_id', pid, 'name', nm, 'color', col, 'qty', q,
              'unit_price', pr, 'options', opt, 'file_path', fpath, 'file_size', fsz));
  end loop;

  select (z->>'fee')::numeric into zfee from jsonb_array_elements(coalesce(st->'shipZones', '[]'::jsonb)) z where z->>'id' = cu->>'zone' limit 1;
  ship := case when sub >= coalesce((st->>'freeShipOver')::numeric, 300000) then 0
               else coalesce(zfee, (st->>'shipFee')::numeric, 25000) end;

  -- Khách hàng: tìm theo SĐT; chỉ tạo mới, không ghi đè thông tin khách cũ
  select id into cid from customers where phone_norm = ph;
  if cid is null then
    insert into customers(user_id, name, phone, phone_norm, email, address)
    values (v_uid, trim(cu->>'name'), ph, ph, nullif(trim(coalesce(cu->>'email', '')), ''), trim(cu->>'address')) returning id into cid;
  end if;

  v_code := gen_order_code();
  insert into orders(code, user_id, customer_id, customer_name, phone, phone_norm, email, address, zone_id, note, payment_method, subtotal, ship_fee, total)
  values (v_code, v_uid, cid, trim(cu->>'name'), ph, ph, nullif(trim(coalesce(cu->>'email', '')), ''), trim(cu->>'address'), cu->>'zone',
          left(coalesce(cu->>'note', ''), 500), pay, sub, ship, sub + ship) returning id into oid;

  for it in select * from jsonb_array_elements(calc) loop
    insert into order_items(order_id, product_id, kind, name, color, qty, unit_price, options)
    values (oid, nullif(it->>'product_id', '')::uuid, it->>'kind', it->>'name', it->>'color', (it->>'qty')::int, (it->>'unit_price')::numeric, it->'options')
    returning id into oi;
    if nullif(it->>'file_path', '') is not null then
      insert into uploaded_files(order_id, order_item_id, path, original_name, size_bytes)
      values (oid, oi, it->>'file_path', it->'options'->>'file_name', nullif(it->>'file_size', '')::bigint);
    end if;
  end loop;

  return jsonb_build_object('id', oid, 'code', v_code, 'subtotal', sub, 'ship_fee', ship, 'total', sub + ship, 'payment_method', pay, 'status', 'new');
end $$;
grant execute on function public.place_order_v2(jsonb) to anon, authenticated;

-- Tra cứu đơn cho khách (cần đúng cả mã đơn và số điện thoại); không trả địa chỉ/ghi chú nội bộ
create or replace function public.track_order_v2(p_code text, p_phone text) returns jsonb
language sql security definer stable set search_path = public as $$
  select jsonb_build_object('code', o.code, 'status', o.status, 'payment_status', o.payment_status, 'payment_method', o.payment_method,
    'created_at', o.created_at, 'subtotal', o.subtotal, 'ship_fee', o.ship_fee, 'total', o.total, 'customer_name', o.customer_name,
    'shipping_provider', o.shipping_provider, 'tracking_code', o.tracking_code,
    'items', coalesce((select jsonb_agg(jsonb_build_object('name', i.name, 'color', i.color, 'qty', i.qty, 'unit_price', i.unit_price) order by i.created_at)
                       from order_items i where i.order_id = o.id), '[]'::jsonb))
  from orders o where upper(o.code) = upper(trim(p_code)) and o.phone_norm = normalize_phone(p_phone) limit 1 $$;
grant execute on function public.track_order_v2(text, text) to anon, authenticated;

-- Admin đổi trạng thái đơn: hủy => hoàn kho (1 lần); hoàn thành => trừ nhựa theo hàng đợi in (1 lần)
create or replace function public.admin_set_order_status(p_order uuid, p_status text) returns void
language plpgsql security definer set search_path = public as $$
declare o record; q record;
begin
  if not is_admin() then raise exception 'Không có quyền'; end if;
  if p_status not in ('new','confirmed','preparing','printing','finishing','shipping','done','cancelled') then raise exception 'Trạng thái không hợp lệ'; end if;
  select * into o from orders where id = p_order for update;
  if not found then raise exception 'Không tìm thấy đơn'; end if;

  if p_status = 'cancelled' and not o.restocked then
    update products pr set stock = pr.stock + s.q
      from (select product_id, sum(qty)::int as q from order_items where order_id = o.id and product_id is not null group by product_id) s
      where pr.id = s.product_id;
    update orders set restocked = true where id = o.id;
  elsif p_status <> 'cancelled' and o.restocked then
    update products pr set stock = greatest(0, pr.stock - s.q)
      from (select product_id, sum(qty)::int as q from order_items where order_id = o.id and product_id is not null group by product_id) s
      where pr.id = s.product_id;
    update orders set restocked = false where id = o.id;
  end if;

  if p_status = 'done' then
    for q in select * from print_queue where order_id = o.id and filament_id is not null and not deducted loop
      update filament_inventory set remaining_g = greatest(0, remaining_g - coalesce(q.actual_grams, q.est_grams, 0)) where id = q.filament_id;
      update print_queue set deducted = true, status = case when status in ('queued', 'printing') then 'done' else status end,
             finished_at = coalesce(finished_at, now()) where id = q.id;
    end loop;
  end if;

  update orders set status = p_status where id = o.id;
end $$;
grant execute on function public.admin_set_order_status(uuid, text) to authenticated;

-- =====================================================================
-- Storage: bucket ảnh công khai (admin tải lên). Bucket stl-files giữ nguyên chính sách cũ để trang In theo yêu cầu hiện tại vẫn chạy;
-- sẽ siết lại (chỉ cho tải vào thư mục tạm, đúng đuôi .stl/.3mf) sau khi frontend giai đoạn 5 được triển khai.
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('public-images', 'public-images', true, 2097152, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = true, file_size_limit = 2097152, allowed_mime_types = array['image/jpeg','image/png','image/webp'];
drop policy if exists "img_insert" on storage.objects;
drop policy if exists "img_update" on storage.objects;
drop policy if exists "img_delete" on storage.objects;
create policy "img_insert" on storage.objects for insert to authenticated with check (bucket_id = 'public-images' and public.is_admin());
create policy "img_update" on storage.objects for update to authenticated using (bucket_id = 'public-images' and public.is_admin());
create policy "img_delete" on storage.objects for delete to authenticated using (bucket_id = 'public-images' and public.is_admin());

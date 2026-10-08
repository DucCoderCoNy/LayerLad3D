-- =====================================================================
-- LayerLab 3D – Migration 003 (dành cho web đang chạy bằng bảng `records`)
--  1) place_order: nhận món "In theo yêu cầu" (cfg-print), kiểm tra file STL/3MF đã tải lên Storage,
--     kiểm tra màu theo danh sách màu admin, tự tính lại giá ở server, luôn tạo đơn ở trạng thái new + chưa thanh toán
--  2) Cho khách xem bộ sưu tập `colors` (màu nhựa). Các bộ mới (printers, customers) mặc định CHỈ admin.
--  3) Siết bucket stl-files: chỉ cho tải lên đường dẫn đúng dạng và đuôi .stl/.3mf (tối đa 50MB)
--  4) Hàm admin liệt kê file mồ côi (tải lên nhưng không có đơn) để dọn tay
-- Yêu cầu: đã chạy supabase/schema.sql. Chạy lại nhiều lần vẫn an toàn. KHÔNG sửa/xóa dữ liệu hiện có.
-- ⚠ Chưa được kiểm thử trên Postgres thật: hãy chạy thử trên một project Supabase tạm trước.
-- =====================================================================
do $$ begin
  if to_regclass('public.records') is null or to_regprocedure('public.is_admin()') is null then
    raise exception 'Hãy chạy supabase/schema.sql trước';
  end if;
end $$;

-- 2) Chính sách đọc: thêm `colors` vào nhóm công khai (customers/printers/ws/wc/wo... vẫn chỉ admin đọc được)
drop policy if exists "rec_select" on public.records;
create policy "rec_select" on public.records for select using (
  collection in ('products','settings','categories','showcase','colors')
  or (collection = 'posts' and data->>'published' = 'true') or public.is_admin()
  or (collection in ('orders','requests') and owner = auth.uid()));

-- 1) Đặt hàng
create or replace function public.place_order(o jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare it jsonb; p record; st jsonb; r jsonb := o; sub numeric := 0; ship numeric; zfee numeric; items jsonb := '[]'::jsonb;
        q int; pr numeric; nm text; cfg jsonb; newcfg jsonb; oid text; n int; cols int; rws int;
        col text; ncolors int; okcolor boolean;
        mat text; lh text; grams numeric; hrs numeric; infill int; mmult numeric; lmult numeric; est numeric; fpath text; fsz bigint; design boolean;
begin
  if auth.uid() is not null and exists(select 1 from public.profiles where id = auth.uid() and banned) then raise exception 'Tài khoản đã bị khóa'; end if;
  if length(o::text) > 200000 then raise exception 'Đơn hàng quá lớn'; end if;
  oid := coalesce(o->>'id', '');
  if oid !~ '^[A-Za-z0-9-]{6,24}$' then raise exception 'Mã đơn không hợp lệ'; end if;
  n := jsonb_array_length(coalesce(o->'items', '[]'::jsonb));
  if n < 1 or n > 30 then raise exception 'Giỏ hàng không hợp lệ'; end if;
  if coalesce(o->'customer'->>'payment', 'cod') not in ('cod', 'bank') then raise exception 'Phương thức thanh toán không hợp lệ'; end if;
  select data into st from public.records where collection = 'settings' and id = 'main';
  select count(*) into ncolors from public.records where collection = 'colors';

  for it in select * from jsonb_array_elements(o->'items') loop
    q := least(99, greatest(1, coalesce((it->>'qty')::int, 1)));
    cfg := it->'cfg'; newcfg := cfg; col := nullif(trim(coalesce(it->>'color', '')), '');

    if it->>'id' = 'cfg-keychain' then
      if length(trim(coalesce(cfg->>'text', ''))) not between 1 and 20 then raise exception 'Tên trên móc khóa không hợp lệ'; end if;
      pr := coalesce((st->>'keychainBase')::numeric, 25000) + coalesce((st->>'keychainPerChar')::numeric, 3000) * length(replace(trim(cfg->>'text'), ' ', ''));
      nm := 'Móc khóa: ' || trim(cfg->>'text');

    elsif it->>'id' = 'cfg-timetable' then
      cols := coalesce((cfg->>'cols')::int, 0); rws := coalesce((cfg->>'rows')::int, 0);
      if cols not between 1 and 10 or rws not between 1 and 12 then raise exception 'Kích thước thời khóa biểu không hợp lệ'; end if;
      pr := coalesce((st->>'ttBase')::numeric, 10000) + coalesce((st->>'ttPerCell')::numeric, 3400) * cols * rws;
      nm := 'Thời khóa biểu module ' || cols || '×' || rws;

    elsif it->>'id' = 'cfg-print' then   -- In theo yêu cầu: giá ƯỚC TÍNH, tính lại từ gram/giờ khách gửi; admin kiểm tra file rồi xác nhận
      mat := upper(coalesce(cfg->>'material', 'PLA'));
      if mat not in ('PLA', 'PETG', 'ABS') then raise exception 'Vật liệu không hợp lệ'; end if;
      lh := coalesce(cfg->>'layer', '0.2');
      if lh not in ('0.12', '0.16', '0.2', '0.28') then raise exception 'Layer height không hợp lệ'; end if;
      grams := coalesce((cfg->>'grams')::numeric, 0); hrs := coalesce((cfg->>'hours')::numeric, 0);
      if grams < 1 or grams > 5000 or hrs < 0.25 or hrs > 500 then raise exception 'Thông số in không hợp lệ'; end if;
      infill := least(100, greatest(5, coalesce((cfg->>'infill')::int, 20)));
      design := coalesce((cfg->>'design')::boolean, false);
      mmult := coalesce((st->'materialMult'->>mat)::numeric, case mat when 'PETG' then 1.1 when 'ABS' then 1.2 else 1 end);
      lmult := coalesce((st->'layerMult'->>lh)::numeric, case lh when '0.12' then 1.3 when '0.16' then 1.15 when '0.28' then 0.85 else 1 end);
      est := grams * coalesce((st->>'pricePerGram')::numeric, 1500) * mmult
           + hrs * coalesce((st->>'pricePerHour')::numeric, 8000) * lmult
           + case when design then coalesce((st->>'designFee')::numeric, 50000) else 0 end;
      pr := greatest(round(est / 1000) * 1000, coalesce((st->>'minCustomPrice')::numeric, 0));
      fpath := nullif(cfg->>'filePath', ''); fsz := null;
      if fpath is null and not design then raise exception 'Vui lòng tải file STL/3MF hoặc chọn hỗ trợ thiết kế'; end if;
      if fpath is not null then
        if fpath !~ '^[A-Za-z0-9_-]{6,40}/[A-Za-z0-9._-]{1,120}$' or lower(fpath) !~ '\.(stl|3mf)$' then raise exception 'Đường dẫn file không hợp lệ'; end if;
        select (metadata->>'size')::bigint into fsz from storage.objects where bucket_id = 'stl-files' and name = fpath;
        if not found then raise exception 'Không tìm thấy file đã tải lên, hãy tải lại file'; end if;
        if fsz > 52428800 then raise exception 'File quá lớn (tối đa 50MB)'; end if;
      end if;
      nm := 'In theo yêu cầu: ' || coalesce(nullif(left(cfg->>'fileName', 60), ''), '(chưa có file)') || ' (' || mat || ')';
      newcfg := jsonb_build_object('material', mat, 'layer', lh, 'infill', infill, 'grams', grams, 'hours', hrs, 'design', design,
                  'note', left(coalesce(cfg->>'note', ''), 500), 'fileName', left(coalesce(cfg->>'fileName', ''), 120), 'filePath', coalesce(fpath, ''),
                  'fileSize', coalesce(fsz, 0), 'volumeCm3', coalesce((cfg->>'volumeCm3')::numeric, 0), 'dims', coalesce(cfg->'dims', '[]'::jsonb), 'estimate', true);

    else
      select * into p from public.records where collection = 'products' and id = it->>'id' for update;
      if not found or (p.data->>'active') = 'false' then raise exception 'Sản phẩm không còn bán'; end if;
      if (p.data->>'stock')::int < q then raise exception 'Hết hàng: %', p.data->>'name'; end if;
      if col is not null and ncolors > 0 and col not in ('Custom', 'Màu khác (ghi chú)') then   -- màu phải nằm trong danh sách màu admin đã gán cho sản phẩm
        select exists(select 1 from public.records c where c.collection = 'colors' and c.data->>'name' = col and coalesce(c.data->>'active', 'true') <> 'false'
                and (jsonb_array_length(coalesce(p.data->'colorIds', '[]'::jsonb)) = 0 or p.data->'colorIds' ? c.id)) into okcolor;
        if not okcolor then raise exception 'Màu "%" không có cho sản phẩm này', col; end if;
      end if;
      pr := (p.data->>'price')::numeric; nm := p.data->>'name';
      update public.records set data = jsonb_set(data, '{stock}', to_jsonb((data->>'stock')::int - q))
        where collection = 'products' and id = p.id;
    end if;

    sub := sub + pr * q;
    items := items || jsonb_build_array((it || jsonb_build_object('price', pr, 'name', nm, 'qty', q))
                                         || case when newcfg is not null then jsonb_build_object('cfg', newcfg) else '{}'::jsonb end);
  end loop;

  select (z->>'fee')::numeric into zfee from jsonb_array_elements(coalesce(st->'shipZones', '[]'::jsonb)) z where z->>'id' = o->'customer'->>'zone' limit 1;
  ship := case when sub >= coalesce((st->>'freeShipOver')::numeric, 300000) then 0
               else coalesce(zfee, (st->>'shipFee')::numeric, 25000) end;
  r := r || jsonb_build_object('items', items, 'subtotal', sub, 'ship', ship, 'total', sub + ship,
                               'status', 'new', 'paid', false, 'payStatus', 'unpaid', 'userId', auth.uid(),
                               'createdAt', (extract(epoch from now()) * 1000)::bigint);
  insert into public.records(collection, id, data, owner) values ('orders', oid, r, auth.uid());
  return r;
end $$;
grant execute on function public.place_order(jsonb) to anon, authenticated;

-- 3) Storage: bucket file STL/3MF của khách (riêng tư). Khách chỉ tải LÊN được; chỉ admin tải về/xóa.
insert into storage.buckets (id, name, public, file_size_limit) values ('stl-files', 'stl-files', false, 52428800)
  on conflict (id) do update set public = false, file_size_limit = 52428800;
drop policy if exists "stl_upload" on storage.objects;
create policy "stl_upload" on storage.objects for insert to anon, authenticated with check (
  bucket_id = 'stl-files'
  and name ~ '^[A-Za-z0-9_-]{6,40}/[A-Za-z0-9._-]{1,120}$'
  and lower(name) ~ '\.(stl|3mf)$');
-- stl_read / stl_delete (chỉ admin) đã có trong schema.sql; tạo lại cho chắc
drop policy if exists "stl_read" on storage.objects;
drop policy if exists "stl_delete" on storage.objects;
create policy "stl_read" on storage.objects for select to authenticated using (bucket_id = 'stl-files' and public.is_admin());
create policy "stl_delete" on storage.objects for delete to authenticated using (bucket_id = 'stl-files' and public.is_admin());

-- 4) Liệt kê file đã tải lên nhưng không thuộc đơn nào sau N ngày (khách thêm vào giỏ rồi bỏ). Admin xóa tay trong Storage hoặc từ giao diện.
create or replace function public.list_orphan_uploads(days int default 7) returns table(name text, size_bytes bigint, created_at timestamptz)
language sql security definer stable set search_path = public as $$
  select o.name, (o.metadata->>'size')::bigint, o.created_at from storage.objects o
  where public.is_admin() and o.bucket_id = 'stl-files' and o.created_at < now() - make_interval(days => days)
    and not exists (select 1 from public.records r where r.collection = 'orders' and r.data::text like '%' || o.name || '%')
  order by o.created_at $$;
grant execute on function public.list_orphan_uploads(int) to authenticated;

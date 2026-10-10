-- =====================================================================
-- Migration 004 – Hồ sơ máy in: thông số kỹ thuật + lịch sử bảo dưỡng. CHỈ THÊM MỚI, chạy lại nhiều lần an toàn.
-- Yêu cầu: đã chạy 001 (bảng printers, print_queue, hàm is_admin).
-- =====================================================================
alter table public.printers
  add column if not exists brand text,
  add column if not exists serial_number text,
  add column if not exists image_url text,
  add column if not exists tech text default 'FDM',
  add column if not exists build_x numeric, add column if not exists build_y numeric, add column if not exists build_z numeric,   -- vùng in (mm)
  add column if not exists nozzle_mm numeric,
  add column if not exists max_nozzle_c int, add column if not exists max_bed_c int,
  add column if not exists max_speed_mm_s int,
  add column if not exists firmware text,
  add column if not exists enclosed boolean not null default false,
  add column if not exists materials text[] not null default '{}',
  add column if not exists purchase_date date,
  add column if not exists purchase_price numeric(12,0),
  add column if not exists vendor text,
  add column if not exists warranty_until date,
  add column if not exists location text,
  add column if not exists maint_every_days int check (maint_every_days is null or maint_every_days > 0),
  add column if not exists maint_every_hours int check (maint_every_hours is null or maint_every_hours > 0),
  add column if not exists extra jsonb not null default '[]'::jsonb;   -- thông số tự thêm: [{"k":"Tên","v":"Giá trị"}]

create table if not exists public.printer_maintenance (
  id uuid primary key default gen_random_uuid(),
  printer_id uuid not null references public.printers(id) on delete cascade,
  performed_on date not null default current_date,
  kind text not null default 'routine' check (kind in ('routine','cleaning','part_replace','repair','calibration','upgrade','other')),
  title text not null,
  details text,
  parts text,                          -- linh kiện đã thay / vật tư đã dùng
  cost numeric(12,0) not null default 0 check (cost >= 0),
  performed_by text,
  print_hours_at numeric,              -- tổng giờ in của máy tại thời điểm bảo dưỡng
  next_due_on date,
  created_at timestamptz not null default now()
);
create index if not exists printer_maintenance_idx on public.printer_maintenance(printer_id, performed_on desc);

alter table public.printer_maintenance enable row level security;
drop policy if exists printer_maintenance_admin on public.printer_maintenance;
create policy printer_maintenance_admin on public.printer_maintenance for all using (public.is_admin()) with check (public.is_admin());

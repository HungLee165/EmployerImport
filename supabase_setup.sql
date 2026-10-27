-- =====================================================================
--  KPI nhóm hỗ trợ Nam Định — cài đặt cơ sở dữ liệu Supabase
--  Dán TOÀN BỘ file này vào Supabase → SQL Editor → bấm Run.
--  Chạy lại nhiều lần cũng không sao (không làm mất dữ liệu).
-- =====================================================================

-- ---------- 1. Bảng số liệu: mỗi dòng là 1 người trong 1 ngày ----------
create table if not exists public.kpi_rows (
  id            bigint generated always as identity primary key,
  ngay          date    not null,
  thu_tu        int     not null default 0,
  nhan_vien     text    not null,
  cot_b         numeric,
  cot_c         numeric,
  cot_d         numeric,
  cot_e         numeric,
  cot_f         numeric,
  tong          numeric not null default 0,
  moc           numeric,
  ket_qua       text check (ket_qua in ('Đạt', 'Không đạt', 'Nghỉ')),
  nghi          boolean not null default false,
  thu_viec      boolean not null default false,
  cot_j         numeric,
  nguon         text    not null default '',
  cap_nhat_luc  timestamptz not null default now()
);
create index if not exists kpi_rows_ngay_idx on public.kpi_rows (ngay);

-- ---------- 2. Cài đặt chung: tên cột, danh sách nhân viên ----------
create table if not exists public.kpi_config (
  key         text primary key,
  value       jsonb not null,
  updated_at  timestamptz not null default now()
);

-- ---------- 3. Mã nhập liệu (không ai đọc được từ trang web) ----------
create table if not exists public.kpi_secret (
  id   int primary key default 1 check (id = 1),
  pin  text not null
);
-- ĐỔI '1234' THÀNH MÃ CỦA CẬU, rồi bấm Run.
-- Muốn đổi mã sau này: sửa dòng dưới và chạy lại cả file.
insert into public.kpi_secret (id, pin) values (1, '1234')
on conflict (id) do update set pin = excluded.pin;

-- ---------- 4. Bảo mật: ai cũng XEM được, KHÔNG ai ghi trực tiếp ----------
alter table public.kpi_rows   enable row level security;
alter table public.kpi_config enable row level security;
alter table public.kpi_secret enable row level security;

drop policy if exists "ai cung xem" on public.kpi_rows;
create policy "ai cung xem" on public.kpi_rows   for select to anon, authenticated using (true);
drop policy if exists "ai cung xem" on public.kpi_config;
create policy "ai cung xem" on public.kpi_config for select to anon, authenticated using (true);
-- kpi_secret không có policy nào → trang web không đọc được mã.

grant select on public.kpi_rows, public.kpi_config to anon, authenticated;
revoke all on public.kpi_secret from anon, authenticated;
revoke insert, update, delete on public.kpi_rows, public.kpi_config from anon, authenticated;

-- ---------- 5. Đánh dấu "có thay đổi" để trang tự làm mới ----------
create or replace function public.kpi_bump()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into kpi_config (key, value, updated_at)
  values ('version', to_jsonb(clock_timestamp()::text), now())
  on conflict (key) do update set value = excluded.value, updated_at = now();
  return null;
end $$;

drop trigger if exists kpi_rows_bump on public.kpi_rows;
create trigger kpi_rows_bump after insert or update or delete on public.kpi_rows
for each statement execute function public.kpi_bump();

-- ---------- 6. Kiểm tra mã ----------
create or replace function public.kpi_check_pin(p_pin text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from kpi_secret where id = 1 and pin = coalesce(p_pin, ''));
$$;

-- ---------- 7. Đọc toàn bộ (ai cũng gọi được) ----------
create or replace function public.kpi_load()
returns jsonb language sql stable set search_path = public as $$
  select jsonb_build_object(
    'days', coalesce((
      select jsonb_object_agg(t.ngay::text,
               jsonb_build_object('date', t.ngay::text, 'sheet', t.sheet, 'rows', t.rows))
      from (
        select ngay,
               max(nguon) as sheet,
               jsonb_agg(jsonb_build_object(
                 'name', nhan_vien,
                 'v', jsonb_build_array(cot_b, cot_c, cot_d, cot_e, cot_f),
                 'total', tong, 'target', moc,
                 'pass', case ket_qua when 'Đạt' then true when 'Không đạt' then false else null end,
                 'off', nghi, 'probation', thu_viec, 'j', cot_j
               ) order by thu_tu, id) as rows
        from kpi_rows group by ngay
      ) t), '{}'::jsonb),
    'labels',  (select value from kpi_config where key = 'labels'),
    'roster',  (select value from kpi_config where key = 'roster'),
    'version', (select value from kpi_config where key = 'version')
  );
$$;

-- ---------- 8. Ghi số liệu (cần mã) ----------
-- p_days: [{ "date": "2026-03-16", "payload": { "sheet": "...", "rows": [ ... ] } }, ...]
-- Mỗi ngày gửi lên sẽ THAY THẾ toàn bộ số liệu cũ của ngày đó.
create or replace function public.kpi_write_days(p_pin text, p_days jsonb)
returns int language plpgsql security definer set search_path = public as $$
declare
  d jsonb; r jsonb; v_date date; i int; n int := 0;
begin
  if not kpi_check_pin(p_pin) then
    raise exception 'pin' using errcode = '28000', hint = 'Sai mã nhập liệu';
  end if;
  if jsonb_typeof(p_days) <> 'array' then
    raise exception 'du lieu khong hop le';
  end if;

  for d in select value from jsonb_array_elements(p_days) loop
    v_date := (d->>'date')::date;
    delete from kpi_rows where ngay = v_date;
    i := 0;
    for r in select value from jsonb_array_elements(coalesce(d->'payload'->'rows', '[]'::jsonb)) loop
      continue when coalesce(trim(r->>'name'), '') = '';
      insert into kpi_rows (ngay, thu_tu, nhan_vien, cot_b, cot_c, cot_d, cot_e, cot_f,
                            tong, moc, ket_qua, nghi, thu_viec, cot_j, nguon)
      values (
        v_date, i, trim(r->>'name'),
        (r->'v'->>0)::numeric, (r->'v'->>1)::numeric, (r->'v'->>2)::numeric,
        (r->'v'->>3)::numeric, (r->'v'->>4)::numeric,
        coalesce((r->>'total')::numeric, 0), (r->>'target')::numeric,
        case when coalesce((r->>'off')::boolean, false) then 'Nghỉ'
             when r->>'pass' = 'true'  then 'Đạt'
             when r->>'pass' = 'false' then 'Không đạt'
             else null end,
        coalesce((r->>'off')::boolean, false),
        coalesce((r->>'probation')::boolean, false),
        (r->>'j')::numeric,
        coalesce(d->'payload'->>'sheet', '')
      );
      i := i + 1; n := n + 1;
    end loop;
  end loop;
  return n;
end $$;

-- ---------- 9. Xóa một ngày (cần mã) ----------
create or replace function public.kpi_delete_day(p_pin text, p_date date)
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not kpi_check_pin(p_pin) then
    raise exception 'pin' using errcode = '28000', hint = 'Sai mã nhập liệu';
  end if;
  delete from kpi_rows where ngay = p_date;
  get diagnostics n = row_count;
  return n;
end $$;

-- ---------- 10. Lưu cài đặt (cần mã) ----------
create or replace function public.kpi_save_config(p_pin text, p_key text, p_value jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not kpi_check_pin(p_pin) then
    raise exception 'pin' using errcode = '28000', hint = 'Sai mã nhập liệu';
  end if;
  if p_key not in ('labels', 'roster') then
    raise exception 'khoa khong hop le';
  end if;
  insert into kpi_config (key, value, updated_at) values (p_key, p_value, now())
  on conflict (key) do update set value = excluded.value, updated_at = now();
  insert into kpi_config (key, value, updated_at)
  values ('version', to_jsonb(clock_timestamp()::text), now())
  on conflict (key) do update set value = excluded.value, updated_at = now();
end $$;

-- ---------- 11. Quyền gọi hàm ----------
revoke execute on function public.kpi_check_pin(text)                from public, anon, authenticated;
revoke execute on function public.kpi_bump()                          from public, anon, authenticated;
grant  execute on function public.kpi_load()                          to anon, authenticated;
grant  execute on function public.kpi_write_days(text, jsonb)         to anon, authenticated;
grant  execute on function public.kpi_delete_day(text, date)          to anon, authenticated;
grant  execute on function public.kpi_save_config(text, text, jsonb)  to anon, authenticated;

-- Xong! Kiểm tra nhanh: select public.kpi_load();

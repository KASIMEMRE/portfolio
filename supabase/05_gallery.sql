-- =========================================================
-- 05 — Proje ekran görüntüleri (galeri) ve "Yapay zekâ" kategorisi
-- 04_job_and_enterprise.sql'den SONRA çalıştırılır.
-- Görseller repoda assets/img/ altında durur; veritabanı yalnızca yol ve açıklama tutar.
-- =========================================================
create or replace function private.valid_gallery(g jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select jsonb_typeof(g) = 'array'
     and jsonb_array_length(g) <= 12
     and not exists (
       select 1 from jsonb_array_elements(g) e
       where jsonb_typeof(e) <> 'object'
          or not (e ? 'src')
          or (e->>'src') !~ '^assets/img/[a-z0-9_-]+(/[a-z0-9_-]+)*\.(webp|png|jpg|jpeg)$'
          or coalesce(e->>'w', '0') !~ '^[0-9]{1,5}$'
          or coalesce(e->>'h', '0') !~ '^[0-9]{1,5}$'
          or char_length(coalesce(e->>'alt', '')) > 200
          or char_length(coalesce(e->>'alt_en', '')) > 200
          or (select count(*) from jsonb_object_keys(e) k where k not in ('src','w','h','alt','alt_en')) > 0
     );
$$;
revoke all on function private.valid_gallery(jsonb) from public, anon;
grant execute on function private.valid_gallery(jsonb) to authenticated;

alter table public.projects add column gallery jsonb not null default '[]'::jsonb;
alter table public.projects add constraint projects_gallery_valid check (private.valid_gallery(gallery));
grant insert (gallery), update (gallery) on public.projects to authenticated;

alter table public.projects drop constraint projects_category_check;
alter table public.projects add constraint projects_category_check check (category in ('api','ai','cli','app','web','mobile'));

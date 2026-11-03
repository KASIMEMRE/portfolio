-- =========================================================
-- 03 — Çift dil (TR/EN) ve proje detay sayfası alanları
-- 02_security_hardening.sql'den SONRA çalıştırılır.
-- *_en alanları boş bırakılırsa sitede Türkçe içerik gösterilir.
-- =========================================================
alter table public.projects
  add column slug text,
  add column title_en text not null default '',
  add column description_en text not null default '',
  add column features_en text[] not null default '{}',
  add column details text not null default '',
  add column details_en text not null default '',
  add column architecture text[] not null default '{}',
  add column architecture_en text[] not null default '{}',
  add column status text not null default 'completed',
  add column year text not null default '';

alter table public.projects drop constraint projects_category_check;
alter table public.projects add constraint projects_category_check check (category in ('api','cli','app','web','mobile'));
alter table public.projects add constraint projects_status_check check (status in ('completed','in_progress'));
alter table public.projects add constraint projects_slug_format check (slug is null or slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$');
create unique index projects_slug_idx on public.projects (slug) where slug is not null;
alter table public.projects
  add constraint projects_title_en_len check (char_length(title_en) <= 120),
  add constraint projects_desc_en_len check (char_length(description_en) <= 1000),
  add constraint projects_details_len check (char_length(details) <= 8000 and char_length(details_en) <= 8000),
  add constraint projects_year_len check (char_length(year) <= 20);

alter table public.skills
  add column name_en text not null default '',
  add column description_en text not null default '';
alter table public.skills drop constraint skills_group_name_check;
alter table public.skills add constraint skills_group_name_check check (group_name in ('backend','data','mobile','web','approach'));
alter table public.skills add constraint skills_en_len check (char_length(name_en) <= 80 and char_length(description_en) <= 500);

alter table public.journey
  add column period_en text not null default '',
  add column title_en text not null default '',
  add column subtitle_en text not null default '';
alter table public.journey add constraint journey_en_len check (char_length(period_en) <= 60 and char_length(title_en) <= 120 and char_length(subtitle_en) <= 200);

alter table public.profile
  add column title_en text not null default '',
  add column bio_en text not null default '',
  add column location_en text not null default '',
  add column learning_en text not null default '',
  add column next_goal_en text not null default '';
alter table public.profile add constraint profile_en_len check (char_length(bio_en) <= 1000 and char_length(title_en) <= 80);

-- Yeni sütunlara yalnızca admin yazabilir (en az yetki korunur)
grant insert (slug, title_en, description_en, features_en, details, details_en, architecture, architecture_en, status, year),
      update (slug, title_en, description_en, features_en, details, details_en, architecture, architecture_en, status, year)
  on public.projects to authenticated;
grant insert (name_en, description_en), update (name_en, description_en) on public.skills to authenticated;
grant insert (period_en, title_en, subtitle_en), update (period_en, title_en, subtitle_en) on public.journey to authenticated;
grant update (title_en, bio_en, location_en, learning_en, next_goal_en) on public.profile to authenticated;

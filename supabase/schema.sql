-- =========================================================
-- Portfolyo veritabanı şeması (Supabase / PostgreSQL)
-- Yeni bir Supabase projesinde SQL Editor'e yapıştırıp çalıştırabilirsin.
-- =========================================================

-- Admin listesi: buraya eklenen e-postalar yönetim paneline girebilir
create table public.admins (
  email text primary key
);
alter table public.admins enable row level security;

-- Admin kontrolü, API'ye kapalı özel şemada
create schema if not exists private;
grant usage on schema private to anon, authenticated;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admins a
    where lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;
revoke all on function private.is_admin() from public;
grant execute on function private.is_admin() to anon, authenticated;

-- Profil (tek satır)
create table public.profile (
  id int primary key default 1 check (id = 1),
  name text not null,
  title text not null default '',
  bio text not null default '',
  location text not null default '',
  email text not null default '',
  github_url text not null default '',
  linkedin_url text not null default '',
  instagram_url text not null default '',
  available boolean not null default true,
  learning text not null default '',
  next_goal text not null default '',
  updated_at timestamptz not null default now()
);

create table public.projects (
  id bigint generated always as identity primary key,
  title text not null,
  category text not null default 'api' check (category in ('api','cli','app','web')),
  description text not null default '',
  features text[] not null default '{}',
  tech text[] not null default '{}',
  github_url text not null default '',
  demo_url text not null default '',
  code_snippet text not null default '',
  featured boolean not null default false,
  visible boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table public.skills (
  id bigint generated always as identity primary key,
  name text not null,
  abbr text not null default '',
  group_name text not null default 'backend' check (group_name in ('backend','data','web','approach')),
  description text not null default '',
  used_in text[] not null default '{}',
  visible boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table public.journey (
  id bigint generated always as identity primary key,
  period text not null default '',
  title text not null,
  subtitle text not null default '',
  sort_order int not null default 0
);

create table public.messages (
  id bigint generated always as identity primary key,
  name text not null check (char_length(name) between 1 and 120),
  email text not null check (char_length(email) between 3 and 200 and email like '%_@_%'),
  body text not null check (char_length(body) between 1 and 5000),
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profile enable row level security;
alter table public.projects enable row level security;
alter table public.skills enable row level security;
alter table public.journey enable row level security;
alter table public.messages enable row level security;

-- Herkes okuyabilir (gizli proje/yetenekleri sadece admin görür)
create policy "profile_read" on public.profile for select to anon, authenticated using (true);
create policy "projects_read" on public.projects for select to anon, authenticated using (visible or (select private.is_admin()));
create policy "skills_read" on public.skills for select to anon, authenticated using (visible or (select private.is_admin()));
create policy "journey_read" on public.journey for select to anon, authenticated using (true);

-- Yazma: sadece admin
create policy "profile_admin_update" on public.profile for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "projects_admin_insert" on public.projects for insert to authenticated with check ((select private.is_admin()));
create policy "projects_admin_update" on public.projects for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "projects_admin_delete" on public.projects for delete to authenticated using ((select private.is_admin()));
create policy "skills_admin_insert" on public.skills for insert to authenticated with check ((select private.is_admin()));
create policy "skills_admin_update" on public.skills for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "skills_admin_delete" on public.skills for delete to authenticated using ((select private.is_admin()));
create policy "journey_admin_insert" on public.journey for insert to authenticated with check ((select private.is_admin()));
create policy "journey_admin_update" on public.journey for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "journey_admin_delete" on public.journey for delete to authenticated using ((select private.is_admin()));

-- Mesajlar: herkes gönderebilir, sadece admin okur
create policy "messages_public_insert" on public.messages for insert to anon, authenticated with check (is_read = false);
create policy "messages_admin_select" on public.messages for select to authenticated using ((select private.is_admin()));
create policy "messages_admin_update" on public.messages for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "messages_admin_delete" on public.messages for delete to authenticated using ((select private.is_admin()));

-- Admin kendi kaydını görebilir (panel bununla yetki kontrolü yapar)
create policy "admins_self_read" on public.admins for select to authenticated
  using (lower(email) = lower(coalesce((select auth.jwt()) ->> 'email', '')));

grant select on public.profile, public.projects, public.skills, public.journey to anon, authenticated;
grant select on public.admins to authenticated;
grant insert (name, email, body) on public.messages to anon, authenticated;
grant select, update, delete on public.messages to authenticated;
grant update on public.profile to authenticated;
grant insert, update, delete on public.projects, public.skills, public.journey to authenticated;

create index projects_order_idx on public.projects (sort_order, id);
create index skills_order_idx on public.skills (group_name, sort_order, id);
create index messages_created_idx on public.messages (created_at desc);

-- Kendi admin e-postanı ekle:
-- insert into public.admins (email) values ('senin@epostan.com');
-- insert into public.profile (id, name) values (1, 'Adın Soyadın');

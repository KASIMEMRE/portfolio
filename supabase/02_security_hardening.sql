-- =========================================================
-- 02 — Güvenlik sertleştirmesi
-- schema.sql'den SONRA çalıştırılır.
-- =========================================================

-- 1) En az yetki: Supabase'in varsayılan geniş yetkilerini (DELETE, TRUNCATE...) kaldır
revoke all on all tables in schema public from anon, authenticated;
alter default privileges in schema public revoke all on tables from anon, authenticated;

grant select on public.profile, public.projects, public.skills, public.journey to anon, authenticated;
grant insert (name, email, body) on public.messages to anon, authenticated;
grant select, delete on public.messages to authenticated;
grant update (is_read) on public.messages to authenticated;
grant update (name, title, bio, location, email, github_url, linkedin_url, instagram_url, available, learning, next_goal, updated_at) on public.profile to authenticated;
grant insert (title, category, description, features, tech, github_url, demo_url, code_snippet, featured, visible, sort_order),
      update (title, category, description, features, tech, github_url, demo_url, code_snippet, featured, visible, sort_order),
      delete on public.projects to authenticated;
grant insert (name, abbr, group_name, description, used_in, visible, sort_order),
      update (name, abbr, group_name, description, used_in, visible, sort_order),
      delete on public.skills to authenticated;
grant insert (period, title, subtitle, sort_order),
      update (period, title, subtitle, sort_order),
      delete on public.journey to authenticated;
grant select on public.admins to authenticated;

-- 2) Admin yetkisi e-postaya değil, doğrulanmış kullanıcı kimliğine (auth.uid) bağlı
alter table public.admins add column if not exists user_id uuid unique references auth.users(id) on delete cascade;
update public.admins a set user_id = u.id
  from auth.users u
  where lower(u.email) = lower(a.email) and u.email_confirmed_at is not null and a.user_id is null;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admins a
    where a.user_id is not null and a.user_id = auth.uid()
  );
$$;

drop policy if exists "admins_self_read" on public.admins;
create policy "admins_self_read" on public.admins for select to authenticated
  using (user_id = (select auth.uid()));

-- 3) Veri doğrulama kısıtları
alter table public.messages drop constraint if exists messages_email_check;
alter table public.messages add constraint messages_email_format
  check (char_length(email) <= 200 and email ~ '^[^\s@<>?&;,"]+@[^\s@<>?&;,"]+\.[A-Za-z]{2,}$');
alter table public.messages add constraint messages_name_clean
  check (name !~ '[\x00-\x08\x0B\x0C\x0E-\x1F]');

alter table public.projects
  add constraint projects_title_len check (char_length(title) between 1 and 120),
  add constraint projects_desc_len check (char_length(description) <= 1000),
  add constraint projects_code_len check (char_length(code_snippet) <= 4000),
  add constraint projects_github_url check (github_url = '' or github_url ~* '^https://'),
  add constraint projects_demo_url check (demo_url = '' or demo_url ~* '^https://');

alter table public.skills
  add constraint skills_name_len check (char_length(name) between 1 and 80),
  add constraint skills_abbr_len check (char_length(abbr) <= 4),
  add constraint skills_desc_len check (char_length(description) <= 500);

alter table public.journey
  add constraint journey_title_len check (char_length(title) between 1 and 120),
  add constraint journey_len check (char_length(period) <= 60 and char_length(subtitle) <= 200);

alter table public.profile
  add constraint profile_name_len check (char_length(name) between 1 and 80),
  add constraint profile_bio_len check (char_length(bio) <= 1000),
  add constraint profile_urls check (
    (github_url = '' or github_url ~* '^https://') and
    (linkedin_url = '' or linkedin_url ~* '^https://') and
    (instagram_url = '' or instagram_url ~* '^https://')),
  add constraint profile_email check (email = '' or email ~ '^[^\s@<>?&;,"]+@[^\s@<>?&;,"]+\.[A-Za-z]{2,}$');

-- 4) İletişim formu: sunucu tarafı hız sınırı ve korumalı alanlar
alter table public.messages add column if not exists ip_hash text;

create or replace function private.messages_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  headers json;
  ip text;
  recent_ip int;
  recent_email int;
  recent_all int;
begin
  new.is_read := false;
  new.created_at := now();

  begin
    headers := current_setting('request.headers', true)::json;
  exception when others then
    headers := null;
  end;
  ip := coalesce(headers ->> 'cf-connecting-ip', split_part(headers ->> 'x-forwarded-for', ',', 1), headers ->> 'x-real-ip', '');
  -- IP adresi açık metin saklanmaz, yalnızca tuzlu özeti tutulur
  new.ip_hash := case when ip = '' then null
                      else encode(sha256(convert_to(trim(ip) || ':portfolio', 'UTF8')), 'hex') end;

  select count(*) into recent_all from public.messages where created_at > now() - interval '1 hour';
  if recent_all >= 60 then
    raise exception 'Çok fazla mesaj gönderildi, lütfen daha sonra tekrar deneyin.' using errcode = 'P0001';
  end if;

  if new.ip_hash is not null then
    select count(*) into recent_ip from public.messages where ip_hash = new.ip_hash and created_at > now() - interval '10 minutes';
    if recent_ip >= 3 then
      raise exception 'Çok fazla mesaj gönderildi, lütfen biraz bekleyin.' using errcode = 'P0001';
    end if;
  end if;

  select count(*) into recent_email from public.messages where lower(email) = lower(new.email) and created_at > now() - interval '1 hour';
  if recent_email >= 5 then
    raise exception 'Bu e-posta ile çok fazla mesaj gönderildi.' using errcode = 'P0001';
  end if;

  return new;
end;
$$;
revoke all on function private.messages_guard() from public, anon, authenticated;

drop trigger if exists messages_guard on public.messages;
create trigger messages_guard
  before insert on public.messages
  for each row execute function private.messages_guard();

create index if not exists messages_ip_idx on public.messages (ip_hash, created_at desc);
create index if not exists messages_email_idx on public.messages (lower(email), created_at desc);

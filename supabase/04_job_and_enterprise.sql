-- =========================================================
-- 04 — Mevcut pozisyon / şirket alanları ve "Kurumsal & entegrasyon" yetenek grubu
-- 03_bilingual_and_details.sql'den SONRA çalıştırılır.
-- =========================================================
alter table public.profile
  add column job_title text not null default '',
  add column job_title_en text not null default '',
  add column company text not null default '',
  add column company_url text not null default '';
alter table public.profile add constraint profile_job_len check (char_length(job_title) <= 120 and char_length(job_title_en) <= 120 and char_length(company) <= 80);
alter table public.profile add constraint profile_company_url check (company_url = '' or company_url ~* '^https://');
grant update (job_title, job_title_en, company, company_url) on public.profile to authenticated;

alter table public.skills drop constraint skills_group_name_check;
alter table public.skills add constraint skills_group_name_check check (group_name in ('enterprise','backend','data','mobile','web','approach'));

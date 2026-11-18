create table if not exists public.portfolio_admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);

alter table public.portfolio_admins enable row level security;
revoke all on public.portfolio_admins from public, anon, authenticated;

create or replace function public.is_portfolio_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from public.portfolio_admins
    where user_id = auth.uid()
  );
$function$;

revoke all on function public.is_portfolio_admin() from public, anon;
grant execute on function public.is_portfolio_admin() to authenticated;

create table if not exists public.hair_portfolio (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null unique,
  caption text not null check (char_length(caption) between 1 and 180),
  created_at timestamptz not null default now()
);

alter table public.hair_portfolio enable row level security;
revoke all on public.hair_portfolio from public, anon, authenticated;
grant select on public.hair_portfolio to anon, authenticated;
grant insert, delete on public.hair_portfolio to authenticated;

drop policy if exists "Anyone can view salon portfolio" on public.hair_portfolio;
create policy "Anyone can view salon portfolio"
  on public.hair_portfolio for select
  to anon, authenticated
  using (true);

drop policy if exists "Portfolio admins can add photos" on public.hair_portfolio;
create policy "Portfolio admins can add photos"
  on public.hair_portfolio for insert
  to authenticated
  with check (public.is_portfolio_admin());

drop policy if exists "Portfolio admins can remove photos" on public.hair_portfolio;
create policy "Portfolio admins can remove photos"
  on public.hair_portfolio for delete
  to authenticated
  using (public.is_portfolio_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'hair-portfolio',
  'hair-portfolio',
  true,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Anyone can view salon portfolio images" on storage.objects;
create policy "Anyone can view salon portfolio images"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'hair-portfolio');

drop policy if exists "Portfolio admins can upload salon images" on storage.objects;
create policy "Portfolio admins can upload salon images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'hair-portfolio' and public.is_portfolio_admin());

drop policy if exists "Portfolio admins can delete salon images" on storage.objects;
create policy "Portfolio admins can delete salon images"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'hair-portfolio' and public.is_portfolio_admin());

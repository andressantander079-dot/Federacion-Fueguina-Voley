-- Create Sponsors Table
create table if not exists public.sponsors (
    id uuid not null default gen_random_uuid(),
    name text not null,
    website text null,
    logo_url text null,
    active boolean default true,
    display_order integer default 99,
    created_at timestamp with time zone default now(),
    constraint sponsors_pkey primary key (id)
);

-- Enable RLS
alter table public.sponsors enable row level security;

-- Policies
create policy "Enable read access for all users" on public.sponsors
    for select using (true);

create policy "Enable insert for authenticated users only" on public.sponsors
    for insert with check (auth.role() = 'authenticated');

create policy "Enable update for authenticated users only" on public.sponsors
    for update using (auth.role() = 'authenticated');

create policy "Enable delete for authenticated users only" on public.sponsors
    for delete using (auth.role() = 'authenticated');

-- Storage Bucket for Config/Sponsors (if not exists)
insert into storage.buckets (id, name, public)
values ('config-assets', 'config-assets', true)
on conflict (id) do nothing;

create policy "Public Access Config Assets" on storage.objects
  for select using ( bucket_id = 'config-assets' );

create policy "Auth Upload Config Assets" on storage.objects
  for insert with check ( bucket_id = 'config-assets' and auth.role() = 'authenticated' );

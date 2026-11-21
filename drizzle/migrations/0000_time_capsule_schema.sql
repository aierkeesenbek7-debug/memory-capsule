-- PROFILES
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "Signed-in users can view profiles" on public.profiles for select to authenticated using (true);
create policy "Users insert own profile" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "Users update own profile" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data->>'display_name', ''),
      nullif(new.raw_user_meta_data->>'full_name', ''),
      nullif(new.raw_user_meta_data->>'name', ''),
      split_part(coalesce(new.email, 'friend'), '@', 1)
    )
  )
  on conflict (id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- CAPSULES
create table public.capsules (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  cover_path text,
  event_date date,
  open_at timestamptz not null,
  visibility text not null default 'personal' check (visibility in ('personal','shared')),
  hue text not null default 'aqua' check (hue in ('aqua','coral','amber','lime','rose','sky')),
  created_at timestamptz not null default now()
);
create index capsules_owner_idx on public.capsules(owner_id);
grant select, insert, update, delete on public.capsules to authenticated;
grant all on public.capsules to service_role;

create table public.capsule_contents (
  capsule_id uuid primary key references public.capsules(id) on delete cascade,
  story text check (story is null or char_length(story) <= 20000),
  music_url text check (music_url is null or char_length(music_url) <= 1000)
);
grant select, insert on public.capsule_contents to authenticated;
grant all on public.capsule_contents to service_role;

create table public.capsule_participants (
  id uuid primary key default gen_random_uuid(),
  capsule_id uuid not null references public.capsules(id) on delete cascade,
  email text not null check (char_length(email) between 3 and 320),
  can_upload boolean not null default false,
  invited_at timestamptz not null default now(),
  unique (capsule_id, email)
);
create index capsule_participants_email_idx on public.capsule_participants(email);
grant select, insert, update, delete on public.capsule_participants to authenticated;
grant all on public.capsule_participants to service_role;

create table public.capsule_media (
  id uuid primary key default gen_random_uuid(),
  capsule_id uuid not null references public.capsules(id) on delete cascade,
  uploader_id uuid not null references public.profiles(id) on delete cascade,
  storage_path text not null unique,
  media_type text not null check (media_type in ('image','video')),
  created_at timestamptz not null default now()
);
create index capsule_media_capsule_idx on public.capsule_media(capsule_id);
grant select, insert, delete on public.capsule_media to authenticated;
grant all on public.capsule_media to service_role;

create table public.capsule_comments (
  id uuid primary key default gen_random_uuid(),
  capsule_id uuid not null references public.capsules(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  kind text not null default 'comment' check (kind in ('comment','wish')),
  created_at timestamptz not null default now()
);
create index capsule_comments_capsule_idx on public.capsule_comments(capsule_id);
grant select, insert, delete on public.capsule_comments to authenticated;
grant all on public.capsule_comments to service_role;

create table public.capsule_opens (
  capsule_id uuid not null references public.capsules(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  opened_at timestamptz not null default now(),
  primary key (capsule_id, user_id)
);
grant select, insert on public.capsule_opens to authenticated;
grant all on public.capsule_opens to service_role;

-- HELPERS
create or replace function public.try_uuid(_t text)
returns uuid language plpgsql immutable as $$
begin
  return _t::uuid;
exception when others then
  return null;
end $$;

create or replace function public.current_user_email()
returns text language sql stable security definer set search_path = public, auth as $$
  select lower(email) from auth.users where id = auth.uid()
$$;

create or replace function public.is_capsule_owner(_capsule_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.capsules where id = _capsule_id and owner_id = auth.uid())
$$;

create or replace function public.is_capsule_member(_capsule_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.capsules c
    where c.id = _capsule_id
      and (
        c.owner_id = auth.uid()
        or (c.visibility = 'shared' and exists (
          select 1 from public.capsule_participants p
          where p.capsule_id = c.id and p.email = public.current_user_email()
        ))
      )
  )
$$;

create or replace function public.is_capsule_open(_capsule_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.capsules where id = _capsule_id and open_at <= now())
$$;

create or replace function public.can_upload_to_capsule(_capsule_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.capsules c
    where c.id = _capsule_id
      and (
        c.owner_id = auth.uid()
        or (c.visibility = 'shared' and exists (
          select 1 from public.capsule_participants p
          where p.capsule_id = c.id and p.can_upload and p.email = public.current_user_email()
        ))
      )
  )
$$;

-- VALIDATION TRIGGERS
create or replace function public.validate_capsule()
returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if new.open_at <= now() then
      raise exception 'The opening date must be in the future';
    end if;
  elsif tg_op = 'UPDATE' then
    if new.open_at is distinct from old.open_at then
      raise exception 'The opening date of a sealed capsule cannot be changed';
    end if;
    if new.owner_id is distinct from old.owner_id or new.created_at is distinct from old.created_at then
      raise exception 'These capsule fields cannot be changed';
    end if;
  end if;
  return new;
end $$;
create trigger capsules_validate before insert or update on public.capsules
for each row execute function public.validate_capsule();

create or replace function public.normalize_participant_email()
returns trigger language plpgsql set search_path = public as $$
begin
  new.email := lower(trim(new.email));
  return new;
end $$;
create trigger capsule_participants_normalize before insert or update on public.capsule_participants
for each row execute function public.normalize_participant_email();

-- RLS
alter table public.capsules enable row level security;
create policy "Members can view capsules" on public.capsules for select to authenticated using (public.is_capsule_member(id));
create policy "Users create own capsules" on public.capsules for insert to authenticated with check (owner_id = auth.uid());
create policy "Owners update capsules" on public.capsules for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "Owners delete capsules" on public.capsules for delete to authenticated using (owner_id = auth.uid());

alter table public.capsule_contents enable row level security;
create policy "Members read contents after opening" on public.capsule_contents for select to authenticated
  using (public.is_capsule_member(capsule_id) and public.is_capsule_open(capsule_id));
create policy "Owners seal contents" on public.capsule_contents for insert to authenticated
  with check (public.is_capsule_owner(capsule_id));

alter table public.capsule_participants enable row level security;
create policy "Members view participants" on public.capsule_participants for select to authenticated using (public.is_capsule_member(capsule_id));
create policy "Owners invite participants" on public.capsule_participants for insert to authenticated with check (public.is_capsule_owner(capsule_id));
create policy "Owners update participants" on public.capsule_participants for update to authenticated using (public.is_capsule_owner(capsule_id)) with check (public.is_capsule_owner(capsule_id));
create policy "Owners remove participants" on public.capsule_participants for delete to authenticated using (public.is_capsule_owner(capsule_id));

alter table public.capsule_media enable row level security;
create policy "Members view media after opening" on public.capsule_media for select to authenticated
  using (public.is_capsule_member(capsule_id) and public.is_capsule_open(capsule_id));
create policy "Contributors add media" on public.capsule_media for insert to authenticated
  with check (uploader_id = auth.uid() and public.can_upload_to_capsule(capsule_id));
create policy "Uploaders or owners remove media" on public.capsule_media for delete to authenticated
  using (uploader_id = auth.uid() or public.is_capsule_owner(capsule_id));

alter table public.capsule_comments enable row level security;
create policy "Members view comments" on public.capsule_comments for select to authenticated using (public.is_capsule_member(capsule_id));
create policy "Members post comments" on public.capsule_comments for insert to authenticated
  with check (author_id = auth.uid() and public.is_capsule_member(capsule_id));
create policy "Authors or owners delete comments" on public.capsule_comments for delete to authenticated
  using (author_id = auth.uid() or public.is_capsule_owner(capsule_id));

alter table public.capsule_opens enable row level security;
create policy "Users view own openings" on public.capsule_opens for select to authenticated using (user_id = auth.uid());
create policy "Members record opening after date" on public.capsule_opens for insert to authenticated
  with check (user_id = auth.uid() and public.is_capsule_member(capsule_id) and public.is_capsule_open(capsule_id));

-- STORAGE POLICIES (bucket: capsule-media, paths: {capsule_id}/cover/... or {capsule_id}/media/...)
create policy "Members view capsule covers" on storage.objects for select to authenticated
  using (bucket_id = 'capsule-media' and (storage.foldername(name))[2] = 'cover'
         and public.is_capsule_member(public.try_uuid((storage.foldername(name))[1])));
create policy "Members view media after opening" on storage.objects for select to authenticated
  using (bucket_id = 'capsule-media' and (storage.foldername(name))[2] = 'media'
         and public.is_capsule_member(public.try_uuid((storage.foldername(name))[1]))
         and public.is_capsule_open(public.try_uuid((storage.foldername(name))[1])));
create policy "Owners upload covers" on storage.objects for insert to authenticated
  with check (bucket_id = 'capsule-media' and (storage.foldername(name))[2] = 'cover'
              and public.is_capsule_owner(public.try_uuid((storage.foldername(name))[1])));
create policy "Contributors upload media" on storage.objects for insert to authenticated
  with check (bucket_id = 'capsule-media' and (storage.foldername(name))[2] = 'media'
              and public.can_upload_to_capsule(public.try_uuid((storage.foldername(name))[1])));
create policy "Owners delete capsule files" on storage.objects for delete to authenticated
  using (bucket_id = 'capsule-media' and public.is_capsule_owner(public.try_uuid((storage.foldername(name))[1])));

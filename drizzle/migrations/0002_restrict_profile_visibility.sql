create or replace function public.can_view_profile(_profile_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select _profile_id = auth.uid()
    or exists (
      select 1 from public.capsules c
      where c.owner_id = _profile_id and public.is_capsule_member(c.id)
    )
    or exists (
      select 1 from public.capsule_comments cc
      where cc.author_id = _profile_id and public.is_capsule_member(cc.capsule_id)
    )
    or exists (
      select 1 from public.capsule_media m
      where m.uploader_id = _profile_id and public.is_capsule_member(m.capsule_id)
    )
$$;

revoke execute on function public.can_view_profile(uuid) from public, anon;
grant execute on function public.can_view_profile(uuid) to authenticated;

drop policy if exists "Signed-in users can view profiles" on public.profiles;
create policy "Users view own and fellow capsule member profiles" on public.profiles
  for select to authenticated using (public.can_view_profile(id));
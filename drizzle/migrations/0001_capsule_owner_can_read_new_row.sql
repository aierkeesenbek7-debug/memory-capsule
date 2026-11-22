drop policy "Members can view capsules" on public.capsules;
create policy "Members can view capsules" on public.capsules for select to authenticated
  using (owner_id = auth.uid() or public.is_capsule_member(id));
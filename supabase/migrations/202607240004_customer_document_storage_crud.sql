-- Keep customer documents private while allowing only the owner or admins to access them.
update storage.buckets
set public = false
where id = 'customer-documents';

drop policy if exists "customer document files own folder" on storage.objects;
drop policy if exists "customer document uploads own" on storage.objects;
drop policy if exists "customer document deletes own" on storage.objects;
drop policy if exists "customer document files own or admin" on storage.objects;
drop policy if exists "customer document uploads own or admin" on storage.objects;
drop policy if exists "customer document updates own or admin" on storage.objects;
drop policy if exists "customer document deletes own or admin" on storage.objects;

create policy "customer document files own or admin"
  on storage.objects
  for select
  using (bucket_id = 'customer-documents' and (public.is_admin() or owner = auth.uid()));

create policy "customer document uploads own or admin"
  on storage.objects
  for insert
  with check (bucket_id = 'customer-documents' and (public.is_admin() or owner = auth.uid()));

create policy "customer document updates own or admin"
  on storage.objects
  for update
  using (bucket_id = 'customer-documents' and (public.is_admin() or owner = auth.uid()))
  with check (bucket_id = 'customer-documents' and (public.is_admin() or owner = auth.uid()));

create policy "customer document deletes own or admin"
  on storage.objects
  for delete
  using (bucket_id = 'customer-documents' and (public.is_admin() or owner = auth.uid()));

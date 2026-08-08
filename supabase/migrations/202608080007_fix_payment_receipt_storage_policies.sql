-- Storage no longer reliably populates storage.objects.owner on client uploads.
-- Bind receipt access to the user folder instead.
drop policy if exists "payment receipt files own" on storage.objects;
drop policy if exists "payment receipt uploads own" on storage.objects;
drop policy if exists "payment receipt files own or admin" on storage.objects;
drop policy if exists "payment receipt uploads own or admin" on storage.objects;
drop policy if exists "payment receipt updates own or admin" on storage.objects;
drop policy if exists "payment receipt deletes own or admin" on storage.objects;

create policy "payment receipt files own or admin"
  on storage.objects
  for select
  using (
    bucket_id = 'payment-receipts'
    and (public.is_admin() or (storage.foldername(name))[1] = auth.uid()::text)
  );

create policy "payment receipt uploads own or admin"
  on storage.objects
  for insert
  with check (
    bucket_id = 'payment-receipts'
    and (public.is_admin() or (storage.foldername(name))[1] = auth.uid()::text)
  );

create policy "payment receipt updates own or admin"
  on storage.objects
  for update
  using (
    bucket_id = 'payment-receipts'
    and (public.is_admin() or (storage.foldername(name))[1] = auth.uid()::text)
  )
  with check (
    bucket_id = 'payment-receipts'
    and (public.is_admin() or (storage.foldername(name))[1] = auth.uid()::text)
  );

create policy "payment receipt deletes own or admin"
  on storage.objects
  for delete
  using (
    bucket_id = 'payment-receipts'
    and (public.is_admin() or (storage.foldername(name))[1] = auth.uid()::text)
  );

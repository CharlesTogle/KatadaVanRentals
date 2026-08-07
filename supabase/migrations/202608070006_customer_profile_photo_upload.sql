-- Allow authenticated users to upload their own profile photo to business-assets/profile-photos/
create policy "customer profile photo upload own"
  on storage.objects
  for insert
  with check (
    bucket_id = 'business-assets'
    and owner = auth.uid()
    and (storage.foldername(name))[1] = 'profile-photos'
  );

-- Allow authenticated users to update their own profile photo (upsert)
create policy "customer profile photo update own"
  on storage.objects
  for update
  using (
    bucket_id = 'business-assets'
    and owner = auth.uid()
    and (storage.foldername(name))[1] = 'profile-photos'
  )
  with check (
    bucket_id = 'business-assets'
    and owner = auth.uid()
    and (storage.foldername(name))[1] = 'profile-photos'
  );

-- Allow authenticated users to delete their own profile photo
create policy "customer profile photo delete own"
  on storage.objects
  for delete
  using (
    bucket_id = 'business-assets'
    and owner = auth.uid()
    and (storage.foldername(name))[1] = 'profile-photos'
  );

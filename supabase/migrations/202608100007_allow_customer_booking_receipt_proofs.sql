drop policy if exists "payment receipt files own or admin" on storage.objects;

create policy "payment receipt files own booking or admin"
  on storage.objects
  for select
  using (
    bucket_id = 'payment-receipts'
    and (
      public.is_admin()
      or (storage.foldername(name))[1] = auth.uid()::text
      or exists (
        select 1
        from public.bookings b
        where b.customer_id = auth.uid()
          and b.id::text in ((storage.foldername(name))[1], (storage.foldername(name))[2])
      )
    )
  );

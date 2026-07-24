-- Allow customers to delete their own documents (replaces admin-only policy)
drop policy if exists "documents delete admin" on public.customer_documents;

create policy "documents delete own or admin"
  on public.customer_documents
  for delete
  using (customer_id = auth.uid() or public.is_admin());

-- Allow customers to delete their own files from customer-documents bucket
create policy "customer document deletes own"
  on storage.objects
  for delete
  using (bucket_id = 'customer-documents' and owner = auth.uid());

create policy "shelters upload pet photos" on storage.objects for insert to authenticated
with check (bucket_id = 'pet-photos' and (storage.foldername(name))[1] = auth.uid()::text and public.has_role(auth.uid(),'shelter'));
create policy "pet photos readable" on storage.objects for select to anon, authenticated using (bucket_id = 'pet-photos');
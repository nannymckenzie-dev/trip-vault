-- Trip Vault — Phase 3 storage: private buckets + per-user policies.
-- Run in the Supabase SQL editor (Dashboard → SQL → New query). Idempotent.
--
-- Security model (PRD principle #5): both buckets are PRIVATE. The app never
-- exposes permanent public URLs — it generates short-lived signed URLs. Objects
-- are stored under a `<user_id>/...` prefix and policies only let a user touch
-- files under their own uid prefix.

-- ---------------------------------------------------------------------------
-- Buckets
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values
  ('documents', 'documents', false),
  ('tickets', 'tickets', false)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Policies on storage.objects, scoped to the authenticated user's uid prefix.
-- (storage.foldername(name))[1] is the first path segment, i.e. the user_id.
-- ---------------------------------------------------------------------------
do $$
declare
  b text;
  buckets text[] := array['documents', 'tickets'];
begin
  foreach b in array buckets loop
    execute format('drop policy if exists %I on storage.objects;', b || '_select_own');
    execute format($p$
      create policy %I on storage.objects for select to authenticated
      using (bucket_id = %L and (storage.foldername(name))[1] = auth.uid()::text);
    $p$, b || '_select_own', b);

    execute format('drop policy if exists %I on storage.objects;', b || '_insert_own');
    execute format($p$
      create policy %I on storage.objects for insert to authenticated
      with check (bucket_id = %L and (storage.foldername(name))[1] = auth.uid()::text);
    $p$, b || '_insert_own', b);

    execute format('drop policy if exists %I on storage.objects;', b || '_update_own');
    execute format($p$
      create policy %I on storage.objects for update to authenticated
      using (bucket_id = %L and (storage.foldername(name))[1] = auth.uid()::text)
      with check (bucket_id = %L and (storage.foldername(name))[1] = auth.uid()::text);
    $p$, b || '_update_own', b, b);

    execute format('drop policy if exists %I on storage.objects;', b || '_delete_own');
    execute format($p$
      create policy %I on storage.objects for delete to authenticated
      using (bucket_id = %L and (storage.foldername(name))[1] = auth.uid()::text);
    $p$, b || '_delete_own', b);
  end loop;
end;
$$;

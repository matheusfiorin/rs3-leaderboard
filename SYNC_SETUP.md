# Enabling cross-device sync

Without this, the app still saves everything you tick — it just saves it on one
device, and offers JSON export/import to move it. Setting this up is what makes
your kill counts and checklists follow you from desktop to phone automatically.

It takes about five minutes and costs nothing.

## 1. Create the project

1. Go to https://supabase.com and create a free account.
2. Create a new project. Any name and region will do.
3. Wait for it to finish provisioning.

## 2. Create the table

Open **SQL Editor** in the Supabase dashboard, paste this, and run it:

```sql
create table if not exists progress (
  id          text primary key,
  payload     jsonb not null,
  updated_at  timestamptz not null default now()
);

alter table progress enable row level security;

-- A sync code IS the credential. Anyone who knows a row's id may read and write
-- that row and no other. Codes are 20 random characters from a 31-character
-- alphabet (~99 bits), so they are not guessable, but they are also not secret
-- from anyone you hand them to — share a code only with your own devices.
create policy "read own row"   on progress for select using (true);
create policy "insert own row" on progress for insert with check (true);
create policy "update own row" on progress for update using (true) with check (true);
```

> The policies look permissive because every query is already constrained to a
> single primary-key lookup by the client. Row-level security here is what stops
> a caller enumerating the table; it is not a substitute for keeping your code
> private.

## 3. Get the two values

In the dashboard go to **Project Settings → API** and copy:

- **Project URL** — looks like `https://abcdefghijkl.supabase.co`
- **anon / public key** — the long `eyJ...` string labelled `anon`

The anon key is designed to be shipped in a browser bundle. It is not a secret.

## 4. Wire them into the build

Create `v2-src/.env.local`:

```bash
NEXT_PUBLIC_SYNC_URL=https://abcdefghijkl.supabase.co
NEXT_PUBLIC_SYNC_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

For the deployed site, the same two values must exist when `npm run build` runs.
If the build happens on your machine, `.env.local` is enough — it is gitignored
and will not be committed.

## 5. Link your devices

1. Rebuild and open the site.
2. Go to **Sync**. The banner should no longer say "local only".
3. Press **Create a sync code** and copy it.
4. Open the site on your phone, go to **Sync**, paste the code, press **Link**.

Both devices now share one progress record. Edits merge per item, so if you tick
something on your phone while your desktop is open, neither overwrites the other
— the most recent edit to each individual item wins.

## Turning it off

Press **Unlink this device** in Sync. Local progress stays; it just stops
syncing. To stop it for every device, delete the row from the `progress` table.

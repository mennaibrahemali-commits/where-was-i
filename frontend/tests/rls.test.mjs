// Runs supabase/setup.sql in an in-memory Postgres (PGlite) with a minimal
// stand-in for Supabase's auth schema, then checks that each person can only
// reach their own rows.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const setup = readFileSync(new URL('../../supabase/setup.sql', import.meta.url), 'utf8');
const A = '11111111-1111-1111-1111-111111111111';
const B = '22222222-2222-2222-2222-222222222222';

async function db() {
  const pg = new PGlite();
  // Minimal copy of what Supabase provides.
  await pg.exec(`
    create role anon nologin; create role authenticated nologin;
    create schema auth;
    create table auth.users (id uuid primary key);
    insert into auth.users values ('${A}'), ('${B}');
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claims', true)::json->>'sub', '')::uuid $$;
    grant usage on schema auth to anon, authenticated;
    grant usage on schema public to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
  `);
  await pg.exec(setup);
  await pg.exec(setup); // must be safe to run twice
  return pg;
}

async function as(pg, who, sql, params) {
  await pg.exec('reset role');
  if (who === 'anon') {
    await pg.exec(`set request.jwt.claims = '{}'; set role anon;`);
  } else {
    await pg.exec(`set request.jwt.claims = '{"sub":"${who}"}'; set role authenticated;`);
  }
  try {
    return await pg.query(sql, params);
  } finally {
    await pg.exec('reset role');
  }
}

test('each person only sees and changes their own rows', async () => {
  const pg = await db();
  await as(pg, A, `insert into public.wwi_docs (id, data) values ('x', '{"title":"A secret"}')`);
  await as(pg, B, `insert into public.wwi_docs (user_id, id, data) values ($1, 'y', '{"title":"B"}')`, [B]);

  const aRows = await as(pg, A, 'select id, data from public.wwi_docs');
  assert.deepEqual(aRows.rows.map((r) => r.id), ['x']);
  const bRows = await as(pg, B, 'select id from public.wwi_docs');
  assert.deepEqual(bRows.rows.map((r) => r.id), ['y']);

  // B tries to write a row into A's account
  await assert.rejects(as(pg, B, `insert into public.wwi_docs (user_id, id, data) values ($1, 'z', '{}')`, [A]), /row-level security/);
  // B tries to change and delete A's row: nothing happens
  const upd = await as(pg, B, `update public.wwi_docs set data = '{"title":"hacked"}' where id = 'x'`);
  assert.equal(upd.affectedRows, 0);
  const del = await as(pg, B, `delete from public.wwi_docs where id = 'x'`);
  assert.equal(del.affectedRows, 0);
  // B tries to move their row into A's account
  await assert.rejects(as(pg, B, `update public.wwi_docs set user_id = $1 where id = 'y'`, [A]), /row-level security/);
  const still = await as(pg, A, `select data->>'title' as t from public.wwi_docs where id = 'x'`);
  assert.equal(still.rows[0].t, 'A secret');

  // Not signed in: no access at all
  await assert.rejects(as(pg, 'anon', 'select * from public.wwi_docs'), /permission denied/);
});

test('upsert works for the owner and the server sets updated_at', async () => {
  const pg = await db();
  await as(pg, A, `insert into public.wwi_docs (user_id, id, data, updated_at) values ($1, 'x', '{"v":1}', '2000-01-01')`, [A]);
  const first = await as(pg, A, 'select updated_at from public.wwi_docs');
  assert.ok(new Date(first.rows[0].updated_at).getFullYear() > 2000, 'client time ignored');
  await as(pg, A, `insert into public.wwi_docs (user_id, id, data) values ($1, 'x', '{"v":2}')
                   on conflict (user_id, id) do update set data = excluded.data`, [A]);
  const after = await as(pg, A, `select data->>'v' as v from public.wwi_docs`);
  assert.equal(after.rows[0].v, '2');
});

// Database isolation tests: runs every migration in supabase/migrations against an in-memory
// Postgres (PGlite) with a minimal Supabase shim, then checks that user A and user B cannot
// read or change each other's data. Uses synthetic users only — never touches a real project.
//
// Setup (once, does not modify package.json):  npm i --no-save --legacy-peer-deps @electric-sql/pglite@0.3.7
// Run:                                          npm run test:db

import { test, before } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";

const MIGRATIONS = join(dirname(fileURLToPath(import.meta.url)), "..", "migrations");
const A = "00000000-0000-4000-8000-00000000000a";
const B = "00000000-0000-4000-8000-00000000000b";

// The parts of a Supabase project the migrations depend on.
const SHIM = `
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN BYPASSRLS;
GRANT anon, authenticated, service_role TO postgres;

CREATE SCHEMA auth;
CREATE TABLE auth.users (
  id uuid PRIMARY KEY, email text, raw_user_meta_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(), last_sign_in_at timestamptz
);
CREATE TABLE auth.sessions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE, updated_at timestamptz);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
  $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;

CREATE SCHEMA storage;
CREATE TABLE storage.buckets (id text PRIMARY KEY, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
CREATE TABLE storage.objects (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), bucket_id text, name text, owner uuid, metadata jsonb);
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION storage.foldername(name text) RETURNS text[] LANGUAGE sql IMMUTABLE AS
  $$ SELECT (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;

CREATE SCHEMA realtime;
CREATE TABLE realtime.messages (id bigserial PRIMARY KEY, payload jsonb);
CREATE FUNCTION realtime.topic() RETURNS text LANGUAGE sql STABLE AS
  $$ SELECT current_setting('realtime.topic', true) $$;
CREATE PUBLICATION supabase_realtime;

GRANT USAGE ON SCHEMA public, auth, storage, realtime TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON storage.objects TO authenticated, service_role;
GRANT SELECT ON realtime.messages TO authenticated;
-- Supabase grants everything on new public tables to these roles; RLS is what protects data.
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
`;

let db;

async function as(userId, fn) {
  await db.exec("RESET ROLE");
  await db.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [userId ?? ""]);
  await db.exec(userId ? "SET ROLE authenticated" : "SET ROLE anon");
  try {
    return await fn();
  } finally {
    await db.exec("RESET ROLE");
  }
}

async function asService(fn) {
  await db.exec("SET ROLE service_role");
  try {
    return await fn();
  } finally {
    await db.exec("RESET ROLE");
  }
}

const q = (sql, params) => db.query(sql, params);
const count = async (sql, params) => Number((await q(sql, params)).rows[0].n);

async function applyMigrations() {
  const files = readdirSync(MIGRATIONS).filter((f) => f.endsWith(".sql")).sort();
  for (const f of files) {
    const sql = readFileSync(join(MIGRATIONS, f), "utf8");
    try {
      await db.exec(sql);
    } catch (e) {
      // 20260428014558 re-adds public.jobs to the realtime publication, which the first migration
      // already did. On the live project only one of them ran; replaying both fails, so skip that line.
      if (e.code !== "42710" || !/ALTER PUBLICATION/i.test(sql)) throw e;
      console.log(`note: ${f}: table already in publication, re-running without ALTER PUBLICATION`);
      await db.exec(sql.replace(/^ALTER PUBLICATION.*$/gim, ""));
    }
  }
  return files;
}

async function seedUser(id, tag) {
  await q("INSERT INTO auth.users (id, email) VALUES ($1, $2)", [id, `${tag}@example.test`]);
  return as(id, async () => {
    const v = await q("INSERT INTO public.cv_versions (user_id, name) VALUES ($1, $2) RETURNING id", [id, `${tag} cv`]);
    const versionId = v.rows[0].id;
    const j = await q(
      "INSERT INTO public.jobs (user_id, company, role, notes, cv_version_id) VALUES ($1, $2, 'Engineer', 'synthetic', $3) RETURNING id",
      [id, `${tag} GmbH`, versionId],
    );
    await q("INSERT INTO public.cv_baseline (user_id, cv_text, file_path) VALUES ($1, 'synthetic cv', $2)", [id, `${id}/cv-1.pdf`]);
    await q("INSERT INTO public.api_tokens (user_id, name, token_hash, token_prefix) VALUES ($1, 't', $2, 'cvc_x')", [id, `hash-${tag}`]);
    await q("INSERT INTO public.privacy_settings (user_id, ai_enabled, ai_notice_version) VALUES ($1, true, 'test')", [id]);
    await q("INSERT INTO storage.objects (bucket_id, name, owner) VALUES ('cvs', $1, $2)", [`${id}/cv-1.pdf`, id]);
    return { versionId, jobId: j.rows[0].id };
  });
}

let seeded;

before(async () => {
  db = new PGlite();
  await db.exec(SHIM);
  await applyMigrations();
  seeded = { a: await seedUser(A, "a"), b: await seedUser(B, "b") };
});

test("all migrations apply, and the privacy migration can be re-run", async () => {
  await db.exec(readFileSync(join(MIGRATIONS, "20261020120000_privacy_hardening.sql"), "utf8"));
  const bucket = (await q("SELECT file_size_limit, allowed_mime_types FROM storage.buckets WHERE id = 'cvs'")).rows[0];
  assert.equal(Number(bucket.file_size_limit), 10485760);
  assert.ok(bucket.allowed_mime_types.includes("application/pdf"));
});

const TABLES = ["jobs", "cv_versions", "cv_baseline", "api_tokens", "privacy_settings"];

for (const table of TABLES) {
  test(`${table}: user B cannot read, change or delete user A's rows`, async () => {
    await as(B, async () => {
      assert.equal(await count(`SELECT count(*) AS n FROM public.${table} WHERE user_id = $1`, [A]), 0, "read");
      const own = await count(`SELECT count(*) AS n FROM public.${table}`);
      assert.equal(own, 1, "B sees exactly its own row");
      const upd = await q(`UPDATE public.${table} SET user_id = user_id WHERE user_id = $1`, [A]);
      assert.equal(upd.affectedRows, 0, "update");
      const del = await q(`DELETE FROM public.${table} WHERE user_id = $1`, [A]);
      assert.equal(del.affectedRows, 0, "delete");
    });
    await asService(async () => {
      assert.equal(await count(`SELECT count(*) AS n FROM public.${table} WHERE user_id = $1`, [A]), 1, "A's row still there");
    });
  });
}

test("user B cannot insert rows owned by user A", async () => {
  await as(B, async () => {
    await assert.rejects(q("INSERT INTO public.jobs (user_id, company, role) VALUES ($1, 'x', 'y')", [A]), /row-level security/);
    await assert.rejects(q("INSERT INTO public.cv_versions (user_id, name) VALUES ($1, 'x')", [A]), /row-level security/);
    await assert.rejects(q("INSERT INTO public.privacy_settings (user_id, ai_enabled) VALUES ($1, true)", [A]), /row-level security|duplicate key/);
  });
});

test("user B cannot move its own job to user A", async () => {
  await as(B, async () => {
    const j = await q("INSERT INTO public.jobs (user_id, company, role) VALUES ($1, 'x', 'y') RETURNING id", [B]);
    await assert.rejects(q("UPDATE public.jobs SET user_id = $1 WHERE id = $2", [A, j.rows[0].id]), /row-level security/);
    await q("DELETE FROM public.jobs WHERE id = $1", [j.rows[0].id]);
  });
});

test("a job cannot reference another user's CV version", async () => {
  await as(B, async () => {
    await assert.rejects(
      q("UPDATE public.jobs SET cv_version_id = $1 WHERE id = $2", [seeded.a.versionId, seeded.b.jobId]),
      /does not belong to this user/,
    );
  });
  // Also enforced for the service role (e.g. a buggy edge function).
  await asService(async () => {
    await assert.rejects(
      q("INSERT INTO public.jobs (user_id, company, role, cv_version_id) VALUES ($1, 'x', 'y', $2)", [B, seeded.a.versionId]),
      /does not belong to this user/,
    );
  });
});

test("signed-out (anon) requests get no table access at all", async () => {
  await as(null, async () => {
    for (const table of [...TABLES, "profiles", "user_roles", "privacy_events"]) {
      await assert.rejects(q(`SELECT 1 FROM public.${table} LIMIT 1`), /permission denied/, table);
    }
  });
});

test("CV files: B cannot read A's file or upload into A's folder", async () => {
  await as(B, async () => {
    assert.equal(await count("SELECT count(*) AS n FROM storage.objects WHERE name LIKE $1", [`${A}/%`]), 0);
    await assert.rejects(
      q("INSERT INTO storage.objects (bucket_id, name, owner) VALUES ('cvs', $1, $2)", [`${A}/evil.pdf`, B]),
      /row-level security/,
    );
    const del = await q("DELETE FROM storage.objects WHERE name LIKE $1", [`${A}/%`]);
    assert.equal(del.affectedRows, 0);
  });
});

test("realtime: B cannot subscribe to A's jobs channel", async () => {
  await q("INSERT INTO realtime.messages (payload) VALUES ('{}')");
  await db.query("SELECT set_config('realtime.topic', $1, false)", [`jobs-${A}`]);
  await as(B, async () => {
    assert.equal(await count("SELECT count(*) AS n FROM realtime.messages"), 0);
  });
  await db.query("SELECT set_config('realtime.topic', $1, false)", [`jobs-${B}`]);
  await as(B, async () => {
    assert.equal(await count("SELECT count(*) AS n FROM realtime.messages"), 1);
  });
});

test("AI preference history is written by the server and cannot be forged", async () => {
  await as(A, async () => {
    await assert.rejects(q("INSERT INTO public.privacy_events (user_id, event) VALUES ($1, 'ai_enabled')", [A]), /permission denied/);
    await q(
      "UPDATE public.privacy_settings SET ai_enabled = false, ai_enabled_at = '2000-01-01', ai_notice_version = 'test' WHERE user_id = $1",
      [A],
    );
    const s = (await q("SELECT ai_enabled, ai_enabled_at, ai_disabled_at FROM public.privacy_settings")).rows[0];
    assert.equal(s.ai_enabled, false);
    assert.notEqual(new Date(s.ai_enabled_at).getUTCFullYear(), 2000, "client timestamp ignored");
    assert.ok(s.ai_disabled_at, "disable time recorded");
    const events = (await q("SELECT event FROM public.privacy_events ORDER BY created_at, event")).rows.map((r) => r.event);
    assert.deepEqual(events.sort(), ["ai_disabled", "ai_enabled"]);
  });
  await as(B, async () => {
    assert.equal(await count("SELECT count(*) AS n FROM public.privacy_events WHERE user_id = $1", [A]), 0);
  });
});

test("purge_user_data and inactive_user_ids are callable only by the service role", async () => {
  await as(A, async () => {
    await assert.rejects(q("SELECT public.purge_user_data($1)", [B]), /permission denied/);
    await assert.rejects(q("SELECT * FROM public.inactive_user_ids('1 day')"), /permission denied/);
  });
});

test("inactive_user_ids counts session refreshes and job edits as activity", async () => {
  const C = "00000000-0000-4000-8000-00000000000c";
  const D = "00000000-0000-4000-8000-00000000000d";
  await q("INSERT INTO auth.users (id, created_at, last_sign_in_at) VALUES ($1, now() - interval '400 days', now() - interval '400 days')", [C]);
  await q("INSERT INTO auth.users (id, created_at, last_sign_in_at) VALUES ($1, now() - interval '400 days', now() - interval '400 days')", [D]);
  await q("INSERT INTO auth.sessions (user_id, updated_at) VALUES ($1, now() - interval '2 days')", [D]);
  const ids = await asService(async () => (await q("SELECT user_id FROM public.inactive_user_ids('365 days')")).rows.map((r) => r.user_id));
  assert.ok(ids.includes(C), "C inactive");
  assert.ok(!ids.includes(D), "D refreshed its session recently");
  assert.ok(!ids.includes(A) && !ids.includes(B), "fresh users are active");
  await q("DELETE FROM auth.users WHERE id IN ($1, $2)", [C, D]);
});

test("purge_user_data removes every app row of exactly one user", async () => {
  const counts = await asService(async () => (await q("SELECT public.purge_user_data($1) AS r", [A])).rows[0].r);
  assert.equal(counts.jobs, 1);
  assert.equal(counts.cv_versions, 1);
  assert.equal(counts.cv_baseline, 1);
  assert.equal(counts.api_tokens, 1);
  assert.equal(counts.privacy_settings, 1);
  await asService(async () => {
    for (const table of [...TABLES, "privacy_events"]) {
      assert.equal(await count(`SELECT count(*) AS n FROM public.${table} WHERE user_id = $1`, [A]), 0, `A gone from ${table}`);
    }
    assert.equal(await count("SELECT count(*) AS n FROM public.jobs WHERE user_id = $1", [B]), 1, "B untouched");
  });
  // Re-running is harmless (idempotent retry after a partial failure).
  const again = await asService(async () => (await q("SELECT public.purge_user_data($1) AS r", [A])).rows[0].r);
  assert.equal(again.jobs, 0);
});

test("deleting the auth user cascades to every user table, including cv_versions", async () => {
  await q("DELETE FROM auth.users WHERE id = $1", [B]);
  await asService(async () => {
    for (const table of [...TABLES, "privacy_events"]) {
      assert.equal(await count(`SELECT count(*) AS n FROM public.${table} WHERE user_id = $1`, [B]), 0, table);
    }
  });
});

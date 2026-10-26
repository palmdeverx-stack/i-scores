import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
const modulePath = process.env.LINE_LOGIN_TEST_PGLITE_MODULE;
test(
  'actual LINE migration: one-use flow, explicit consent, uniqueness, unlink and relink',
  { skip: !modulePath },
  async () => {
    const { PGlite } = await import(modulePath);
    const db = new PGlite();
    const school = '11111111-1111-4111-8111-111111111111';
    const user = '22222222-2222-4222-8222-222222222222';
    const other = '33333333-3333-4333-8333-333333333333';
    try {
      await db.exec(
        `create role anon; create role authenticated; create role service_role; create table schools(id uuid primary key); create table app_users(id uuid primary key,school_id uuid,role text,is_active boolean);`
      );
      await db.exec(
        readFileSync('supabase/migrations/20261026010000_teacher_line_login.sql', 'utf8')
      );
      await db.query('insert into schools values($1)', [school]);
      await db.query("insert into app_users values($1,$3,'teacher',true),($2,$3,'teacher',true)", [
        user,
        other,
        school,
      ]);
      async function flow(state, actor = user, subject = 'LINE-one') {
        await db.query(
          `insert into line_login_flows(state_hash,browser_hash,intent,app_user_id,school_id,session_hash,channel_id,redirect_uri,expires_at,verified_subject) values($1,$2,'link',$3,$4,'session','123','https://ekru.test/auth/line',now()+interval '10 minutes',$5)`,
          [state.repeat(64), 'b'.repeat(64), actor, school, subject]
        );
      }
      const claim = (state, browser = 'b'.repeat(64)) =>
        db.query('select * from claim_line_login_flow($1,$2)', [state.repeat(64), browser]);
      const confirm = (state, actor = user, session = 'session') =>
        db.query('select confirm_teacher_line_login($1,$2,$3,$4,$5) as id', [
          state.repeat(64),
          'b'.repeat(64),
          actor,
          school,
          session,
        ]);
      await flow('a');
      await assert.rejects(confirm('a')); // verification not yet claimed
      assert.equal((await claim('a', 'c'.repeat(64))).rows.length, 0);
      assert.equal((await claim('a')).rows.length, 1);
      assert.equal((await claim('a')).rows.length, 0);
      assert.equal((await db.query('select * from teacher_line_login_links')).rows.length, 0); // no automatic link during verification
      await assert.rejects(confirm('a', user, 'different-session'));
      await assert.rejects(confirm('a', other));
      const id = (await confirm('a')).rows[0].id;
      assert.equal((await confirm('a')).rows[0].id, id);
      await flow('c', other);
      await claim('c');
      await assert.rejects(confirm('c', other)); // same LINE, different user
      await flow('d', user, 'LINE-two');
      await claim('d');
      await assert.rejects(confirm('d')); // existing user, different LINE
      await db.query('select unlink_teacher_line_login($1,$2)', [user, school]);
      assert.equal((await db.query('select * from teacher_line_login_links')).rows.length, 0);
      await assert.rejects(confirm('d')); // unlink cancels pending links
      await flow('e');
      await claim('e');
      assert.notEqual((await confirm('e')).rows[0].id, id); // old JWT binding cannot revive
      await flow('f', other, 'LINE-three');
      await claim('f');
      await db.query('update app_users set is_active=false where id=$1', [other]);
      await assert.rejects(confirm('f', other));
      assert.equal((await db.query('select * from app_users')).rows.length, 2);
      const grants = await db.query(
        "select has_table_privilege('authenticated','teacher_line_login_links','SELECT') as allowed"
      );
      assert.equal(grants.rows[0].allowed, false);
    } finally {
      await db.close();
    }
  }
);

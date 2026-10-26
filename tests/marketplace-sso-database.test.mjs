import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
const modulePath = process.env.SSO_TEST_PGLITE_MODULE;
test(
  'actual SSO migration: one-use code and transaction, consent binding and LINE-only buyer isolation',
  { skip: !modulePath },
  async () => {
    const { PGlite } = await import(modulePath);
    const db = new PGlite();
    const school = '11111111-1111-4111-8111-111111111111',
      teacher = '22222222-2222-4222-8222-222222222222',
      identity = '33333333-3333-4333-8333-333333333333',
      tx = '44444444-4444-4444-8444-444444444444',
      tx2 = '55555555-5555-4555-8555-555555555555',
      app = '66666666-6666-4666-8666-666666666666';
    try {
      await db.exec(
        `create role anon;create role authenticated;create role service_role;create table schools(id uuid primary key);create table app_users(id uuid primary key,is_active boolean);create table marketplace_users(id uuid primary key default gen_random_uuid(),auth_user_id uuid not null,username text,email text not null,first_name text,last_name text,role text,is_active boolean);create table ekru_apps(id uuid primary key);create table ekru_app_workspaces(id uuid primary key default gen_random_uuid(),app_id uuid,owner_auth_user_id uuid,school_id uuid,check((owner_auth_user_id is not null and school_id is null)or(owner_auth_user_id is null and school_id is not null)));`
      );
      await db.exec(
        readFileSync('supabase/migrations/20261026020000_marketplace_code_sso.sql', 'utf8')
      );
      await db.query('insert into app_users values($1,true)', [teacher]);
      await db.query(
        "insert into marketplace_sso_identities(id,issuer,subject,remote_user_id,account_type)values($1,'https://e-kru-marketplace.com','LINE-new','remote-line','marketplace_user')",
        [identity]
      );
      const insert = async (id, state, expired = false) =>
        db.query(
          `insert into marketplace_sso_transactions(id,state_hash,expires_at)values($1,$2,now()+$3::interval)`,
          [id, state, expired ? '-1 second' : '4 minutes']
        );
      const claim = (id, state, code) =>
        db.query('select * from claim_marketplace_sso($1,$2,$3)', [id, state, code]);
      await insert(tx, 'state');
      assert.equal((await claim(tx, 'wrong-state', 'code')).rows.length, 0);
      assert.equal((await claim(tx, 'state', 'code')).rows.length, 1);
      assert.equal((await claim(tx, 'state', 'code')).rows.length, 0);
      await insert(tx2, 'other-state');
      await assert.rejects(claim(tx2, 'other-state', 'code')); // same code cannot be used in a different browser transaction
      await db.query(
        "update marketplace_sso_transactions set identity_id=$2,pending_kind='link' where id=$1",
        [tx, identity]
      );
      assert.equal((await db.query('select * from marketplace_users')).rows.length, 0);
      const buyer = (
        await db.query('select create_marketplace_sso_buyer($1,$2) as id', [tx, identity])
      ).rows[0].id;
      const row = (await db.query('select * from marketplace_users where id=$1', [buyer])).rows[0];
      assert.equal(row.role, 'marketplace_user');
      assert.equal(row.auth_user_id, null);
      assert.equal(row.email, null);
      await assert.rejects(db.query('select create_marketplace_sso_buyer($1,$2)', [tx, identity]));
      assert.equal((await db.query('select * from app_users')).rows.length, 1); // never creates teacher or school
      assert.equal((await db.query('select * from schools')).rows.length, 0);
      await claim(tx2, 'other-state', 'code2');
      await db.query(
        "update marketplace_sso_transactions set identity_id=$2,pending_kind='link' where id=$1",
        [tx2, identity]
      );
      await assert.rejects(
        db.query("select complete_marketplace_sso($1,$2,'link',$3,null)", [tx2, identity, teacher])
      ); // binding cannot be reassigned to staff
      await db.query('insert into ekru_apps values($1)', [app]);
      await db.query(
        'insert into ekru_app_workspaces(app_id,owner_marketplace_user_id)values($1,$2)',
        [app, buyer]
      );
      await assert.rejects(
        db.query('insert into ekru_app_workspaces(app_id,owner_marketplace_user_id)values($1,$2)', [
          app,
          buyer,
        ])
      );
      await assert.rejects(
        db.query(
          'insert into ekru_app_workspaces(app_id,owner_marketplace_user_id,school_id)values($1,$2,$3)',
          [app, buyer, school]
        )
      );
      const expired = '77777777-7777-4777-8777-777777777777';
      await insert(expired, 'expired', true);
      assert.equal((await claim(expired, 'expired', 'old-code')).rows.length, 0);
      assert.equal(
        (
          await db.query(
            "select has_table_privilege('authenticated','marketplace_sso_identities','SELECT') as allowed"
          )
        ).rows[0].allowed,
        false
      );
    } finally {
      await db.close();
    }
  }
);

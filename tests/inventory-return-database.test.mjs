import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

// Optional local PostgreSQL-compatible test engine, kept outside app dependencies.
// INVENTORY_TEST_PGLITE_MODULE=/tmp/i-scores-return-sql-test/node_modules/@electric-sql/pglite/dist/index.js node --test tests/inventory-return-database.test.mjs
const modulePath = process.env.INVENTORY_TEST_PGLITE_MODULE;
test(
  'return migration preserves stock, audit and custody invariants',
  { skip: !modulePath },
  async () => {
    const { PGlite } = await import(modulePath);
    const db = new PGlite();
    try {
      await db.exec(`
      create role anon;create role authenticated;create role service_role;
      create table schools(id uuid primary key);
      create table app_users(id uuid primary key,school_id uuid,role text,is_active boolean);
      create table notifications(user_id uuid,school_id uuid,type text,title text,body text,link text,event_key text,unique(user_id,event_key));
    `);
      await db.exec(
        readFileSync('supabase/migrations/20261024090000_school_inventory.sql', 'utf8')
      );
      await db.exec(`
      alter table inventory_items add column item_type text default 'material';
      create table inventory_documents(id uuid primary key,school_id uuid,kind text,status text,lines jsonb,created_by uuid);
      create table inventory_assets(id uuid primary key,school_id uuid,item_id uuid,asset_code text,custodian text,location text,
        status text check(status in ('registered','in_use')),activated_by uuid,activated_at timestamptz);
      create function activate_inventory_asset(p_id uuid,p_school uuid,p_actor uuid,p_custodian text,p_location text)
      returns void language plpgsql set search_path=public as $$ begin update inventory_assets set status='in_use',custodian=p_custodian,location=p_location,activated_at=now() where id=p_id and school_id=p_school;end $$;
    `);
      await db.exec(
        readFileSync('supabase/migrations/20261025030000_inventory_returns.sql', 'utf8')
      );
      const school = '11111111-1111-4111-8111-111111111111';
      const other = '22222222-2222-4222-8222-222222222222';
      const actor = '33333333-3333-4333-8333-333333333333';
      const owner = '44444444-4444-4444-8444-444444444444';
      const material = '55555555-5555-4555-8555-555555555555';
      const equipment = '66666666-6666-4666-8666-666666666666';
      const source = '77777777-7777-4777-8777-777777777777';
      const asset = '88888888-8888-4888-8888-888888888888';
      const ret = '99999999-9999-4999-8999-999999999999';
      const ret2 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
      const ret3 = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
      const ret4 = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
      const cycle = '2026-10-20T00:00:00Z';
      await db.exec(`
      insert into schools values('${school}'),('${other}');
      insert into app_users values('${actor}','${school}','school_admin',true),('${owner}','${school}','teacher',true);
      insert into inventory_items(id,school_id,code,name,unit,quantity,item_type) values
        ('${material}','${school}','M-1','Material','unit',10,'material'),('${equipment}','${school}','E-1','Equipment','piece',1,'equipment');
      insert into inventory_documents values('${source}','${school}','issue','posted','[{"item_id":"${material}","quantity":5}]','${owner}');
      insert into inventory_assets values('${asset}','${school}','${equipment}','A-001','Teacher','Room','in_use','${actor}','${cycle}');
    `);
      const record = (id, kind, lines, schoolId = school) =>
        db.query('select record_inventory_return($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)', [
          id,
          schoolId,
          actor,
          kind,
          kind === 'material' ? source : null,
          '2026-10-25',
          'Teacher',
          'Unused / returned',
          JSON.stringify(lines),
        ]);
      const stock = async () =>
        Number(
          (await db.query('select quantity from inventory_items where id=$1', [material])).rows[0]
            .quantity
        );
      await record(ret, 'material', [{ item_id: material, quantity: 2 }]);
      assert.equal(await stock(), 12);
      await record(ret, 'material', [{ item_id: material, quantity: 2 }]);
      assert.equal(await stock(), 12, 'retry must not increase stock twice');
      assert.equal(
        Number((await db.query('select count(*) as n from notifications')).rows[0].n),
        1
      );
      await assert.rejects(
        record(ret2, 'material', [{ item_id: material, quantity: 4 }]),
        /outstanding/
      );
      assert.equal(await stock(), 12, 'over-return must rollback');
      await assert.rejects(
        record(ret, 'material', [{ item_id: material, quantity: 1 }]),
        /conflict/
      );
      await assert.rejects(
        record(ret2, 'material', [{ item_id: material, quantity: 1 }], other),
        /actor/
      );
      await assert.rejects(
        record(ret2, 'material', [
          { item_id: material, quantity: 1 },
          { item_id: material, quantity: 1 },
        ]),
        /Duplicate/
      );
      await record(ret2, 'material', [{ item_id: material, quantity: 3 }]);
      assert.equal(await stock(), 15);
      await assert.rejects(
        record(ret3, 'material', [{ item_id: material, quantity: 1 }]),
        /outstanding/
      );
      await record(ret3, 'equipment', [
        { asset_id: asset, activated_at: cycle, condition: 'good' },
      ]);
      let saved = (await db.query('select * from inventory_assets where id=$1', [asset])).rows[0];
      assert.equal(saved.status, 'registered');
      assert.equal(saved.custodian, '');
      assert.equal(
        Number(
          (await db.query('select quantity from inventory_items where id=$1', [equipment])).rows[0]
            .quantity
        ),
        1
      );
      assert.equal(
        (await db.query('select lines from inventory_returns where id=$1', [ret3])).rows[0].lines[0]
          .custodian,
        'Teacher'
      );
      await db.exec('set role service_role');
      await db.query('select activate_inventory_asset($1,$2,$3,$4,$5)', [
        asset,
        school,
        actor,
        'Teacher B',
        'Other room',
      ]);
      await assert.rejects(
        db.query('select activate_inventory_asset_before_returns($1,$2,$3,$4,$5)', [
          asset,
          school,
          actor,
          'Teacher',
          'Room',
        ]),
        /permission/
      );
      await db.exec('reset role');
      await record(ret3, 'equipment', [
        { asset_id: asset, activated_at: cycle, condition: 'good' },
      ]);
      assert.equal(
        (await db.query('select status from inventory_assets where id=$1', [asset])).rows[0].status,
        'in_use',
        'retrying an old receipt cannot change a new custody cycle'
      );
      await assert.rejects(
        record(ret4, 'equipment', [{ asset_id: asset, activated_at: cycle, condition: 'damaged' }]),
        /custody/
      );
      saved = (await db.query('select * from inventory_assets where id=$1', [asset])).rows[0];
      await record(ret4, 'equipment', [
        { asset_id: asset, activated_at: saved.activated_at.toISOString(), condition: 'damaged' },
      ]);
      assert.equal(
        (await db.query('select status from inventory_assets where id=$1', [asset])).rows[0].status,
        'maintenance'
      );
      await assert.rejects(
        db.query('select activate_inventory_asset($1,$2,$3,$4,$5)', [
          asset,
          school,
          actor,
          'Teacher',
          'Room',
        ]),
        /not available/
      );
    } finally {
      await db.close();
    }
  }
);

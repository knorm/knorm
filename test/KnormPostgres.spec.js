const knorm = require('@knorm/knorm');
const knormRelations = require('@knorm/relations');
const KnormPostgres = require('../lib/KnormPostgres');
const knormPostgres = require('../');
const makeKnex = require('knex');
const { Client } = require('pg');
const sql = require('sql-bricks-postgres');
const sinon = require('sinon');
const expect = require('unexpected')
  .clone()
  .use(require('unexpected-sinon'))
  .use(require('unexpected-knex'))
  .addAssertion(
    '<Promise> to be fulfilled with sorted rows [exhaustively] satisfying <array>',
    (expect, subject, value) => {
      const ascendingOrder = (a, b) => parseInt(a.id) - parseInt(b.id);
      expect.errorMode = 'bubble';
      return expect(
        subject,
        'to be fulfilled with value satisfying',
        subject => {
          expect(subject, 'to be an array');
          expect(
            subject,
            'sorted by',
            ascendingOrder,
            'to [exhaustively] satisfy',
            value
          );
        }
      );
    }
  )
  .addAssertion(
    '<knexQuery> to have sorted rows [exhaustively] satisfying <array>',
    (expect, subject, value) => {
      const ascendingOrder = (a, b) => parseInt(a.id) - parseInt(b.id);
      expect.errorMode = 'bubble';
      return expect(subject, 'to have rows satisfying', rows =>
        expect(
          rows,
          'sorted by',
          ascendingOrder,
          'to [exhaustively] satisfy',
          value
        )
      );
    }
  );

const { KnormPostgresError } = KnormPostgres;
const connection = {
  host: process.env.PGHOST || '127.0.0.1',
  port: process.env.PGPORT || 5432,
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || '',
  database: process.env.PGDATABASE || 'postgres'
};

const knex = makeKnex({
  client: 'pg',
  connection
});

describe('KnormPostgres', () => {
  before(async () =>
    knex.schema.createTable('user', table => {
      table.increments().primary();
      table.string('name');
    })
  );

  after(async () => knex.schema.dropTable('user'));

  it('supports passing `connection` config as a string', async () => {
    const knormPostgres = new KnormPostgres({
      connection: 'postgres://postgres@127.0.0.1:5432/postgres'
    });
    const client = await knormPostgres.acquireClient();
    await knormPostgres.releaseClient(client);
  });

  it('supports options in the connection string', async () => {
    const knormPostgres = new KnormPostgres({
      connection:
        'postgres://postgres@127.0.0.1:5432/postgres?max=5&idleTimeoutMillis=1000'
    });

    // TODO: pg-connection-string should parseInt on the `max` option
    await expect(knormPostgres.pool.options.max, 'to be', '5');
    const client = await knormPostgres.acquireClient();
    await knormPostgres.releaseClient(client);
  });

  it('uses postgres environment variables if no `connection` config is provided', async () => {
    process.env.PGHOST = '127.0.0.1';
    process.env.PGPORT = 5432;
    process.env.PGUSER = 'postgres';
    process.env.PGPASSWORD = '';
    process.env.PGDATABASE = 'postgres';
    const knormPostgres = new KnormPostgres();
    const client = await knormPostgres.acquireClient();
    await knormPostgres.releaseClient(client);
    process.env.PGHOST = undefined;
    process.env.PGPORT = undefined;
    process.env.PGUSER = undefined;
    process.env.PGPASSWORD = undefined;
    process.env.PGDATABASE = undefined;
  });

  describe('init', () => {
    it('throws if not passed a `Knorm` instance', () => {
      expect(
        () => new KnormPostgres().init(),
        'to throw',
        new KnormPostgresError('no Knorm instance provided')
      );
    });

    it('throws if passed an invalid `Knorm` instance', () => {
      expect(
        () => new KnormPostgres().init({}),
        'to throw',
        new KnormPostgresError('invalid Knorm instance provided')
      );
    });
  });

  describe('acquireClient', () => {
    it('calls the user-provided `initClient`', async () => {
      const initClient = sinon.spy().named('initClient');
      const knormPostgres = new KnormPostgres({ connection, initClient });
      const client = await knormPostgres.acquireClient();
      await expect(initClient, 'to have calls satisfying', () => {
        initClient(client);
      });
      await knormPostgres.releaseClient(client);
    });

    it('releases the client if the user-provided `initClient` rejects', async () => {
      let client;
      const initClient = async theClient => {
        client = theClient;
        throw new Error('foo');
      };
      const knormPostgres = new KnormPostgres({ connection, initClient });
      await expect(
        knormPostgres.acquireClient(),
        'to be rejected with error satisfying',
        new Error('foo')
      );
      await expect(
        () => client.release(),
        'to throw',
        new Error(
          'Release called on client which has already been released to the pool.'
        )
      );
    });
  });

  describe('releaseClient', () => {
    it('calls the user-provided `restoreClient`', async () => {
      const restoreClient = sinon.spy().named('restoreClient');
      const knormPostgres = new KnormPostgres({ connection, restoreClient });
      const client = await knormPostgres.acquireClient();
      await knormPostgres.releaseClient(client);
      await expect(restoreClient, 'to have calls satisfying', () => {
        restoreClient(client);
      });
    });

    it('releases the client if there is no user-provided `restoreClient`', async () => {
      const knormPostgres = new KnormPostgres({ connection });
      const client = await knormPostgres.acquireClient();
      await knormPostgres.releaseClient(client);
      await expect(
        () => client.release(),
        'to throw',
        new Error(
          'Release called on client which has already been released to the pool.'
        )
      );
    });

    it('releases the client even if the user-provided `restoreClient` rejects', async () => {
      const restoreClient = async () => {
        throw new Error('foo');
      };
      const knormPostgres = new KnormPostgres({ connection, restoreClient });
      const client = await knormPostgres.acquireClient();
      await expect(
        knormPostgres.releaseClient(client),
        'to be rejected with error satisfying',
        new Error('foo')
      );
      await expect(
        () => client.release(),
        'to throw',
        new Error(
          'Release called on client which has already been released to the pool.'
        )
      );
    });
  });

  describe('PostgresField', () => {
    const { Field, Model, Query } = knorm().use(knormPostgres());
    const { sql } = Query.prototype;

    it('enforces maxLength 255 on all strings', async () => {
      const field = new Field({ name: 'foo', model: Model, type: 'string' });
      const value = Array(257).join('a');
      expect(value.length, 'to be', 256);
      await expect(field.validate(value), 'to be rejected with', {
        name: 'ValidationError',
        type: 'MaxLengthError'
      });
    });

    it('does not enforce maxLength 255 on text fields', async () => {
      const field = new Field({ name: 'foo', model: Model, type: 'text' });
      const value = Array(257).join('a');
      expect(value.length, 'to be', 256);
      await expect(field.validate(value), 'to be fulfilled');
    });

    describe('for `json` and `jsonb` fields', () => {
      describe('forSave', () => {
        it('stringifies values', () => {
          const field = new Field({ name: 'foo', model: Model, type: 'json' });
          expect(
            field.cast({ foo: 'bar' }, null, { forSave: true }),
            'to equal',
            JSON.stringify({ foo: 'bar' })
          );
        });

        it('does not stringify `null` values', () => {
          const field = new Field({ name: 'foo', model: Model, type: 'json' });
          expect(field.cast(null, null, { forSave: true }), 'to be undefined');
        });

        it('does not stringify raw sql values', () => {
          const field = new Field({ name: 'foo', model: Model, type: 'json' });
          expect(
            field.cast(sql('foo'), null, { forSave: true }),
            'to be undefined'
          );
        });

        it('does not stringify raw sql values when Query.prototype.sql is overloaded', () => {
          class Foo {}
          Query.prototype.sql = Foo;
          const field = new Field({ name: 'foo', model: Model, type: 'json' });
          expect(
            field.cast(new Foo(), null, { forSave: true }),
            'to be undefined'
          );
          Query.prototype.sql = sql;
        });

        describe('with a forSave cast function configured', () => {
          it('uses the configred function', () => {
            const field = new Field({
              name: 'foo',
              model: Model,
              type: 'jsonb',
              cast: {
                forSave() {
                  return 'foo';
                }
              }
            });
            expect(
              field.cast({ foo: 'bar' }, null, { forSave: true }),
              'to be',
              'foo'
            );
          });

          it('calls the function with `this` set to the model instance', () => {
            const forSave = sinon.spy();
            const field = new Field({
              name: 'foo',
              model: Model,
              type: 'json',
              cast: { forSave }
            });
            const instance = { model: 'instance' };
            field.cast({ foo: 'bar' }, instance, { forSave: true });
            expect(forSave, 'was called on', instance);
          });

          it('calls the function with raw sql values', function() {
            const forSave = sinon.spy();
            const field = new Field({
              name: 'foo',
              model: Model,
              type: 'json',
              cast: { forSave }
            });
            field.cast(sql('foo'), 'a model instance', { forSave: true });
            expect(forSave, 'was called with', sql('foo'));
          });
        });
      });

      describe('forFetch', () => {
        it('parses values', () => {
          const field = new Field({ name: 'foo', model: Model, type: 'json' });
          expect(
            field.cast(JSON.stringify({ foo: 'bar' }), null, {
              forFetch: true
            }),
            'to equal',
            { foo: 'bar' }
          );
        });

        it('does not parse `null` values', () => {
          const field = new Field({ name: 'foo', model: Model, type: 'json' });
          expect(field.cast(null, { forFetch: true }), 'to be undefined');
        });

        it('does nothing for already parsed values', () => {
          const field = new Field({ name: 'foo', model: Model, type: 'json' });
          expect(
            field.cast({ foo: 'bar' }, null, { forFetch: true }),
            'to be undefined'
          );
        });

        it('does nothing for already parsed string values', () => {
          const field = new Field({ name: 'foo', model: Model, type: 'json' });
          expect(
            field.cast('bar', null, { forFetch: true }),
            'to be undefined'
          );
        });

        it('parses json string values', () => {
          const field = new Field({ name: 'foo', model: Model, type: 'json' });
          expect(field.cast('"bar"', null, { forFetch: true }), 'to be', 'bar');
        });

        describe('with a forFetch cast function configured', () => {
          it('uses the configred function', () => {
            const field = new Field({
              name: 'foo',
              model: Model,
              type: 'jsonb',
              cast: {
                forFetch() {
                  return 'foo';
                }
              }
            });
            expect(
              field.cast({ foo: 'bar' }, null, { forFetch: true }),
              'to be',
              'foo'
            );
          });

          it('calls the function with `this` set to the model instance', () => {
            const forFetch = sinon.spy();
            const field = new Field({
              name: 'foo',
              model: Model,
              type: 'json',
              cast: { forFetch }
            });
            const instance = { model: 'instace' };
            field.cast({ foo: 'bar' }, instance, { forFetch: true });
            expect(forFetch, 'was called on', instance);
          });
        });
      });
    });

    // regression tests
    describe('with a forSave cast function configured for non-json fields', () => {
      it('uses the configred function for other field types', () => {
        const field = new Field({
          name: 'foo',
          model: Model,
          type: 'text',
          cast: {
            forSave() {
              return 'foo';
            }
          }
        });
        expect(field.cast('bar', null, { forSave: true }), 'to be', 'foo');
      });

      it('calls the function with `this` set to the model instance', () => {
        const forSave = sinon.spy();
        const field = new Field({
          name: 'foo',
          model: Model,
          type: 'string',
          cast: { forSave }
        });
        const instance = { model: 'instace' };
        field.cast('bar', instance, { forSave: true });
        expect(forSave, 'was called on', instance);
      });
    });
  });

  describe('PostgresQuery', () => {
    let User;
    let Image;
    let Query;

    before(async () => {
      const orm = knorm()
        .use(knormPostgres({ connection }))
        .use(knormRelations());

      Query = orm.Query;

      User = class extends orm.Model {};
      User.table = 'user';
      User.fields = {
        id: { type: 'integer', primary: true, updated: false },
        name: 'string'
      };

      Image = class extends orm.Model {};
      Image.table = 'image';
      Image.fields = {
        id: { type: 'integer', primary: true, updated: false },
        userId: { type: 'integer', references: User.fields.id }
      };

      await knex.schema.createTable('image', table => {
        table.increments().primary();
        table
          .integer('userId')
          .references('id')
          .inTable('user');
      });
    });

    afterEach(async () => {
      await knex.truncate('image');
      await knex.raw('TRUNCATE TABLE "user" RESTART IDENTITY CASCADE');
    });

    after(async () => knex.schema.dropTable('image'));

    it('enables `insert`', async () => {
      await expect(
        new Query(User).insert({ id: 1, name: 'foo' }),
        'to be fulfilled with value satisfying',
        [{ id: 1, name: 'foo' }]
      );
      await expect(knex, 'with table', User.table, 'to have rows satisfying', [
        { id: 1, name: 'foo' }
      ]);
    });

    it('enables `update`', async () => {
      await new Query(User).insert({ id: 1, name: 'foo' });
      await expect(
        new Query(User).update({ id: 1, name: 'bar' }),
        'to be fulfilled with value satisfying',
        [{ id: 1, name: 'bar' }]
      );
      await expect(knex, 'with table', User.table, 'to have rows satisfying', [
        { id: 1, name: 'bar' }
      ]);
    });

    it('enables `fetch`', async () => {
      await new Query(User).insert({ id: 1, name: 'foo' });
      await expect(
        new Query(User).fetch(),
        'to be fulfilled with value satisfying',
        [{ id: 1, name: 'foo' }]
      );
    });

    it('enables `delete`', async () => {
      await new Query(User).insert({ id: 1, name: 'foo' });
      await expect(
        new Query(User).delete(),
        'to be fulfilled with value satisfying',
        [{ id: 1, name: 'foo' }]
      );
      await expect(knex, 'with table', User.table, 'to be empty');
    });

    it('allows running raw queries', async () => {
      await expect(
        new Query(User).query('select now() as now'),
        'to be fulfilled with value satisfying',
        [{ now: expect.it('to be a date') }]
      );
    });

    it('enables `returning`', async () => {
      await new Query(User).insert({ id: 1, name: 'foo' });
      await expect(
        new Query(User).returning('id').delete(),
        'to be fulfilled with value exhaustively satisfying',
        [{ id: 1 }]
      );
    });

    it('enables `ilike`', async () => {
      await new Query(User).insert([
        { id: 1, name: 'Foo' },
        { id: 2, name: 'foo' }
      ]);
      await expect(
        new Query(User).where(new Query.Where().ilike('name', 'Fo%')).fetch(),
        'to be fulfilled with value satisfying',
        [{ id: 1, name: 'Foo' }, { id: 2, name: 'foo' }]
      );
    });

    it('enables `limit`', async () => {
      await new Query(User).insert([
        { id: 1, name: 'foo' },
        { id: 2, name: 'bar' }
      ]);
      await expect(
        new Query(User).limit(1).fetch(),
        'to be fulfilled with value satisfying',
        [{ id: 1, name: 'foo' }]
      );
    });

    it('enables `offset`', async () => {
      await new Query(User).insert([
        { id: 1, name: 'foo' },
        { id: 2, name: 'bar' }
      ]);
      await expect(
        new Query(User).offset(1).fetch(),
        'to be fulfilled with value satisfying',
        [{ id: 2, name: 'bar' }]
      );
    });

    it('supports `limit: 0`', async () => {
      await new Query(User).insert([
        { id: 1, name: 'foo' },
        { id: 2, name: 'bar' }
      ]);
      await expect(
        new Query(User).limit(0).fetch(),
        'to be fulfilled with value satisfying',
        []
      );
    });

    it('supports `offset: 0`', async () => {
      await new Query(User).insert([
        { id: 1, name: 'foo' },
        { id: 2, name: 'bar' }
      ]);
      const spy = sinon.spy(Query.prototype, 'query');
      await expect(
        new Query(User).offset(0).fetch(),
        'to be fulfilled with value satisfying',
        [{ id: 1, name: 'foo' }, { id: 2, name: 'bar' }]
      );
      await expect(spy, 'to have calls satisfying', () => {
        spy(
          expect.it(
            'when passed as parameter to',
            query => query.toString(),
            'to contain',
            'OFFSET 0'
          )
        );
      });
      spy.restore();
    });

    it('adds `limit` for `fetch` when `first` is true', async () => {
      await new Query(User).insert({ id: 1, name: 'foo' });
      const spy = sinon.spy(Query.prototype, 'query');
      await expect(
        new Query(User).first().fetch(),
        'to be fulfilled with value satisfying',
        { id: 1, name: 'foo' }
      );
      await expect(spy, 'to have calls satisfying', () => {
        spy(
          expect.it(
            'when passed as parameter to',
            query => query.toString(),
            'to contain',
            'LIMIT 1'
          )
        );
      });
      spy.restore();
    });

    it('allows updating all rows', async () => {
      await new Query(User).insert([
        { id: 1, name: 'foo' },
        { id: 2, name: 'bar' }
      ]);
      await expect(
        new Query(User).update({ name: 'bar' }),
        'to be fulfilled with sorted rows satisfying',
        [{ id: 1, name: 'bar' }, { id: 2, name: 'bar' }]
      );
      await expect(
        knex,
        'with table',
        User.table,
        'to have sorted rows satisfying',
        [{ id: 1, name: 'bar' }, { id: 2, name: 'bar' }]
      );
    });

    it('allows updates with a `where` clause', async () => {
      await new Query(User).insert([
        { id: 1, name: 'foo' },
        { id: 2, name: 'foo' }
      ]);
      await expect(
        new Query(User).update({ name: 'bar' }, { where: { id: 1 } }),
        'to be fulfilled with sorted rows satisfying',
        [{ id: 1, name: 'bar' }]
      );
      await expect(
        knex,
        'with table',
        User.table,
        'to have sorted rows satisfying',
        [{ id: 1, name: 'bar' }, { id: 2, name: 'foo' }]
      );
    });

    it('does not update fields `updated: false` fields', async () => {
      const user = await new Query(User).first().insert({ id: 1, name: 'foo' });
      const spy = sinon.spy(Query.prototype, 'query');
      user.name = 'bar';
      await expect(user, 'to satisfy', { id: 1 });
      await new Query(User).update(user);
      await expect(spy, 'to have calls satisfying', () => {
        spy(
          expect.it(
            'when passed as parameter to',
            query => query.toString(),
            'to begin with',
            'UPDATE "user" SET "name" = "v"."name" FROM'
          )
        );
      });
      spy.restore();
    });

    it('allows updating with raw sql values', async () => {
      await new Query(User).insert([{ id: 1, name: 'foo' }]);
      const query = new Query(User);
      await expect(
        query.update({ name: query.sql(`upper("name")`) }),
        'to be fulfilled with sorted rows satisfying',
        [{ id: 1, name: 'FOO' }]
      );
      await expect(
        knex,
        'with table',
        User.table,
        'to have sorted rows satisfying',
        [{ id: 1, name: 'FOO' }]
      );
    });

    it('ignores `limit` and `offset` for inserts', async () => {
      const query = new Query(User).limit(1).offset(2);
      await expect(
        query.insert([{ id: 1, name: 'foo' }]),
        'to be fulfilled with sorted rows satisfying',
        [{ id: 1, name: 'foo' }]
      );
    });

    it('ignores `limit` and `offset` for updates', async () => {
      await new Query(User).insert([{ id: 1, name: 'foo' }]);
      const query = new Query(User).limit(1).offset(2);
      await expect(
        query.update({ id: 1, name: 'bar' }),
        'to be fulfilled with sorted rows satisfying',
        [{ id: 1, name: 'bar' }]
      );
    });

    it('ignores `limit` and `offset` for deletes', async () => {
      await new Query(User).insert([{ id: 1, name: 'foo' }]);
      const query = new Query(User).limit(1).offset(2);
      await expect(
        query.delete(),
        'to be fulfilled with sorted rows satisfying',
        [{ id: 1, name: 'foo' }]
      );
    });

    describe('for field updates', () => {
      let Model;
      let Query;

      const createTable = addFields =>
        knex.schema.createTable('foo', table => {
          table.increments().primary();
          addFields(table);
        });

      before(async () => {
        const orm = knorm().use(knormPostgres({ connection }));
        Query = orm.Query;
        Model = orm.Model;
        Model.fields = {
          id: { type: 'integer', primary: true, updated: false }
        };
      });

      afterEach(async () => knex.schema.dropTable('foo'));

      it('allows updating `date` fields', async () => {
        const toUtc = date =>
          new Date(
            date.getUTCFullYear(),
            date.getUTCMonth(),
            date.getUTCDate(),
            date.getUTCHours(),
            date.getUTCMinutes(),
            date.getUTCSeconds()
          );

        await createTable(table => {
          table.date('date');
        });

        class Foo extends Model {}
        Foo.table = 'foo';
        Foo.fields = { date: 'date' };

        await new Query(Foo).insert({ id: 1, date: new Date('2018-08-07') });
        await expect(
          new Query(Foo).update({ id: 1, date: new Date('2018-05-08') }),
          'to be fulfilled with sorted rows satisfying',
          [{ id: 1, date: toUtc(new Date('2018-05-08')) }]
        );
        await expect(
          new Query(Foo).update({ id: 1, date: null }),
          'to be fulfilled with sorted rows satisfying',
          [{ id: 1, date: null }]
        );
      });

      it('allows updating `dateTime` fields', async () => {
        await createTable(table => {
          table.dateTime('dateTime');
        });

        class Foo extends Model {}
        Foo.table = 'foo';
        Foo.fields = { dateTime: 'dateTime' };

        await new Query(Foo).insert({ id: 1, dateTime: new Date(1000) });
        await expect(
          new Query(Foo).update({ id: 1, dateTime: new Date(2000) }),
          'to be fulfilled with sorted rows satisfying',
          [{ id: 1, dateTime: new Date(2000) }]
        );
        await expect(
          new Query(Foo).update({ id: 1, dateTime: null }),
          'to be fulfilled with sorted rows satisfying',
          [{ id: 1, dateTime: null }]
        );
      });

      it('allows updating `integer` fields', async () => {
        await createTable(table => {
          table.integer('integer');
        });

        class Foo extends Model {}
        Foo.table = 'foo';
        Foo.fields = { integer: 'integer' };

        await new Query(Foo).insert({ id: 1, integer: 10 });
        await expect(
          new Query(Foo).update({ id: 1, integer: 20 }),
          'to be fulfilled with sorted rows satisfying',
          [{ id: 1, integer: 20 }]
        );
        await expect(
          new Query(Foo).update({ id: 1, integer: null }),
          'to be fulfilled with sorted rows satisfying',
          [{ id: 1, integer: null }]
        );
      });

      it('allows updating `json` fields', async () => {
        await createTable(table => {
          table.json('json');
        });

        class Foo extends Model {}
        Foo.table = 'foo';
        Foo.fields = { json: 'json' };

        await new Query(Foo).insert({ id: 1, json: '"foo"' });
        await expect(
          new Query(Foo).update({ id: 1, json: '"bar"' }),
          'to be fulfilled with sorted rows satisfying',
          [{ id: 1, json: 'bar' }]
        );
        await expect(
          new Query(Foo).update({ id: 1, json: null }),
          'to be fulfilled with sorted rows satisfying',
          [{ id: 1, json: null }]
        );
      });

      it('allows updating `jsonb` fields', async () => {
        await createTable(table => {
          table.jsonb('jsonb');
        });

        class Foo extends Model {}
        Foo.table = 'foo';
        Foo.fields = { jsonb: 'jsonb' };

        await new Query(Foo).insert({ id: 1, jsonb: { foo: 'foo' } });
        await expect(
          new Query(Foo).update({ id: 1, jsonb: { foo: 'bar' } }),
          'to be fulfilled with sorted rows satisfying',
          [{ id: 1, jsonb: { foo: 'bar' } }]
        );
        await expect(
          new Query(Foo).update({ id: 1, jsonb: null }),
          'to be fulfilled with sorted rows satisfying',
          [{ id: 1, jsonb: null }]
        );
      });

      it('allows updating `text` fields', async () => {
        await createTable(table => {
          table.text('text');
        });

        class Foo extends Model {}
        Foo.table = 'foo';
        Foo.fields = { text: 'text' };

        await new Query(Foo).insert({ id: 1, text: 'foo' });
        await expect(
          new Query(Foo).update({ id: 1, text: 'bar' }),
          'to be fulfilled with sorted rows satisfying',
          [{ id: 1, text: 'bar' }]
        );
        await expect(
          new Query(Foo).update({ id: 1, text: null }),
          'to be fulfilled with sorted rows satisfying',
          [{ id: 1, text: null }]
        );
      });

      it('allows updating `string` fields', async () => {
        await createTable(table => {
          table.string('string');
        });

        class Foo extends Model {}
        Foo.table = 'foo';
        Foo.fields = { string: 'string' };

        await new Query(Foo).insert({ id: 1, string: 'foo' });
        await expect(
          new Query(Foo).update({ id: 1, string: 'bar' }),
          'to be fulfilled with sorted rows satisfying',
          [{ id: 1, string: 'bar' }]
        );
        await expect(
          new Query(Foo).update({ id: 1, string: null }),
          'to be fulfilled with sorted rows satisfying',
          [{ id: 1, string: null }]
        );
      });

      it('allows updating `binary` fields', async () => {
        await createTable(table => {
          table.binary('binary');
        });

        class Foo extends Model {}
        Foo.table = 'foo';
        Foo.fields = { binary: 'binary' };

        await new Query(Foo).insert({ id: 1, binary: Buffer.from('foo') });
        await expect(
          new Query(Foo).update({ id: 1, binary: Buffer.from('bar') }),
          'to be fulfilled with sorted rows satisfying',
          [{ id: 1, binary: Buffer.from('bar') }]
        );
        await expect(
          new Query(Foo).update({ id: 1, binary: null }),
          'to be fulfilled with sorted rows satisfying',
          [{ id: 1, binary: null }]
        );
      });

      it('allows updating `decimal` fields', async () => {
        await createTable(table => {
          table.decimal('decimal');
        });

        class Foo extends Model {}
        Foo.table = 'foo';
        Foo.fields = { decimal: 'decimal' };

        await new Query(Foo).insert({ id: 1, decimal: 1.2 });
        await expect(
          new Query(Foo).update([{ id: 1, decimal: 1.2 }]),
          'to be fulfilled with sorted rows satisfying',
          [{ id: 1, decimal: '1.20' }]
        );
        await expect(
          new Query(Foo).update({ id: 1, decimal: null }),
          'to be fulfilled with sorted rows satisfying',
          [{ id: 1, decimal: null }]
        );
      });

      it('allows updating `boolean` fields', async () => {
        await createTable(table => {
          table.boolean('boolean');
        });

        class Foo extends Model {}
        Foo.table = 'foo';
        Foo.fields = { boolean: 'boolean' };

        await new Query(Foo).insert({ id: 1, boolean: false });
        await expect(
          new Query(Foo).update({ id: 1, boolean: true }),
          'to be fulfilled with sorted rows satisfying',
          [{ id: 1, boolean: true }]
        );
        await expect(
          new Query(Foo).update({ id: 1, boolean: null }),
          'to be fulfilled with sorted rows satisfying',
          [{ id: 1, boolean: null }]
        );
      });
    });

    describe('for multi-updates', () => {
      it('runs a single query', async () => {
        await new Query(User).insert([
          { id: 1, name: 'foo' },
          { id: 2, name: 'bar' }
        ]);
        const spy = sinon.spy(Query.prototype, 'query');
        await expect(
          new Query(User).update([
            { id: 1, name: 'foofoo' },
            { id: 2, name: 'barbar' }
          ]),
          'to be fulfilled with value satisfying',
          [{ id: 1, name: 'foofoo' }, { id: 2, name: 'barbar' }]
        );
        await expect(
          knex,
          'with table',
          User.table,
          'to have rows satisfying',
          [{ id: 1, name: 'foofoo' }, { id: 2, name: 'barbar' }]
        );
        await expect(spy, 'was called once');
        spy.restore();
      });

      it('respects `batchSize`', async () => {
        await new Query(User).insert([
          { id: 1, name: 'foo' },
          { id: 2, name: 'bar' }
        ]);
        const spy = sinon.spy(Query.prototype, 'query');
        await expect(
          new Query(User)
            .batchSize(1)
            .update([{ id: 1, name: 'foofoo' }, { id: 2, name: 'barbar' }]),
          'to be fulfilled with value satisfying',
          [{ id: 1, name: 'foofoo' }, { id: 2, name: 'barbar' }]
        );
        await expect(
          knex,
          'with table',
          User.table,
          'to have rows satisfying',
          [{ id: 1, name: 'foofoo' }, { id: 2, name: 'barbar' }]
        );
        await expect(spy, 'was called twice');
        spy.restore();
      });

      it('does not update fields `updated: false` fields', async () => {
        await new Query(User).insert([
          { id: 1, name: 'foo' },
          { id: 2, name: 'bar' }
        ]);
        const spy = sinon.spy(Query.prototype, 'query');
        await new Query(User).update([
          { id: 1, name: 'foofoo' },
          { id: 2, name: 'barbar' }
        ]);
        await expect(spy, 'to have calls satisfying', () => {
          spy(
            expect.it(
              'when passed as parameter to',
              query => query.toString(),
              'to begin with',
              'UPDATE "user" SET "name" = "v"."name" FROM'
            )
          );
        });
        spy.restore();
      });

      it('formats fields to columns', async () => {
        class OtherUser extends User {}
        OtherUser.fields = {
          ID: { type: 'integer', primary: true, updated: false, column: 'id' },
          NAME: { type: 'string', column: 'name' }
        };
        await new Query(OtherUser).insert([
          { ID: 1, NAME: 'foo' },
          { ID: 2, NAME: 'bar' }
        ]);
        await expect(
          new Query(OtherUser).update([
            { ID: 1, NAME: 'foofoo' },
            { ID: 2, NAME: 'barbar' }
          ]),
          'to be fulfilled with value satisfying',
          [{ ID: 1, NAME: 'foofoo' }, { ID: 2, NAME: 'barbar' }]
        );
      });

      it('allows updating with raw sql values', async () => {
        await new Query(User).insert([
          { id: 1, name: 'foo' },
          { id: 2, name: 'bar' }
        ]);
        const query = new Query(User);
        await expect(
          query.update([
            { id: 1, name: query.sql(`upper('foo')`) },
            { id: 2, name: query.sql(`upper('bar')`) }
          ]),
          'to be fulfilled with sorted rows satisfying',
          [{ id: 1, name: 'FOO' }, { id: 2, name: 'BAR' }]
        );
        await expect(
          knex,
          'with table',
          User.table,
          'to have sorted rows satisfying',
          [{ id: 1, name: 'FOO' }, { id: 2, name: 'BAR' }]
        );
      });

      it('supports model `schema`', async () => {
        class OtherUser extends User {}
        OtherUser.schema = 'public';
        await new Query(OtherUser).insert([
          { id: 1, name: 'foo' },
          { id: 2, name: 'bar' }
        ]);
        const spy = sinon.spy(Query.prototype, 'query');
        await expect(
          new Query(OtherUser).update([
            { id: 1, name: 'foofoo' },
            { id: 2, name: 'barbar' }
          ]),
          'to be fulfilled with value satisfying',
          [{ id: 1, name: 'foofoo' }, { id: 2, name: 'barbar' }]
        );
        await expect(spy, 'to have calls satisfying', () => {
          spy(
            expect.it(
              'when passed as parameter to',
              sql => sql.toString(),
              'to contain',
              '"public"."user"'
            )
          );
        });
        spy.restore();
      });
    });

    describe('save', () => {
      describe('with an array', () => {
        it('supports `insert`', async () => {
          const insert = sinon.spy(Query.prototype, 'insert');
          await expect(
            new Query(User).save([{ name: 'foo' }, { name: 'bar' }]),
            'to be fulfilled with sorted rows satisfying',
            [new User({ id: 1, name: 'foo' }), new User({ id: 2, name: 'bar' })]
          );
          await expect(
            knex,
            'with table',
            User.table,
            'to have sorted rows satisfying',
            [{ id: 1, name: 'foo' }, { id: 2, name: 'bar' }]
          );
          await expect(insert, 'to have calls satisfying', () => {
            // options are undefined
            insert([{ name: 'foo' }, { name: 'bar' }], undefined);
          });
          insert.restore();
        });

        it('supports `update`', async () => {
          await new Query(User).insert([
            { id: 1, name: 'foo' },
            { id: 2, name: 'bar' }
          ]);
          const update = sinon.spy(Query.prototype, 'update');
          await expect(
            new Query(User).save([
              { id: 1, name: 'foofoo' },
              { id: 2, name: 'barbar' }
            ]),
            'to be fulfilled with sorted rows satisfying',
            [
              new User({ id: 1, name: 'foofoo' }),
              new User({ id: 2, name: 'barbar' })
            ]
          );
          await expect(
            knex,
            'with table',
            User.table,
            'to have sorted rows satisfying',
            [{ id: 1, name: 'foofoo' }, { id: 2, name: 'barbar' }]
          );
          await expect(update, 'to have calls satisfying', () => {
            // options are undefined
            update([{ name: 'foofoo' }, { name: 'barbar' }], undefined);
          });
          update.restore();
        });

        it('supports both `insert` and `update`', async () => {
          await new Query(User).insert([{ name: 'foo' }]);
          const insert = sinon.spy(Query.prototype, 'insert');
          const update = sinon.spy(Query.prototype, 'update');
          await expect(
            new Query(User).save([{ id: 1, name: 'foofoo' }, { name: 'bar' }]),
            'to be fulfilled with sorted rows satisfying',
            [{ id: 1, name: 'foofoo' }, { id: 2, name: 'bar' }]
          );
          await expect(
            knex,
            'with table',
            User.table,
            'to have sorted rows satisfying',
            [{ id: 1, name: 'foofoo' }, { id: 2, name: 'bar' }]
          );
          await expect(insert, 'to have calls satisfying', () => {
            // options are undefined
            insert([{ name: 'bar' }], undefined);
          });
          await expect(update, 'to have calls satisfying', () => {
            // options are undefined
            update([{ id: 1, name: 'foofoo' }], undefined);
          });
          insert.restore();
          update.restore();
        });

        it('passes options to both `insert` and `update`', async () => {
          await new Query(User).insert([{ name: 'foo' }]);
          await expect(
            new Query(User)
              .returning('id')
              .save([{ id: 1, name: 'foofoo' }, { name: 'bar' }]),
            'to be fulfilled with sorted rows exhaustively satisfying',
            [{ id: 1 }, { id: 2 }]
          );
        });

        it('supports `first` with insert', async () => {
          await expect(
            new Query(User).save([{ name: 'foo' }, { name: 'bar' }], {
              first: true
            }),
            'to be fulfilled with value satisfying',
            new User({ id: 1, name: 'foo' })
          );
          await expect(
            knex,
            'with table',
            User.table,
            'to have sorted rows satisfying',
            [{ id: 1, name: 'foo' }, { id: 2, name: 'bar' }]
          );
        });

        it('supports `first` with `update`', async () => {
          await new Query(User).insert([
            { id: 1, name: 'foo' },
            { id: 2, name: 'bar' }
          ]);
          await expect(
            new Query(User).save(
              [{ id: 1, name: 'foofoo' }, { id: 2, name: 'barbar' }],
              { first: true }
            ),
            'to be fulfilled with value satisfying',
            new User({ id: 1, name: 'foofoo' })
          );
          await expect(
            knex,
            'with table',
            User.table,
            'to have sorted rows satisfying',
            [{ id: 1, name: 'foofoo' }, { id: 2, name: 'barbar' }]
          );
        });

        it('supports `first` with both `update` and `insert`', async () => {
          await new Query(User).insert([{ name: 'foo' }]);
          await expect(
            new Query(User).save([{ id: 1, name: 'foofoo' }, { name: 'bar' }], {
              first: true
            }),
            'to be fulfilled with value satisfying',
            { id: 2, name: 'bar' }
          );
          await expect(
            knex,
            'with table',
            User.table,
            'to have sorted rows satisfying',
            [{ id: 1, name: 'foofoo' }, { id: 2, name: 'bar' }]
          );
        });
      });

      describe('with a single object', () => {
        it('supports `insert`', async () => {
          await expect(
            new Query(User).save({ name: 'foo' }),
            'to be fulfilled with sorted rows satisfying',
            [{ id: 1, name: 'foo' }]
          );
          await expect(
            knex,
            'with table',
            User.table,
            'to have sorted rows satisfying',
            [{ id: 1, name: 'foo' }]
          );
        });

        it('supports `first` with `insert`', async () => {
          await expect(
            new Query(User).save({ name: 'foo' }, { first: true }),
            'to be fulfilled with value satisfying',
            { id: 1, name: 'foo' }
          );
          await expect(
            knex,
            'with table',
            User.table,
            'to have sorted rows satisfying',
            [{ id: 1, name: 'foo' }]
          );
        });

        it('supports `update`', async () => {
          await new Query(User).insert([{ id: 1, name: 'foo' }]);
          await expect(
            new Query(User).save({ id: 1, name: 'foofoo' }),
            'to be fulfilled with sorted rows satisfying',
            [{ id: 1, name: 'foofoo' }]
          );
          await expect(
            knex,
            'with table',
            User.table,
            'to have sorted rows satisfying',
            [{ id: 1, name: 'foofoo' }]
          );
        });

        it('supports `first` with `update`', async () => {
          await new Query(User).insert([{ id: 1, name: 'foo' }]);
          await expect(
            new Query(User).save({ id: 1, name: 'foofoo' }, { first: true }),
            'to be fulfilled with value satisfying',
            { id: 1, name: 'foofoo' }
          );
          await expect(
            knex,
            'with table',
            User.table,
            'to have sorted rows satisfying',
            [{ id: 1, name: 'foofoo' }]
          );
        });
      });
    });

    describe('for joined queries (via @knorm/relations)', () => {
      it('does not add `limit` if `first` is configured on the join', async () => {
        await new Query(User).insert([
          { id: 1, name: 'foo' },
          { id: 2, name: 'bar' }
        ]);
        await new Query(Image).insert([
          { id: 1, userId: 1 },
          { id: 2, userId: 1 }
        ]);
        await expect(
          new Query(User).leftJoin(new Query(Image).first()).fetch(),
          'to be fulfilled with sorted rows exhaustively satisfying',
          [
            { id: 1, name: 'foo', image: { id: 1 } },
            { id: 2, name: 'bar', image: null }
          ]
        );
      });

      it('ignores `limit` on the join', async () => {
        await new Query(User).insert([
          { id: 1, name: 'foo' },
          { id: 2, name: 'bar' }
        ]);
        await new Query(Image).insert([
          { id: 1, userId: 1 },
          { id: 2, userId: 1 }
        ]);
        await expect(
          new Query(User).leftJoin(new Query(Image).limit(1)).fetch(),
          'to be fulfilled with sorted rows exhaustively satisfying',
          [
            { id: 1, name: 'foo', image: [{ id: 1 }, { id: 2 }] },
            { id: 2, name: 'bar', image: null }
          ]
        );
      });

      it('ignores `offset` on the join', async () => {
        await new Query(User).insert([
          { id: 1, name: 'foo' },
          { id: 2, name: 'bar' }
        ]);
        await new Query(Image).insert([
          { id: 1, userId: 1 },
          { id: 2, userId: 1 }
        ]);
        await expect(
          new Query(User).leftJoin(new Query(Image).offset(1)).fetch(),
          'to be fulfilled with sorted rows exhaustively satisfying',
          [
            { id: 1, name: 'foo', image: [{ id: 1 }, { id: 2 }] },
            { id: 2, name: 'bar', image: null }
          ]
        );
      });
    });

    describe('for json/jsonb field updates', function() {
      const { Model } = knorm().use(knormPostgres({ connection }));

      class Foo extends Model {}
      Foo.table = 'foo';
      Foo.fields = {
        id: { type: 'integer', primary: true, updated: false, methods: true },
        jsonb: { type: 'jsonb' },
        json: { type: 'json' }
      };

      before(async () => {
        await knex.schema.createTable(Foo.table, table => {
          table.increments().primary();
          table.jsonb('jsonb');
          table.json('json');
        });
      });

      after(async () => {
        await knex.schema.dropTable(Foo.table);
      });

      beforeEach(async () => {
        const data = {
          string: 'foo',
          number: 1,
          array: ['foo', 'bar'],
          object: { string: 'foo', number: 1, array: ['foo', 'bar'] }
        };
        await new Query(Foo).insert({ id: 1, jsonb: data, json: data });
      });

      afterEach(async () => {
        await knex(Foo.table).truncate();
      });

      it('updates the whole object by default', async () => {
        const query = new Query(Foo).where({ id: 1 }).first();
        await expect(
          query.update({ jsonb: { foo: 'bar' }, json: { foo: 'bar' } }),
          'to be fulfilled with value exhaustively satisfying',
          new Foo({ id: 1, jsonb: { foo: 'bar' }, json: { foo: 'bar' } })
        );
      });

      describe('with `patch` configured', () => {
        it('updates a single path', async () => {
          const query = new Query(Foo)
            .where({ id: 1 })
            .first()
            .patch()
            .debug();
          const data = {
            string: 'bar',
            number: 1,
            array: ['foo', 'bar'],
            object: { string: 'foo', number: 1, array: ['foo', 'bar'] }
          };
          await expect(
            query.update({ jsonb: { string: 'bar' }, json: { string: 'bar' } }),
            'to be fulfilled with value exhaustively satisfying',
            new Foo({ id: 1, jsonb: data, json: data })
          );
        });

        it('updates multiple paths', async () => {
          const query = new Query(Foo)
            .where({ id: 1 })
            .first()
            .patch();
          const data = {
            string: 'bar',
            number: 2,
            array: ['foo', 'bar'],
            object: { string: 'bar', number: 2, array: ['bar'] }
          };
          await expect(
            query.update({ jsonb: data, json: data }),
            'to be fulfilled with value exhaustively satisfying',
            new Foo({ id: 1, jsonb: data, json: data })
          );
        });

        it('creates missing paths', async () => {
          const query = new Query(Foo)
            .where({ id: 1 })
            .first()
            .patch();
          const data = {
            string: 'foo',
            number: 1,
            array: ['foo', 'bar'],
            missing: 'bar',
            object: { string: 'foo', number: 1, array: ['foo', 'bar'] }
          };
          await expect(
            query.update({
              jsonb: { missing: 'bar' },
              json: { missing: 'bar' }
            }),
            'to be fulfilled with value exhaustively satisfying',
            new Foo({ id: 1, jsonb: data, json: data })
          );
        });

        it('allows specifying a single field to patch', async () => {
          const query = new Query(Foo)
            .where({ id: 1 })
            .first()
            .patch('json');
          await expect(
            query.update({
              jsonb: { array: ['bar'] },
              json: { array: ['foo'] }
            }),
            'to be fulfilled with value exhaustively satisfying',
            new Foo({
              id: 1,
              jsonb: {
                array: ['bar']
              },
              json: {
                string: 'foo',
                number: 1,
                array: ['foo'],
                object: { string: 'foo', number: 1, array: ['foo', 'bar'] }
              }
            })
          );
        });

        it('allows specifying multiple fields to patch', async () => {
          const query = new Query(Foo)
            .where({ id: 1 })
            .first()
            .patch(['json', 'jsonb']);
          await expect(
            query.update({
              jsonb: { array: ['bar'] },
              json: { array: ['foo'] }
            }),
            'to be fulfilled with value exhaustively satisfying',
            new Foo({
              id: 1,
              jsonb: {
                string: 'foo',
                number: 1,
                array: ['bar'],
                object: { string: 'foo', number: 1, array: ['foo', 'bar'] }
              },
              json: {
                string: 'foo',
                number: 1,
                array: ['foo'],
                object: { string: 'foo', number: 1, array: ['foo', 'bar'] }
              }
            })
          );
        });

        it('allows patching with `jsonb_set` raw sql', async () => {
          const query = new Query(Foo)
            .where({ id: 1 })
            .first()
            .patch();
          await expect(
            query.update({
              jsonb: query.sql(
                `jsonb_set("jsonb", '{object,array,0}', '"bar"')`
              ),
              json: query.sql(
                `jsonb_set("json"::jsonb, '{object,array,1}', '"foo"')::json`
              )
            }),
            'to be fulfilled with value exhaustively satisfying',
            new Foo({
              id: 1,
              jsonb: {
                string: 'foo',
                number: 1,
                array: ['foo', 'bar'],
                object: {
                  string: 'foo',
                  number: 1,
                  array: ['bar', 'bar']
                }
              },
              json: {
                string: 'foo',
                number: 1,
                array: ['foo', 'bar'],
                object: {
                  string: 'foo',
                  number: 1,
                  array: ['foo', 'foo']
                }
              }
            })
          );
        });

        it('throws if the patch value is a non-object', async () => {
          const query = new Query(Foo)
            .where({ id: 1 })
            .first()
            .patch();
          await expect(
            query.update({
              jsonb: 'string',
              json: { array: ['foo'] }
            }),
            'to be rejected with error satisfying',
            new Query.QueryError(
              'Foo: cannot patch field `jsonb` (JSON patching is only supported for objects)'
            )
          );
        });

        it('throws if the patch value is an array', async () => {
          const query = new Query(Foo)
            .where({ id: 1 })
            .first()
            .patch();
          await expect(
            query.update({
              jsonb: { array: ['foo'] },
              json: ['foo']
            }),
            'to be rejected with error satisfying',
            new Query.QueryError(
              'Foo: cannot patch field `json` (JSON patching is only supported for objects)'
            )
          );
        });
      });
    });

    describe('for query hooks', () => {
      it('calls `beforeQuery`', async () => {
        const query = new Query(User);
        const spy = sinon.spy(query, 'beforeQuery');
        await query.fetch();
        await expect(spy, 'to have calls satisfying', () => {
          spy(expect.it('to be a', Client), expect.it('to be a', sql.select));
        });
      });

      it('allows `beforeQuery` to change the sql when running raw sql', async () => {
        await new Query(User).insert({ id: 1, name: 'foo' });
        const query = new Query(User);
        sinon
          .stub(query, 'beforeQuery')
          .returns(sql.select(['id as "user.id"']).from('user'));
        await expect(
          query.fetch(),
          'to be fulfilled with value exhaustively satisfying',
          [new User({ id: 1 })]
        );
      });

      it('calls `beforeQuery` when running raw sql', async () => {
        const query = new Query(User);
        const spy = sinon.spy(query, 'beforeQuery');
        await query.query('select now()');
        await expect(spy, 'to have calls satisfying', () => {
          spy(expect.it('to be a', Client), 'select now()');
        });
      });

      it('allows `beforeQuery` to change the sql when running raw sql', async () => {
        const query = new Query(User);
        sinon.stub(query, 'beforeQuery').returns('select now() as "newDate"');
        await expect(
          query.query('select now() as "oldDate"'),
          'to be fulfilled with value exhaustively satisfying',
          [new User({ newDate: expect.it('to be a', Date) })]
        );
      });

      it('calls `afterQuery`', async () => {
        await new Query(User).insert({ id: 1, name: 'foo' });
        const query = new Query(User);
        const spy = sinon.spy(query, 'afterQuery');
        await query.fetch();
        await expect(spy, 'to have calls satisfying', () => {
          spy(expect.it('to be a', Client), expect.it('to be a', sql.select), {
            command: 'SELECT',
            rowCount: 1,
            rows: [{ 'user.id': 1, 'user.name': 'foo' }]
          });
        });
      });

      it('allows `afterQuery` to change the query result', async () => {
        const query = new Query(User);
        sinon
          .stub(query, 'afterQuery')
          .returns({ rows: [{ 'user.id': 'foo' }] });
        await expect(
          query.fetch(),
          'to be fulfilled with value exhaustively satisfying',
          [new User({ id: 'foo' })]
        );
      });
    });
  });

  describe('PostgresTransaction', () => {
    let User;
    let plugin;
    let Transaction;

    before(async () => {
      plugin = knormPostgres({ connection });
      const orm = knorm().use(plugin);

      Transaction = orm.Transaction;

      User = class extends orm.Model {};
      User.table = 'user';
      User.fields = {
        id: { type: 'integer', primary: true, updated: false },
        name: 'string'
      };
    });

    afterEach(async () => knex(User.table).truncate());

    describe('with a callback function', () => {
      it('rejects if `execute` is called without a callback', async () => {
        await expect(
          new Transaction().execute(),
          'to be rejected with error satisfying',
          new Transaction.TransactionError('no callback provided')
        );
        await expect(
          new Transaction(),
          'to be rejected with error satisfying',
          new Transaction.TransactionError('no callback provided')
        );
      });

      it('enables scoped model operations', async () => {
        await new Transaction(async function() {
          await this.models.User.insert([{ id: 1, name: 'foo' }]);
        });
        await expect(
          knex,
          'with table',
          User.table,
          'to have sorted rows satisfying',
          [{ id: 1, name: 'foo' }]
        );
      });

      it('enables scoped query operations', async () => {
        await new Transaction(async function() {
          await new this.Query(this.models.User).insert([
            { id: 1, name: 'foo' }
          ]);
        });
        await expect(
          knex,
          'with table',
          User.table,
          'to have sorted rows satisfying',
          [{ id: 1, name: 'foo' }]
        );
      });

      it('enables running raw scoped queries', async () => {
        await expect(
          new Transaction(async function() {
            return new this.Query(this.models.User).query(
              'select now() as now'
            );
          }),
          'to be fulfilled with value satisfying',
          [{ now: expect.it('to be a date') }]
        );
      });

      it('enables running multiple queries in a transaction', async () => {
        await new Transaction(async function() {
          await this.models.User.insert([{ id: 1, name: 'foo' }]);
          await this.models.User.insert([{ id: 2, name: 'bar' }]);
          await this.models.User.update([{ id: 1, name: 'foofoo' }]);
        });
        await expect(
          knex,
          'with table',
          User.table,
          'to have sorted rows satisfying',
          [{ id: 1, name: 'foofoo' }, { id: 2, name: 'bar' }]
        );
      });

      it('rolls back a transaction on failure', async () => {
        await expect(
          new Transaction(async function() {
            await this.models.User.insert([{ id: 1, name: 'foo' }]);
            await this.models.User.insert([{ id: 1, name: 'bar' }]); // primary key error
          }),
          'to be rejected'
        );
        await expect(knex, 'with table', User.table, 'to be empty');
      });

      it('resolves the transaction with the results from the callback', async () => {
        await expect(
          new Transaction(async () => ({ foo: 'bar' })),
          'to be fulfilled with value satisfying',
          { foo: 'bar' }
        );
      });

      it('rejects the transaction with the error from the callback', async () => {
        await expect(
          new Transaction(async () => {
            throw new Error('foo');
          }),
          'to be rejected with error satisfying',
          new Error('foo')
        );
      });

      it('runs queries with one client', async () => {
        const spy = sinon.spy(plugin, 'acquireClient');
        await new Transaction(async function() {
          await this.models.User.insert([{ id: 1, name: 'foo' }]);
          await this.models.User.insert([{ id: 2, name: 'bar' }]);
        });
        await expect(spy, 'was called once');
        spy.restore();
      });

      it('runs queries with one client even with nested models', async () => {
        const spy = sinon.spy(plugin, 'acquireClient');
        await new Transaction(async function() {
          class FooUser extends this.models.User {
            async foo() {
              await this.models.User.insert([{ id: 1, name: 'foo' }]);
              await this.models.User.insert([{ id: 2, name: 'bar' }]);
            }
          }
          await new FooUser().foo();
          await this.models.User.update([{ id: 1, name: 'foofoo' }]);
        });
        await expect(
          knex,
          'with table',
          User.table,
          'to have sorted rows satisfying',
          [{ id: 1, name: 'foofoo' }, { id: 2, name: 'bar' }]
        );
        await expect(spy, 'was called once');
        spy.restore();
      });

      it('releases the client after runnning queries', async () => {
        const spy = sinon.spy(Transaction.prototype, 'releaseClient');
        await new Transaction(async function() {
          await this.models.User.insert([{ id: 1, name: 'foo' }]);
          await this.models.User.insert([{ id: 2, name: 'bar' }]);
        });
        await expect(spy, 'was called once');
        spy.restore();
      });

      it('passes the transaction to the callback', async () => {
        const spy = sinon.spy().named('transaction');
        const transaction = new Transaction(spy);
        await transaction;
        await expect(spy, 'to have calls satisfying', () => spy(transaction));
      });

      it('releases the client if `BEGIN` fails', async () => {
        let client;
        const transaction = new Transaction(() => {});
        transaction._query = function(sql) {
          client = this.client;
          if (sql === 'BEGIN') {
            throw new Error('begin error');
          }
        };
        const spy = sinon.spy(transaction, '_query');
        await expect(
          transaction,
          'to be rejected with error satisfying',
          new Transaction.TransactionBeginError(new Error('begin error'))
        );
        await expect(
          () => client.release(),
          'to throw',
          new Error(
            'Release called on client which has already been released to the pool.'
          )
        );
        await expect(spy, 'to have calls satisfying', () => {
          spy('BEGIN');
          spy('ROLLBACK');
        });
      });

      it('releases the client if the transaction fails', async () => {
        let client;
        const transaction = new Transaction(() => {
          throw new Error('foo');
        });
        transaction._query = function() {
          client = this.client;
        };
        await expect(
          transaction,
          'to be rejected with error satisfying',
          new Error('foo')
        );
        await expect(
          () => client.release(),
          'to throw',
          new Error(
            'Release called on client which has already been released to the pool.'
          )
        );
      });

      it('releases the client if `COMMIT` fails', async () => {
        let client;
        const transaction = new Transaction(async function() {
          await new this.Query(this.models.User).query('select now()');
        });
        transaction._query = function(sql) {
          client = this.client;
          if (sql === 'COMMIT') {
            throw new Error('commit error');
          }
        };
        const spy = sinon.spy(transaction, '_query');
        await expect(
          transaction,
          'to be rejected with error satisfying',
          new Transaction.TransactionCommitError(new Error('commit error'))
        );
        await expect(
          () => client.release(),
          'to throw',
          new Error(
            'Release called on client which has already been released to the pool.'
          )
        );
        await expect(spy, 'to have calls satisfying', () => {
          spy('BEGIN');
          spy('select now()');
          spy('COMMIT');
          spy('ROLLBACK');
        });
      });

      it('releases the client if `ROLLBACK` fails', async () => {
        let client;
        const transaction = new Transaction(async function() {
          await new this.Query(this.models.User).query('select now()');
          throw new Error('foo');
        });
        transaction._query = function(sql) {
          client = this.client;
          if (sql === 'ROLLBACK') {
            throw new Error('rollback error');
          }
        };
        const spy = sinon.spy(transaction, '_query');
        await expect(
          transaction,
          'to be rejected with error satisfying',
          new Transaction.TransactionRollbackError(new Error('rollback error'))
        );
        await expect(
          () => client.release(),
          'to throw',
          new Error(
            'Release called on client which has already been released to the pool.'
          )
        );
        await expect(spy, 'to have calls satisfying', () => {
          spy('BEGIN');
          spy('select now()');
          spy('ROLLBACK');
        });
      });

      describe('for query hooks', () => {
        it('calls `beforeQuery`', async () => {
          const transaction = new Transaction(({ models: { User } }) =>
            User.insert({ id: 1, name: 'foo' })
          );
          const spy = sinon.spy(transaction, 'beforeQuery');
          await transaction.execute();
          await expect(spy, 'to have calls satisfying', () => {
            spy(expect.it('to be a', Client), 'BEGIN');
            spy(expect.it('to be a', Client), expect.it('to be a', sql.insert));
            spy(expect.it('to be a', Client), 'COMMIT');
          });
        });

        it('allows `beforeQuery` to change the sql when running raw sql', async () => {
          await new Transaction(({ models: { User } }) =>
            User.insert({ id: 1, name: 'foo' })
          );
          const transaction = new Transaction(async function(transaction) {
            return transaction.models.User.fetch();
          });
          sinon
            .stub(transaction, 'beforeQuery')
            .returns(sql.select(['id as "user.id"']).from('user'));
          await expect(
            transaction.execute(),
            'to be fulfilled with value exhaustively satisfying',
            [new User({ id: 1 })]
          );
        });

        it('calls `beforeQuery` when running raw sql', async () => {
          const transaction = new Transaction(({ models: { User } }) =>
            User.query.query('select now()')
          );
          const spy = sinon.spy(transaction, 'beforeQuery');
          await transaction.execute();
          await expect(spy, 'to have calls satisfying', () => {
            spy(expect.it('to be a', Client), 'BEGIN');
            spy(expect.it('to be a', Client), 'select now()');
            spy(expect.it('to be a', Client), 'COMMIT');
          });
        });

        it('allows `beforeQuery` to change the sql when running raw sql', async () => {
          const transaction = new Transaction(({ models: { User } }) =>
            User.query.query('select now() as "oldDate"')
          );
          sinon
            .stub(transaction, 'beforeQuery')
            .returns('select now() as "newDate"');
          await expect(
            transaction.execute(),
            'to be fulfilled with value exhaustively satisfying',
            [new User({ newDate: expect.it('to be a', Date) })]
          );
        });

        it('calls `afterQuery`', async () => {
          const transaction = new Transaction(({ models: { User } }) =>
            User.insert({ id: 1, name: 'foo' })
          );
          const spy = sinon.spy(transaction, 'afterQuery');
          await transaction.execute();
          await expect(spy, 'to have calls satisfying', () => {
            spy(expect.it('to be a', Client), 'BEGIN', {
              command: 'BEGIN',
              rowCount: null,
              rows: []
            });
            spy(
              expect.it('to be a', Client),
              expect.it('to be a', sql.insert),
              {
                command: 'INSERT',
                rowCount: 1,
                rows: [{ 'user.id': 1, 'user.name': 'foo' }]
              }
            );
            spy(expect.it('to be a', Client), 'COMMIT', {
              command: 'COMMIT',
              rowCount: null,
              rows: []
            });
          });
        });

        it('allows `afterQuery` to change the query result', async () => {
          const transaction = new Transaction(({ models: { User } }) =>
            User.insert({ id: 1, name: 'foo' })
          );
          sinon
            .stub(transaction, 'afterQuery')
            .returns({ rows: [{ 'user.id': 'foo' }] });
          await expect(
            transaction.execute(),
            'to be fulfilled with value exhaustively satisfying',
            [new User({ id: 'foo' })]
          );
        });
      });
    });

    describe('without a callback function', () => {
      it('enables scoped model operations', async () => {
        const transaction = new Transaction();
        await transaction.models.User.insert([{ id: 1, name: 'foo' }]);
        await transaction.commit();
        await expect(
          knex,
          'with table',
          User.table,
          'to have sorted rows satisfying',
          [{ id: 1, name: 'foo' }]
        );
      });

      it('enables scoped query operations', async () => {
        const transaction = new Transaction();
        await new transaction.Query(transaction.models.User).insert([
          { id: 1, name: 'foo' }
        ]);
        await transaction.commit();
        await expect(
          knex,
          'with table',
          User.table,
          'to have sorted rows satisfying',
          [{ id: 1, name: 'foo' }]
        );
      });

      it('enables running raw scoped queries', async () => {
        const transaction = new Transaction();
        await expect(
          new transaction.Query(transaction.models.User).query(
            'select now() as now'
          ),
          'to be fulfilled with value satisfying',
          [{ now: expect.it('to be a date') }]
        );
        await transaction.commit();
      });

      it('enables running multiple queries in a transaction', async () => {
        const transaction = new Transaction();
        await transaction.models.User.insert([{ id: 1, name: 'foo' }]);
        await transaction.models.User.insert([{ id: 2, name: 'bar' }]);
        await transaction.models.User.update([{ id: 1, name: 'foofoo' }]);
        await transaction.commit();
        await expect(
          knex,
          'with table',
          User.table,
          'to have sorted rows satisfying',
          [{ id: 1, name: 'foofoo' }, { id: 2, name: 'bar' }]
        );
      });

      it('rolls back a transaction on query failure', async () => {
        await expect(async () => {
          const transaction = new Transaction();
          await transaction.models.User.insert([{ id: 1, name: 'foo' }]);
          await transaction.models.User.insert([{ id: 1, name: 'bar' }]); // primary key error
          await transaction.commit();
        }, 'to be rejected');
        await expect(knex, 'with table', User.table, 'to be empty');
      });

      it('runs queries with one client', async () => {
        const transaction = new Transaction();
        const spy = sinon.spy(plugin, 'acquireClient');
        await transaction.models.User.insert([{ id: 1, name: 'foo' }]);
        await transaction.models.User.insert([{ id: 2, name: 'bar' }]);
        await transaction.commit();
        await expect(spy, 'was called once');
        spy.restore();
      });

      it('runs queries with one client even with nested models', async () => {
        const transaction = new Transaction();
        const spy = sinon.spy(plugin, 'acquireClient');
        class FooUser extends transaction.models.User {
          async foo() {
            await this.models.User.insert([{ id: 1, name: 'foo' }]);
            await this.models.User.insert([{ id: 2, name: 'bar' }]);
          }
        }
        await new FooUser().foo();
        await transaction.models.User.update([{ id: 1, name: 'foofoo' }]);
        await transaction.commit();
        await expect(
          knex,
          'with table',
          User.table,
          'to have sorted rows satisfying',
          [{ id: 1, name: 'foofoo' }, { id: 2, name: 'bar' }]
        );
        await expect(spy, 'was called once');
        spy.restore();
      });

      it('releases the client after runnning queries', async () => {
        const transaction = new Transaction();
        const spy = sinon.spy(transaction, 'releaseClient');
        await transaction.models.User.insert([{ id: 1, name: 'foo' }]);
        await transaction.models.User.insert([{ id: 2, name: 'bar' }]);
        await transaction.commit();
        await expect(spy, 'was called once');
        spy.restore();
      });

      describe('begin', () => {
        it('acquires a client', async () => {
          const transaction = new Transaction();
          const spy = sinon.spy(transaction, 'acquireClient');
          await transaction.begin();
          await transaction.rollback();
          await expect(spy, 'was called once');
        });

        it('rolls back the transaction on failure', async () => {
          const transaction = new Transaction();
          const spy = sinon.spy(transaction, '_rollback');
          transaction._begin = function() {
            throw new Error('begin error');
          };
          await expect(
            transaction.begin(),
            'to be rejected with error satisfying',
            new Error('begin error')
          );
          await expect(spy, 'was called once');
        });

        it('releases the client on failure', async () => {
          let client;
          const transaction = new Transaction();
          transaction._begin = function() {
            client = this.client;
            throw new Error('begin error');
          };
          await expect(
            transaction.begin(),
            'to be rejected with error satisfying',
            new Error('begin error')
          );
          await expect(
            () => client.release(),
            'to throw',
            new Error(
              'Release called on client which has already been released to the pool.'
            )
          );
        });
      });

      describe('query', () => {
        it('acquires a client', async () => {
          const transaction = new Transaction();
          const spy = sinon.spy(transaction, 'acquireClient');
          await transaction.query('select now()');
          await transaction.query('select now()');
          await transaction.rollback();
          await expect(spy, 'was called once');
        });

        it('begins the transaction', async () => {
          const transaction = new Transaction();
          const spy = sinon.spy(transaction, 'begin');
          await transaction.query('select now()');
          await transaction.query('select now()');
          await transaction.rollback();
          await expect(spy, 'was called once');
        });

        it('rolls back the transaction on failure', async () => {
          const transaction = new Transaction();
          const spy = sinon.spy(transaction, 'rollback');
          transaction._query = function(sql) {
            if (sql === 'select now()') {
              throw new Error('query error');
            }
          };
          await expect(
            transaction.query('select now()'),
            'to be rejected with error satisfying',
            new Error('query error')
          );
          await expect(spy, 'was called once');
        });

        it('releases the client on failure', async () => {
          let client;
          const transaction = new Transaction();
          transaction._query = function(sql) {
            client = this.client;
            if (sql === 'select now()') {
              throw new Error('query error');
            }
          };
          await expect(
            transaction.query('select now()'),
            'to be rejected with error satisfying',
            new Error('query error')
          );
          await expect(
            () => client.release(),
            'to throw',
            new Error(
              'Release called on client which has already been released to the pool.'
            )
          );
        });
      });

      describe('commit', () => {
        it('rolls back the transaction on failure', async () => {
          const transaction = new Transaction();
          const spy = sinon.spy(transaction, '_rollback');
          transaction._commit = function() {
            throw new Error('commit error');
          };
          await transaction.begin();
          await expect(
            transaction.commit(),
            'to be rejected with error satisfying',
            new Error('commit error')
          );
          await expect(spy, 'was called once');
        });

        it('releases the client on failure', async () => {
          let client;
          const transaction = new Transaction();
          transaction._commit = function() {
            client = this.client;
            throw new Error('commit error');
          };
          await transaction.begin();
          await expect(
            transaction.commit(),
            'to be rejected with error satisfying',
            new Error('commit error')
          );
          await expect(
            () => client.release(),
            'to throw',
            new Error(
              'Release called on client which has already been released to the pool.'
            )
          );
        });

        it('releases the client on success', async () => {
          let client;
          const transaction = new Transaction();
          transaction._commit = function() {
            client = this.client;
            return this.client.query('COMMIT');
          };
          await transaction.begin();
          await expect(transaction.commit(), 'to be fulfilled');
          await expect(
            () => client.release(),
            'to throw',
            new Error(
              'Release called on client which has already been released to the pool.'
            )
          );
        });
      });

      describe('rollback', () => {
        it('releases the client on failure', async () => {
          let client;
          const transaction = new Transaction();
          transaction._rollback = function() {
            client = this.client;
            throw new Error('rollback error');
          };
          await transaction.begin();
          await expect(
            transaction.rollback(),
            'to be rejected with error satisfying',
            new Error('rollback error')
          );
          await expect(
            () => client.release(),
            'to throw',
            new Error(
              'Release called on client which has already been released to the pool.'
            )
          );
        });

        it('releases the client on success', async () => {
          let client;
          const transaction = new Transaction();
          transaction._rollback = function() {
            client = this.client;
            return this.client.query('ROLLBACK');
          };
          await transaction.begin();
          await expect(transaction.rollback(), 'to be fulfilled');
          await expect(
            () => client.release(),
            'to throw',
            new Error(
              'Release called on client which has already been released to the pool.'
            )
          );
        });
      });

      describe('for query hooks', () => {
        it('calls `beforeQuery`', async () => {
          const transaction = new Transaction();
          const spy = sinon.spy(transaction, 'beforeQuery');
          await transaction.models.User.insert({ id: 1, name: 'foo' });
          await transaction.commit();
          await expect(spy, 'to have calls satisfying', () => {
            spy(expect.it('to be a', Client), 'BEGIN');
            spy(expect.it('to be a', Client), expect.it('to be a', sql.insert));
            spy(expect.it('to be a', Client), 'COMMIT');
          });
        });

        it('allows `beforeQuery` to change the sql when running raw sql', async () => {
          await new Transaction(({ models: { User } }) =>
            User.insert({ id: 1, name: 'foo' })
          );
          const transaction = new Transaction();
          sinon
            .stub(transaction, 'beforeQuery')
            .returns(sql.select(['id as "user.id"']).from('user'));
          const users = await transaction.models.User.insert({
            id: 1,
            name: 'foo'
          });
          await transaction.commit();
          await expect(users, 'to exhaustively satisfy', [new User({ id: 1 })]);
        });

        it('calls `beforeQuery` when running raw sql', async () => {
          const transaction = new Transaction();
          const spy = sinon.spy(transaction, 'beforeQuery');
          await transaction.models.User.query.query('select now()');
          await transaction.commit();
          await expect(spy, 'to have calls satisfying', () => {
            spy(expect.it('to be a', Client), 'BEGIN');
            spy(expect.it('to be a', Client), 'select now()');
            spy(expect.it('to be a', Client), 'COMMIT');
          });
        });

        it('allows `beforeQuery` to change the sql when running raw sql', async () => {
          const transaction = new Transaction();
          sinon
            .stub(transaction, 'beforeQuery')
            .returns('select now() as "newDate"');
          const rows = await transaction.models.User.query.query(
            'select now() as "oldDate"'
          );
          await transaction.commit();
          await expect(rows, 'to exhaustively satisfy', [
            new User({ newDate: expect.it('to be a', Date) })
          ]);
        });

        it('calls `afterQuery`', async () => {
          const transaction = new Transaction();
          const spy = sinon.spy(transaction, 'afterQuery');
          await transaction.models.User.insert({ id: 1, name: 'foo' });
          await transaction.commit();
          await expect(spy, 'to have calls satisfying', () => {
            spy(expect.it('to be a', Client), 'BEGIN', {
              command: 'BEGIN',
              rowCount: null,
              rows: []
            });
            spy(
              expect.it('to be a', Client),
              expect.it('to be a', sql.insert),
              {
                command: 'INSERT',
                rowCount: 1,
                rows: [{ 'user.id': 1, 'user.name': 'foo' }]
              }
            );
            spy(expect.it('to be a', Client), 'COMMIT', {
              command: 'COMMIT',
              rowCount: null,
              rows: []
            });
          });
        });

        it('allows `afterQuery` to change the query result', async () => {
          const transaction = new Transaction();
          sinon
            .stub(transaction, 'afterQuery')
            .returns({ rows: [{ 'user.id': 'foo' }] });
          const users = await transaction.models.User.insert({
            id: 1,
            name: 'foo'
          });
          await transaction.commit();
          await expect(users, 'to exhaustively satisfy', [
            new User({ id: 'foo' })
          ]);
        });
      });
    });
  });
});

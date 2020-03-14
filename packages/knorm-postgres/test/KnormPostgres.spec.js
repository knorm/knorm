const knorm = require('@knorm/knorm');
const knormRelations = require('@knorm/relations');
const { Client } = require('pg');
const KnormPostgres = require('../lib/KnormPostgres');
const knormPostgres = require('../');
const makeKnex = require('knex');
const sinon = require('sinon');
const expect = require('unexpected')
  .clone()
  .use(require('unexpected-sinon'))
  .use(require('unexpected-knex'));

const { KnormPostgresError } = KnormPostgres;
const host = process.env.PGHOST || '127.0.0.1';
const connection = {
  host,
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
      connection: `postgres://postgres@${host}:5432/postgres`
    });
    await expect(
      knormPostgres.pool.connect(),
      'to be fulfilled with',
      expect.it('to be a', Client).and(
        'when passed as parameter to',
        client => client.release(),
        'to be undefined' // but not to throw
      )
    );
  });

  it('supports options in the connection string', async () => {
    const knormPostgres = new KnormPostgres({
      connection: `postgres://postgres@${host}:5432/postgres?max=5`
    });

    // TODO: pg-connection-string should parseInt on the `max` option
    await expect(knormPostgres.pool.options.max, 'to be', '5');
    await expect(
      knormPostgres.pool.connect(),
      'to be fulfilled with',
      expect.it('to be a', Client).and(
        'when passed as parameter to',
        client => client.release(),
        'to be undefined' // but not to throw
      )
    );
  });

  it('uses postgres environment variables if no `connection` config is provided', async () => {
    const PGHOST = process.env.PGHOST;
    const PGPORT = process.env.PGPORT;
    const PGUSER = process.env.PGUSER;
    const PGPASSWORD = process.env.PGPASSWORD;
    const PGDATABASE = process.env.PGDATABASE;

    process.env.PGHOST = host;
    process.env.PGPORT = 5432;
    process.env.PGUSER = 'postgres';
    process.env.PGPASSWORD = '';
    process.env.PGDATABASE = 'postgres';

    const knormPostgres = new KnormPostgres();

    await expect(
      knormPostgres.pool.connect(),
      'to be fulfilled with',
      expect.it('to be a', Client).and(
        'when passed as parameter to',
        client => client.release(),
        'to be undefined' // but not to throw
      )
    );

    process.env.PGHOST = PGHOST;
    process.env.PGPORT = PGPORT;
    process.env.PGUSER = PGUSER;
    process.env.PGPASSWORD = PGPASSWORD;
    process.env.PGDATABASE = PGDATABASE;
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

        it('does not stringify `null` values', () => {
          const field = new Field({ name: 'foo', model: Model, type: 'json' });
          expect(field.cast(null, null, { forSave: true }), 'to be undefined');
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

          it('calls the function with the passed value and the model instance', () => {
            const forSave = sinon.spy();
            const field = new Field({
              name: 'foo',
              model: Model,
              type: 'json',
              cast: { forSave }
            });
            const instance = { model: 'instance' };
            field.cast({ foo: 'bar' }, instance, { forSave: true });
            expect(forSave, 'to have calls satisfying', () =>
              forSave({ foo: 'bar' }, instance)
            );
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
            expect(forSave, 'to have calls satisfying', () =>
              forSave(sql('foo'), 'a model instance')
            );
          });
        });
      });

      describe('forFetch', () => {
        it('does not parse values (already parsed by the postgres driver)', () => {
          const field = new Field({ name: 'foo', model: Model, type: 'json' });
          expect(
            field.cast('foo', null, { forFetch: true }),
            'to be undefined'
          );
        });

        describe('with a forFetch cast function configured', () => {
          it('uses the configured function', () => {
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

          it('calls the function with the passed value and the model instance', () => {
            const forFetch = sinon.spy();
            const field = new Field({
              name: 'foo',
              model: Model,
              type: 'json',
              cast: { forFetch }
            });
            const instance = { model: 'instace' };
            field.cast({ foo: 'bar' }, instance, { forFetch: true });
            expect(forFetch, 'to have calls satisfying', () =>
              forFetch({ foo: 'bar' }, instance)
            );
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

      it('calls the function with the passed value and model instance', () => {
        const forSave = sinon.spy();
        const field = new Field({
          name: 'foo',
          model: Model,
          type: 'string',
          cast: { forSave }
        });
        const instance = { model: 'instace' };
        field.cast('bar', instance, { forSave: true });
        expect(forSave, 'to have calls satisfying', () =>
          forSave('bar', instance)
        );
      });
    });
  });

  describe('PostgresConnection', () => {
    let User;
    let Query;
    let Transaction;

    before(async () => {
      const orm = knorm().use(knormPostgres({ connection }));

      Query = orm.Query;
      Transaction = orm.Transaction;

      User = class extends orm.Model {};
      User.table = 'user';
      User.fields = {
        id: { type: 'integer', primary: true, updated: false },
        name: 'string'
      };
    });

    afterEach(async () => knex(User.table).truncate());

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

    it('allows running string sql queries', async () => {
      await expect(
        new Query(User).execute('select now() as now'),
        'to be fulfilled with value satisfying',
        [{ now: expect.it('to be a date') }]
      );
    });

    it('allows running { text, value } sql queries', async () => {
      await expect(
        new Query(User).execute({
          text: `select upper($1) as foo`,
          values: ['foo']
        }),
        'to be fulfilled with value satisfying',
        [{ foo: 'FOO' }]
      );
    });

    describe('in transactions', () => {
      it('enables `insert`', async () => {
        await expect(
          new Transaction(async ({ models: { User } }) => {
            return User.insert({ id: 1, name: 'foo' });
          }),
          'to be fulfilled with value satisfying',
          [{ id: 1, name: 'foo' }]
        );
        await expect(
          knex,
          'with table',
          User.table,
          'to have rows satisfying',
          [{ id: 1, name: 'foo' }]
        );
      });

      it('enables `update`', async () => {
        await expect(
          new Transaction(async ({ models: { User } }) => {
            await User.insert({ id: 1, name: 'foo' });
            return User.update({ id: 1, name: 'bar' });
          }),
          'to be fulfilled with value satisfying',
          [{ id: 1, name: 'bar' }]
        );
        await expect(
          knex,
          'with table',
          User.table,
          'to have rows satisfying',
          [{ id: 1, name: 'bar' }]
        );
      });

      it('enables `fetch`', async () => {
        await expect(
          new Transaction(async ({ models: { User } }) => {
            await User.insert({ id: 1, name: 'foo' });
            return User.fetch();
          }),
          'to be fulfilled with value satisfying',
          [{ id: 1, name: 'foo' }]
        );
      });

      it('enables `delete`', async () => {
        await expect(
          new Transaction(async ({ models: { User } }) => {
            await User.insert({ id: 1, name: 'foo' });
            return User.delete();
          }),
          'to be fulfilled with value satisfying',
          [{ id: 1, name: 'foo' }]
        );
        await expect(knex, 'with table', User.table, 'to be empty');
      });

      it('allows running string sql queries', async () => {
        await expect(
          new Transaction(async ({ models: { User } }) => {
            return User.query.execute('select now() as now');
          }),
          'to be fulfilled with value satisfying',
          [{ now: expect.it('to be a date') }]
        );
      });

      it('allows running { text, value } sql queries', async () => {
        await expect(
          new Transaction(async ({ models: { User } }) => {
            return User.query.execute({
              text: `select upper($1) as foo`,
              values: ['foo']
            });
          }),
          'to be fulfilled with value satisfying',
          [{ foo: 'FOO' }]
        );
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

    it('enables `returning`', async () => {
      await new Query(User).insert({ id: 1, name: 'foo' });
      await expect(
        new Query(User).returning('id').delete(),
        'to be fulfilled with value exhaustively satisfying',
        [new User({ id: 1 })]
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
      const execute = sinon.spy(Query.prototype, 'execute');
      await expect(
        new Query(User).offset(0).fetch(),
        'to be fulfilled with value satisfying',
        [{ id: 1, name: 'foo' }, { id: 2, name: 'bar' }]
      );
      await expect(execute, 'to have calls satisfying', () => {
        execute(
          expect.it(
            'when passed as parameter to',
            query => query.toString(),
            'to contain',
            'OFFSET 0'
          )
        );
      });
      execute.restore();
    });

    it('adds `limit` for `fetch` when `first` is true', async () => {
      await new Query(User).insert({ id: 1, name: 'foo' });
      const execute = sinon.spy(Query.prototype, 'execute');
      await expect(
        new Query(User).first().fetch(),
        'to be fulfilled with value satisfying',
        { id: 1, name: 'foo' }
      );
      await expect(execute, 'to have calls satisfying', () => {
        execute(
          expect.it(
            'when passed as parameter to',
            query => query.toString(),
            'to contain',
            'LIMIT 1'
          )
        );
      });
      execute.restore();
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
      const execute = sinon.spy(Query.prototype, 'execute');
      user.name = 'bar';
      await expect(user, 'to satisfy', { id: 1 });
      await new Query(User).update(user);
      await expect(execute, 'to have calls satisfying', () => {
        execute(
          expect.it(
            'when passed as parameter to',
            query => query.toString(),
            'to begin with',
            'UPDATE "user" AS "user" SET "name" = "v"."name" FROM'
          )
        );
      });
      execute.restore();
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

        await expect(
          new Query(Foo).insert({ id: 1, json: 'foo' }),
          'to be fulfilled with sorted rows satisfying',
          [{ id: 1, json: 'foo' }]
        );
        await expect(
          new Query(Foo).update({ id: 1, json: { foo: 'foo' } }),
          'to be fulfilled with sorted rows satisfying',
          [{ id: 1, json: { foo: 'foo' } }]
        );
        await expect(
          new Query(Foo).update({ id: 1, json: '1' }),
          'to be fulfilled with sorted rows satisfying',
          [{ id: 1, json: '1' }]
        );
        await expect(
          new Query(Foo).update({ id: 1, json: 10 }),
          'to be fulfilled with sorted rows satisfying',
          [{ id: 1, json: 10 }]
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

      it('allows updating `uuid` and `uuid4` fields', async () => {
        await createTable(table => {
          table.uuid('uuid');
          table.uuid('uuid4');
        });

        class Foo extends Model {}
        Foo.table = 'foo';
        Foo.fields = { uuid: 'uuid', uuid4: 'uuid4' };

        await new Query(Foo).insert({
          id: 1,
          uuid: '44bbd080-3453-11e9-8f01-0f3f09e1cf60',
          uuid4: 'bb726591-e5ee-4725-b8b2-92101a387a56'
        });
        await expect(
          new Query(Foo).update({
            id: 1,
            uuid: 'a4af1ba0-3453-11e9-8f01-0f3f09e1cf60',
            uuid4: '1c5e91d3-07b7-47cc-980a-cef937c66bef'
          }),
          'to be fulfilled with value satisfying',
          [
            {
              id: 1,
              uuid: 'a4af1ba0-3453-11e9-8f01-0f3f09e1cf60',
              uuid4: '1c5e91d3-07b7-47cc-980a-cef937c66bef'
            }
          ]
        );
        await expect(
          new Query(Foo).update({ id: 1, uuid: null, uuid4: null }),
          'to be fulfilled with value satisfying',
          [{ id: 1, uuid: null, uuid4: null }]
        );
      });
    });

    describe('for multi-updates', () => {
      it('runs a single query', async () => {
        await new Query(User).insert([
          { id: 1, name: 'foo' },
          { id: 2, name: 'bar' }
        ]);
        const execute = sinon.spy(Query.prototype, 'execute');
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
        await expect(execute, 'was called once');
        execute.restore();
      });

      it('respects `batchSize`', async () => {
        await new Query(User).insert([
          { id: 1, name: 'foo' },
          { id: 2, name: 'bar' }
        ]);
        const execute = sinon.spy(Query.prototype, 'execute');
        const query = sinon.spy(Query.prototype, 'query');
        await expect(
          new Query(User)
            .batchSize(1)
            .update([{ id: 1, name: 'foofoo' }, { id: 2, name: 'barbar' }]),
          'to be fulfilled with sorted rows satisfying',
          [{ id: 1, name: 'foofoo' }, { id: 2, name: 'barbar' }]
        );
        await expect(
          knex,
          'with table',
          User.table,
          'to have sorted rows satisfying',
          [{ id: 1, name: 'foofoo' }, { id: 2, name: 'barbar' }]
        );
        await expect(execute, 'was called once');
        await expect(query, 'was called twice');
        execute.restore();
        query.restore();
      });

      it('does not update fields `updated: false` fields', async () => {
        await new Query(User).insert([
          { id: 1, name: 'foo' },
          { id: 2, name: 'bar' }
        ]);
        const execute = sinon.spy(Query.prototype, 'execute');
        await new Query(User).update([
          { id: 1, name: 'foofoo' },
          { id: 2, name: 'barbar' }
        ]);
        await expect(execute, 'to have calls satisfying', () => {
          execute(
            expect.it(
              'when passed as parameter to',
              query => query.toString(),
              'to begin with',
              'UPDATE "user" AS "user" SET "name" = "v"."name" FROM'
            )
          );
        });
        execute.restore();
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
        const execute = sinon.spy(Query.prototype, 'execute');
        await expect(
          new Query(OtherUser).update([
            { id: 1, name: 'foofoo' },
            { id: 2, name: 'barbar' }
          ]),
          'to be fulfilled with value satisfying',
          [{ id: 1, name: 'foofoo' }, { id: 2, name: 'barbar' }]
        );
        await expect(execute, 'to have calls satisfying', () => {
          execute(
            expect.it(
              'when passed as parameter to',
              sql => sql.toString(),
              'to contain',
              '"public"."user"'
            )
          );
        });
        execute.restore();
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
            [new User({ id: 1 }), new User({ id: 2 })]
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
          'to be fulfilled with sorted rows satisfying',
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
          'to be fulfilled with sorted rows satisfying',
          [
            { id: 1, name: 'foo', image: [{ id: 1 }, { id: 2 }] },
            { id: 2, name: 'bar', image: [] }
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
          'to be fulfilled with sorted rows satisfying',
          [
            { id: 1, name: 'foo', image: [{ id: 1 }, { id: 2 }] },
            { id: 2, name: 'bar', image: [] }
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

        it('ignores paths whose value is `undefined`', async () => {
          const query = new Query(Foo)
            .where({ id: 1 })
            .first()
            .patch();
          const data = { string: undefined, number: undefined };
          const expected = {
            string: 'foo',
            number: 1,
            array: ['foo', 'bar'],
            object: { string: 'foo', number: 1, array: ['foo', 'bar'] }
          };
          await expect(
            query.update({ jsonb: data, json: data }),
            'to be fulfilled with value exhaustively satisfying',
            new Foo({ id: 1, jsonb: expected, json: expected })
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

        it('rejects if the patch value is a non-object', async () => {
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

        it('rejects if the patch value is an array', async () => {
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

        it('updates the json object containing single quotes', async () => {
          const query = new Query(Foo)
            .where({ id: 1 })
            .first()
            .patch();
          await expect(
            query.update({
              jsonb: { string: `bar ' ` },
              json: { string: `bar ' ` }
            }),
            'to be fulfilled with value exhaustively satisfying',
            new Foo({
              id: 1,
              jsonb: {
                string: `bar ' `,
                number: 1,
                array: ['foo', 'bar'],
                object: {
                  string: 'foo',
                  number: 1,
                  array: ['foo', 'bar']
                }
              },
              json: {
                string: `bar ' `,
                number: 1,
                array: ['foo', 'bar'],
                object: {
                  string: 'foo',
                  number: 1,
                  array: ['foo', 'bar']
                }
              }
            })
          );
        });
      });
    });
  });
});

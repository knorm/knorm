const { Client } = require('pg');
const knorm = require('@knorm/knorm');
const KnormPostgres = require('../lib/KnormPostgres');
const knormPostgres = require('../');
const makeKnex = require('knex');
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
    const { Field, Model } = knorm().use(knormPostgres());

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
      it('stringifies values before save', () => {
        const field = new Field({ name: 'foo', model: Model, type: 'json' });
        expect(
          field.cast({ foo: 'bar' }, null, { forSave: true }),
          'to be',
          JSON.stringify({ foo: 'bar' })
        );
      });

      it('does not stringify `null` values', () => {
        const field = new Field({ name: 'foo', model: Model, type: 'json' });
        expect(field.cast(null, { forSave: true }), 'to be undefined');
      });

      describe('with a forSave cast function configured', () => {
        describe('for `json` and `jsonb` fields', () => {
          it('uses the configred function for json fields', () => {
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
            const instance = { model: 'instace' };
            field.cast({ foo: 'bar' }, instance, { forSave: true });
            expect(forSave, 'was called on', instance);
          });
        });

        describe('for other field types', () => {
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
    });
  });

  describe('PostgresQuery', () => {
    let User;
    let Query;

    before(async () => {
      const orm = knorm().use(knormPostgres({ connection }));

      Query = orm.Query;

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
          [{ id: 1, json: '"bar"' }]
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
      });
    });
  });

  describe('PostgresTransaction', () => {
    let User;
    let Query;
    let Transaction;
    let plugin;

    before(async () => {
      const orm = knorm().use(knormPostgres({ connection }));

      Query = orm.Query;
      Transaction = orm.Transaction;
      plugin = orm.plugins.postgres;

      User = class extends orm.Model {};
      User.table = 'user';
      User.fields = {
        id: { type: 'integer', primary: true, updated: false },
        name: 'string'
      };
    });

    afterEach(async () => knex(User.table).truncate());

    it('enables scoped model operations', async () => {
      await new Transaction(async function() {
        await this.User.insert([{ id: 1, name: 'foo' }]);
        await expect(this.User, 'not to be', User);
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
        await new this.Query(this.User).insert([{ id: 1, name: 'foo' }]);
        await expect(this.Query, 'not to be', Query);
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
          return new this.Query(this.User).query('select now() as now');
        }),
        'to be fulfilled with value satisfying',
        [{ now: expect.it('to be a date') }]
      );
    });

    it('enables running multiple queries in a transaction', async () => {
      await new Transaction(async function() {
        await this.User.insert([{ id: 1, name: 'foo' }]);
        await this.User.insert([{ id: 2, name: 'bar' }]);
        await this.User.update([{ id: 1, name: 'foofoo' }]);
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
          await this.User.insert([{ id: 1, name: 'foo' }]);
          await this.User.insert([{ id: 1, name: 'bar' }]); // primary key error
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
      sinon.spy(plugin, 'acquireClient');
      await new Transaction(async function() {
        await this.User.insert([{ id: 1, name: 'foo' }]);
        await this.User.insert([{ id: 2, name: 'bar' }]);
      });
      expect(plugin.acquireClient, 'was called once');
    });

    it('releases the client after runnning queries', async () => {
      sinon.spy(plugin, 'releaseClient');
      await new Transaction(async function() {
        await this.User.insert([{ id: 1, name: 'foo' }]);
        await this.User.insert([{ id: 2, name: 'bar' }]);
      });
      expect(plugin.releaseClient, 'was called once');
    });

    it('passes the client to the transaction callback', async () => {
      const spy = sinon.spy().named('transaction');
      await new Transaction(spy);
      expect(spy, 'to have calls satisfying', () =>
        spy(expect.it('to be a', Client))
      );
    });

    it('releases the client if `BEGIN` fails', async () => {
      let client;
      const transaction = new Transaction(() => {});
      transaction.query = function(sql) {
        client = this.client;
        if (sql === 'BEGIN') {
          throw new Error('begin error');
        }
      };
      const spy = sinon.spy(transaction, 'query');
      await expect(
        transaction,
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
      await expect(spy, 'was called once');
    });

    it('releases the client if the transaction fails', async () => {
      let client;
      const transaction = new Transaction(() => {
        throw new Error('foo');
      });
      transaction.query = function() {
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
        await new this.Query(this.User).query('select now()');
      });
      transaction.query = function(sql) {
        client = this.client;
        if (sql === 'COMMIT') {
          throw new Error('commit error');
        }
      };
      const spy = sinon.spy(transaction, 'query');
      await expect(
        transaction,
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
        await new this.Query(this.User).query('select now()');
        throw new Error('foo');
      });
      transaction.query = function(sql) {
        client = this.client;
        if (sql === 'ROLLBACK') {
          throw new Error('rollback error');
        }
      };
      const spy = sinon.spy(transaction, 'query');
      await expect(transaction, 'to be rejected with error satisfying', {
        name: 'TransactionError',
        message: 'unable to roll back after a failed transaction',
        transactionError: new Error('foo'),
        rollbackError: new Error('rollback error')
      });
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
  });
});

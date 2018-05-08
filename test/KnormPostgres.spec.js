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

const { KnormError } = knorm;
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
      table.date('date');
      table.dateTime('dateTime');
    })
  );

  after(async () => knex.schema.dropTable('user'));

  it('supports passing `connection` config as a string', async () => {
    const knormPostgres = new KnormPostgres({
      connection: 'postgres://postgres@127.0.0.1:5432/postgres'
    });
    const mockTarget = { initClient() {}, restoreClient() {} };
    await expect(knormPostgres.acquireClient(mockTarget), 'to be fulfilled');
    await expect(knormPostgres.releaseClient(mockTarget), 'to be fulfilled');
  });

  it('uses postgres environment variables if no `connection` config is provided', async () => {
    process.env.PGHOST = '127.0.0.1';
    process.env.PGPORT = 5432;
    process.env.PGUSER = 'postgres';
    process.env.PGPASSWORD = '';
    process.env.PGDATABASE = 'postgres';
    const knormPostgres = new KnormPostgres();
    const mockTarget = { initClient() {}, restoreClient() {} };
    await expect(knormPostgres.acquireClient(mockTarget), 'to be fulfilled');
    await expect(knormPostgres.releaseClient(mockTarget), 'to be fulfilled');
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
    it("calls the target's `initClient`", async () => {
      const knormPostgres = new KnormPostgres({ connection });
      const initClient = sinon.spy().named('initClient');
      const mockTarget = { initClient, restoreClient() {} };
      await knormPostgres.acquireClient(mockTarget);
      await expect(initClient, 'to have calls satisfying', () => {
        initClient(knormPostgres.client);
      });
      await knormPostgres.releaseClient(mockTarget);
    });

    it('does not acquire another client if one is already acquired', async () => {
      const initClient = sinon.spy().named('initClient');
      const mockTarget = { initClient, restoreClient() {} };
      const knormPostgres = new KnormPostgres({ connection });
      await knormPostgres.acquireClient(mockTarget);
      await knormPostgres.acquireClient(mockTarget);
      await expect(initClient, 'was called once');
      await knormPostgres.releaseClient(mockTarget);
    });

    it("releases the client if the target's `initClient` rejects", async () => {
      let client;
      const initClient = async theClient => {
        client = theClient;
        throw new Error('foo');
      };
      const mockTarget = { initClient, restoreClient() {} };
      const knormPostgres = new KnormPostgres({ connection });
      await expect(
        knormPostgres.acquireClient(mockTarget),
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
    it("calls the target's `restoreClient`", async () => {
      const restoreClient = sinon.spy().named('restoreClient');
      const mockTarget = { initClient() {}, restoreClient };
      const knormPostgres = new KnormPostgres({ connection });
      await knormPostgres.acquireClient(mockTarget);
      const client = knormPostgres.client;
      await knormPostgres.releaseClient(mockTarget);
      await expect(restoreClient, 'to have calls satisfying', () => {
        restoreClient(client);
      });
    });

    it('does not try to release the client if it is already released', async () => {
      const restoreClient = sinon.spy().named('restoreClient');
      const mockTarget = { initClient() {}, restoreClient };
      const knormPostgres = new KnormPostgres({ connection });
      await knormPostgres.acquireClient(mockTarget);
      await knormPostgres.releaseClient(mockTarget);
      await knormPostgres.releaseClient(mockTarget);
      await expect(restoreClient, 'was called once');
    });

    it("releases the client even if the target's `restoreClient` rejects", async () => {
      const restoreClient = () => {
        throw new Error('foo');
      };
      const mockTarget = { initClient() {}, restoreClient };
      const knormPostgres = new KnormPostgres({ connection });
      await knormPostgres.acquireClient(mockTarget);
      const client = knormPostgres.client;
      await expect(
        knormPostgres.releaseClient(mockTarget),
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

  describe('query', () => {
    let acquireClient;
    let releaseClient;
    let knormPostgres;
    const mockTarget = { initClient() {}, restoreClient() {} };

    before(() => {
      acquireClient = sinon.spy(KnormPostgres.prototype, 'acquireClient');
      releaseClient = sinon.spy(KnormPostgres.prototype, 'releaseClient');
      knormPostgres = new KnormPostgres({ connection });
    });

    after(() => {
      acquireClient.restore();
      releaseClient.restore();
    });

    afterEach(() => {
      acquireClient.resetHistory();
      releaseClient.resetHistory();
    });

    it('acquires a client via `acquireClient`', async () => {
      await knormPostgres.query(mockTarget, 'select now()');
      await expect(acquireClient, 'was called once');
    });

    it('releases the client after running the query', async () => {
      await knormPostgres.query(mockTarget, 'select now()');
      await expect(releaseClient, 'was called once');
    });

    it('acquires and releases a client per run', async () => {
      await knormPostgres.query(mockTarget, 'select now()');
      await knormPostgres.query(mockTarget, 'select now()');
      await expect(acquireClient, 'was called twice');
      await expect(releaseClient, 'was called twice');
    });
  });

  describe('transact', () => {
    it('passes the client to the transaction callback', async () => {
      const transaction = sinon.spy().named('transaction');
      const mockTarget = { initClient() {}, restoreClient() {}, transaction };
      const knormPostgres = new KnormPostgres({ connection });
      await knormPostgres.transact(mockTarget);
      await expect(transaction, 'to have calls satisfying', () => {
        transaction(expect.it('to be a', Client));
      });
    });

    it('runs queries with one client', async () => {
      const initClient = sinon.spy().named('initClient');
      const transaction = async () => {
        const mockQuery = { initClient() {}, restoreClient() {} };
        await knormPostgres.query(mockQuery, 'select now()');
        await knormPostgres.query(mockQuery, 'select now()');
      };
      const mockTarget = { initClient, restoreClient() {}, transaction };
      const knormPostgres = new KnormPostgres({ connection });
      await knormPostgres.transact(mockTarget);
      await expect(initClient, 'was called once');
    });

    it('releases the client after runnning queries', async () => {
      const restoreClient = sinon.spy().named('restoreClient');
      const transaction = async () => {
        const mockQuery = { initClient() {}, restoreClient() {} };
        await knormPostgres.query(mockQuery, 'select now()');
        await knormPostgres.query(mockQuery, 'select now()');
      };
      const mockTarget = { initClient() {}, restoreClient, transaction };
      const knormPostgres = new KnormPostgres({ connection });
      await knormPostgres.transact(mockTarget);
      await expect(restoreClient, 'was called once');
    });

    it('releases the client if `BEGIN` fails', async () => {
      const transaction = async () => {
        const mockQuery = { initClient() {}, restoreClient() {} };
        await knormPostgres.query(mockQuery, 'select now()');
      };
      const mockTarget = { initClient() {}, restoreClient() {}, transaction };
      const knormPostgres = new KnormPostgres({ connection });
      await knormPostgres.acquireClient(mockTarget);
      const client = knormPostgres.client;
      const query = sinon.stub(client, 'query').callsFake(async query => {
        if (query === 'BEGIN') {
          throw new Error('foo');
        }
      });
      await expect(
        knormPostgres.transact(mockTarget),
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
      await expect(query, 'was called once');
      await expect(knormPostgres.transacting, 'to be false');
    });

    it('releases the client if the transaction fails', async () => {
      let client;
      const initClient = theClient => {
        client = theClient;
      };
      const transaction = async () => {
        throw new Error('foo');
      };
      const mockTarget = { initClient, restoreClient() {}, transaction };
      const knormPostgres = new KnormPostgres({ connection });
      await expect(
        knormPostgres.transact(mockTarget),
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
      await expect(knormPostgres.transacting, 'to be false');
    });

    it('releases the client if `COMMIT` fails', async () => {
      const transaction = async () => {
        const mockQuery = { initClient() {}, restoreClient() {} };
        await knormPostgres.query(mockQuery, 'select now()');
      };
      const mockTarget = { initClient() {}, restoreClient() {}, transaction };
      const knormPostgres = new KnormPostgres({ connection });
      await knormPostgres.acquireClient(mockTarget);
      const client = knormPostgres.client;
      const query = sinon.stub(client, 'query').callsFake(async query => {
        if (query === 'COMMIT') {
          throw new Error('foo');
        }
      });
      await expect(
        knormPostgres.transact(mockTarget),
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
      await expect(query, 'to have calls satisfying', () => {
        query('BEGIN');
        query('select now()');
        query('COMMIT');
        query('ROLLBACK');
      });
      await expect(knormPostgres.transacting, 'to be false');
    });

    it('releases the client if `ROLLBACK` fails', async () => {
      const transaction = async () => {
        const mockQuery = { initClient() {}, restoreClient() {} };
        await knormPostgres.query(mockQuery, 'select now()');
        throw new Error('foo');
      };
      const mockTarget = { initClient() {}, restoreClient() {}, transaction };
      const knormPostgres = new KnormPostgres({ connection });
      await knormPostgres.acquireClient(mockTarget);
      const client = knormPostgres.client;
      const query = sinon.stub(client, 'query').callsFake(async query => {
        if (query === 'ROLLBACK') {
          throw new Error('rollback error');
        }
      });
      await expect(
        knormPostgres.transact(mockTarget),
        'to be rejected with error satisfying',
        {
          name: 'KnormPostgresError',
          message: 'unable to roll back after a failed transaction',
          transactionError: new Error('foo'),
          rollbackError: new Error('rollback error')
        }
      );
      await expect(
        () => client.release(),
        'to throw',
        new Error(
          'Release called on client which has already been released to the pool.'
        )
      );
      await expect(query, 'to have calls satisfying', () => {
        query('BEGIN');
        query('select now()');
        query('ROLLBACK');
      });
      await expect(knormPostgres.transacting, 'to be false');
    });

    it('calls `initClient` on the transaction and not the query target', async () => {
      const mockQuery = {
        initClient: sinon.spy().named('queryInitClient'),
        restoreClient() {}
      };
      const mockTransaction = {
        initClient: sinon.spy().named('transactionInitClient'),
        restoreClient() {},
        async transaction() {
          await knormPostgres.query(mockQuery, 'select now()');
        }
      };
      const knormPostgres = new KnormPostgres({ connection });
      await knormPostgres.transact(mockTransaction);
      await expect(mockTransaction.initClient, 'was called once');
      await expect(mockQuery.initClient, 'was not called');
    });

    it('calls `restoreClient` on the transaction and not the query target', async () => {
      const mockQuery = {
        initClient() {},
        restoreClient: sinon.spy().named('queryRestoreClient')
      };
      const mockTransaction = {
        initClient() {},
        restoreClient: sinon.spy().named('transactionRestoreClient'),
        async transaction() {
          await knormPostgres.query(mockQuery, 'select now()');
        }
      };
      const knormPostgres = new KnormPostgres({ connection });
      await knormPostgres.transact(mockTransaction);
      await expect(mockTransaction.restoreClient, 'was called once');
      await expect(mockQuery.restoreClient, 'was not called');
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
        name: 'string',
        date: 'date',
        dateTime: 'dateTime'
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
      const spy = sinon.spy(KnormPostgres.prototype, 'query');
      await expect(
        new Query(User).first().fetch(),
        'to be fulfilled with value satisfying',
        { id: 1, name: 'foo' }
      );
      await expect(spy, 'to have calls satisfying', () => {
        spy(
          expect.it('to be a', Query),
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
      await new Query(User).insert({
        id: 1,
        name: 'foo',
        date: new Date('2018-08-07')
      });
      await expect(
        new Query(User).update({
          id: 1,
          date: new Date('2018-05-08')
        }),
        'to be fulfilled with sorted rows satisfying',
        [{ id: 1, date: toUtc(new Date('2018-05-08')) }]
      );
      await expect(
        knex,
        'with table',
        User.table,
        'to have sorted rows satisfying',
        [{ id: 1, date: toUtc(new Date('2018-05-08')) }]
      );
    });

    it('allows updating `dateTime` fields', async () => {
      await new Query(User).insert({
        id: 1,
        name: 'foo',
        dateTime: new Date(1000)
      });
      await expect(
        new Query(User).update({ id: 1, dateTime: new Date(2000) }),
        'to be fulfilled with sorted rows satisfying',
        [{ id: 1, dateTime: new Date(2000) }]
      );
      await expect(
        knex,
        'with table',
        User.table,
        'to have sorted rows satisfying',
        [{ id: 1, dateTime: new Date(2000) }]
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
            'UPDATE "user" SET "name" = "v"."name", "date" = "v"."date", "dateTime" = "v"."dateTime" FROM'
          )
        );
      });
      spy.restore();
    });

    describe('for multi-updates', () => {
      it('runs a single query', async () => {
        await new Query(User).insert([
          { id: 1, name: 'foo' },
          { id: 2, name: 'bar' }
        ]);
        const spy = sinon.spy(KnormPostgres.prototype, 'query');
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
        const spy = sinon.spy(KnormPostgres.prototype, 'query');
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

      it('rejects with a QueryError if objects have mismatching field counts', async function() {
        await new Query(User).insert([
          { id: 1, name: 'foo' },
          { id: 2, name: 'bar' }
        ]);
        const query = new Query(User);
        await expect(
          query.update([
            new User({ id: 1, name: 'foofoo' }),
            new User({ id: 2 })
          ]),
          'to be rejected with error satisfying',
          new Query.QueryError({
            query,
            error: new KnormError(
              'Query: all objects should have the same field count'
            )
          })
        );
      });
    });

    describe('save', () => {
      describe('with an array', () => {
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
            insert([{ name: 'bar' }], undefined); // options are undefined
          });
          await expect(update, 'to have calls satisfying', () => {
            update([{ id: 1, name: 'foofoo' }], undefined); // options are undefined
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

  describe('PostgresTransaction', () => {
    let User;
    let Transaction;
    let initClient;
    let restoreClient;

    before(async () => {
      initClient = sinon.spy().named('initClient');
      restoreClient = sinon.spy().named('restoreClient');

      const orm = knorm().use(
        knormPostgres({ connection, initClient, restoreClient })
      );

      Transaction = orm.Transaction;

      User = class extends orm.Model {};
      User.table = 'user';
      User.fields = {
        id: { type: 'integer', primary: true, updated: false },
        name: 'string'
      };
    });

    afterEach(async () => {
      await knex(User.table).truncate();
      initClient.resetHistory();
      restoreClient.resetHistory();
    });

    it('commits the transaction', async () => {
      await new Transaction(async () => {
        await User.insert([{ id: 1, name: 'foo' }]);
        await User.insert([{ id: 2, name: 'bar' }]);
        await User.update([{ id: 1, name: 'foofoo' }]);
      });
      await expect(
        knex,
        'with table',
        User.table,
        'to have sorted rows satisfying',
        [{ id: 1, name: 'foofoo' }, { id: 2, name: 'bar' }]
      );
    });

    it('rolls back the transaction on failure', async () => {
      await expect(
        new Transaction(async () => {
          await User.insert([{ id: 1, name: 'foo' }]);
          await User.insert([{ id: 1, name: 'bar' }]); // primary key error
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
  });
});

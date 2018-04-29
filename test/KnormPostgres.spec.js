const knorm = require('knorm');
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
    await expect(knormPostgres.acquireClient(), 'to be fulfilled');
    await expect(knormPostgres.releaseClient(), 'to be fulfilled');
  });

  it('uses postgres environment variables if no `connection` config is provided', async () => {
    process.env.PGHOST = '127.0.0.1';
    process.env.PGPORT = 5432;
    process.env.PGUSER = 'postgres';
    process.env.PGPASSWORD = '';
    process.env.PGDATABASE = 'postgres';
    const knormPostgres = new KnormPostgres();
    await expect(knormPostgres.acquireClient(), 'to be fulfilled');
    await expect(knormPostgres.releaseClient(), 'to be fulfilled');
    process.env.PGHOST = undefined;
    process.env.PGPORT = undefined;
    process.env.PGUSER = undefined;
    process.env.PGPASSWORD = undefined;
    process.env.PGDATABASE = undefined;
  });

  describe('init', () => {
    it('throws if not passed a `Knorm` instance', () => {
      expect(
        () => new KnormPostgres({ connection }).init(),
        'to throw',
        new KnormPostgresError('no Knorm instance provided')
      );
    });

    it('throws if passed an invalid `Knorm` instance', () => {
      expect(
        () => new KnormPostgres({ connection }).init({}),
        'to throw',
        new KnormPostgresError('invalid Knorm instance provided')
      );
    });
  });

  describe('acquireClient', () => {
    it('calls the user-provided `initClient`', async () => {
      const initClient = sinon.spy().named('initClient');
      const knormPostgres = new KnormPostgres({ connection, initClient });
      await knormPostgres.acquireClient();
      await expect(initClient, 'to have calls satisfying', () => {
        initClient(knormPostgres.client);
      });
      await knormPostgres.releaseClient();
    });

    it('does not acquire another client if one is already acquired', async () => {
      const initClient = sinon.spy().named('initClient');
      const knormPostgres = new KnormPostgres({ connection, initClient });
      await knormPostgres.acquireClient();
      await knormPostgres.acquireClient();
      await expect(initClient, 'was called once');
      await knormPostgres.releaseClient();
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
      await knormPostgres.acquireClient();
      const client = knormPostgres.client;
      await knormPostgres.releaseClient();
      await expect(restoreClient, 'to have calls satisfying', () => {
        restoreClient(client);
      });
    });

    it('does not try to release the client if it is already released', async () => {
      const restoreClient = sinon.spy().named('restoreClient');
      const knormPostgres = new KnormPostgres({ connection, restoreClient });
      await knormPostgres.acquireClient();
      await knormPostgres.releaseClient();
      await knormPostgres.releaseClient();
      await expect(restoreClient, 'was called once');
    });

    it('releases the client even if the user-provided `restoreClient` rejects', async () => {
      let client;
      const restoreClient = async theClient => {
        client = theClient;
        throw new Error('foo');
      };
      const knormPostgres = new KnormPostgres({ connection, restoreClient });
      await knormPostgres.acquireClient();
      await expect(
        knormPostgres.releaseClient(),
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
      await knormPostgres.query('select now()');
      await expect(acquireClient, 'was called once');
    });

    it('releases the client after running the query', async () => {
      await knormPostgres.query('select now()');
      await expect(releaseClient, 'was called once');
    });

    it('acquires and releases a client per run', async () => {
      await knormPostgres.query('select now()');
      await knormPostgres.query('select now()');
      await expect(acquireClient, 'was called twice');
      await expect(releaseClient, 'was called twice');
    });
  });

  describe('transact', () => {
    it('runs queries with one client', async () => {
      const initClient = sinon.spy().named('initClient');
      const knormPostgres = new KnormPostgres({ connection, initClient });
      await knormPostgres.transact(async () => {
        await knormPostgres.query('select now()');
        await knormPostgres.query('select now()');
      });
      expect(initClient, 'was called once');
    });

    it('releases the client after runnning queries', async () => {
      const restoreClient = sinon.spy().named('restoreClient');
      const knormPostgres = new KnormPostgres({ connection, restoreClient });
      await knormPostgres.transact(async () => {
        await knormPostgres.query('select now()');
        await knormPostgres.query('select now()');
      });
      expect(restoreClient, 'was called once');
    });

    it('releases the client if `BEGIN` fails', async () => {
      let client;
      const initClient = theClient => {
        client = theClient;
      };
      const knormPostgres = new KnormPostgres({ connection, initClient });
      const stub = sinon.stub(knormPostgres, 'query').callsFake(async query => {
        if (query === 'BEGIN') {
          throw new Error('foo');
        }
      });
      await expect(
        knormPostgres.transact(async () => {
          await knormPostgres.query('select now()');
        }),
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
      await expect(stub, 'was called once');
      await expect(knormPostgres.transacting, 'to be false');
    });

    it('releases the client if the transaction fails', async () => {
      let client;
      const initClient = theClient => {
        client = theClient;
      };
      const knormPostgres = new KnormPostgres({ connection, initClient });
      await expect(
        knormPostgres.transact(async () => {
          throw new Error('foo');
        }),
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
      let client;
      const initClient = theClient => {
        client = theClient;
      };
      const knormPostgres = new KnormPostgres({ connection, initClient });
      const stub = sinon.stub(knormPostgres, 'query').callsFake(async query => {
        if (query === 'COMMIT') {
          throw new Error('foo');
        }
      });
      await expect(
        knormPostgres.transact(async () => {
          await knormPostgres.query('select now()');
        }),
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
      await expect(stub, 'to have calls satisfying', () => {
        stub('BEGIN');
        stub('select now()');
        stub('COMMIT');
        stub('ROLLBACK');
      });
      await expect(knormPostgres.transacting, 'to be false');
    });

    it('releases the client if `ROLLBACK` fails', async () => {
      let client;
      const initClient = theClient => {
        client = theClient;
      };
      const knormPostgres = new KnormPostgres({ connection, initClient });
      const stub = sinon.stub(knormPostgres, 'query').callsFake(async query => {
        if (query === 'ROLLBACK') {
          throw new Error('rollback error');
        }
      });
      await expect(
        knormPostgres.transact(async () => {
          await knormPostgres.query('select now()');
          throw new Error('foo');
        }),
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
      await expect(stub, 'to have calls satisfying', () => {
        stub('BEGIN');
        stub('select now()');
        stub('ROLLBACK');
      });
      await expect(knormPostgres.transacting, 'to be false');
    });
  });

  describe('PostgresField', () => {
    const { Field, Model } = knorm().use(knormPostgres({ connection }));

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
            field.cast({ foo: 'bar' }, instance, { forSave: true }),
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
            field.cast('bar', instance, { forSave: true }),
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
        new Query(User).where(new Query.Where().ilike('name', 'fo%')).fetch(),
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
    });

    describe('save', () => {
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

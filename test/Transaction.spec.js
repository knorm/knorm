const Knorm = require('../lib/Knorm');
const postgresPlugin = require('./lib/postgresPlugin');
const knex = require('./lib/knex');
const sinon = require('sinon');
const expect = require('unexpected')
  .clone()
  .use(require('unexpected-sinon'))
  .use(require('unexpected-knex'));

describe('Transaction', () => {
  let Model;
  let Query;
  let Connection;
  let Transaction;
  let TransactionError;
  let User;

  before(() => {
    const knorm = new Knorm();

    Model = knorm.Model;
    Query = knorm.Query;
    Connection = knorm.Connection;
    Transaction = knorm.Transaction;
    TransactionError = Transaction.TransactionError;
  });

  describe('constructor', () => {
    it('creates scoped models', () => {
      User = class extends Model {};
      User.table = 'user';
      User.fields = { name: { type: 'string', primary: true } };
      User.Query = class UserQuery extends User.Query {};

      const transaction = new Transaction();
      const TransactionUser = transaction.models.User;

      expect(TransactionUser.name, 'to be', 'User');
      expect(TransactionUser.Query.name, 'to be', 'UserQuery');

      expect(TransactionUser.prototype, 'to be a', User);
      expect(TransactionUser.models.User, 'to be', TransactionUser);
      expect(TransactionUser.prototype.models.User, 'to be', TransactionUser);

      expect(TransactionUser.Query.prototype, 'to be a', Query);
      expect(TransactionUser.Query.models.User.prototype, 'to be a', User);
      expect(
        TransactionUser.Query.prototype.models.User.prototype,
        'to be a',
        User
      );
    });

    it('adds an accessor to the transaction instance', () => {
      const transaction = new Transaction();
      const TransactionUser = transaction.models.User;

      expect(TransactionUser.transaction, 'to be', transaction);
      expect(TransactionUser.Query.transaction, 'to be', transaction);

      expect(TransactionUser.prototype.transaction, 'to be', transaction);
      expect(TransactionUser.Query.prototype.transaction, 'to be', transaction);
    });
  });

  describe('Transaction.prototype.connect', () => {
    let DummyConnection;
    let DummyTransaction;

    beforeEach(() => {
      DummyTransaction = class DummyTransaction extends Transaction {};
      DummyConnection = class DummyConnection extends Connection {};
      DummyTransaction.Connection = DummyConnection;
    });

    it('creates a connection via Connection.prototype.create', async () => {
      const createConnection = sinon.stub(DummyConnection.prototype, 'create');
      const transaction = new DummyTransaction();
      await transaction.connect();
      await expect(
        createConnection,
        'to have calls exhaustively satisfying',
        () => createConnection()
      );
    });

    it('supports an async Connection.prototype.create', async () => {
      sinon
        .stub(DummyConnection.prototype, 'create')
        .returns(Promise.resolve('foo'));
      const transaction = new DummyTransaction();
      await expect(transaction.connect(), 'to be fulfilled with', 'foo');
    });

    it('rejects with a TransactionError on creation failure', async () => {
      sinon
        .stub(DummyConnection.prototype, 'create')
        .returns(Promise.reject(new Error('connection error')));
      const transaction = new DummyTransaction();
      await expect(
        transaction.connect(),
        'to be rejected with error exhaustively satisfying',
        new TransactionError(new Error('connection error'))
      );
    });
  });

  describe('Transaction.prototype.disconnect', () => {
    let DummyConnection;
    let DummyTransaction;

    beforeEach(() => {
      DummyTransaction = class DummyTransaction extends Transaction {};
      DummyConnection = class DummyConnection extends Connection {
        create() {}
      };
      DummyTransaction.Connection = DummyConnection;
    });

    it('closes a connection via Connection.prototype.close', async () => {
      const close = sinon.stub(DummyConnection.prototype, 'close');
      const transaction = new DummyTransaction();
      await transaction.connect();
      await transaction.disconnect();
      await expect(close, 'to have calls exhaustively satisfying', () =>
        close()
      );
    });

    it('supports an async Connection.prototype.close', async () => {
      sinon
        .stub(DummyConnection.prototype, 'close')
        .returns(Promise.resolve('foo'));
      const transaction = new DummyTransaction();
      await transaction.connect();
      await expect(transaction.disconnect(), 'to be fulfilled with', 'foo');
    });

    it('rejects with a TransactionError on close failure', async () => {
      sinon
        .stub(DummyConnection.prototype, 'close')
        .returns(Promise.reject(new Error('connection close error')));
      const transaction = new DummyTransaction();
      await transaction.connect();
      await expect(
        transaction.disconnect(),
        'to be rejected with error exhaustively satisfying',
        new TransactionError(new Error('connection close error'))
      );
    });
  });

  describe('Transaction.prototype.begin', () => {
    let DummyConnection;
    let DummyTransaction;

    beforeEach(() => {
      DummyTransaction = class DummyTransaction extends Transaction {};
      DummyConnection = class DummyConnection extends Connection {
        create() {}
        query() {}
        close() {}
      };
      DummyTransaction.Connection = DummyConnection;
    });

    it('creates a connection if one does not exist', async () => {
      const createConnection = sinon.stub(DummyConnection.prototype, 'create');
      const transaction = new DummyTransaction();
      await transaction.begin();
      await expect(
        createConnection,
        'to have calls exhaustively satisfying',
        () => createConnection()
      );
    });

    it('does not recreate a connection if one already exists', async () => {
      const createConnection = sinon.stub(DummyConnection.prototype, 'create');
      const transaction = new DummyTransaction();
      await transaction.begin();
      await transaction.begin();
      await expect(
        createConnection,
        'to have calls exhaustively satisfying',
        () => createConnection()
      );
    });

    it('begins a transaction via Transaction.prototype._begin', async () => {
      const _begin = sinon.spy(DummyTransaction.prototype, '_begin');
      const transaction = new DummyTransaction();
      await transaction.begin();
      await expect(_begin, 'to have calls exhaustively satisfying', () =>
        _begin()
      );
    });

    it('rejects with a TransactionError on begin failure', async () => {
      sinon
        .stub(DummyTransaction.prototype, '_begin')
        .returns(Promise.reject(new Error('begin error')));
      const transaction = new DummyTransaction();
      await expect(
        transaction.begin(),
        'to be rejected with error exhaustively satisfying',
        new TransactionError(new Error('begin error'))
      );
    });

    it('closes the connection on begin failure', async () => {
      sinon
        .stub(DummyTransaction.prototype, '_begin')
        .returns(Promise.reject(new Error('begin error')));
      const disconnect = sinon.spy(DummyTransaction.prototype, 'disconnect');
      const transaction = new DummyTransaction();
      await expect(
        transaction.begin(),
        'to be rejected with error exhaustively satisfying',
        new TransactionError(new Error('begin error'))
      );
      await expect(disconnect, 'to have calls exhaustively satisfying', () =>
        disconnect()
      );
    });

    it('sets the `active` flag to `true`', async () => {
      const transaction = new DummyTransaction();
      await expect(transaction.active, 'to be undefined');
      await transaction.begin();
      await expect(transaction.active, 'to be true');
    });

    it('sets the `started` flag to `true`', async () => {
      const transaction = new DummyTransaction();
      await expect(transaction.started, 'to be undefined');
      await transaction.begin();
      await expect(transaction.started, 'to be true');
    });

    it('leaves the `ended` flag as `undefined`', async () => {
      const transaction = new DummyTransaction();
      await expect(transaction.ended, 'to be undefined');
      await transaction.begin();
      await expect(transaction.ended, 'to be undefined');
    });
  });

  describe('Transaction.prototype.commit', () => {
    let DummyConnection;
    let DummyTransaction;

    beforeEach(() => {
      DummyTransaction = class DummyTransaction extends Transaction {};
      DummyConnection = class DummyConnection extends Connection {
        create() {}
        query() {}
        close() {}
      };
      DummyTransaction.Connection = DummyConnection;
    });

    it('commits a transaction via Transaction.prototype._commit', async () => {
      const _commit = sinon.spy(DummyTransaction.prototype, '_commit');
      const transaction = new DummyTransaction();
      await transaction.begin();
      await transaction.commit();
      await expect(_commit, 'to have calls exhaustively satisfying', () =>
        _commit()
      );
    });

    it('closes the connection via Transaction.prototype.close', async () => {
      const disconnect = sinon.spy(DummyTransaction.prototype, 'disconnect');
      const transaction = new DummyTransaction();
      await transaction.begin();
      await transaction.commit();
      await expect(disconnect, 'to have calls exhaustively satisfying', () =>
        disconnect()
      );
    });

    it('closes the connection after commit', async () => {
      const order = [];
      sinon
        .stub(DummyTransaction.prototype, '_commit')
        .callsFake(() => order.push('commit'));
      sinon
        .stub(DummyTransaction.prototype, 'disconnect')
        .callsFake(() => order.push('disconnect'));
      const transaction = new DummyTransaction();
      await transaction.begin();
      await transaction.commit();
      await expect(order, 'to equal', ['commit', 'disconnect']);
    });

    it('rejects with a TransactionError on commit failure', async () => {
      sinon
        .stub(DummyTransaction.prototype, '_commit')
        .returns(Promise.reject(new Error('commit error')));
      const transaction = new DummyTransaction();
      await transaction.begin();
      await expect(
        transaction.commit(),
        'to be rejected with error exhaustively satisfying',
        new TransactionError(new Error('commit error'))
      );
    });

    it('calls Transasction.prototype.rollback on commit failure', async () => {
      sinon
        .stub(DummyTransaction.prototype, '_commit')
        .returns(Promise.reject(new Error('commit error')));
      const rollback = sinon.spy(DummyTransaction.prototype, 'rollback');
      const transaction = new DummyTransaction();
      await transaction.begin();
      await expect(
        transaction.commit(),
        'to be rejected with error exhaustively satisfying',
        new TransactionError(new Error('commit error'))
      );
      await expect(rollback, 'to have calls exhaustively satisfying', () =>
        rollback()
      );
    });

    it('does not rollback on disconnect failure', async () => {
      sinon
        .stub(DummyTransaction.prototype, 'disconnect')
        .returns(Promise.reject(new Error('disconnect error')));
      const rollback = sinon.spy(DummyTransaction.prototype, 'rollback');
      const transaction = new DummyTransaction();
      await transaction.begin();
      await expect(
        transaction.commit(),
        'to be rejected with error exhaustively satisfying',
        new Error('disconnect error')
      );
      await expect(rollback, 'was not called');
    });

    it('sets the `active` flag to `false`', async () => {
      const transaction = new DummyTransaction();
      await transaction.begin();
      await expect(transaction.active, 'to be true');
      await transaction.commit();
      await expect(transaction.active, 'to be false');
    });

    it('sets the `ended` flag to `true`', async () => {
      const transaction = new DummyTransaction();
      await transaction.begin();
      await expect(transaction.ended, 'to be undefined');
      await transaction.commit();
      await expect(transaction.ended, 'to be true');
    });

    it('leaves the `started` flag as `true`', async () => {
      const transaction = new DummyTransaction();
      await transaction.begin();
      await expect(transaction.started, 'to be true');
      await transaction.commit();
      await expect(transaction.started, 'to be true');
    });
  });

  describe('Transaction.prototype.rollback', () => {
    let DummyConnection;
    let DummyTransaction;

    beforeEach(() => {
      DummyTransaction = class DummyTransaction extends Transaction {};
      DummyConnection = class DummyConnection extends Connection {
        create() {}
        query() {}
        close() {}
      };
      DummyTransaction.Connection = DummyConnection;
    });

    it('rolls back a transaction via Transaction.prototype._rollback', async () => {
      const _rollback = sinon.spy(DummyTransaction.prototype, '_rollback');
      const transaction = new DummyTransaction();
      await transaction.begin();
      await transaction.rollback();
      await expect(_rollback, 'to have calls exhaustively satisfying', () =>
        _rollback()
      );
    });

    it('closes the connection via Transaction.prototype.disconnect', async () => {
      const disconnect = sinon.spy(DummyTransaction.prototype, 'disconnect');
      const transaction = new DummyTransaction();
      await transaction.begin();
      await transaction.rollback();
      await expect(disconnect, 'to have calls exhaustively satisfying', () =>
        disconnect()
      );
    });

    it('closes the connection after rollback', async () => {
      const order = [];
      sinon
        .stub(DummyTransaction.prototype, '_rollback')
        .callsFake(() => order.push('rollback'));
      sinon
        .stub(DummyTransaction.prototype, 'disconnect')
        .callsFake(() => order.push('disconnect'));
      const transaction = new DummyTransaction();
      await transaction.begin();
      await transaction.rollback();
      await expect(order, 'to equal', ['rollback', 'disconnect']);
    });

    it('rejects with a TransactionError on rollback failure', async () => {
      sinon
        .stub(DummyTransaction.prototype, '_rollback')
        .returns(Promise.reject(new Error('rollback error')));
      const transaction = new DummyTransaction();
      await transaction.begin();
      await expect(
        transaction.rollback(),
        'to be rejected with error exhaustively satisfying',
        new TransactionError(new Error('rollback error'))
      );
    });

    it('sets the `active` flag to `false`', async () => {
      const transaction = new DummyTransaction();
      await transaction.begin();
      await expect(transaction.active, 'to be true');
      await transaction.rollback();
      await expect(transaction.active, 'to be false');
    });

    it('sets the `ended` flag to `true`', async () => {
      const transaction = new DummyTransaction();
      await transaction.begin();
      await expect(transaction.ended, 'to be undefined');
      await transaction.rollback();
      await expect(transaction.ended, 'to be true');
    });

    it('leaves the `started` flag as `true`', async () => {
      const transaction = new DummyTransaction();
      await transaction.begin();
      await expect(transaction.started, 'to be true');
      await transaction.rollback();
      await expect(transaction.started, 'to be true');
    });
  });

  describe('Transaction.prototype.execute', () => {
    let DummyConnection;
    let DummyTransaction;

    beforeEach(() => {
      DummyTransaction = class DummyTransaction extends Transaction {};
      DummyConnection = class DummyConnection extends Connection {
        create() {}
        query() {}
        close() {}
      };
      DummyTransaction.Connection = DummyConnection;
    });

    it('rejects with a TransactionError if no callback exists', async () => {
      const transaction = new Transaction();
      await expect(
        transaction.execute(),
        'to be rejected with error exhaustively satisfying',
        new TransactionError('no transaction callback provided')
      );
    });

    it('begins the transaction via Transaction.prototype.begin', async () => {
      const begin = sinon.spy(DummyTransaction.prototype, 'begin');
      const transaction = new DummyTransaction(() => {});
      await transaction.execute();
      await expect(begin, 'to have calls exhaustively satisfying', () =>
        begin()
      );
    });

    it('calls the transaction callback with the transaction as an argument', async () => {
      const callback = sinon.spy();
      const transaction = new DummyTransaction(callback);
      await transaction.execute();
      await expect(callback, 'to have calls exhaustively satisfying', () =>
        callback(transaction)
      );
    });

    it('commits the transaction via Transaction.prototype.commit', async () => {
      const commit = sinon.spy(DummyTransaction.prototype, 'commit');
      const transaction = new DummyTransaction(() => {});
      await transaction.execute();
      await expect(commit, 'to have calls exhaustively satisfying', () =>
        commit()
      );
    });

    it('calls `begin`, the callback and `commit` in the right order', async () => {
      const order = [];
      sinon
        .stub(DummyTransaction.prototype, 'begin')
        .callsFake(() => order.push('begin'));
      sinon
        .stub(DummyTransaction.prototype, 'commit')
        .callsFake(() => order.push('commit'));
      const transaction = new DummyTransaction(() => order.push('callback'));
      await transaction.execute();
      await expect(order, 'to equal', ['begin', 'callback', 'commit']);
    });

    it('resolves with the return value of the transaction callback', async () => {
      const transaction = new DummyTransaction(() => 'foo');
      await expect(
        transaction.execute(),
        'to be fulfilled with value exhaustively satisfying',
        'foo'
      );
    });

    it('resolves with the resolution value of the transaction callback', async () => {
      const transaction = new DummyTransaction(async () => 'foo');
      await expect(
        transaction.execute(),
        'to be fulfilled with value exhaustively satisfying',
        'foo'
      );
    });

    describe('on callback failure', () => {
      it('rejects with the error thrown', async () => {
        const transaction = new DummyTransaction(() => {
          throw new Error('callback error');
        });
        await expect(
          transaction.execute(),
          'to be rejected with error exhaustively satisfying',
          new Error('callback error')
        );
      });

      it('rejects with the rejection error', async () => {
        const transaction = new DummyTransaction(async () => {
          throw new Error('callback error');
        });
        await expect(
          transaction.execute(),
          'to be rejected with error exhaustively satisfying',
          new Error('callback error')
        );
      });

      it('rollbacks the transaction', async () => {
        const rollback = sinon.spy(DummyTransaction.prototype, 'rollback');
        const transaction = new DummyTransaction(() => {
          throw new Error('callback error');
        });
        await expect(
          transaction.execute(),
          'to be rejected with error exhaustively satisfying',
          new Error('callback error')
        );
        await expect(rollback, 'to have calls exhaustively satisfying', () =>
          rollback()
        );
      });

      it('calls `begin`, the callback and `rollback` in the right order', async () => {
        const order = [];
        sinon
          .stub(DummyTransaction.prototype, 'begin')
          .callsFake(() => order.push('begin'));
        sinon
          .stub(DummyTransaction.prototype, 'rollback')
          .callsFake(() => order.push('rollback'));
        const transaction = new DummyTransaction(() => {
          order.push('callback');
          throw new Error('callback error');
        });
        await expect(
          transaction.execute(),
          'to be rejected with error exhaustively satisfying',
          new Error('callback error')
        );
        await expect(order, 'to equal', ['begin', 'callback', 'rollback']);
      });
    });
  });

  describe('Transaction.prototype.then', () => {
    let executeStub;

    before(() => {
      executeStub = sinon.stub(Transaction.prototype, 'execute');
    });

    after(() => {
      executeStub.restore();
    });

    beforeEach(() => {
      executeStub.reset();
      executeStub.returns(Promise.resolve());
    });

    it('calls Transaction.prototype.execute', async () => {
      const transaction = new Transaction();
      await transaction.then();
      await expect(executeStub, 'to have calls exhaustively satisfying', () => {
        executeStub();
      });
    });

    it('calls the callback', async () => {
      const transaction = new Transaction();
      const spy = sinon.spy();
      await transaction.then(spy);
      await expect(spy, 'to have calls exhaustively satisfying', () => {
        spy(undefined);
      });
    });

    it("calls the callback with Transaction.prototype.execute's fulfillment value", async () => {
      executeStub.returns(Promise.resolve('foo'));
      const transaction = new Transaction();
      const spy = sinon.spy();
      await transaction.then(spy);
      await expect(spy, 'to have calls exhaustively satisfying', () => {
        spy('foo');
      });
    });

    describe('when called without a callback', () => {
      it("resolves with Transaction.prototype.execute's fulfillment value", async () => {
        executeStub.returns(Promise.resolve('foo'));
        const transaction = new Transaction();
        await expect(transaction.then(), 'to be fulfilled with', 'foo');
      });

      it('rejects if Transaction.prototype.execute rejects', async () => {
        executeStub.returns(Promise.reject(new Error('foo')));
        const transaction = new Transaction();
        await expect(
          transaction.then(),
          'to be rejected with',
          new Error('foo')
        );
      });
    });
  });

  describe('Transaction.prototype.catch', () => {
    let executeStub;

    before(() => {
      executeStub = sinon.stub(Transaction.prototype, 'execute');
    });

    after(() => {
      executeStub.restore();
    });

    beforeEach(() => {
      executeStub.reset();
      executeStub.returns(Promise.resolve());
    });

    it('calls Transaction.prototype.execute', async () => {
      const transaction = new Transaction();
      await transaction.catch();
      await expect(executeStub, 'to have calls exhaustively satisfying', () => {
        executeStub();
      });
    });

    it('does not call the callback if Transaction.prototype.execute fulfils', async () => {
      executeStub.reset();
      executeStub.returns(Promise.resolve());
      const transaction = new Transaction();
      const spy = sinon.spy();
      await transaction.catch(spy);
      await expect(spy, 'was not called');
    });

    it('calls the callback if Transaction.prototype.execute rejects', async () => {
      executeStub.returns(Promise.reject(new Error('foo')));
      const transaction = new Transaction();
      const spy = sinon.spy();
      await transaction.catch(spy);
      await expect(spy, 'to have calls exhaustively satisfying', () => {
        spy(new Error('foo'));
      });
    });

    describe('when called without a callback', () => {
      it("rejects with Transaction.prototype.execute's rejection reason", async () => {
        executeStub.returns(Promise.reject(new Error('foo')));
        const transaction = new Transaction();
        await expect(
          transaction.catch(),
          'to be rejected with',
          new Error('foo')
        );
      });

      it('fulfils if Transaction.prototype.execute fulfils', async () => {
        executeStub.reset();
        executeStub.returns(Promise.resolve());
        const transaction = new Transaction();
        await expect(transaction.catch(), 'to be fulfilled');
      });
    });
  });

  describe('for db operations', () => {
    let User;
    let Model;
    let Connection;
    let Transaction;
    let TransactionError;

    before(() => {
      ({ Model, Connection, Transaction } = new Knorm().use(postgresPlugin));
      ({ TransactionError } = Transaction);

      User = class extends Model {};
      User.table = 'user';
      User.fields = {
        id: { type: 'integer', primary: true, updated: false },
        name: 'string'
      };
    });

    before(async () => knex.schema.dropTableIfExists(User.table));

    before(async () =>
      knex.schema.createTable(User.table, table => {
        table.increments().primary();
        table.string('name');
      })
    );

    after(async () => knex.schema.dropTable(User.table));

    afterEach(async () => knex(User.table).truncate());

    describe('with a callback function', () => {
      it('enables transaction model operations', async () => {
        await new Transaction(async transaction => {
          await transaction.models.User.insert({ id: 1, name: 'foo' });
        });
        await expect(
          knex,
          'with table',
          User.table,
          'to have sorted rows satisfying',
          [{ id: 1, name: 'foo' }]
        );
      });

      it('enables running multiple queries in a transaction', async () => {
        await new Transaction(async ({ models: { User } }) => {
          await User.insert({ id: 1, name: 'foo' });
          await User.insert({ id: 2, name: 'bar' });
          await User.update({ id: 1, name: 'foofoo' });
        });
        await expect(
          knex,
          'with table',
          User.table,
          'to have sorted rows satisfying',
          [{ id: 1, name: 'foofoo' }, { id: 2, name: 'bar' }]
        );
      });

      it('runs queries with one connection', async () => {
        const create = sinon.spy(Connection.prototype, 'create');
        await new Transaction(async ({ models: { User } }) => {
          await User.insert({ id: 1, name: 'foo' });
          await User.insert({ id: 2, name: 'bar' });
        });
        await expect(create, 'to have calls satisfying', () => create());
        create.restore();
      });

      it('runs queries with one connection even with nested models', async () => {
        const create = sinon.spy(Connection.prototype, 'create');
        await new Transaction(async ({ models: { User } }) => {
          class FooUser extends User {
            async foo() {
              await User.insert({ id: 1, name: 'foo' });
              await User.insert({ id: 2, name: 'bar' });
            }
          }
          await new FooUser().foo();
          await User.update({ id: 1, name: 'foofoo' });
        });
        await expect(
          knex,
          'with table',
          User.table,
          'to have sorted rows satisfying',
          [{ id: 1, name: 'foofoo' }, { id: 2, name: 'bar' }]
        );
        await expect(create, 'to have calls satisfying', () => create());
        create.restore();
      });

      it('runs insert queries with a `batchSize` with a single connection', async () => {
        const create = sinon.spy(Connection.prototype, 'create');
        const query = sinon.spy(Connection.prototype, 'query');
        await new Transaction(async ({ models: { User } }) => {
          await User.insert([{ id: 1, name: 'foo' }, { id: 2, name: 'bar' }], {
            batchSize: 1
          });
        });
        await expect(
          knex,
          'with table',
          User.table,
          'to have sorted rows satisfying',
          [{ id: 1, name: 'foo' }, { id: 2, name: 'bar' }]
        );
        await expect(create, 'to have calls satisfying', () => create());
        await expect(query, 'to have calls satisfying', () => {
          query('BEGIN');
          query({ text: expect.it('to be a string'), values: [1, 'foo'] });
          query({ text: expect.it('to be a string'), values: [2, 'bar'] });
          query('COMMIT');
        });
        create.restore();
        query.restore();
      });

      it('rolls back a transaction on failure', async () => {
        await expect(
          new Transaction(async ({ models: { User } }) => {
            await User.insert({ id: 1, name: 'foo' });
            await User.insert({ id: 1, name: 'bar' }); // primary key error
          }),
          'to be rejected with error satisfying',
          {
            message:
              'User: duplicate key value violates unique constraint "user_pkey"'
          }
        );
        await expect(knex, 'with table', User.table, 'to be empty');
      });

      it('closes the connection after runnning queries', async () => {
        const close = sinon.spy(Connection.prototype, 'close');
        await new Transaction(async ({ models: { User } }) => {
          await User.insert({ id: 1, name: 'foo' });
          await User.insert({ id: 2, name: 'bar' });
        });
        await expect(close, 'to have calls satisfying', () => close());
        close.restore();
      });

      it('closes the connection if `begin` fails', async () => {
        const close = sinon.spy(Connection.prototype, 'close');
        const query = sinon
          .stub(Connection.prototype, 'query')
          .callsFake(sql => {
            if (sql === 'BEGIN') {
              throw new Error('begin error');
            }
            return { rows: [] };
          });
        const transaction = new Transaction(() => {});
        await expect(
          transaction.execute(),
          'to be rejected with error satisfying',
          new TransactionError(new Error('begin error'))
        );
        await expect(query, 'to have calls satisfying', () => {
          query('BEGIN');
        });
        await expect(close, 'to have calls satisfying', () => close());
        query.restore();
        close.restore();
      });

      it('closes the connection if the transaction callback throws', async () => {
        const close = sinon.spy(Connection.prototype, 'close');
        const transaction = new Transaction(() => {
          throw new Error('foo');
        });
        await expect(
          transaction.execute(),
          'to be rejected with error satisfying',
          new Error('foo')
        );
        await expect(close, 'to have calls satisfying', () => close());
        close.restore();
      });

      it('closes the connection if `commit` fails', async () => {
        const close = sinon.spy(Connection.prototype, 'close');
        const query = sinon
          .stub(Connection.prototype, 'query')
          .callsFake(sql => {
            if (sql === 'COMMIT') {
              throw new Error('commit error');
            }
            return { rows: [] };
          });
        const transaction = new Transaction(async ({ models: { User } }) => {
          await User.query.execute('select now()');
        });
        await expect(
          transaction.execute(),
          'to be rejected with error satisfying',
          new TransactionError(new Error('commit error'))
        );
        await expect(query, 'to have calls satisfying', () => {
          query('BEGIN');
          query({ text: 'select now()' });
          query('COMMIT');
          query('ROLLBACK'); // rollback will be automatically called
        });
        await expect(close, 'to have calls satisfying', () => close());
        query.restore();
        close.restore();
      });

      it('closes the connection if `rollback` fails', async () => {
        const close = sinon.spy(Connection.prototype, 'close');
        const query = sinon
          .stub(Connection.prototype, 'query')
          .callsFake(sql => {
            if (sql === 'ROLLBACK') {
              throw new Error('rollback error');
            }
            return { rows: [] };
          });
        const transaction = new Transaction(async ({ models: { User } }) => {
          await User.query.execute('select now()');
          throw new Error('foo'); // trigger rollback
        });
        await expect(
          transaction,
          'to be rejected with error satisfying',
          new TransactionError(new Error('rollback error'))
        );

        await expect(query, 'to have calls satisfying', () => {
          query('BEGIN');
          query({ text: 'select now()' });
          query('ROLLBACK');
        });
        await expect(close, 'to have calls satisfying', () => close());
        query.restore();
        close.restore();
      });
    });

    describe('without a callback function', () => {
      it('enables transaction model operations', async () => {
        const transaction = new Transaction();
        await transaction.models.User.insert({ id: 1, name: 'foo' });
        await transaction.commit();
        await expect(
          knex,
          'with table',
          User.table,
          'to have sorted rows satisfying',
          [{ id: 1, name: 'foo' }]
        );
      });

      it('enables running multiple queries in a transaction', async () => {
        const transaction = new Transaction();
        await transaction.models.User.insert({ id: 1, name: 'foo' });
        await transaction.models.User.insert({ id: 2, name: 'bar' });
        await transaction.models.User.update({ id: 1, name: 'foofoo' });
        await transaction.commit();
        await expect(
          knex,
          'with table',
          User.table,
          'to have sorted rows satisfying',
          [{ id: 1, name: 'foofoo' }, { id: 2, name: 'bar' }]
        );
      });

      it('runs queries with one connection', async () => {
        const create = sinon.spy(Connection.prototype, 'create');
        const transaction = new Transaction();
        await transaction.models.User.insert({ id: 1, name: 'foo' });
        await transaction.models.User.insert({ id: 2, name: 'bar' });
        await transaction.commit();
        await expect(create, 'to have calls satisfying', () => create());
        create.restore();
      });

      it('runs queries with one connection even with nested models', async () => {
        const create = sinon.spy(Connection.prototype, 'create');
        const transaction = new Transaction();
        class FooUser extends transaction.models.User {
          async foo() {
            await this.models.User.insert({ id: 1, name: 'foo' });
            await this.models.User.insert({ id: 2, name: 'bar' });
          }
        }
        await new FooUser().foo();
        await transaction.models.User.update({ id: 1, name: 'foofoo' });
        await transaction.commit();
        await expect(
          knex,
          'with table',
          User.table,
          'to have sorted rows satisfying',
          [{ id: 1, name: 'foofoo' }, { id: 2, name: 'bar' }]
        );
        await expect(create, 'to have calls satisfying', () => create());
        create.restore();
      });

      it('runs insert queries with a `batchSize` with a single connection', async () => {
        const create = sinon.spy(Connection.prototype, 'create');
        const query = sinon.spy(Connection.prototype, 'query');
        const transaction = new Transaction();
        await transaction.models.User.insert(
          [{ id: 1, name: 'foo' }, { id: 2, name: 'bar' }],
          { batchSize: 1 }
        );
        await transaction.commit();
        await expect(
          knex,
          'with table',
          User.table,
          'to have sorted rows satisfying',
          [{ id: 1, name: 'foo' }, { id: 2, name: 'bar' }]
        );
        await expect(create, 'to have calls satisfying', () => create());
        await expect(query, 'to have calls satisfying', () => {
          query('BEGIN');
          query({ text: expect.it('to be a string'), values: [1, 'foo'] });
          query({ text: expect.it('to be a string'), values: [2, 'bar'] });
          query('COMMIT');
        });
        create.restore();
        query.restore();
      });

      it('rolls back a transaction on query failure', async () => {
        await expect(
          async () => {
            const transaction = new Transaction();
            await transaction.models.User.insert({ id: 1, name: 'foo' });
            await transaction.models.User.insert([{ id: 1, name: 'bar' }]); // primary key error
            await transaction.commit();
          },
          'to be rejected with error satisfying',
          {
            message:
              'User: duplicate key value violates unique constraint "user_pkey"'
          }
        );
        await expect(knex, 'with table', User.table, 'to be empty');
      });

      it('closes the connection after `commit`', async () => {
        const close = sinon.spy(Connection.prototype, 'close');
        const transaction = new Transaction();
        await transaction.models.User.insert({ id: 1, name: 'foo' });
        await transaction.models.User.insert({ id: 2, name: 'bar' });
        await transaction.commit();
        await expect(close, 'to have calls satisfying', () => close());
        close.restore();
      });

      it('closes the connection after `rollback`', async () => {
        const close = sinon.spy(Connection.prototype, 'close');
        const transaction = new Transaction();
        await transaction.models.User.insert({ id: 1, name: 'foo' });
        await transaction.models.User.insert({ id: 2, name: 'bar' });
        await transaction.rollback();
        await expect(close, 'to have calls satisfying', () => close());
        close.restore();
      });

      it('closes the connection if `begin` fails', async () => {
        const close = sinon.spy(Connection.prototype, 'close');
        const query = sinon
          .stub(Connection.prototype, 'query')
          .callsFake(sql => {
            if (sql === 'BEGIN') {
              throw new Error('begin error');
            }
            return { rows: [] };
          });
        const transaction = new Transaction();
        await expect(
          transaction.begin(),
          'to be rejected with error satisfying',
          new TransactionError(new Error('begin error'))
        );
        await expect(query, 'to have calls satisfying', () => {
          query('BEGIN');
        });
        await expect(close, 'to have calls satisfying', () => close());
        query.restore();
        close.restore();
      });

      it('closes the connection if `commit` fails', async () => {
        const close = sinon.spy(Connection.prototype, 'close');
        const query = sinon
          .stub(Connection.prototype, 'query')
          .callsFake(sql => {
            if (sql === 'COMMIT') {
              throw new Error('commit error');
            }
            return { rows: [] };
          });
        const transaction = new Transaction();
        await transaction.models.User.query.execute('select now()');
        await expect(
          transaction.commit(),
          'to be rejected with error satisfying',
          new TransactionError(new Error('commit error'))
        );
        await expect(query, 'to have calls satisfying', () => {
          query('BEGIN');
          query({ text: 'select now()' });
          query('COMMIT');
          query('ROLLBACK'); // rollback will be automatically called
        });
        await expect(close, 'to have calls satisfying', () => close());
        query.restore();
        close.restore();
      });

      it('closes the connection if `rollback` fails', async () => {
        const close = sinon.spy(Connection.prototype, 'close');
        const query = sinon
          .stub(Connection.prototype, 'query')
          .callsFake(sql => {
            if (sql === 'ROLLBACK') {
              throw new Error('rollback error');
            }
            return { rows: [] };
          });
        const transaction = new Transaction();
        await transaction.models.User.query.execute('select now()');
        await expect(
          transaction.rollback(),
          'to be rejected with error satisfying',
          new TransactionError(new Error('rollback error'))
        );

        await expect(query, 'to have calls satisfying', () => {
          query('BEGIN');
          query({ text: 'select now()' });
          query('ROLLBACK');
        });
        await expect(close, 'to have calls satisfying', () => close());
        query.restore();
        close.restore();
      });
    });
  });
});

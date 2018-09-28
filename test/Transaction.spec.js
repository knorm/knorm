const Knorm = require('../lib/Knorm');
const sinon = require('sinon');
const expect = require('unexpected')
  .clone()
  .use(require('unexpected-sinon'))
  .use(require('unexpected-knex'));

describe('Transaction', function() {
  let Field;
  let Model;
  let Query;
  let Transaction;
  let TransactionError;
  let User;

  before(function() {
    const knorm = new Knorm();

    Field = knorm.Field;
    Model = knorm.Model;
    Query = knorm.Query;
    Transaction = knorm.Transaction;
    TransactionError = Transaction.TransactionError;

    User = class extends Model {};
    User.table = 'user';
    User.fields = { name: { type: 'string', primary: true } };
  });

  describe('constructor', function() {
    it('creates scoped Field, Model, Query', function() {
      const transaction = new Transaction();

      expect(transaction.Field.prototype, 'to be a', Field);
      expect(transaction.Model.prototype, 'to be a', Model);
      expect(transaction.Query.prototype, 'to be a', Query);

      expect(transaction.Model.Field, 'to be', transaction.Field);
      expect(transaction.Model.Query, 'to be', transaction.Query);
    });

    it('creates scoped models', function() {
      const transaction = new Transaction();
      const TransactionUser = transaction.models.User;

      expect(TransactionUser.name, 'to be', 'User');

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

      expect(TransactionUser.Field.prototype, 'to be a', Field);
      expect(TransactionUser.Field.models.User.prototype, 'to be a', User);
      expect(
        TransactionUser.Field.prototype.models.User.prototype,
        'to be a',
        User
      );
    });

    it('adds an accessor to the transaction instance', function() {
      const transaction = new Transaction();
      const TransactionUser = transaction.models.User;

      expect(transaction.Field.transaction, 'to be', transaction);
      expect(transaction.Query.transaction, 'to be', transaction);
      expect(transaction.Model.transaction, 'to be', transaction);

      expect(transaction.Field.prototype.transaction, 'to be', transaction);
      expect(transaction.Query.prototype.transaction, 'to be', transaction);
      expect(transaction.Model.prototype.transaction, 'to be', transaction);

      expect(TransactionUser.transaction, 'to be', transaction);
      expect(TransactionUser.Field.transaction, 'to be', transaction);
      expect(TransactionUser.Query.transaction, 'to be', transaction);

      expect(TransactionUser.prototype.transaction, 'to be', transaction);
      expect(TransactionUser.Field.prototype.transaction, 'to be', transaction);
      expect(TransactionUser.Query.prototype.transaction, 'to be', transaction);
    });
  });

  describe('Transaction.prototype.query', function() {
    it('rejects if not overridden', async function() {
      const transaction = new Transaction();
      await expect(
        transaction.query(),
        'to be rejected with error satisfying',
        new TransactionError('`Transaction.prototype.query` is not implemented')
      );
    });

    it('rejects on the scoped Query classes', async function() {
      class FooTransaction extends Transaction {
        async execute() {
          return this.callback(this);
        }
      }

      await expect(
        new FooTransaction(async ({ Query, models: { User } }) => {
          return new Query(User).insert({ name: 'foo' });
        }),
        'to be rejected with error satisfying',
        {
          originalError: new TransactionError(
            '`Transaction.prototype.query` is not implemented'
          )
        }
      );

      await expect(
        new FooTransaction(async ({ models: { User } }) => {
          return User.insert({ name: 'foo' });
        }),
        'to be rejected with error satisfying',
        {
          originalError: new TransactionError(
            '`Transaction.prototype.query` is not implemented'
          )
        }
      );
    });
  });

  describe('Transaction.prototype.execute', function() {
    it('rejects if not overridden', async function() {
      const transaction = new Transaction();
      await expect(
        transaction.execute(),
        'to be rejected with error satisfying',
        new TransactionError(
          '`Transaction.prototype.execute` is not implemented'
        )
      );
    });
  });

  describe('Transaction.prototype.then', function() {
    let executeStub;

    before(() => {
      executeStub = sinon.stub(Transaction.prototype, 'execute');
    });

    after(() => {
      executeStub.restore();
    });

    beforeEach(function() {
      executeStub.reset();
      executeStub.returns(Promise.resolve());
    });

    it('calls Transaction.prototype.execute', async function() {
      const transaction = new Transaction();
      await transaction.then();
      await expect(executeStub, 'to have calls satisfying', () => {
        executeStub();
      });
    });

    it('calls the callback', async function() {
      const transaction = new Transaction();
      const spy = sinon.spy();
      await transaction.then(spy);
      await expect(spy, 'to have calls satisfying', () => {
        spy(undefined);
      });
    });

    it("calls the callback with Transaction.prototype.execute's fulfillment value", async function() {
      executeStub.returns(Promise.resolve('foo'));
      const transaction = new Transaction();
      const spy = sinon.spy();
      await transaction.then(spy);
      await expect(spy, 'to have calls satisfying', () => {
        spy('foo');
      });
    });

    describe('when called without a callback', function() {
      it("resolves with Transaction.prototype.execute's fulfillment value", async function() {
        executeStub.returns(Promise.resolve('foo'));
        const transaction = new Transaction();
        await expect(transaction.then(), 'to be fulfilled with', 'foo');
      });

      it('rejects if Transaction.prototype.execute rejects', async function() {
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

  describe('Transaction.prototype.catch', function() {
    let executeStub;

    before(() => {
      executeStub = sinon.stub(Transaction.prototype, 'execute');
    });

    after(() => {
      executeStub.restore();
    });

    beforeEach(function() {
      executeStub.reset();
      executeStub.returns(Promise.resolve());
    });

    it('calls Transaction.prototype.execute', async function() {
      const transaction = new Transaction();
      await transaction.catch();
      await expect(executeStub, 'to have calls satisfying', () => {
        executeStub();
      });
    });

    it('does not call the callback if Transaction.prototype.execute fulfils', async function() {
      executeStub.reset();
      executeStub.returns(Promise.resolve());
      const transaction = new Transaction();
      const spy = sinon.spy();
      await transaction.catch(spy);
      await expect(spy, 'was not called');
    });

    it('calls the callback if Transaction.prototype.execute rejects', async function() {
      executeStub.returns(Promise.reject(new Error('foo')));
      const transaction = new Transaction();
      const spy = sinon.spy();
      await transaction.catch(spy);
      await expect(spy, 'to have calls satisfying', () => {
        spy(new Error('foo'));
      });
    });

    describe('when called without a callback', function() {
      it("rejects with Transaction.prototype.execute's rejection reason", async function() {
        executeStub.returns(Promise.reject(new Error('foo')));
        const transaction = new Transaction();
        await expect(
          transaction.catch(),
          'to be rejected with',
          new Error('foo')
        );
      });

      it('fulfils if Transaction.prototype.execute fulfils', async function() {
        executeStub.reset();
        executeStub.returns(Promise.resolve());
        const transaction = new Transaction();
        await expect(transaction.catch(), 'to be fulfilled');
      });
    });
  });
});

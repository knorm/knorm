const Knorm = require('../lib/Knorm');
const sinon = require('sinon');
const expect = require('unexpected')
  .clone()
  .use(require('unexpected-sinon'))
  .use(require('unexpected-knex'));

const { Field, Transaction, Model, Query } = new Knorm();
const { TransactionError } = Transaction;

class User extends Model {}
User.table = 'user';
User.fields = { name: { type: 'string', primary: true } };

describe('Transaction', function() {
  describe('constructor', function() {
    it('throws if not passed a transaction callback', function() {
      expect(
        () => new Transaction(),
        'to throw',
        new TransactionError('no `transaction` function provided')
      );
    });

    it('adds accessors to scoped Field, Model, Query and user models', function() {
      expect(new Transaction(() => {}), 'to satisfy', transaction => {
        expect(transaction.Field, 'to be', Field);
        expect(transaction.Query.prototype, 'to be a', Query);
        expect(transaction.Model.prototype, 'to be a', Model);
        expect(transaction.Model.Query.prototype, 'to be a', Query);
        expect(transaction.User.prototype, 'to be a', User);
      });
    });
  });

  describe('Transaction.prototype.query', function() {
    it('rejects if not overridden', async function() {
      const transaction = new Transaction(() => {});
      await expect(
        transaction.query(),
        'to be rejected with error satisfying',
        new TransactionError('`Transaction.prototype.query` is not implemented')
      );
    });

    it('rejects on the scoped Query classes', async function() {
      class FooTransaction extends Transaction {
        async execute() {
          // eslint-disable-next-line no-useless-call
          return this.transaction.call(this);
        }
      }

      await expect(
        new FooTransaction(async function() {
          return new this.Query(this.User).insert({ name: 'foo' });
        }),
        'to be rejected with error satisfying',
        {
          originalError: new TransactionError(
            '`Transaction.prototype.query` is not implemented'
          )
        }
      );

      await expect(
        new FooTransaction(async function() {
          return this.User.insert({ name: 'foo' });
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
      const transaction = new Transaction(() => {});
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
      const transaction = new Transaction(() => {});
      await transaction.then();
      await expect(executeStub, 'to have calls satisfying', () => {
        executeStub();
      });
    });

    it('calls the callback', async function() {
      const transaction = new Transaction(() => {});
      const spy = sinon.spy();
      await transaction.then(spy);
      await expect(spy, 'to have calls satisfying', () => {
        spy(undefined);
      });
    });

    it("calls the callback with Transaction.prototype.execute's fulfillment value", async function() {
      executeStub.returns(Promise.resolve('foo'));
      const transaction = new Transaction(() => {});
      const spy = sinon.spy();
      await transaction.then(spy);
      await expect(spy, 'to have calls satisfying', () => {
        spy('foo');
      });
    });

    describe('when called without a callback', function() {
      it("resolves with Transaction.prototype.execute's fulfillment value", async function() {
        executeStub.returns(Promise.resolve('foo'));
        const transaction = new Transaction(() => {});
        await expect(transaction.then(), 'to be fulfilled with', 'foo');
      });

      it('rejects if Transaction.prototype.execute rejects', async function() {
        executeStub.returns(Promise.reject(new Error('foo')));
        const transaction = new Transaction(() => {});
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
      const transaction = new Transaction(() => {});
      await transaction.catch();
      await expect(executeStub, 'to have calls satisfying', () => {
        executeStub();
      });
    });

    it('does not call the callback if Transaction.prototype.execute fulfils', async function() {
      executeStub.reset();
      executeStub.returns(Promise.resolve());
      const transaction = new Transaction(() => {});
      const spy = sinon.spy();
      await transaction.catch(spy);
      await expect(spy, 'was not called');
    });

    it('calls the callback if Transaction.prototype.execute rejects', async function() {
      executeStub.returns(Promise.reject(new Error('foo')));
      const transaction = new Transaction(() => {});
      const spy = sinon.spy();
      await transaction.catch(spy);
      await expect(spy, 'to have calls satisfying', () => {
        spy(new Error('foo'));
      });
    });

    describe('when called without a callback', function() {
      it("rejects with Transaction.prototype.execute's rejection reason", async function() {
        executeStub.returns(Promise.reject(new Error('foo')));
        const transaction = new Transaction(() => {});
        await expect(
          transaction.catch(),
          'to be rejected with',
          new Error('foo')
        );
      });

      it('fulfils if Transaction.prototype.execute fulfils', async function() {
        executeStub.reset();
        executeStub.returns(Promise.resolve());
        const transaction = new Transaction(() => {});
        await expect(transaction.catch(), 'to be fulfilled');
      });
    });
  });
});

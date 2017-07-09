const AbstractTransaction = require('../lib/Transaction');
const knex = require('./lib/knex')();
const sinon = require('sinon');
const expect = require('unexpected')
    .clone()
    .use(require('unexpected-sinon'))
    .use(require('unexpected-knex'));

describe('Transaction', function () {
    describe('constructor', function () {
        it('throws if not passed a callback', function () {
            expect(
                () => new AbstractTransaction(),
                'to throw',
                new Error('Transaction requires a callback')
            );
        });

        it('throws if Transaction.knex is not configured', function () {
            expect(
                () => new AbstractTransaction(() => {}),
                'to throw',
                new Error('Transaction.knex is not configured')
            );
        });
    });

    describe('Transaction.prototype.execute', function () {
        class Transaction extends AbstractTransaction {}

        before(async function () {
            Transaction.knex = knex;
            await knex.schema.createTable('user', table => {
                table.increments();
                table.string('name').notNullable();
            });
        });

        after(async function () {
            await knex.schema.dropTable('user');
        });

        afterEach(async function () {
            await knex('user').truncate();
        });

        it('calls the callback with a transaction object', async function () {
            const spy = sinon.spy();
            const transaction = new Transaction(spy);
            await transaction.execute();
            await expect(spy, 'to have calls satisfying', () => {
                spy(expect.it('to satisfy', {
                    commit: expect.it('to be a function'),
                    rollback: expect.it('to be a function'),
                }));
            });
        });

        it('resolves with the result returned by the callback', async function () {
            const transaction = new Transaction(() => 'foo');
            await expect(
                transaction.execute(),
                'to be fulfilled with',
                'foo'
            );
        });
        it('rejects with the error returned by the callback', async function () {
            const transaction = new Transaction(() => {
                throw new Error('foo');
            });
            await expect(
                transaction.execute(),
                'to be rejected with',
                new Error('foo')
            );
        });

        it("commits the transaction if the callback doesn't reject", async function () {
            const transaction = new Transaction(async transaction => {
                const result = await knex('user')
                    .transacting(transaction)
                    .returning('*')
                    .insert({ name: 'John' });

                const user = result[0];

                return user;
            });

            await expect(
                transaction.execute(),
                'to be fulfilled with value exhaustively satisfying',
                {
                    id: 1,
                    name: 'John',
                }
            );

            await expect(
                knex, 'with table', 'user',
                'to have rows exhaustively satisfying', [{
                    id: 1,
                    name: 'John',
                }]
            );
        });

        it('rolls back the transaction if the callback rejects', async function () {
            const transaction = new Transaction(async transaction => {
                await knex('user')
                    .transacting(transaction)
                    .returning('*')
                    .insert({ name: 'John' });

                throw new Error('foo');
            });

            await expect(
                transaction.execute(),
                'to be rejected with',
                new Error('foo')
            );

            await expect(knex, 'with table', 'user', 'to be empty');
        });
    });

    describe('Transaction.prototype.then', function () {
        class Transaction extends AbstractTransaction {}

        Transaction.knex = knex;

        const executeStub = sinon.stub(Transaction.prototype, 'execute');

        beforeEach(function () {
            executeStub.reset();
            executeStub.returns(Promise.resolve());
        });

        it('calls Transaction.prototype.execute', async function () {
            const transaction = new Transaction(() => {});
            await transaction.then();
            await expect(executeStub, 'to have calls satisfying', () => {
                executeStub();
            });
        });

        it('calls the callback', async function () {
            const transaction = new Transaction(() => {});
            const spy = sinon.spy();
            await transaction.then(spy);
            await expect(spy, 'to have calls satisfying', () => {
                spy(undefined);
            });
        });

        it("calls the callback with Transaction.prototype.execute's fulfillment value", async function () {
            executeStub.returns(Promise.resolve('foo'));
            const transaction = new Transaction(() => {});
            const spy = sinon.spy();
            await transaction.then(spy);
            await expect(spy, 'to have calls satisfying', () => {
                spy('foo');
            });
        });

        describe('when called without a callback', function () {
            it("resolves with Transaction.prototype.execute's fulfillment value", async function () {
                executeStub.returns(Promise.resolve('foo'));
                const transaction = new Transaction(() => {});
                await expect(
                    transaction.then(),
                    'to be fulfilled with',
                    'foo'
                );
            });

            it('rejects if Transaction.prototype.execute rejects', async function () {
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

    describe('Transaction.prototype.catch', function () {
        class Transaction extends AbstractTransaction {}

        Transaction.knex = knex;

        const executeStub = sinon.stub(Transaction.prototype, 'execute');

        beforeEach(function () {
            executeStub.reset();
            executeStub.returns(Promise.resolve());
        });

        it('calls Transaction.prototype.execute', async function () {
            const transaction = new Transaction(() => {});
            await transaction.catch();
            await expect(executeStub, 'to have calls satisfying', () => {
                executeStub();
            });
        });

        it('does not call the callback if Transaction.prototype.execute fulfils', async function () {
            executeStub.reset();
            executeStub.returns(Promise.resolve());
            const transaction = new Transaction(() => {});
            const spy = sinon.spy();
            await transaction.catch(spy);
            await expect(spy, 'was not called');
        });

        it('calls the callback if Transaction.prototype.execute rejects', async function () {
            executeStub.returns(Promise.reject(new Error('foo')));
            const transaction = new Transaction(() => {});
            const spy = sinon.spy();
            await transaction.catch(spy);
            await expect(spy, 'to have calls satisfying', () => {
                spy(new Error('foo'));
            });
        });

        describe('when called without a callback', function () {
            it("rejects with Transaction.prototype.execute's rejection reason", async function () {
                executeStub.returns(Promise.reject(new Error('foo')));
                const transaction = new Transaction(() => {});
                await expect(
                    transaction.catch(),
                    'to be rejected with',
                    new Error('foo')
                );
            });

            it('fulfils if Transaction.prototype.execute fulfils', async function () {
                executeStub.reset();
                executeStub.returns(Promise.resolve());
                const transaction = new Transaction(() => {});
                await expect(transaction.catch(), 'to be fulfilled');
            });
        });
    });
});

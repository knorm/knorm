const Query = require('../../../lib/newModels/Query');
const DbModel = require('../../../lib/newModels/DbModel');
const Field = require('../../../lib/newModels/Field');
const knex = require('../../../lib/services/knex')();
const sinon = require('sinon');
const expect = require('unexpected')
    .clone()
    .use(require('unexpected-sinon'))
    .use(require('../../unexpected-sorted-array'))
    .addAssertion('<function> to be an error named <string>', function (expect, CustomError, name) {
        const error = new CustomError();
        return expect(error, 'to satisfy', {
            name,
            [name]: true,
        });
    });

const createUserTable = table => {
    table.increments();
    table.timestamps();
    table.string('name').notNullable();
    table.text('description');
    table.integer('age');
    table.boolean('confirmed').notNullable();
    table.dateTime('date_of_birth');
    table.string('db_default').defaultTo('set-by-db');
};

const truncateUserTable = () => {
    return knex.schema.raw('TRUNCATE "user" RESTART IDENTITY');
};

class User extends DbModel {}
User.table = 'user';
User.fields = {
    name: {
        type: Field.types.string,
        required: true,
    },
    description: {
        type: Field.types.string,
    },
    age: {
        type: Field.types.integer,
        default: null,
    },
    confirmed: {
        type: Field.types.boolean,
        required: true,
        default: false,
    },
    dateOfBirth: {
        type: Field.types.dateTime,
    },
    dbDefault: {
        type: Field.types.string,
    },
};

describe('lib/newModels/DbModel', function () {
    before(require('../../helpers/preparePostgres'));

    before(async function () {
        await knex.schema.createTable(User.table, createUserTable);
    });

    after(async function () {
        await knex.schema.dropTable(User.table);
    });

    describe('DbModel.query', function () {
        it('is a getter that returns a Query instance', function () {
            expect(User.query, 'to be a', Query);
        });

        it("returns a new Query every time it's accessed", function () {
            let query1 = User.query.where({ id: 1 }).builder.toString();
            let query2 = User.query.builder.toString();

            expect(query1, 'not to equal', query2);
            expect(query1, 'to contain', 'where');
            expect(query2, 'not to contain', 'where');
        });
    });

    describe('DbModel.errors', function () {
        describe('as a setter', function () {
            it("returns the model's errors", function () {
                expect(DbModel.errors, 'to exhaustively satisfy', {
                    CountError: expect.it('to be an error named', 'DbModelCountError'),
                    FetchRowError: expect.it('to be an error named', 'DbModelFetchRowError'),
                    FetchRowsError: expect.it('to be an error named', 'DbModelFetchRowsError'),
                    SaveError: expect.it('to be an error named', 'DbModelSaveError'),
                    RowNotInsertedError: expect.it('to be an error named', 'DbModelNotInsertedError'),
                    RowNotUpdatedError: expect.it('to be an error named', 'DbModelNotUpdatedError'),
                    RowNotFoundError: expect.it('to be an error named', 'DbModelNotFoundError'),
                    RowsNotFoundError: expect.it('to be an error named', 'DbModelsNotFoundError'),
                });

                expect(User.errors, 'to exhaustively satisfy', {
                    CountError: expect.it('to be an error named', 'UserCountError'),
                    FetchRowError: expect.it('to be an error named', 'UserFetchRowError'),
                    FetchRowsError: expect.it('to be an error named', 'UserFetchRowsError'),
                    SaveError: expect.it('to be an error named', 'UserSaveError'),
                    RowNotInsertedError: expect.it('to be an error named', 'UserNotInsertedError'),
                    RowNotUpdatedError: expect.it('to be an error named', 'UserNotUpdatedError'),
                    RowNotFoundError: expect.it('to be an error named', 'UserNotFoundError'),
                    RowsNotFoundError: expect.it('to be an error named', 'UsersNotFoundError'),
                });
            });
        });

        describe('as a setter', function () {
            it("adds the errors passed to the model's default errors", function () {
                class Student extends User {}

                Student.errors = {
                    StudentFooError: { studentFoo: 'bar' },
                };

                expect(Student.errors, 'to exhaustively satisfy', {
                    CountError: expect.it('to be an error named', 'StudentCountError'),
                    FetchRowError: expect.it('to be an error named', 'StudentFetchRowError'),
                    FetchRowsError: expect.it('to be an error named', 'StudentFetchRowsError'),
                    SaveError: expect.it('to be an error named', 'StudentSaveError'),
                    RowNotInsertedError: expect.it('to be an error named', 'StudentNotInsertedError'),
                    RowNotUpdatedError: expect.it('to be an error named', 'StudentNotUpdatedError'),
                    RowNotFoundError: expect.it('to be an error named', 'StudentNotFoundError'),
                    RowsNotFoundError: expect.it('to be an error named', 'StudentsNotFoundError'),
                    StudentFooError: { studentFoo: 'bar' },
                });
            });

            describe('when a model is subclassed', function () {
                it("doesn't overwrite the parent's errors", function () {
                    User.errors = {
                        UserFooError: { userFoo: 'bar' },
                    };

                    class Student extends User {}

                    Student.errors = {
                        StudentFooError: { studentFoo: 'bar' },
                    };

                    expect(Student.errors, 'to exhaustively satisfy', {
                        CountError: expect.it('to be an error named', 'StudentCountError'),
                        FetchRowError: expect.it('to be an error named', 'StudentFetchRowError'),
                        FetchRowsError: expect.it('to be an error named', 'StudentFetchRowsError'),
                        SaveError: expect.it('to be an error named', 'StudentSaveError'),
                        RowNotInsertedError: expect.it('to be an error named', 'StudentNotInsertedError'),
                        RowNotUpdatedError: expect.it('to be an error named', 'StudentNotUpdatedError'),
                        RowNotFoundError: expect.it('to be an error named', 'StudentNotFoundError'),
                        RowsNotFoundError: expect.it('to be an error named', 'StudentsNotFoundError'),
                        UserFooError: { userFoo: 'bar' },
                        StudentFooError: { studentFoo: 'bar' },
                    });

                    delete User.errors.UserFooError;
                });
            });
        });
    });

    describe('DbModel.fetchById', function () {
        it("calls DbModel.fetchOne with the id provided and sets the 'require' to true", async function () {
            const spy = sinon.stub(User, 'fetchOne').returns(Promise.resolve());
            await User.fetchById(1, { require: false });
            await expect(spy, 'to have calls satisfying', () => {
                spy({ where: { id: 1 }, require: true });
            });
            spy.restore();
        });

        it('calls DbModel.fetchOne with the extra options passed', async function () {
            const spy = sinon.stub(User, 'fetchOne').returns(Promise.resolve());
            await User.fetchById(1, { fields: ['name'] });
            await expect(spy, 'to have calls satisfying', () => {
                spy({ where: { id: 1 }, require: true, fields: ['name'] });
            });
            spy.restore();
        });
    });

    describe('DbModel.fetchByUserId', function () {
        it("calls DbModel.fetchOne with the userId provided and sets the 'require' to true", async function () {
            const spy = sinon.stub(User, 'fetchOne').returns(Promise.resolve());
            await User.fetchByUserId(1, { require: false });
            await expect(spy, 'to have calls satisfying', () => {
                spy({ where: { userId: 1 }, require: true });
            });
            spy.restore();
        });

        it('calls DbModel.fetchOne with the extra options passed', async function () {
            const spy = sinon.stub(User, 'fetchOne').returns(Promise.resolve());
            await User.fetchByUserId(1, { fields: ['name'] });
            await expect(spy, 'to have calls satisfying', () => {
                spy({ where: { userId: 1 }, require: true, fields: ['name'] });
            });
            spy.restore();
        });
    });

    describe('DbModel.transact', function () {
        afterEach(async function () {
            await truncateUserTable();
        });

        it('calls the callback with a transaction object', async function () {
            const spy = sinon.spy();
            await User.transact(spy);
            await expect(spy, 'to have calls satisfying', () => {
                spy(expect.it('to be a function'));
            });
        });

        it('resolves with the result returned by the callback', async function () {
            await expect(
                User.transact(() => 'foo'),
                'to be fulfilled with',
                'foo'
            );
        });

        it('rejects with the error returned by the callback', async function () {
            await expect(
                User.transact(() => { throw new Error('foo'); }),
                'to be rejected with',
                new Error('foo')
            );
        });

        it("commits the transaction if the callback doesn't reject", async function () {
            let user;
            await expect(
                User.transact(async transaction => {
                    user = await User.save({ name: 'John' }, { transaction });
                    return User.save({ id: user.id, name: 'Jane' }, { transaction });
                }),
                'to be fulfilled with',
                {
                    name: 'Jane',
                }
            );
            await expect(knex('user').select(), 'to be fulfilled with', [{
                id: user.id,
                name: 'Jane',
            }]);
        });

        it('rolls back the transaction if the callback rejects', async function () {
            let user;
            await expect(
                User.transact(async transaction => {
                    user = await User.save({ name: 'John' }, { transaction });
                    await User.save({ id: user.id, name: 'Jane' }, { transaction });
                    throw new Error('foo');
                }),
                'to be rejected with',
                new Error('foo')
            );
            await expect(knex('user').select(), 'to be fulfilled with', expect.it('to be empty'));
        });
    });

    describe('DbModel.prototype.save', function () {
        afterEach(async function () {
            await truncateUserTable();
        });

        it('saves the data on a model instance to the database', async function () {
            const user = new User({ name: 'John Doe' });
            await expect(user.save(), 'to be fulfilled');
            await expect(knex('user').select(), 'to be fulfilled with', [{
                name: 'John Doe',
            }]);
        });

        it('proxies to Model.save', async function () {
            const stub = sinon.stub(User, 'save').returns(Promise.resolve());
            const user = new User({ name: 'John Doe' });
            await expect(user.save(), 'to be fulfilled');
            await expect(stub, 'to have calls satisfying', () => {
                stub(user, undefined);
            });
            stub.restore();
        });

        it('passes any options passed to Model.save', async function () {
            const stub = sinon.stub(User, 'save').returns(Promise.resolve());
            const user = new User({ name: 'John Doe' });
            await expect(user.save({ foo: 'bar' }), 'to be fulfilled');
            await expect(stub, 'to have calls satisfying', () => {
                stub(user, { foo: 'bar' });
            });
            stub.restore();
        });
    });

    describe('DbModel.prototype.fetch', function () {
        let clock;

        before(async function () {
            clock = sinon.useFakeTimers('Date');
            await knex('user').insert([
                {
                    id: 1,
                    name: 'User 1',
                    confirmed: false,
                    description: 'this is user 1',
                    age: 10,
                    date_of_birth: new Date(1000),
                },
                {
                    id: 2,
                    name: 'User 2',
                    confirmed: true,
                    description: 'this is user 2',
                    age: 20,
                    date_of_birth: new Date(2000),
                },
            ]);
        });

        after(async function () {
            clock.restore();
            await truncateUserTable();
        });

        it('fetches and populates a model instance from the database with the data set on it', async function () {
            const user = new User({ name: 'User 1' });
            await expect(user.fetch(), 'to be fulfilled with', new User({
                id: 1,
                name: 'User 1',
                confirmed: false,
                description: 'this is user 1',
                age: 10,
                dateOfBirth: new Date(1000),
                createdAt: null,
                updatedAt: null,
                dbDefault: 'set-by-db',
            }));
        });

        it('retains other properties already set on the instance', async function () {
            const user = new User({ name: 'User 1' });
            user.iKnowWhoIam = 'me';
            await expect(user.fetch(), 'to be fulfilled with', {
                id: 1,
                name: 'User 1',
                iKnowWhoIam: 'me',
            });
        });

        it("proxies to Model.fetchRow with 'require' set to true", async function () {
            const stub = sinon.stub(User, 'fetchRow').returns(Promise.resolve({}));
            const user = new User({ name: 'User 1' });
            await expect(user.fetch({ require: false }), 'to be fulfilled');
            await expect(stub, 'to have calls satisfying', () => {
                stub({ where: { name: 'User 1' }, require: true });
            });
            stub.restore();
        });

        it('passes any other options passed to Model.fetchRow', async function () {
            const stub = sinon.stub(User, 'fetchRow').returns(Promise.resolve({}));
            const user = new User({ name: 'User 1' });
            await expect(user.fetch({ foo: 'bar' }), 'to be fulfilled');
            await expect(stub, 'to have calls satisfying', () => {
                stub({ where: { name: 'User 1' }, foo: 'bar', require: true });
            });
            stub.restore();
        });
    });
});

const QueryBuilder = require('knex/lib/query/builder');
const AbstractModel = require('../Model');
const Field = require('../Field');
const knex = require('./lib/knex')();
const AbstractQuery = require('../Query');
const sinon = require('sinon');
const expect = require('unexpected')
    .clone()
    .use(require('unexpected-sinon'));

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
    return knex.schema.raw('TRUNCATE "user" RESTART IDENTITY CASCADE');
};

class Model extends AbstractModel {}

Model.fields = {
    id: {
        type: Field.types.integer,
        required: true,
    },
    createdAt: {
        type: Field.types.dateTime,
        default: () => new Date(),
    },
    updatedAt: {
        type: Field.types.dateTime,
        default: () => new Date(),
    },
};

class User extends Model {}
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

const createImageCategoryTable = table => {
    table.increments();
    table.timestamps();
    table.string('name').notNullable();
};

const truncateImageCategoryTable = () => {
    return knex.schema.raw('TRUNCATE "image_category" RESTART IDENTITY CASCADE');
};

class ImageCategory extends Model {}
ImageCategory.table = 'image_category';
ImageCategory.fields = {
    name: {
        type: Field.types.string,
        required: true,
    },
};

const createImageTable = table => {
    table.increments();
    table.timestamps();
    table.integer('user_id').references('id').inTable('user');
    table.integer('category_id').references('id').inTable('user');
};

const truncateImageTable = () => {
    return knex('image').truncate();
};

class Image extends Model {}
Image.table = 'image';
Image.fields = {
    userId: {
        type: Field.types.integer,
        references: User.fields.id,
    },
    categoryId: {
        type: Field.types.integer,
        references: ImageCategory.fields.id,
    },
};

class Dummy extends Model {}
Dummy.table = 'dummy_table';
Dummy.fields = {
    fieldOne: {
        type: Field.types.integer,
        references: User.fields.id,
    },
    fieldTwo: {
        type: Field.types.integer,
        references: User.fields.createdAt,
    },
    fieldThree: {
        type: Field.types.integer,
        references: User.fields.updatedAt,
    },
};

class Query extends AbstractQuery {}
Query.knex = knex;

describe('lib/newModels/Query', function () {
    before(async function () {
        await knex.schema.createTable(User.table, createUserTable);
        await knex.schema.createTable(ImageCategory.table, createImageCategoryTable);
        await knex.schema.createTable(Image.table, createImageTable);
    });

    after(async function () {
        await knex.schema.dropTable(Image.table);
        await knex.schema.dropTable(ImageCategory.table);
        await knex.schema.dropTable(User.table);
    });

    describe('constructor', function () {
        it('throws an error if not passed a model', function () {
            expect(
                () => new Query(),
                'to throw',
                new Error('Query requires a Model class')
            );
        });

        it('throws an error if the passed model does not inherit from Model', function () {
            class Foo {}
            expect(
                () => new Query(Foo),
                'to throw',
                new Error('Query requires a subclass of Model')
            );
        });

        it("throws an error if the passed model's table-name is not set", function () {
            class Foo extends Model {}
            expect(
                () => new Query(Foo),
                'to throw',
                new Error("'Foo.table' is not configured")
            );
        });

        it('throws an error if Query.knex is not configured', function () {
            class Foo extends Model {}
            Foo.table = 'foo';
            expect(
                () => new AbstractQuery(Foo),
                'to throw',
                new Error('Query.knex is not configured')
            );
        });
    });

    describe('Query.prototype.count', function () {
        before(async function () {
            await knex('user').insert([
                {
                    id: 1,
                    name: 'User 1',
                    confirmed: false,
                    description: 'this is user 1',
                    age: 10,
                    date_of_birth: null,
                },
                {
                    id: 2,
                    name: 'User 2',
                    confirmed: true,
                    description: 'this is user 2',
                    age: 10,
                    date_of_birth: null,
                },
            ]);
            await knex('image_category').insert([
                {
                    id: 1,
                    name: 'User images',
                },
            ]);
            await knex('image').insert([
                {
                    id: 1,
                    user_id: 1,
                    category_id: 1,
                },
            ]);
        });

        after(async function () {
            await truncateImageTable();
            await truncateImageCategoryTable();
            await truncateUserTable();
        });

        it('resolves with the count of all the rows in the table if not passed any options', async function () {
            const query = new Query(User);
            await expect(
                query.count(),
                'to be fulfilled with',
                2
            );
        });

        it("accepts a 'field' option specifying the field to count", async function () {
            const query = new Query(User);
            await expect(
                query.count({ field: 'dateOfBirth' }),
                'to be fulfilled with',
                0 // since date_of_birth is null in both rows
            );
        });

        it("accepts a 'distinct' option to count distinct fields", async function () {
            const query = new Query(User);
            await expect(
                query.count({ distinct: User.fields.age }),
                'to be fulfilled with',
                1
            );
        });

        it('rejects with a ModelCountError if a database error occurs', async function () {
            const query = new Query(User);
            const stub = sinon.stub(QueryBuilder.prototype, 'first').returns(
                Promise.reject(new Error('count error'))
            );
            await expect(
                query.count(),
                'to be rejected with',
                new User.errors.CountError('count error')
            );
            stub.restore();
        });

        describe("with a 'where' configured", function () {
            it('resolves with the count of rows matching the query', async function () {
                const query = new Query(User).where({ confirmed: true });
                await expect(
                    query.count(),
                    'to be fulfilled with',
                    1
                );
            });
        });

        describe("with a 'with' configured", function () {
            it('resolves with the count of rows matching the join', async function () {
                const imageQuery = new Query(Image).require(true);
                const query = new Query(User).with(imageQuery);
                await expect(
                    query.count(),
                    'to be fulfilled with',
                    1
                );
            });
        });
    });

    describe.skip('Query.prototype.returning', function () {
        let returningSpy;
        let query;

        before(function () {
            returningSpy = sinon.spy(QueryBuilder.prototype, 'returning');
        });

        after(function () {
            returningSpy.restore();
        });

        beforeEach(function () {
            query = new Query(User);
            returningSpy.reset();
        });

        it("passes the fields to the query builder as columns with the model's table name", function () {
            query.returning([ User.fields.id, User.fields.name ]);
            expect(returningSpy, 'to have calls satisfying', () => {
                returningSpy([ 'user.id as id', 'user.name as name' ]);
            });
        });

        it('accepts an array of field names as (camel-cased) strings', function () {
            query.returning([ 'id', 'name' ]);
            expect(returningSpy, 'to have calls satisfying', () => {
                returningSpy([ 'user.id as id', 'user.name as name' ]);
            });
        });

        it('accepts a single field object', function () {
            query.returning(User.fields.age);
            expect(returningSpy, 'to have calls satisfying', () => {
                returningSpy([ 'user.age as age' ]);
            });
        });

        it('accepts a single field name as a string', function () {
            query.returning('age');
            expect(returningSpy, 'to have calls satisfying', () => {
                returningSpy([ 'user.age as age' ]);
            });
        });

        it("throws if the field-name isn't one of the fields in Model.fields", function () {
            expect(() => {
                query.returning('ages');
            }, 'to throw', new Error(
                "unknown field 'User.ages'"
            ));
        });

        it('uses the raw (snake-cased) representation of the field name', function () {
            query.returning(User.fields.dateOfBirth);
            expect(returningSpy, 'to have calls satisfying', () => {
                returningSpy([ 'user.date_of_birth as dateOfBirth' ]);
            });
        });

        it('accepts fields passed as an object to allow aliases', function () {
            query.returning({ dateOfBirth: 'dob', name: 'nomenclature' });
            expect(returningSpy, 'to have calls satisfying', () => {
                returningSpy([
                    'user.date_of_birth as dob',
                    'user.name as nomenclature',
                ]);
            });
        });

        it('accepts an object with field-names as keys and fields as values', function () {
            query.returning(User.fields);
            expect(returningSpy, 'to have calls satisfying', () => {
                returningSpy([
                    'user.id as id',
                    'user.created_at as createdAt',
                    'user.updated_at as updatedAt',
                    'user.name as name',
                    'user.description as description',
                    'user.age as age',
                    'user.confirmed as confirmed',
                    'user.date_of_birth as dateOfBirth',
                    'user.db_default as dbDefault',
                ]);
            });
        });

        it('throws if a key in the object is not a known field-name (in Model.fields)', function () {
            expect(() => {
                query.returning({ ages: 'age' });
            }, 'to throw', new Error(
                "unknown field 'User.ages'"
            ));
        });
    });

    describe.skip('Query.prototype.save', function () {
        let query;

        beforeEach(function () {
            query = new Query(User);
        });

        afterEach(async function () {
            await truncateUserTable();
        });

        it('saves a plain object to the database', async function () {
            await expect(
                query.save({ name: 'John Doe', confirmed: false }),
                'to be fulfilled'
            );
            await expect(knex('user').select(), 'to be fulfilled with', [{
                name: 'John Doe',
                confirmed: false,
            }]);
        });

        it('rejects with an error if a key in the object is not a valid field', async function () {
            await expect(
                query.save({ foo: 'John Doe' }),
                'to be rejected with',
                // TODO: standardize errors
                new Error("cannot populate unknown field 'foo'")
            );
        });

        it('saves an instance of the model to the database', async function () {
            const user = new User({ name: 'John Doe' });
            await expect(query.save(user), 'to be fulfilled');
            await expect(knex('user').select(), 'to be fulfilled with', [{
                name: 'John Doe',
            }]);
        });

        it('resolves with an instance of the model', async function () {
            await expect(
                query.save({ name: 'John Doe' }),
                'to be fulfilled with',
                expect.it('to be a', User)
            );
        });

        it('resolves with an object populated with data from the row in the database', async function () {
            const dateOfBirth = new Date();
            await expect(
                query.save({
                    dateOfBirth,
                    name: 'John Doe',
                    description: 'The description',
                    age: 123,
                    confirmed: true,
                }),
                'to be fulfilled with',
                new User({
                    dateOfBirth,
                    id: expect.it('to be a number'),
                    createdAt: expect.it('to be a', Date),
                    updatedAt: expect.it('to be a', Date),
                    name: 'John Doe',
                    description: 'The description',
                    age: 123,
                    confirmed: true,
                    dbDefault: 'set-by-db',
                })
            );
        });

        it('converts the fields to their database columns names', async function () {
            const spy = sinon.spy(QueryBuilder.prototype, 'insert');
            const dateOfBirth = new Date();
            await query.save({ dateOfBirth, name: 'John Doe', confirmed: true });
            await expect(spy, 'to have calls satisfying', () => {
                spy({
                    date_of_birth: dateOfBirth,
                    name: 'John Doe',
                    confirmed: true,
                });
            });
            spy.restore();
        });

        describe('with a transaction', function () {
            it('passes the transaction to the query builder', async function () {
                const spy = sinon.spy(QueryBuilder.prototype, 'transacting');
                const stub = sinon.stub(QueryBuilder.prototype, 'insert').returns(
                    Promise.resolve([{ id: 1 }])
                );
                await expect(
                    query.save(
                        { name: 'John Doe', confirmed: false },
                        { transaction: 'foo bar' }
                    ),
                    'to be fulfilled'
                );
                await expect(spy, 'to have calls satisfying', () => {
                    spy('foo bar');
                });
                spy.restore();
                stub.restore();
            });
        });

        describe('for inserts', function () {
            it('inserts a new row', async function () {
                await expect(
                    query.save({ name: 'John Doe', confirmed: false }),
                    'to be fulfilled'
                );
                await expect(knex('user').select(), 'to be fulfilled with', [{
                    id: 1,
                    name: 'John Doe',
                    confirmed: false,
                }]);
            });

            it('populates default values before saving', async function () {
                await query.save({ name: 'John Doe' });
                await expect(knex('user').select(), 'to be fulfilled with', [{
                    name: 'John Doe',
                    age: null,
                    confirmed: false,
                }]);
            });

            it("populates 'createdAt' and 'updatedAt' before saving", async function () {
                const clock = sinon.useFakeTimers('Date');
                const now = new Date();
                await query.save({ name: 'John Doe' });
                await expect(knex('user').select(), 'to be fulfilled with', [{
                    name: 'John Doe',
                    created_at: now,
                    updated_at: now,
                }]);
                clock.restore();
            });

            it('validates the data before saving', async function () {
                await expect(query.save({
                    name: 'John Doe',
                    age: 'cause error',
                }), 'to be rejected with', {
                    BadRequest: true,
                    InvalidUserAgeTypeError: true,
                });
            });

            it('sets the id of the model after inserting', async function () {
                const user = await query.save({
                    name: 'John Doe',
                    confirmed: false,
                });
                expect(user.id, 'to be', 1);
            });

            it('rejects with a SaveError if an insert error occurs', async function () {
                const stub = sinon.stub(QueryBuilder.prototype, 'insert').returns(
                    Promise.reject(new Error('insert error'))
                );
                await expect(
                    query.save({ name: 'John Doe', confirmed: false }),
                    'to be rejected with',
                    {
                        DatabaseError: true,
                        InternalServerError: true,
                        UserSaveError: true,
                        message: 'insert error',
                        data: { error: new Error('insert error') },
                    }
                );
                stub.restore();
            });

            it('rejects with a RowNotInsertedError if no id is returned from the database', async function () {
                const stub = sinon.stub(QueryBuilder.prototype, 'insert').returns(null);
                await expect(
                    query.save({ name: 'John Doe', confirmed: false }),
                    'to be rejected with',
                    {
                        DatabaseError: true,
                        InternalServerError: true,
                        UserNotInsertedError: true,
                    }
                );
                stub.restore();
            });
        });

        describe('for updates', function () {
            let user;
            let clock;

            before(function () {
                clock = sinon.useFakeTimers('Date');
            });

            beforeEach(async function () {
                clock.reset();
                user = await query.save({ name: 'John Doe', confirmed: false });
            });

            after(function () {
                clock.restore();
            });

            it('updates an existing row', async function () {
                await expect(knex('user').select(), 'to be fulfilled with', [{
                    name: 'John Doe',
                }]);
                user.name = 'Jane Doe';
                await expect(query.save(user), 'to be fulfilled');
                await expect(knex('user').select(), 'to be fulfilled with', [{
                    name: 'Jane Doe',
                }]);
            });

            it('validates only the fields that have values set', async function () {
                // allows sending an update without having fetched the model
                const newUser = new User({
                    id: user.id,
                    confirmed: true,
                });
                await expect(knex('user').select(), 'to be fulfilled with', [{
                    id: user.id,
                    name: 'John Doe',
                    confirmed: false,
                }]);
                // this passes even though 'name' is required and hasn't been set
                await expect(query.save(newUser), 'to be fulfilled');
                await expect(knex('user').select(), 'to be fulfilled with', [{
                    id: user.id,
                    name: 'John Doe',
                    confirmed: true,
                }]);
            });

            it("updates the 'updatedAt' of the model", async function () {
                const clock = sinon.useFakeTimers('Date');
                expect(user.createdAt, 'to equal', new Date(0));
                expect(user.updatedAt, 'to equal', new Date(0));
                clock.tick(1000);
                await query.save(user);
                expect(user.createdAt, 'to equal', new Date(0));
                expect(user.updatedAt, 'to equal', new Date(1000));
                await expect(knex('user').select(), 'to be fulfilled with', [{
                    created_at: new Date(0),
                    updated_at: new Date(1000),
                }]);
            });

            it('rejects with a ModelSaveError if an update error occurs', async function () {
                const stub = sinon.stub(QueryBuilder.prototype, 'update').returns(
                    Promise.reject(new Error('update error'))
                );
                user.name = 'Jane Doe';
                await expect(query.save(user), 'to be rejected with', {
                    DatabaseError: true,
                    InternalServerError: true,
                    UserSaveError: true,
                    message: 'update error',
                    data: { error: new Error('update error') },
                });
                stub.restore();
            });

            it('rejects with a ModelNotUpdatedError if no rows are updated', async function () {
                const stub = sinon.stub(QueryBuilder.prototype, 'update').returns([]);
                user.name = 'Jane Doe';
                await expect(query.save(user), 'to be rejected with', {
                    DatabaseError: true,
                    InternalServerError: true,
                    UserNotUpdatedError: true,
                });
                stub.restore();
            });
        });
    });

    describe.skip('Query.prototype.where', function () {
        let query;

        beforeEach(function () {
            query = new Query(User);
        });

        it('calls QueryBuilder.prototype.where with the column name of the passed fields', function () {
            const spy = sinon.spy(QueryBuilder.prototype, 'where');
            query.where({ id: 1, name: 'foo', dateOfBirth: 'foo' });
            expect(spy, 'to have calls satisfying', () => {
                spy('user.id', 1);
                spy('user.name', 'foo');
                spy('user.date_of_birth', 'foo');
            });
            spy.restore();
        });

        it('throws an error if a key in the object is not a field on the model', function () {
            expect(() => query.where({ foo: 'bar' }), 'to throw', new Error(
                "unknown field 'User.foo'"
            ));
        });

        it('calls QueryBuilder.prototype.whereIn if a field has an array value', function () {
            const spy = sinon.spy(QueryBuilder.prototype, 'whereIn');
            query.where({ name: [ 'foo', 'bar' ] });
            expect(spy, 'to have calls satisfying', () => {
                spy('user.name', [ 'foo', 'bar' ]);
            });
            spy.restore();
        });

        it('calls QueryBuilder.prototype.whereNull if a field has value null', function () {
            const spy = sinon.spy(QueryBuilder.prototype, 'whereNull');
            query.where({ name: null });
            expect(spy, 'to have calls satisfying', () => {
                spy('user.name');
            });
            spy.restore();
        });

        it('accepts a QueryBuilder instance', function () {
            const where = knex('user').where({
                name: 'User 2',
            });
            query.where(where);
            expect(
                query.builder.toString(),
                'to contain',
                "where \"name\" = 'User 2'"
            );
        });
    });

    describe.skip('Query.prototype.whereNot', function () {
        let query;

        beforeEach(function () {
            query = new Query(User);
        });

        it('calls QueryBuilder.prototype.whereNot with the column name of the passed fields', function () {
            const spy = sinon.spy(QueryBuilder.prototype, 'whereNot');
            query.whereNot({ id: 1, name: 'foo', dateOfBirth: 'foo' });
            expect(spy, 'to have calls satisfying', () => {
                spy('user.id', 1);
                spy('user.name', 'foo');
                spy('user.date_of_birth', 'foo');
            });
            spy.restore();
        });

        it('throws an error if a key in the object is not a field on the model', function () {
            expect(() => query.whereNot({ foo: 'bar' }), 'to throw', new Error(
                "unknown field 'User.foo'"
            ));
        });

        it('calls QueryBuilder.prototype.whereNotIn if a field has an array value', function () {
            const spy = sinon.spy(QueryBuilder.prototype, 'whereNotIn');
            query.whereNot({ name: [ 'foo', 'bar' ] });
            expect(spy, 'to have calls satisfying', () => {
                spy('user.name', [ 'foo', 'bar' ]);
            });
            spy.restore();
        });

        it('calls QueryBuilder.prototype.whereNotNull if a field has value null', function () {
            const spy = sinon.spy(QueryBuilder.prototype, 'whereNotNull');
            query.whereNot({ name: null });
            expect(spy, 'to have calls satisfying', () => {
                spy('user.name');
            });
            spy.restore();
        });
    });

    describe.skip('Query.prototype.orderBy', function () {
        let orderBySpy;
        let query;

        before(function () {
            orderBySpy = sinon.spy(QueryBuilder.prototype, 'orderBy');
        });

        after(function () {
            orderBySpy.restore();
        });

        beforeEach(function () {
            query = new Query(User);
            orderBySpy.reset();
        });

        it('calls QueryBuilder.prototype.orderBy with the column name of the passed fields', function () {
            query.orderBy({ id: 'asc', name: 'desc' });
            expect(orderBySpy, 'to have calls satisfying', () => {
                orderBySpy('user.id', 'asc');
                orderBySpy('user.name', 'desc');
            });
        });

        it('throws an error if a key in the object is not a field on the model', function () {
            expect(() => query.where({ foo: 'bar' }), 'to throw', new Error(
                "unknown field 'User.foo'"
            ));
        });

        it("accepts 1 as the order direction and converts it to 'asc'", function () {
            query.orderBy({ id: 1 });
            expect(orderBySpy, 'to have calls satisfying', () => {
                orderBySpy('user.id', 'asc');
            });
        });

        it("accepts -1 as the order direction and converts it to 'desc'", function () {
            query.orderBy({ id: -1 });
            expect(orderBySpy, 'to have calls satisfying', () => {
                orderBySpy('user.id', 'desc');
            });
        });
    });

    describe.skip('Query.prototype.fields', function () {
        let columnsSpy;
        let query;

        before(function () {
            columnsSpy = sinon.spy(QueryBuilder.prototype, 'columns');
        });

        after(function () {
            columnsSpy.restore();
        });

        beforeEach(function () {
            query = new Query(User);
            columnsSpy.reset();
        });

        it("passes the fields to the query builder as columns with the model's table name", function () {
            query.fields([ User.fields.id, User.fields.name ]);
            expect(columnsSpy, 'to have calls satisfying', () => {
                columnsSpy([ 'user.id as id', 'user.name as name' ]);
            });
        });

        it('accepts an array of field names as (camel-cased) strings', function () {
            query.fields([ 'id', 'name' ]);
            expect(columnsSpy, 'to have calls satisfying', () => {
                columnsSpy([ 'user.id as id', 'user.name as name' ]);
            });
        });

        it('accepts a single field object', function () {
            query.fields(User.fields.age);
            expect(columnsSpy, 'to have calls satisfying', () => {
                columnsSpy([ 'user.age as age' ]);
            });
        });

        it('accepts a single field name as a string', function () {
            query.fields('age');
            expect(columnsSpy, 'to have calls satisfying', () => {
                columnsSpy([ 'user.age as age' ]);
            });
        });

        it("throws if the field-name isn't one of the fields in Model.fields", function () {
            expect(() => {
                query.fields('ages');
            }, 'to throw', new Error(
                "unknown field 'User.ages'"
            ));
        });

        it('uses the raw (snake-cased) representation of the field name', function () {
            query.fields(User.fields.dateOfBirth);
            expect(columnsSpy, 'to have calls satisfying', () => {
                columnsSpy([ 'user.date_of_birth as dateOfBirth' ]);
            });
        });

        it('accepts fields passed as an object to allow aliases', function () {
            query.fields({ dateOfBirth: 'dob', name: 'nomenclature' });
            expect(columnsSpy, 'to have calls satisfying', () => {
                columnsSpy([
                    'user.date_of_birth as dob',
                    'user.name as nomenclature',
                ]);
            });
        });

        it('accepts an object with field-names as keys and fields as values', function () {
            query.fields(User.fields);
            expect(columnsSpy, 'to have calls satisfying', () => {
                columnsSpy([
                    'user.id as id',
                    'user.created_at as createdAt',
                    'user.updated_at as updatedAt',
                    'user.name as name',
                    'user.description as description',
                    'user.age as age',
                    'user.confirmed as confirmed',
                    'user.date_of_birth as dateOfBirth',
                    'user.db_default as dbDefault',
                ]);
            });
        });

        it('throws if a key in the object is not a known field-name (in Model.fields)', function () {
            expect(() => {
                query.fields({ ages: 'age' });
            }, 'to throw', new Error(
                "unknown field 'User.ages'"
            ));
        });
    });

    describe.skip('Query.prototype.with', function () {
        let leftJoinSpy;
        let innerJoinSpy;
        let query;

        before(function () {
            innerJoinSpy = sinon.spy(QueryBuilder.prototype, 'innerJoin');
            leftJoinSpy = sinon.spy(QueryBuilder.prototype, 'leftJoin');
        });

        after(function () {
            innerJoinSpy.restore();
            leftJoinSpy.restore();
        });

        beforeEach(function () {
            query = new Query(User);
            innerJoinSpy.reset();
            leftJoinSpy.reset();
        });

        it('creates a left join to the referenced model', function () {
            query.with(Image);
            expect(leftJoinSpy, 'to have calls satisfying', () => {
                leftJoinSpy('image as t1', {
                    't1.user_id': 'user.id',
                });
            });
            expect(innerJoinSpy, 'was not called');
        });

        it("creates an inner join when the 'require' option is passed", function () {
            query.with({ Image: { require: true } });
            expect(innerJoinSpy, 'to have calls satisfying', () => {
                innerJoinSpy('image as t1', {
                    't1.user_id': 'user.id',
                });
            });
            expect(leftJoinSpy, 'was not called');
        });

        describe('when the reference is reversed', function () {
            let imageQuery;

            beforeEach(function () {
                imageQuery = new Query(Image);
            });

            it('creates a left join with the right columns', function () {
                imageQuery.with(User);
                expect(leftJoinSpy, 'to have calls satisfying', () => {
                    leftJoinSpy('user as t1', {
                        't1.id': 'image.user_id',
                    });
                });
                expect(innerJoinSpy, 'was not called');
            });

            it("creates an inner join when the 'require' option is passed", function () {
                imageQuery.with({ User: { require: true } });
                expect(innerJoinSpy, 'to have calls satisfying', () => {
                    innerJoinSpy('user as t1', {
                        't1.id': 'image.user_id',
                    });
                });
                expect(leftJoinSpy, 'was not called');
            });
        });

        it("throws if the referenced model has no 'table' property", function () {
            class Bar extends Model {}
            expect(() => {
                query.with(Bar);
            }, 'to throw', new Error(
                "model 'Bar' has no table property"
            ));
        });

        it('throws if the model has no reference to the passed model', function () {
            expect(() => {
                query.with(ImageCategory);
            }, 'to throw', new Error(
                "model 'User' has no references to 'ImageCategory'"
            ));
        });

        it('accepts a string representing the model name', function () {
            query.with('Image');
            expect(leftJoinSpy, 'to have calls satisfying', () => {
                leftJoinSpy('image as t1', {
                    't1.user_id': 'user.id',
                });
            });
        });

        it('throws if the string is not a known model', function () {
            expect(() => {
                query.with('Images');
            }, 'to throw', new Error(
                "unknown model 'Images'"
            ));
        });

        it('accepts an object to allow aliases to the referenced table', function () {
            query.with({ Image: 'userImage' });
            expect(leftJoinSpy, 'to have calls satisfying', () => {
                leftJoinSpy('image as t1', {
                    't1.user_id': 'user.id',
                });
            });
        });

        it("throws if the key in the 'with' object is not a known model", function () {
            expect(() => {
                query.with({ Images: 'userImage' });
            }, 'to throw', new Error(
                "unknown model 'Images'"
            ));
        });

        it('accepts an array to allow multiple joins', function () {
            query.with([ Image, Image ]);
            expect(leftJoinSpy, 'to have calls satisfying', () => {
                leftJoinSpy('image as t1', {
                    't1.user_id': 'user.id',
                });
                leftJoinSpy('image as t2', {
                    't2.user_id': 'user.id',
                });
            });
        });

        it('accepts an object array to allow multiple joins with aliases', function () {
            query.with([
                { Image: 'image1' },
                { Image: 'image2' },
            ]);
            expect(leftJoinSpy, 'to have calls satisfying', () => {
                leftJoinSpy('image as t1', {
                    't1.user_id': 'user.id',
                });
                leftJoinSpy('image as t2', {
                    't2.user_id': 'user.id',
                });
            });
        });

        it("creates joins on all the field references if no 'on' option is passed", function () {
            query.with(Dummy);
            expect(leftJoinSpy, 'to have calls satisfying', () => {
                leftJoinSpy('dummy_table as t1', {
                    't1.field_one': 'user.id',
                    't1.field_two': 'user.created_at',
                    't1.field_three': 'user.updated_at',
                });
            });
        });

        describe("with an 'on' option", function () {
            it('creates joins on the specified field reference', function () {
                query.with({ Dummy: { on: 'fieldTwo' } });
                expect(leftJoinSpy, 'to have calls satisfying', () => {
                    leftJoinSpy('dummy_table as t1', {
                        't1.field_two': 'user.created_at',
                    });
                });
            });

            it('throws if the field is unknown', function () {
                expect(
                    () => query.with({ Dummy: { on: 'fieldTwos' } }),
                    'to throw',
                    new Error("unknown field 'Dummy.fieldTwos'")
                );
            });

            it('accepts a field instance', function () {
                query.with({ Dummy: { on: Dummy.fieldTwo } });
                expect(leftJoinSpy, 'to have calls satisfying', () => {
                    leftJoinSpy('dummy_table as t1', {
                        't1.field_two': 'user.created_at',
                    });
                });
            });

            it('creates joins on the specified references if passed an array', function () {
                query.with({ Dummy: { on: [ 'fieldTwo', 'fieldThree' ] } });
                expect(leftJoinSpy, 'to have calls satisfying', () => {
                    leftJoinSpy('dummy_table as t1', {
                        't1.field_two': 'user.created_at',
                        't1.field_three': 'user.updated_at',
                    });
                });
            });

            it('throws if any of the fields is unknown', function () {
                expect(
                    () => query.with({ Dummy: { on: [ 'fieldTwo', 'fieldThrees' ] } }),
                    'to throw',
                    new Error("unknown field 'Dummy.fieldThrees'")
                );
            });

            describe('when a reference is reversed', function () {
                it('creates the correct join', function () {
                    const dummyQuery = new Query(Dummy);
                    dummyQuery.with({ User: { on: 'createdAt' } });
                    expect(leftJoinSpy, 'to have calls satisfying', () => {
                        leftJoinSpy('user as t1', {
                            't1.created_at': 'dummy_table.field_two',
                        });
                    });
                });

                it('creates the correct join when passed a field object', function () {
                    const dummyQuery = new Query(Dummy);
                    dummyQuery.with({ User: { on: User.createdAt } });
                    expect(leftJoinSpy, 'to have calls satisfying', () => {
                        leftJoinSpy('user as t1', {
                            't1.created_at': 'dummy_table.field_two',
                        });
                    });
                });

                it('creates the correct join when passed a reversed field object', function () {
                    // urgh
                    const dummyQuery = new Query(Dummy);
                    dummyQuery.with({ User: { on: Dummy.fieldTwo } });
                    expect(leftJoinSpy, 'to have calls satisfying', () => {
                        leftJoinSpy('user as t1', {
                            't1.created_at': 'dummy_table.field_two',
                        });
                    });
                });
            });
        });

        it("adds all fields from the joined model if no 'fields' option is passed", function () {
            let columnsSpy = sinon.spy(QueryBuilder.prototype, 'columns');
            query.with(Image);
            expect(leftJoinSpy, 'to have calls satisfying', () => {
                leftJoinSpy('image as t1', {
                    't1.user_id': 'user.id',
                });
            });
            expect(columnsSpy, 'to have calls satisfying', () => {
                columnsSpy([
                    't1.id as t1.id',
                    't1.created_at as t1.createdAt',
                    't1.updated_at as t1.updatedAt',
                    't1.user_id as t1.userId',
                    't1.category_id as t1.categoryId',
                ]);
            });
            columnsSpy.restore();
        });

        describe("with a 'fields' option", function () {
            let columnsSpy;

            before(function () {
                columnsSpy = sinon.spy(QueryBuilder.prototype, 'columns');
            });

            after(function () {
                columnsSpy.restore();
            });

            beforeEach(function () {
                columnsSpy.reset();
            });

            it('adds the fields to the query builder columns', function () {
                query.with({
                    Image: {
                        fields: [ Image.fields.userId ],
                    },
                });
                expect(leftJoinSpy, 'to have calls satisfying', () => {
                    leftJoinSpy('image as t1', {
                        't1.user_id': 'user.id',
                    });
                });
                expect(columnsSpy, 'to have calls satisfying', () => {
                    columnsSpy([ 't1.user_id as t1.userId' ]);
                });
            });

            it("does not add any fields if 'fields' is set to false", function () {
                query.with({
                    Image: {
                        fields: false,
                    },
                });
                expect(leftJoinSpy, 'to have calls satisfying', () => {
                    leftJoinSpy('image as t1', {
                        't1.user_id': 'user.id',
                    });
                });
                expect(columnsSpy, 'was not called');
            });

            it('throws if the fields are unknown', function () {
                expect(
                    () => { query.with({ Image: { fields: 'name' } }); },
                    'to throw',
                    new Error("unknown field 'Image.name'")
                );
            });
        });

        describe("with a 'where' option", function () {
            let whereSpy;

            before(function () {
                whereSpy = sinon.spy(QueryBuilder.prototype, 'where');
            });

            after(function () {
                whereSpy.restore();
            });

            beforeEach(function () {
                whereSpy.reset();
            });

            it('adds the fields to the query builder where', function () {
                query.with({
                    Image: {
                        where: {
                            categoryId: 1,
                        },
                    },
                });
                expect(leftJoinSpy, 'to have calls satisfying', () => {
                    leftJoinSpy('image as t1', {
                        't1.user_id': 'user.id',
                    });
                });
                expect(whereSpy, 'to have calls satisfying', () => {
                    whereSpy('t1.category_id', 1);
                });
            });

            it('throws if the field is unknown', function () {
                expect(
                    () => {
                        query.with({
                            Image: {
                                where: {
                                    name: 'User 1',
                                },
                            },
                        });
                    },
                    'to throw',
                    new Error("unknown field 'Image.name'")
                );
            });
        });

        describe("with a 'whereNot' option", function () {
            let whereNotSpy;

            before(function () {
                whereNotSpy = sinon.spy(QueryBuilder.prototype, 'whereNot');
            });

            after(function () {
                whereNotSpy.restore();
            });

            beforeEach(function () {
                whereNotSpy.reset();
            });

            it('adds the fields to the query builder whereNot', function () {
                query.with({
                    Image: {
                        whereNot: {
                            categoryId: 1,
                        },
                    },
                });
                expect(leftJoinSpy, 'to have calls satisfying', () => {
                    leftJoinSpy('image as t1', {
                        't1.user_id': 'user.id',
                    });
                });
                expect(whereNotSpy, 'to have calls satisfying', () => {
                    whereNotSpy('t1.category_id', 1);
                });
            });

            it('throws if the field is unknown', function () {
                expect(
                    () => {
                        query.with({
                            Image: {
                                whereNot: {
                                    name: 'User 1',
                                },
                            },
                        });
                    },
                    'to throw',
                    new Error("unknown field 'Image.name'")
                );
            });
        });

        describe("with a nested 'with' option", function () {
            it('adds the nested reference to the query builder joins', function () {
                query.with({
                    Image: {
                        with: ImageCategory,
                    },
                });
                expect(leftJoinSpy, 'to have calls satisfying', () => {
                    leftJoinSpy('image as t1', {
                        't1.user_id': 'user.id',
                    });
                    leftJoinSpy('image_category as t2', {
                        't2.id': 't1.category_id',
                    });
                });
            });

            describe("with a nested 'on' option", function () {
                it('adds the nested reference on the specified field', function () {
                    const imageQuery = new Query(Image);
                    imageQuery.with({
                        User: {
                            with: {
                                Dummy: { on: 'fieldTwo' },
                            },
                        },
                    });
                    expect(leftJoinSpy, 'to have calls satisfying', () => {
                        leftJoinSpy('user as t1', {
                            't1.id': 'image.user_id',
                        });
                        leftJoinSpy('dummy_table as t2', {
                            't2.field_two': 't1.created_at',
                        });
                    });
                });
            });

            describe("with a nested 'require' option", function () {
                it('adds the nested reference with an inner join', function () {
                    query.with({
                        Image: {
                            with: {
                                ImageCategory: { require: true },
                            },
                        },
                    });
                    expect(leftJoinSpy, 'to have calls satisfying', () => {
                        leftJoinSpy('image as t1', {
                            't1.user_id': 'user.id',
                        });
                    });
                    expect(innerJoinSpy, 'to have calls satisfying', () => {
                        innerJoinSpy('image_category as t2', {
                            't2.id': 't1.category_id',
                        });
                    });
                });
            });

            describe("with a nested 'fields' option", function () {
                let columnsSpy;

                before(function () {
                    columnsSpy = sinon.spy(QueryBuilder.prototype, 'columns');
                });

                after(function () {
                    columnsSpy.restore();
                });

                beforeEach(function () {
                    columnsSpy.reset();
                });

                it('adds the fields to the query builder columns', function () {
                    query.with({
                        Image: {
                            fields: [ 'userId' ],
                            with: {
                                ImageCategory: {
                                    fields: [ 'name' ],
                                },
                            },
                        },
                    });
                    expect(leftJoinSpy, 'to have calls satisfying', () => {
                        leftJoinSpy('image as t1', {
                            't1.user_id': 'user.id',
                        });
                        leftJoinSpy('image_category as t2', {
                            't2.id': 't1.category_id',
                        });
                    });
                    expect(columnsSpy, 'to have calls satisfying', () => {
                        columnsSpy([ 't1.user_id as t1.userId' ]);
                        columnsSpy([ 't2.name as t2.name' ]);
                    });
                });

                it("uses the alias if passed an 'as' option", function () {
                    query.with({
                        Image: {
                            as: 'image',
                            fields: [ 'userId' ],
                            with: {
                                ImageCategory: {
                                    as: 'imageCategory',
                                    fields: [ 'name' ],
                                },
                            },
                        },
                    });
                    expect(leftJoinSpy, 'to have calls satisfying', () => {
                        leftJoinSpy('image as t1', {
                            't1.user_id': 'user.id',
                        });
                        leftJoinSpy('image_category as t2', {
                            't2.id': 't1.category_id',
                        });
                    });
                    expect(columnsSpy, 'to have calls satisfying', () => {
                        columnsSpy([ 't1.user_id as t1.userId' ]);
                        columnsSpy([ 't2.name as t2.name' ]);
                    });
                });
            });
        });
    });

    describe.skip('Query.prototype.transaction', function () {
        let query;

        beforeEach(function () {
            query = new Query(User);
        });

        it('passes the transaction to the query builder', function () {
            const spy = sinon.spy(QueryBuilder.prototype, 'transacting');
            query.transaction('foo');
            expect(spy, 'to have calls satisfying', () => {
                spy('foo');
            });
            spy.restore();
        });

        describe("with a 'forUpdate' option", function () {
            it('calls forUpdate on the query builder', function () {
                const spy = sinon.spy(QueryBuilder.prototype, 'forUpdate');
                query.transaction('foo', { forUpdate: true });
                expect(spy, 'to have calls satisfying', () => {
                    spy();
                });
                spy.restore();
            });
        });

        describe("with a 'forShare' option", function () {
            it('calls forShare on the query builder', function () {
                const spy = sinon.spy(QueryBuilder.prototype, 'forShare');
                query.transaction('foo', { forShare: true });
                expect(spy, 'to have calls satisfying', () => {
                    spy();
                });
                spy.restore();
            });
        });
    });

    describe.skip('Query.prototype.fetchRow', function () {
        let query;

        before(async function () {
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
            await knex('image_category').insert([
                {
                    id: 1,
                    name: 'User images',
                },
            ]);
            await knex('image').insert([
                {
                    id: 1,
                    user_id: 1,
                    category_id: 1,
                },
            ]);
        });

        after(async function () {
            await truncateImageTable();
            await truncateImageCategoryTable();
            await truncateUserTable();
        });

        beforeEach(function () {
            query = new Query(User);
        });

        describe('with no options', function () {
            it('fulfils with an object matching the first row in the table', async function () {
                await expect(
                    query.fetchRow(),
                    'to be fulfilled with',
                    {
                        id: 1,
                        createdAt: null,
                        updatedAt: null,
                        name: 'User 1',
                        confirmed: false,
                        description: 'this is user 1',
                        age: 10,
                        dateOfBirth: new Date(1000),
                        dbDefault: 'set-by-db',
                    }
                );
            });
        });

        describe("with a 'where' option", function () {
            it('fetches a row matching the object passed', async function () {
                await expect(
                    query.fetchRow({ where: { id: 1 } }),
                    'to be fulfilled with',
                    {
                        id: 1,
                        name: 'User 1',
                        description: 'this is user 1',
                    }
                );
            });

            it("accepts a knex query builder as the 'where' query", async function () {
                await expect(
                    query.fetchRow({ where: knex('user').where({ id: 1 }) }),
                    'to be fulfilled with',
                    {
                        id: 1,
                        createdAt: null,
                        updatedAt: null,
                        name: 'User 1',
                        confirmed: false,
                        description: 'this is user 1',
                        age: 10,
                        dateOfBirth: new Date(1000),
                        dbDefault: 'set-by-db',
                    }
                );
            });
        });

        describe("with a 'whereNot' option", function () {
            it('fetches a row not matching the object passed', async function () {
                await expect(
                    query.fetchRow({ whereNot: { id: 1 } }),
                    'to be fulfilled with',
                    {
                        id: 2,
                        name: 'User 2',
                        description: 'this is user 2',
                    }
                );
            });
        });

        describe("with a 'fields' option", function () {
            it('fulfils with an object containing only the requested fields', async function () {
                await expect(
                    query.fetchRow({ fields: [ User.fields.id, 'dateOfBirth' ] }),
                    'to be fulfilled with',
                    {
                        id: 1,
                        dateOfBirth: new Date(1000),
                        createdAt: undefined,
                        updatedAt: undefined,
                        name: undefined,
                        confirmed: undefined,
                        description: undefined,
                        age: undefined,
                        dbDefault: undefined,
                    }
                );
            });
        });

        describe("with a 'with' option", function () {
            it('fulfils with an object containing aliased fields from the joined table', async function () {
                await expect(
                    query.fetchRow({ with: { Image: { with: ImageCategory } } }),
                    'to be fulfilled with',
                    {
                        id: 1,
                        createdAt: null,
                        updatedAt: null,
                        name: 'User 1',
                        confirmed: false,
                        description: 'this is user 1',
                        age: 10,
                        dateOfBirth: new Date(1000),
                        dbDefault: 'set-by-db',
                        't1.id': 1,
                        't1.createdAt': null,
                        't1.updatedAt': null,
                        't1.userId': 1,
                        't1.categoryId': 1,
                        't2.id': 1,
                        't2.createdAt': null,
                        't2.updatedAt': null,
                        't2.name': 'User images',
                    }
                );
            });
        });

        describe('when the fetch returns no data', function () {
            it("rejects with a ModelNotFoundError if the 'require' option is set to true", async function () {
                await expect(
                    query.fetchRow({ where: { id: 1, 'name': 'User 2' }, require: true }),
                    'to be rejected with',
                    {
                        NotFound: true,
                        UserNotFoundError: true,
                    }
                );
            });

            it("resolves with undefined if 'require' is set to false", async function () {
                await expect(
                    query.fetchRow({ where: { id: 1, 'name': 'User 2' }, require: false }),
                    'to be fulfilled with',
                    undefined
                );
            });

            it("resolves with undefined if 'require' is not provided", async function () {
                await expect(
                    query.fetchRow({ where: { id: 1, 'name': 'User 2' } }),
                    'to be fulfilled with',
                    undefined
                );
            });
        });

        it('rejects with a ModelFetchError if a fetch error occurs', async function () {
            const stub = sinon.stub(QueryBuilder.prototype, 'first').returns(
                Promise.reject(new Error('fetch error'))
            );
            await expect(query.fetchRow(), 'to be rejected with', {
                DatabaseError: true,
                InternalServerError: true,
                UserFetchRowError: true,
                message: 'fetch error',
                data: { error: new Error('fetch error') },
            });
            stub.restore();
        });
    });

    describe.skip('Query.prototype.fetchOne', function () {
        let query;

        before(async function () {
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
            await knex('image_category').insert([
                {
                    id: 1,
                    name: 'User images',
                },
            ]);
            await knex('image').insert([
                {
                    id: 1,
                    user_id: 1,
                    category_id: 1,
                },
            ]);
        });

        after(async function () {
            await truncateImageTable();
            await truncateImageCategoryTable();
            await truncateUserTable();
        });

        beforeEach(function () {
            query = new Query(User);
        });

        it('calls Query.prototype.fetchRow with the query and options provided', async function () {
            const fetchRowStub = sinon.stub(Query.prototype, 'fetchRow')
                .returns(Promise.resolve());
            await query.fetchOne({ where: { id: 1 }, require: 1 });
            await expect(fetchRowStub, 'to have calls satisfying', () => {
                fetchRowStub({ where: { id: 1 }, require: 1 });
            });
            fetchRowStub.restore();
        });

        it('resolves with a populated instance of the model', async function () {
            await expect(
                query.fetchOne({ where: { id: 1 } }),
                'to be fulfilled with',
                new User({
                    id: 1,
                    name: 'User 1',
                    confirmed: false,
                    description: 'this is user 1',
                    age: 10,
                    dateOfBirth: new Date(1000),
                    createdAt: null,
                    updatedAt: null,
                    dbDefault: 'set-by-db',
                })
            );
        });

        it('resolves with undefined if no row matches the query', async function () {
            await expect(
                query.fetchOne({ where: { id: 1, name: 'User 2' } }),
                'to be fulfilled with',
                undefined
            );
        });

        describe("with a 'with' option", function () {
            it('fulfils with an object containing nested instaces of the requested models', async function () {
                const user1 = new User({
                    id: 1,
                    createdAt: null,
                    updatedAt: null,
                    name: 'User 1',
                    confirmed: false,
                    description: 'this is user 1',
                    age: 10,
                    dateOfBirth: new Date(1000),
                    dbDefault: 'set-by-db',
                });
                user1.image = new Image({
                    id: 1,
                    createdAt: null,
                    updatedAt: null,
                    userId: 1,
                    categoryId: 1,
                });
                user1.image.imageCategory = new ImageCategory({
                    id: 1,
                    createdAt: null,
                    updatedAt: null,
                    name: 'User images',
                });
                await expect(
                    query.fetchOne({ with: { Image: { with: ImageCategory } } }),
                    'to be fulfilled with',
                    expect.it('to exhaustively satisfy', user1)
                );
            });

            describe("with a nested 'require' option", function () {
                it('fulfils with an object if a row was matched', async function () {
                    const user1 = new User({
                        id: 1,
                        createdAt: null,
                        updatedAt: null,
                        name: 'User 1',
                        confirmed: false,
                        description: 'this is user 1',
                        age: 10,
                        dateOfBirth: new Date(1000),
                        dbDefault: 'set-by-db',
                    });
                    user1.image = new Image({
                        id: 1,
                        createdAt: null,
                        updatedAt: null,
                        userId: 1,
                        categoryId: 1,
                    });
                    user1.image.imageCategory = new ImageCategory({
                        id: 1,
                        createdAt: null,
                        updatedAt: null,
                        name: 'User images',
                    });

                    await expect(
                        query.fetchOne({
                            where: { id: 1 },
                            with: {
                                Image: {
                                    require: true,
                                    with: ImageCategory,
                                },
                            },
                        }),
                        'to be fulfilled with',
                        expect.it('to exhaustively satisfy', user1)
                    );

                    const newQuery = new Query(User);

                    await expect(
                        newQuery.fetchOne({
                            where: { id: 1 },
                            with: {
                                Image: {
                                    with: {
                                        ImageCategory: {
                                            require: true,
                                        },
                                    },
                                },
                            },
                        }),
                        'to be fulfilled with',
                        expect.it('to exhaustively satisfy', user1)
                    );
                });

                it('fulfils with undefined if no rows were matched', async function () {
                    await expect(
                        query.fetchOne({
                            where: { id: 2 },
                            with: {
                                Image: {
                                    require: true,
                                    with: ImageCategory,
                                },
                            },
                        }),
                        'to be fulfilled with',
                        undefined
                    );

                    const newQuery = new Query(User);

                    await expect(
                        newQuery.fetchOne({
                            where: { id: 2 },
                            with: {
                                Image: {
                                    with: {
                                        ImageCategory: {
                                            require: true,
                                        },
                                    },
                                },
                            },
                        }),
                        'to be fulfilled with',
                        undefined
                    );
                });
            });

            describe("with a nested 'fields' option", function () {
                it('selects only the requested fields', async function () {
                    const user1 = new User({
                        id: 1,
                        createdAt: null,
                        updatedAt: null,
                        name: 'User 1',
                        confirmed: false,
                        description: 'this is user 1',
                        age: 10,
                        dateOfBirth: new Date(1000),
                        dbDefault: 'set-by-db',
                    });
                    user1.image = new Image({
                        id: 1,
                        createdAt: null,
                        updatedAt: null,
                        userId: 1,
                        categoryId: 1,
                    });
                    user1.image.imageCategory = new ImageCategory({
                        name: 'User images',
                    });

                    await expect(
                        query.fetchOne({
                            with: {
                                Image: {
                                    with: {
                                        ImageCategory: {
                                            fields: ImageCategory.fields.name,
                                        },
                                    },
                                },
                            },
                        }),
                        'to be fulfilled with',
                        expect.it('to exhaustively satisfy', user1)
                    );
                });

                describe("when 'fields' is set to false", function () {
                    it('does not include an instance of the joined model', async function () {
                        const user1 = new User({
                            id: 1,
                            createdAt: null,
                            updatedAt: null,
                            name: 'User 1',
                            confirmed: false,
                            description: 'this is user 1',
                            age: 10,
                            dateOfBirth: new Date(1000),
                            dbDefault: 'set-by-db',
                        });
                        user1.image = undefined;

                        await expect(
                            query.fetchOne({
                                with: {
                                    Image: {
                                        fields: false,
                                    },
                                },
                            }),
                            'to be fulfilled with',
                            expect.it('to exhaustively satisfy', user1)
                        );
                    });

                    it("does not include the joined model even if it had a nested 'with' option that matched data", async function () {
                        const user1 = new User({
                            id: 1,
                            createdAt: null,
                            updatedAt: null,
                            name: 'User 1',
                            confirmed: false,
                            description: 'this is user 1',
                            age: 10,
                            dateOfBirth: new Date(1000),
                            dbDefault: 'set-by-db',
                        });
                        user1.image = undefined;

                        await expect(
                            query.fetchOne({
                                with: {
                                    Image: {
                                        fields: false,
                                        with: ImageCategory,
                                    },
                                },
                            }),
                            'to be fulfilled with',
                            expect.it('to exhaustively satisfy', user1)
                        );
                    });
                });
            });

            describe("when the join doesn't match any rows", function () {
                it('does not include the joined model', async function () {
                    const user1 = new User({
                        id: 2,
                        createdAt: null,
                        updatedAt: null,
                        name: 'User 2',
                        confirmed: true,
                        description: 'this is user 2',
                        age: 20,
                        dateOfBirth: new Date(2000),
                        dbDefault: 'set-by-db',
                    });
                    user1.image = undefined;

                    await expect(
                        query.fetchOne({
                            where: { id: 2 },
                            with: Image,
                        }),
                        'to be fulfilled with',
                        expect.it('to exhaustively satisfy', user1)
                    );
                });
            });

            describe('with aliases', function () {
                it('uses the alises as the instance props', async function () {
                    const user1 = new User({
                        id: 1,
                        createdAt: null,
                        updatedAt: null,
                        name: 'User 1',
                        confirmed: false,
                        description: 'this is user 1',
                        age: 10,
                        dateOfBirth: new Date(1000),
                        dbDefault: 'set-by-db',
                    });
                    user1.theImage = new Image({
                        id: 1,
                        createdAt: null,
                        updatedAt: null,
                        userId: 1,
                        categoryId: 1,
                    });

                    await expect(
                        query.fetchOne({ with: { Image: { as: 'theImage' } } }),
                        'to be fulfilled with',
                        expect.it('to exhaustively satisfy', user1)
                    );

                    user1.theImage.theImageCategory = new ImageCategory({
                        id: 1,
                        createdAt: null,
                        updatedAt: null,
                        name: 'User images',
                    });

                    const newQuery = new Query(User);

                    await expect(
                        newQuery.fetchOne({
                            with: {
                                Image: {
                                    as: 'theImage',
                                    with: {
                                        ImageCategory: 'theImageCategory',
                                    },
                                },
                            },
                        }),
                        'to be fulfilled with',
                        expect.it('to exhaustively satisfy', user1)
                    );
                });

                it('allows joins on the same model with different aliases', async function () {
                    const user1 = new User({
                        id: 1,
                        createdAt: null,
                        updatedAt: null,
                        name: 'User 1',
                        confirmed: false,
                        description: 'this is user 1',
                        age: 10,
                        dateOfBirth: new Date(1000),
                        dbDefault: 'set-by-db',
                    });
                    user1.image1 = new Image({
                        id: 1,
                        createdAt: null,
                        updatedAt: null,
                        userId: 1,
                        categoryId: 1,
                    });
                    user1.image2 = new Image({
                        id: 1,
                        createdAt: null,
                        updatedAt: null,
                        userId: 1,
                        categoryId: 1,
                    });

                    await expect(
                        query.fetchOne({
                            with: [
                                { Image: 'image1' },
                                { Image: 'image2' },
                            ],
                        }),
                        'to be fulfilled with',
                        expect.it('to exhaustively satisfy', user1)
                    );

                    delete user1.image2;
                    user1.image1.imageCategory1 = new ImageCategory({
                        id: 1,
                        createdAt: null,
                        updatedAt: null,
                        name: 'User images',
                    });
                    user1.image1.imageCategory2 = new ImageCategory({
                        id: 1,
                        createdAt: null,
                        updatedAt: null,
                        name: 'User images',
                    });

                    const newQuery = new Query(User);

                    await expect(
                        newQuery.fetchOne({
                            with: {
                                Image: {
                                    as: 'image1',
                                    with: [
                                        { ImageCategory: 'imageCategory1' },
                                        { ImageCategory: 'imageCategory2' },
                                    ],
                                },
                            },
                        }),
                        'to be fulfilled with',
                        expect.it('to exhaustively satisfy', user1)
                    );
                });
            });
        });
    });

    describe.skip('Query.prototype.fetchRows', function () {
        let query;

        before(async function () {
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
                    age: 10,
                    date_of_birth: new Date(2000),
                },
            ]);
            await knex('image_category').insert([
                {
                    id: 1,
                    name: 'User images',
                },
            ]);
            await knex('image').insert([
                {
                    id: 1,
                    user_id: 1,
                    category_id: 1,
                },
            ]);
        });

        after(async function () {
            await truncateImageTable();
            await truncateImageCategoryTable();
            await truncateUserTable();
        });

        beforeEach(function () {
            query = new Query(User);
        });

        describe('with no options', function () {
            it('fulfils with an array of all the rows in the table', async function () {
                await expect(
                    query.fetchRows(),
                    'to be fulfilled with',
                    expect.it('when sorted by id', 'to satisfy', [
                        {
                            id: 1,
                            createdAt: null,
                            updatedAt: null,
                            name: 'User 1',
                            confirmed: false,
                            description: 'this is user 1',
                            age: 10,
                            dateOfBirth: new Date(1000),
                            dbDefault: 'set-by-db',
                        },
                        {
                            id: 2,
                            createdAt: null,
                            updatedAt: null,
                            name: 'User 2',
                            confirmed: true,
                            description: 'this is user 2',
                            age: 10,
                            dateOfBirth: new Date(2000),
                            dbDefault: 'set-by-db',
                        },
                    ])
                );
            });
        });

        describe("with a 'where' option", function () {
            it('fetches rows matching the object passed', async function () {
                await expect(
                    query.fetchRows({ where: { id: 1 } }),
                    'to be fulfilled with',
                    expect.it('when sorted by id', 'to satisfy', [
                        {
                            id: 1,
                            name: 'User 1',
                            description: 'this is user 1',
                        },
                    ])
                );
            });

            it("accepts a knex query builder as the 'where' query", async function () {
                await expect(
                    query.fetchRows({ where: knex('user').where({ age: 10 }) }),
                    'to be fulfilled with',
                    expect.it('when sorted by id', 'to exhaustively satisfy', [
                        {
                            id: 1,
                            createdAt: null,
                            updatedAt: null,
                            name: 'User 1',
                            confirmed: false,
                            description: 'this is user 1',
                            age: 10,
                            dateOfBirth: new Date(1000),
                            dbDefault: 'set-by-db',
                        },
                        {
                            id: 2,
                            createdAt: null,
                            updatedAt: null,
                            name: 'User 2',
                            confirmed: true,
                            description: 'this is user 2',
                            age: 10,
                            dateOfBirth: new Date(2000),
                            dbDefault: 'set-by-db',
                        },
                    ])
                );
            });
        });

        describe("with a 'whereNot' option", function () {
            it('fetches rows not matching the object passed', async function () {
                await expect(
                    query.fetchRows({ whereNot: { id: 1 } }),
                    'to be fulfilled with',
                    expect.it('when sorted by id', 'to satisfy', [
                        {
                            id: 2,
                            name: 'User 2',
                            description: 'this is user 2',
                        },
                    ])
                );
            });
        });

        describe("with an 'orderBy' option", function () {
            it('returns rows ordered in the requested order', async function () {
                await expect(
                    query.fetchRows({ orderBy: { id: -1 } }),
                    'to be fulfilled with',
                    [
                        {
                            id: 2,
                            name: 'User 2',
                            description: 'this is user 2',
                        },
                        {
                            id: 1,
                            name: 'User 1',
                            description: 'this is user 1',
                        },
                    ]
                );
            });
        });

        describe("with a 'fields' option", function () {
            it('fulfils with objects containing only the requested fields', async function () {
                await expect(
                    query.fetchRows({ fields: [ User.fields.id, 'dateOfBirth' ] }),
                    'to be fulfilled with',
                    expect.it('when sorted by id', 'to exhaustively satisfy', [
                        {
                            id: 1,
                            dateOfBirth: new Date(1000),
                            createdAt: undefined,
                            updatedAt: undefined,
                            name: undefined,
                            confirmed: undefined,
                            description: undefined,
                            age: undefined,
                            dbDefault: undefined,
                        },
                        {
                            id: 2,
                            dateOfBirth: new Date(2000),
                            createdAt: undefined,
                            updatedAt: undefined,
                            name: undefined,
                            confirmed: undefined,
                            description: undefined,
                            age: undefined,
                            dbDefault: undefined,
                        },
                    ])
                );
            });
        });

        describe("with a 'with' option", function () {
            it('fulfils with objects containing aliased fields from the joined table', async function () {
                await expect(
                    query.fetchRows({ with: { Image: { with: ImageCategory } } }),
                    'to be fulfilled with',
                    expect.it('when sorted by id', 'to exhaustively satisfy', [
                        {
                            id: 1,
                            createdAt: null,
                            updatedAt: null,
                            name: 'User 1',
                            confirmed: false,
                            description: 'this is user 1',
                            age: 10,
                            dateOfBirth: new Date(1000),
                            dbDefault: 'set-by-db',
                            't1.id': 1,
                            't1.createdAt': null,
                            't1.updatedAt': null,
                            't1.userId': 1,
                            't1.categoryId': 1,
                            't2.id': 1,
                            't2.createdAt': null,
                            't2.updatedAt': null,
                            't2.name': 'User images',
                        },
                        {
                            id: 2,
                            createdAt: null,
                            updatedAt: null,
                            name: 'User 2',
                            confirmed: true,
                            description: 'this is user 2',
                            age: 10,
                            dateOfBirth: new Date(2000),
                            dbDefault: 'set-by-db',
                            't1.id': null,
                            't1.createdAt': null,
                            't1.updatedAt': null,
                            't1.userId': null,
                            't1.categoryId': null,
                            't2.id': null,
                            't2.createdAt': null,
                            't2.updatedAt': null,
                            't2.name': null,
                        },
                    ])
                );
            });
        });

        describe('when the fetch returns no data', function () {
            it("rejects with a ModelsNotFoundError if the 'require' option is set to true", async function () {
                await expect(
                    query.fetchRows({
                        where: { id: 1, 'name': 'User 2' },
                        require: true,
                    }),
                    'to be rejected with',
                    {
                        NotFound: true,
                        UsersNotFoundError: true,
                    }
                );
            });

            it("resolves with an empty array if 'require' is set to false", async function () {
                await expect(
                    query.fetchRows({
                        where: { id: 1, 'name': 'User 2' },
                        require: false,
                    }),
                    'to be fulfilled with',
                    []
                );
            });

            it("resolves with undefined if 'require' is not provided", async function () {
                await expect(
                    query.fetchRows({ where: { id: 1, 'name': 'User 2' } }),
                    'to be fulfilled with',
                    []
                );
            });
        });

        it('rejects with a ModelsFetchError if a fetch error occurs', async function () {
            const stub = sinon.stub(QueryBuilder.prototype, 'select').returns(
                Promise.reject(new Error('fetch error'))
            );
            await expect(query.fetchRows(), 'to be rejected with', {
                DatabaseError: true,
                InternalServerError: true,
                UserFetchRowsError: true,
                message: 'fetch error',
                data: { error: new Error('fetch error') },
            });
            stub.restore();
        });

        describe("with a 'limit' option", function () {
            it('adds a limit to the query', async function () {
                await expect(
                    query.fetchRows({ where: { age: 10 }, limit: 1 }),
                    'to be fulfilled with',
                    expect.it('to have length', 1)
                );
            });
        });
    });

    describe.skip('Query.prototype.fetchAll', function () {
        let query;

        before(async function () {
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
                    age: 10,
                    date_of_birth: new Date(2000),
                },
            ]);
            await knex('image_category').insert([
                {
                    id: 1,
                    name: 'User images',
                },
            ]);
            await knex('image').insert([
                {
                    id: 1,
                    user_id: 1,
                    category_id: 1,
                },
            ]);
        });

        after(async function () {
            await truncateImageTable();
            await truncateImageCategoryTable();
            await truncateUserTable();
        });

        beforeEach(function () {
            query = new Query(User);
        });

        it('calls Query.prototype.fetchRows with the query and options provided', async function () {
            const fetchRowsStub = sinon.stub(Query.prototype, 'fetchRows')
                .returns(Promise.resolve([]));
            await query.fetchAll({ where: { id: 1 }, require: 1 });
            await expect(fetchRowsStub, 'to have calls satisfying', () => {
                fetchRowsStub({ where: { id: 1 }, require: 1 });
            });
            fetchRowsStub.restore();
        });

        it('resolves with populated instances of the model', async function () {
            await expect(
                query.fetchAll({ where: { age: 10 } }),
                'to be fulfilled with',
                expect.it('when sorted by id', 'to satisfy', [
                    new User({
                        id: 1,
                        name: 'User 1',
                        confirmed: false,
                        description: 'this is user 1',
                        age: 10,
                        dateOfBirth: new Date(1000),
                        createdAt: null,
                        updatedAt: null,
                        dbDefault: 'set-by-db',
                    }),
                    new User({
                        id: 2,
                        name: 'User 2',
                        confirmed: true,
                        description: 'this is user 2',
                        age: 10,
                        dateOfBirth: new Date(2000),
                        createdAt: null,
                        updatedAt: null,
                        dbDefault: 'set-by-db',
                    }),
                ])
            );
        });

        it('resolves with an empty array if no row matches the query', async function () {
            await expect(
                query.fetchAll({ where: { id: 1, name: 'User 2' } }),
                'to be fulfilled with',
                []
            );
        });

        describe("with a 'with' option", function () {
            it('fulfils with an object containing nested instaces of the requested models', async function () {
                const user1 = new User({
                    id: 1,
                    createdAt: null,
                    updatedAt: null,
                    name: 'User 1',
                    confirmed: false,
                    description: 'this is user 1',
                    age: 10,
                    dateOfBirth: new Date(1000),
                    dbDefault: 'set-by-db',
                });
                user1.image = new Image({
                    id: 1,
                    createdAt: null,
                    updatedAt: null,
                    userId: 1,
                    categoryId: 1,
                });
                user1.image.imageCategory = new ImageCategory({
                    id: 1,
                    createdAt: null,
                    updatedAt: null,
                    name: 'User images',
                });

                const user2 = new User({
                    id: 2,
                    name: 'User 2',
                    confirmed: true,
                    description: 'this is user 2',
                    age: 10,
                    dateOfBirth: new Date(2000),
                    createdAt: null,
                    updatedAt: null,
                    dbDefault: 'set-by-db',
                });
                user2.image = undefined;

                await expect(
                    query.fetchAll({ with: { Image: { with: ImageCategory } } }),
                    'to be fulfilled with',
                    expect.it('when sorted by id', 'to exhaustively satisfy', [
                        user1,
                        user2,
                    ])
                );
            });

            describe("with a nested 'require' option", function () {
                it('only includes the objects where the join matched data', async function () {
                    const user1 = new User({
                        id: 1,
                        createdAt: null,
                        updatedAt: null,
                        name: 'User 1',
                        confirmed: false,
                        description: 'this is user 1',
                        age: 10,
                        dateOfBirth: new Date(1000),
                        dbDefault: 'set-by-db',
                    });
                    user1.image = new Image({
                        id: 1,
                        createdAt: null,
                        updatedAt: null,
                        userId: 1,
                        categoryId: 1,
                    });
                    user1.image.imageCategory = new ImageCategory({
                        id: 1,
                        createdAt: null,
                        updatedAt: null,
                        name: 'User images',
                    });

                    await expect(
                        query.fetchAll({
                            with: {
                                Image: {
                                    require: true,
                                    with: ImageCategory,
                                },
                            },
                        }),
                        'to be fulfilled with',
                        expect.it('when sorted by id', 'to exhaustively satisfy', [
                            user1,
                        ])
                    );

                    const newQuery = new Query(User);

                    await expect(
                        newQuery.fetchAll({
                            with: {
                                Image: {
                                    with: {
                                        ImageCategory: {
                                            require: true,
                                        },
                                    },
                                },
                            },
                        }),
                        'to be fulfilled with',
                        expect.it('when sorted by id', 'to exhaustively satisfy', [
                            user1,
                        ])
                    );
                });
            });

            describe("when the join doesn't match any rows", function () {
                it('does not include the joined model', async function () {
                    const user2 = new User({
                        id: 2,
                        createdAt: null,
                        updatedAt: null,
                        name: 'User 2',
                        confirmed: true,
                        description: 'this is user 2',
                        age: 10,
                        dateOfBirth: new Date(2000),
                        dbDefault: 'set-by-db',
                    });
                    user2.image = undefined;

                    await expect(
                        query.fetchAll({
                            where: { id: 2 },
                            with: Image,
                        }),
                        'to be fulfilled with',
                        expect.it('when sorted by id', 'to exhaustively satisfy', [
                            user2,
                        ])
                    );
                });
            });

            describe("with a nested 'fields' option", function () {
                it('selects only the requested fields', async function () {
                    const user1 = new User({
                        id: 1,
                        createdAt: null,
                        updatedAt: null,
                        name: 'User 1',
                        confirmed: false,
                        description: 'this is user 1',
                        age: 10,
                        dateOfBirth: new Date(1000),
                        dbDefault: 'set-by-db',
                    });
                    user1.image = new Image({
                        id: 1,
                        createdAt: null,
                        updatedAt: null,
                        userId: 1,
                        categoryId: 1,
                    });
                    user1.image.imageCategory = new ImageCategory({
                        name: 'User images',
                    });

                    const user2 = new User({
                        id: 2,
                        name: 'User 2',
                        confirmed: true,
                        description: 'this is user 2',
                        age: 10,
                        dateOfBirth: new Date(2000),
                        createdAt: null,
                        updatedAt: null,
                        dbDefault: 'set-by-db',
                    });
                    user2.image = undefined;

                    await expect(
                        query.fetchAll({
                            with: {
                                Image: {
                                    with: {
                                        ImageCategory: {
                                            fields: ImageCategory.fields.name,
                                        },
                                    },
                                },
                            },
                        }),
                        'to be fulfilled with',
                        expect.it('when sorted by id', 'to exhaustively satisfy', [
                            user1,
                            user2,
                        ])
                    );
                });

                describe("when 'fields' is set to false", function () {
                    it('does not include the joined model', async function () {
                        const user1 = new User({
                            id: 1,
                            createdAt: null,
                            updatedAt: null,
                            name: 'User 1',
                            confirmed: false,
                            description: 'this is user 1',
                            age: 10,
                            dateOfBirth: new Date(1000),
                            dbDefault: 'set-by-db',
                        });
                        user1.image = undefined;

                        const user2 = new User({
                            id: 2,
                            name: 'User 2',
                            confirmed: true,
                            description: 'this is user 2',
                            age: 10,
                            dateOfBirth: new Date(2000),
                            createdAt: null,
                            updatedAt: null,
                            dbDefault: 'set-by-db',
                        });
                        user2.image = undefined;

                        await expect(
                            query.fetchAll({
                                with: {
                                    Image: {
                                        fields: false,
                                    },
                                },
                            }),
                            'to be fulfilled with',
                            expect.it('when sorted by id', 'to exhaustively satisfy', [
                                user1,
                                user2,
                            ])
                        );
                    });

                    it("does not include the joined model even if it had a nested 'with' option that matched data", async function () {
                        const user1 = new User({
                            id: 1,
                            createdAt: null,
                            updatedAt: null,
                            name: 'User 1',
                            confirmed: false,
                            description: 'this is user 1',
                            age: 10,
                            dateOfBirth: new Date(1000),
                            dbDefault: 'set-by-db',
                        });
                        user1.image = undefined;

                        const user2 = new User({
                            id: 2,
                            name: 'User 2',
                            confirmed: true,
                            description: 'this is user 2',
                            age: 10,
                            dateOfBirth: new Date(2000),
                            createdAt: null,
                            updatedAt: null,
                            dbDefault: 'set-by-db',
                        });
                        user2.image = undefined;

                        await expect(
                            query.fetchAll({
                                with: {
                                    Image: {
                                        fields: false,
                                        with: ImageCategory,
                                    },
                                },
                            }),
                            'to be fulfilled with',
                            expect.it('when sorted by id', 'to exhaustively satisfy', [
                                user1,
                                user2,
                            ])
                        );
                    });
                });
            });

            describe('with aliases', function () {
                it('uses the alises as the instance props', async function () {
                    const user1 = new User({
                        id: 1,
                        createdAt: null,
                        updatedAt: null,
                        name: 'User 1',
                        confirmed: false,
                        description: 'this is user 1',
                        age: 10,
                        dateOfBirth: new Date(1000),
                        dbDefault: 'set-by-db',
                    });
                    user1.theImage = new Image({
                        id: 1,
                        createdAt: null,
                        updatedAt: null,
                        userId: 1,
                        categoryId: 1,
                    });

                    const user2 = new User({
                        id: 2,
                        name: 'User 2',
                        confirmed: true,
                        description: 'this is user 2',
                        age: 10,
                        dateOfBirth: new Date(2000),
                        createdAt: null,
                        updatedAt: null,
                        dbDefault: 'set-by-db',
                    });
                    user2.theImage = undefined;

                    await expect(
                        query.fetchAll({ with: { Image: { as: 'theImage' } } }),
                        'to be fulfilled with',
                        expect.it('when sorted by id', 'to exhaustively satisfy', [
                            user1,
                            user2,
                        ])
                    );

                    user1.theImage.theImageCategory = new ImageCategory({
                        id: 1,
                        createdAt: null,
                        updatedAt: null,
                        name: 'User images',
                    });

                    const newQuery = new Query(User);

                    await expect(
                        newQuery.fetchAll({
                            with: {
                                Image: {
                                    as: 'theImage',
                                    with: {
                                        ImageCategory: 'theImageCategory',
                                    },
                                },
                            },
                        }),
                        'to be fulfilled with',
                        expect.it('when sorted by id', 'to exhaustively satisfy', [
                            user1,
                            user2,
                        ])
                    );
                });

                it('allows joins on the same model with different aliases', async function () {
                    const user1 = new User({
                        id: 1,
                        createdAt: null,
                        updatedAt: null,
                        name: 'User 1',
                        confirmed: false,
                        description: 'this is user 1',
                        age: 10,
                        dateOfBirth: new Date(1000),
                        dbDefault: 'set-by-db',
                    });
                    user1.image1 = new Image({
                        id: 1,
                        createdAt: null,
                        updatedAt: null,
                        userId: 1,
                        categoryId: 1,
                    });
                    user1.image2 = new Image({
                        id: 1,
                        createdAt: null,
                        updatedAt: null,
                        userId: 1,
                        categoryId: 1,
                    });

                    const user2 = new User({
                        id: 2,
                        name: 'User 2',
                        confirmed: true,
                        description: 'this is user 2',
                        age: 10,
                        dateOfBirth: new Date(2000),
                        createdAt: null,
                        updatedAt: null,
                        dbDefault: 'set-by-db',
                    });
                    user2.image1 = undefined;
                    user2.image2 = undefined;

                    await expect(
                        query.fetchAll({
                            with: [
                                { Image: 'image1' },
                                { Image: 'image2' },
                            ],
                        }),
                        'to be fulfilled with',
                        expect.it('when sorted by id', 'to exhaustively satisfy', [
                            user1,
                            user2,
                        ])
                    );

                    delete user1.image2;
                    user1.image1.imageCategory1 = new ImageCategory({
                        id: 1,
                        createdAt: null,
                        updatedAt: null,
                        name: 'User images',
                    });
                    user1.image1.imageCategory2 = new ImageCategory({
                        id: 1,
                        createdAt: null,
                        updatedAt: null,
                        name: 'User images',
                    });

                    const newQuery = new Query(User);

                    await expect(
                        newQuery.fetchAll({
                            with: {
                                Image: {
                                    as: 'image1',
                                    with: [
                                        { ImageCategory: 'imageCategory1' },
                                        { ImageCategory: 'imageCategory2' },
                                    ],
                                },
                            },
                        }),
                        'to be fulfilled with',
                        expect.it('when sorted by id', 'to exhaustively satisfy', [
                            user1,
                            user2,
                        ])
                    );
                });
            });
        });
    });
});

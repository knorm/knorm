const QueryBuilder = require('knex/lib/query/builder');
const AbstractModel = require('../Model');
const Field = require('../Field');
const knex = require('./lib/knex')();
const AbstractQuery = require('../Query');
const sinon = require('sinon');
const expect = require('unexpected')
    .clone()
    .use(require('unexpected-sinon'))
    .use(require('unexpected-knex'))
    .addAssertion(
        '<Promise> to be fulfilled with sorted rows exhaustively satisfying <array>',
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
                        'to exhaustively satisfy',
                        value
                    );
                }
            );
        }
    );

class Query extends AbstractQuery {}
Query.knex = knex;

class Model extends AbstractModel {}
Model.Query = Query;
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

const truncateUserTable = async () => {
    return knex.schema.raw(`TRUNCATE "${User.table}" RESTART IDENTITY CASCADE`);
};

class ImageCategory extends Model {}
ImageCategory.table = 'image_category';
ImageCategory.fields = {
    name: {
        type: Field.types.string,
        required: true,
    },
};

const createImageCategoryTable = table => {
    table.increments();
    table.timestamps();
    table.string('name').notNullable();
};

const truncateImageCategoryTable = async () => {
    return knex.schema.raw(`TRUNCATE "${ImageCategory.table}" RESTART IDENTITY CASCADE`);
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

const createImageTable = table => {
    table.increments();
    table.timestamps();
    table.integer('user_id').references('id').inTable('user');
    table.integer('category_id').references('id').inTable('user');
};

const truncateImageTable = async () => {
    return knex(Image.table).truncate();
};

class Message extends Model {}

Message.table = 'account';
Message.fields = {
    text: {
        type: Field.types.text,
        required: true,
    },
    senderId: {
        type: Field.types.integer,
        references: User.fields.id,
    },
    receiverId: {
        type: Field.types.integer,
        references: User.fields.id,
    },
};

const createMessageTable = table => {
    table.increments();
    table.timestamps();
    table.text('text').notNullable();
    table.integer('sender_id').references('id').inTable('user');
    table.integer('receiver_id').references('id').inTable('user');
};

const truncateMessageTable = async () => {
    return knex(Message.table).truncate();
};

describe('lib/newModels/Query', function () {
    before(async function () {
        await knex.schema.createTable(User.table, createUserTable);
        await knex.schema.createTable(ImageCategory.table, createImageCategoryTable);
        await knex.schema.createTable(Image.table, createImageTable);
        await knex.schema.createTable(Message.table, createMessageTable);
    });

    after(async function () {
        await knex.schema.dropTable(Message.table);
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

    describe('Query.prototype.fetch', function () {
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
        });

        after(async function () {
            await truncateUserTable();
        });

        it('resolves with all the rows in the table', async function () {
            const query = new Query(User);
            await expect(
                query.fetch(),
                'to be fulfilled with value satisfying',
                rows => expect(rows, 'to have length', 2)
            );
        });

        it('resolves with instances of the model', async function () {
            const query = new Query(User);
            await expect(
                query.fetch(),
                'to be fulfilled with value satisfying',
                [
                    expect.it('to be a', User),
                    expect.it('to be a', User),
                ]
            );
        });

        it('populates the instances with data for all the fields', async function () {
            const query = new Query(User);
            await expect(
                query.fetch(),
                'to be fulfilled with sorted rows exhaustively satisfying',
                [
                    new User({
                        id: 1,
                        createdAt: null,
                        updatedAt: null,
                        name: 'User 1',
                        confirmed: false,
                        description: 'this is user 1',
                        age: 10,
                        dateOfBirth: null,
                        dbDefault: 'set-by-db',
                    }),
                    new User({
                        id: 2,
                        createdAt: null,
                        updatedAt: null,
                        name: 'User 2',
                        confirmed: true,
                        description: 'this is user 2',
                        age: 10,
                        dateOfBirth: null,
                        dbDefault: 'set-by-db',
                    }),
                ]
            );
        });

        it('rejects with a ModelFetchError if a database error occurs', async function () {
            const query = new Query(User);
            const stub = sinon.stub(QueryBuilder.prototype, 'select').returns(
                Promise.reject(new Error('fetch error'))
            );
            await expect(
                query.fetch(),
                'to be rejected with error satisfying',
                error => {
                    expect(error, 'to be a', User.errors.FetchError);
                    expect(error, 'to exhaustively satisfy', {
                        message: 'fetch error',
                        originalError: new Error('fetch error'),
                    });
                }
            );
            stub.restore();
        });

        describe("with 'require' configured and no rows are matched", function () {
            let selectStub;

            before(function () {
                selectStub = sinon.stub(QueryBuilder.prototype, 'select')
                    .returns(Promise.resolve([]));
            });

            beforeEach(function () {
                selectStub.reset();
            });

            after(function () {
                selectStub.restore();
            });

            it('rejects with a RowsNotFoundError', async function () {
                const query = new Query(User).require();
                await expect(
                    query.fetch(),
                    'to be rejected with error satisfying',
                    new User.errors.RowsNotFoundError()
                );
            });

            describe("with 'first' configured", function () {
                it('rejects with a RowNotFoundError', async function () {
                    const query = new Query(User).require().first();
                    await expect(
                        query.fetch(),
                        'to be rejected with error satisfying',
                        new User.errors.RowNotFoundError()
                    );
                });
            });
        });

        describe("with 'first' configured", function () {
            it('resolves with an instance populated with data from the first row', async function () {
                const query = new Query(User).first();
                await expect(
                    query.fetch(),
                    'to be fulfilled with value exhaustively satisfying',
                    new User({
                        id: 1,
                        createdAt: null,
                        updatedAt: null,
                        name: 'User 1',
                        confirmed: false,
                        description: 'this is user 1',
                        age: 10,
                        dateOfBirth: null,
                        dbDefault: 'set-by-db',
                    })
                );
            });
        });

        describe("with 'forge' disabled", function () {
            it('resolves with plain JS objects', async function () {
                const query = new Query(User).forge(false);
                await expect(
                    query.fetch(),
                    'to be fulfilled with value satisfying',
                    [
                        expect.it('not to be a', User),
                        expect.it('not to be a', User),
                    ]
                );
            });

            it("uses the model's field names as the objects' keys", async function () {
                const query = new Query(User).forge(false);
                await expect(
                    query.fetch(),
                    'to be fulfilled with sorted rows exhaustively satisfying',
                    [
                        {
                            id: 1,
                            createdAt: null,
                            updatedAt: null,
                            name: 'User 1',
                            confirmed: false,
                            description: 'this is user 1',
                            age: 10,
                            dateOfBirth: null,
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
                            dateOfBirth: null,
                            dbDefault: 'set-by-db',
                        },
                    ]
                );
            });
        });

        describe("with a 'where' configured", function () {
            it('resolves with only the rows matching the query', async function () {
                const query = new Query(User).where({ id: 2 });
                await expect(
                    query.fetch(),
                    'to be fulfilled with sorted rows exhaustively satisfying',
                    [
                        new User({
                            id: 2,
                            createdAt: null,
                            updatedAt: null,
                            name: 'User 2',
                            confirmed: true,
                            description: 'this is user 2',
                            age: 10,
                            dateOfBirth: null,
                            dbDefault: 'set-by-db',
                        }),
                    ]
                );
            });
        });

        describe("with a 'whereNot' configured", function () {
            it('resolves with only the rows matching the query', async function () {
                const query = new Query(User).whereNot({ id: 1 });
                await expect(
                    query.fetch(),
                    'to be fulfilled with sorted rows exhaustively satisfying',
                    [
                        new User({
                            id: 2,
                            createdAt: null,
                            updatedAt: null,
                            name: 'User 2',
                            confirmed: true,
                            description: 'this is user 2',
                            age: 10,
                            dateOfBirth: null,
                            dbDefault: 'set-by-db',
                        }),
                    ]
                );
            });
        });

        describe("with an 'orWhere' configured", function () {
            it('resolves with only the rows matching the query', async function () {
                const query = new Query(User).where({ id: 1 }).orWhere({ id: 2 });
                await expect(
                    query.fetch(),
                    'to be fulfilled with sorted rows exhaustively satisfying',
                    [
                        new User({
                            id: 1,
                            createdAt: null,
                            updatedAt: null,
                            name: 'User 1',
                            confirmed: false,
                            description: 'this is user 1',
                            age: 10,
                            dateOfBirth: null,
                            dbDefault: 'set-by-db',
                        }),
                        new User({
                            id: 2,
                            createdAt: null,
                            updatedAt: null,
                            name: 'User 2',
                            confirmed: true,
                            description: 'this is user 2',
                            age: 10,
                            dateOfBirth: null,
                            dbDefault: 'set-by-db',
                        }),
                    ]
                );
            });
        });

        describe("with an 'orWhereNot' configured", function () {
            it('resolves with only the rows matching the query', async function () {
                const query = new Query(User).whereNot({ id: 1 }).orWhereNot({ id: 3 });
                await expect(
                    query.fetch(),
                    'to be fulfilled with sorted rows exhaustively satisfying',
                    [
                        new User({
                            id: 1,
                            createdAt: null,
                            updatedAt: null,
                            name: 'User 1',
                            confirmed: false,
                            description: 'this is user 1',
                            age: 10,
                            dateOfBirth: null,
                            dbDefault: 'set-by-db',
                        }),
                        new User({
                            id: 2,
                            createdAt: null,
                            updatedAt: null,
                            name: 'User 2',
                            confirmed: true,
                            description: 'this is user 2',
                            age: 10,
                            dateOfBirth: null,
                            dbDefault: 'set-by-db',
                        }),
                    ]
                );
            });
        });

        describe("with a 'groupBy' and 'having' configured", function () {
            it('resolves with the rows matching the grouping', async function () {
                const query = new Query(User)
                    .groupBy([ 'id', 'age' ])
                    .having({ age: 10 });
                await expect(
                    query.fetch(),
                    'to be fulfilled with sorted rows exhaustively satisfying',
                    [
                        new User({
                            id: 1,
                            createdAt: null,
                            updatedAt: null,
                            name: 'User 1',
                            confirmed: false,
                            description: 'this is user 1',
                            age: 10,
                            dateOfBirth: null,
                            dbDefault: 'set-by-db',
                        }),
                        new User({
                            id: 2,
                            createdAt: null,
                            updatedAt: null,
                            name: 'User 2',
                            confirmed: true,
                            description: 'this is user 2',
                            age: 10,
                            dateOfBirth: null,
                            dbDefault: 'set-by-db',
                        }),
                    ]
                );
            });
        });

        describe("with an 'orderBy' configured", function () {
            it('resolves with rows in the requested order', async function () {
                const query = new Query(User).orderBy({ id: 'desc' });
                await expect(
                    query.fetch(),
                    'to be fulfilled with value exhaustively satisfying',
                    [
                        new User({
                            id: 2,
                            createdAt: null,
                            updatedAt: null,
                            name: 'User 2',
                            confirmed: true,
                            description: 'this is user 2',
                            age: 10,
                            dateOfBirth: null,
                            dbDefault: 'set-by-db',
                        }),
                        new User({
                            id: 1,
                            createdAt: null,
                            updatedAt: null,
                            name: 'User 1',
                            confirmed: false,
                            description: 'this is user 1',
                            age: 10,
                            dateOfBirth: null,
                            dbDefault: 'set-by-db',
                        }),
                    ]
                );
            });
        });

        describe("with a 'limit' configured", function () {
            it('resolves with rows matching the limit', async function () {
                const query = new Query(User).limit(1);
                await expect(
                    query.fetch(),
                    'to be fulfilled with value exhaustively satisfying',
                    [
                        new User({
                            id: 1,
                            createdAt: null,
                            updatedAt: null,
                            name: 'User 1',
                            confirmed: false,
                            description: 'this is user 1',
                            age: 10,
                            dateOfBirth: null,
                            dbDefault: 'set-by-db',
                        }),
                    ]
                );
            });
        });

        describe("with an 'offset' configured", function () {
            it('resolves with rows starting from the offset', async function () {
                const query = new Query(User).offset(1);
                await expect(
                    query.fetch(),
                    'to be fulfilled with value exhaustively satisfying',
                    [
                        new User({
                            id: 2,
                            createdAt: null,
                            updatedAt: null,
                            name: 'User 2',
                            confirmed: true,
                            description: 'this is user 2',
                            age: 10,
                            dateOfBirth: null,
                            dbDefault: 'set-by-db',
                        }),
                    ]
                );
            });
        });

        describe("with an 'transaction' configured", function () {
            it('does the fetch within the transaction', async function () {
                const spy = sinon.spy(QueryBuilder.prototype, 'transacting');
                await expect(
                    knex.transaction(async transaction => {
                        const users = await new Query(User)
                            .transaction(transaction)
                            .fetch();

                        return users;
                    }),
                    'to be fulfilled with sorted rows exhaustively satisfying',
                    [
                        new User({
                            id: 1,
                            createdAt: null,
                            updatedAt: null,
                            name: 'User 1',
                            confirmed: false,
                            description: 'this is user 1',
                            age: 10,
                            dateOfBirth: null,
                            dbDefault: 'set-by-db',
                        }),
                        new User({
                            id: 2,
                            createdAt: null,
                            updatedAt: null,
                            name: 'User 2',
                            confirmed: true,
                            description: 'this is user 2',
                            age: 10,
                            dateOfBirth: null,
                            dbDefault: 'set-by-db',
                        }),
                    ]
                );
                await expect(spy, 'to have calls satisfying', () => {
                    spy(expect.it('to be a function'));
                });
                spy.restore();
            });
        });

        describe("with a 'with' configured", function () {
            before(async function () {
                await knex(ImageCategory.table).insert([
                    {
                        id: 1,
                        name: 'User images',
                    },
                ]);
                await knex(Image.table).insert([
                    {
                        id: 1,
                        user_id: 1,
                        category_id: 1,
                    },
                ]);
                await knex(Message.table).insert([
                    {
                        id: 1,
                        text: 'Hi User 2',
                        sender_id: 1,
                        receiver_id: 2,
                    },
                    {
                        id: 2,
                        text: 'Hi User 1',
                        sender_id: 2,
                        receiver_id: 1,
                    },
                ]);
            });

            after(async function () {
                await truncateMessageTable();
                await truncateImageTable();
                await truncateImageCategoryTable();
                await truncateUserTable();
            });

            it('throws an error if the models do not reference each other', function () {
                class Foo extends Model {}
                Foo.table = 'foo';
                expect(
                    () => new Query(User).with(new Query(Foo)),
                    'to throw',
                    new Error("'User' has no references to 'Foo'")
                );
                expect(
                    () => new Query(Foo).with(new Query(User)),
                    'to throw',
                    new Error("'Foo' has no references to 'User'")
                );
            });

            it("rejects with an error if a fetch is attempted from the joined model's query", async function () {
                const imageQuery = new Query(Image);
                new Query(User).with(imageQuery);
                await expect(
                    imageQuery.fetch(),
                    'to be rejected with error satisfying',
                    new Error(
                        "Cannot fetch from a child query. (Image.query is User.query's child)"
                    )
                );
            });

            it('includes the joined model in the returned instance using a camel-cased property name', async function () {
                const query = new Query(User).with(new Query(Image));
                await expect(
                    query.fetch(),
                    'to be fulfilled with sorted rows exhaustively satisfying',
                    [
                        Object.assign(new User({
                            id: 1,
                            createdAt: null,
                            updatedAt: null,
                            name: 'User 1',
                            confirmed: false,
                            description: 'this is user 1',
                            age: 10,
                            dateOfBirth: null,
                            dbDefault: 'set-by-db',
                        }), {
                            image: new Image({
                                id: 1,
                                createdAt: null,
                                updatedAt: null,
                                userId: 1,
                                categoryId: 1,
                            }),
                        }),
                        new User({
                            id: 2,
                            createdAt: null,
                            updatedAt: null,
                            name: 'User 2',
                            confirmed: true,
                            description: 'this is user 2',
                            age: 10,
                            dateOfBirth: null,
                            dbDefault: 'set-by-db',
                        }),
                    ]
                );
            });

            it('does not include the joined model if no rows were matched', async function () {
                const query = new Query(User)
                    .with(new Query(Image))
                    .where({ id: 2 });

                const user2 = new User({
                    id: 2,
                    createdAt: null,
                    updatedAt: null,
                    name: 'User 2',
                    confirmed: true,
                    description: 'this is user 2',
                    age: 10,
                    dateOfBirth: null,
                    dbDefault: 'set-by-db',
                });
                user2.image = undefined;

                await expect(
                    query.fetch(),
                    'to be fulfilled with sorted rows exhaustively satisfying',
                    [
                        user2,
                    ]
                );
            });

            it('includes the joined model as an array if more than one rows are matched', async function () {
                await knex('image').insert([
                    {
                        id: 2,
                        user_id: 1,
                        category_id: 1,
                    },
                ]);

                const query = new Query(User)
                    .where({ id: 1 })
                    .with(new Query(Image));
                await expect(
                    query.fetch(),
                    'to be fulfilled with sorted rows exhaustively satisfying',
                    [
                        Object.assign(new User({
                            id: 1,
                            createdAt: null,
                            updatedAt: null,
                            name: 'User 1',
                            confirmed: false,
                            description: 'this is user 1',
                            age: 10,
                            dateOfBirth: null,
                            dbDefault: 'set-by-db',
                        }), {
                            image: [
                                new Image({
                                    id: 1,
                                    createdAt: null,
                                    updatedAt: null,
                                    userId: 1,
                                    categoryId: 1,
                                }),
                                new Image({
                                    id: 2,
                                    createdAt: null,
                                    updatedAt: null,
                                    userId: 1,
                                    categoryId: 1,
                                }),
                            ],
                        }),
                    ]
                );

                await knex('image').where({ id: 2 }).delete();
            });

            describe("with 'require' configured on the child query", function () {
                it('returns the instances with matching data in the joined table (inner join)', async function () {
                    const query = new Query(User).with(
                        new Query(Image).require(true)
                    );
                    await expect(
                        query.fetch(),
                        'to be fulfilled with sorted rows exhaustively satisfying',
                        [
                            Object.assign(new User({
                                id: 1,
                                createdAt: null,
                                updatedAt: null,
                                name: 'User 1',
                                confirmed: false,
                                description: 'this is user 1',
                                age: 10,
                                dateOfBirth: null,
                                dbDefault: 'set-by-db',
                            }), {
                                image: new Image({
                                    id: 1,
                                    createdAt: null,
                                    updatedAt: null,
                                    userId: 1,
                                    categoryId: 1,
                                }),
                            }),
                        ]
                    );
                });

                it("rejects with a ModelsNotFoundError if the join doesn't match any rows", async function () {
                    const query = new Query(User)
                        .where({ id: 2 })
                        .with(new Query(Image).require(true));

                    await expect(
                        query.fetch(),
                        'to be rejected with error satisfying',
                        new Image.errors.RowsNotFoundError()
                    );
                });
            });

            describe("with 'fields' configured on the child query", function () {
                it('returns only the requested fields from the joined model', async function () {
                    const query = new Query(User)
                        .where({ id: 1 })
                        .with(
                            new Query(Image)
                                .fields('id')
                        );
                    await expect(
                        query.fetch(),
                        'to be fulfilled with sorted rows exhaustively satisfying',
                        [
                            Object.assign(new User({
                                id: 1,
                                createdAt: null,
                                updatedAt: null,
                                name: 'User 1',
                                confirmed: false,
                                description: 'this is user 1',
                                age: 10,
                                dateOfBirth: null,
                                dbDefault: 'set-by-db',
                            }), {
                                image: new Image({
                                    id: 1,
                                }),
                            }),
                        ]
                    );
                });
            });

            describe("with 'as' configured on the child query", function () {
                it('uses the passed string as the property name of the joined model', async function () {
                    const query = new Query(User)
                        .where({ id: 1 })
                        .with(
                            new Query(Image)
                                .as('theImage')
                        );
                    await expect(
                        query.fetch(),
                        'to be fulfilled with sorted rows exhaustively satisfying',
                        [
                            Object.assign(new User({
                                id: 1,
                                createdAt: null,
                                updatedAt: null,
                                name: 'User 1',
                                confirmed: false,
                                description: 'this is user 1',
                                age: 10,
                                dateOfBirth: null,
                                dbDefault: 'set-by-db',
                            }), {
                                theImage: new Image({
                                    id: 1,
                                    createdAt: null,
                                    updatedAt: null,
                                    userId: 1,
                                    categoryId: 1,
                                }),
                            }),
                        ]
                    );
                });
            });

            it('creates a join to the referenced model on all fields', async function () {
                const query = new Query(User).with(new Query(Message));
                await expect(
                    query.fetch(),
                    'to be fulfilled with sorted rows exhaustively satisfying',
                    [
                        // this query doesn't match any messages since it joins
                        // ON user.id = message.sender_id AND user.id = message.receiver_id
                        new User({
                            id: 1,
                            createdAt: null,
                            updatedAt: null,
                            name: 'User 1',
                            confirmed: false,
                            description: 'this is user 1',
                            age: 10,
                            dateOfBirth: null,
                            dbDefault: 'set-by-db',
                        }),
                        new User({
                            id: 2,
                            createdAt: null,
                            updatedAt: null,
                            name: 'User 2',
                            confirmed: true,
                            description: 'this is user 2',
                            age: 10,
                            dateOfBirth: null,
                            dbDefault: 'set-by-db',
                        }),
                    ]
                );
            });

            describe("with 'on' configured on the child query", function () {
                it('creates a join on the provided field', async function () {
                    const query = new Query(User).with([
                        new Query(Message)
                            .on(Message.fields.senderId)
                            .as('sentMessage'),
                        new Query(Message)
                            .on('receiverId')
                            .as('receivedMessage'),
                    ]);
                    await expect(
                        query.fetch(),
                        'to be fulfilled with sorted rows exhaustively satisfying',
                        [
                            Object.assign(new User({
                                id: 1,
                                createdAt: null,
                                updatedAt: null,
                                name: 'User 1',
                                confirmed: false,
                                description: 'this is user 1',
                                age: 10,
                                dateOfBirth: null,
                                dbDefault: 'set-by-db',
                            }), {
                                sentMessage: new Message({
                                    id: 1,
                                    createdAt: null,
                                    updatedAt: null,
                                    text: 'Hi User 2',
                                    senderId: 1,
                                    receiverId: 2,
                                }),
                                receivedMessage: new Message({
                                    id: 2,
                                    createdAt: null,
                                    updatedAt: null,
                                    text: 'Hi User 1',
                                    senderId: 2,
                                    receiverId: 1,
                                }),
                            }),
                            Object.assign(new User({
                                id: 2,
                                createdAt: null,
                                updatedAt: null,
                                name: 'User 2',
                                confirmed: true,
                                description: 'this is user 2',
                                age: 10,
                                dateOfBirth: null,
                                dbDefault: 'set-by-db',
                            }), {
                                sentMessage: new Message({
                                    id: 2,
                                    createdAt: null,
                                    updatedAt: null,
                                    text: 'Hi User 1',
                                    senderId: 2,
                                    receiverId: 1,
                                }),
                                receivedMessage: new Message({
                                    id: 1,
                                    createdAt: null,
                                    updatedAt: null,
                                    text: 'Hi User 2',
                                    senderId: 1,
                                    receiverId: 2,
                                }),
                            }),
                        ]
                    );
                });
            });

            describe("with 'where' configured on the child query", function () {
                it('fulfils the requested query on the joined model', async function () {
                    await knex('image').insert([
                        {
                            id: 2,
                            user_id: 1,
                            category_id: 1,
                        },
                    ]);

                    const query = new Query(User)
                        .with(
                            new Query(Image)
                                .where({ id: 2 })
                        );

                    await expect(
                        query.fetch(),
                        'to be fulfilled with sorted rows exhaustively satisfying',
                        [
                            Object.assign(new User({
                                id: 1,
                                createdAt: null,
                                updatedAt: null,
                                name: 'User 1',
                                confirmed: false,
                                description: 'this is user 1',
                                age: 10,
                                dateOfBirth: null,
                                dbDefault: 'set-by-db',
                            }), {
                                image: new Image({
                                    id: 2,
                                    createdAt: null,
                                    updatedAt: null,
                                    userId: 1,
                                    categoryId: 1,
                                }),
                            }),
                        ]
                    );

                    await knex('image').where({ id: 2 }).delete();
                });
            });

            describe("with 'whereNot' configured on the child query", function () {
                it('fulfils the requested query on the joined model', async function () {
                    await knex('image').insert([
                        {
                            id: 2,
                            user_id: 1,
                            category_id: 1,
                        },
                    ]);

                    const query = new Query(User)
                        .with(
                            new Query(Image)
                                .whereNot({ id: 2 })
                        );

                    await expect(
                        query.fetch(),
                        'to be fulfilled with sorted rows exhaustively satisfying',
                        [
                            Object.assign(new User({
                                id: 1,
                                createdAt: null,
                                updatedAt: null,
                                name: 'User 1',
                                confirmed: false,
                                description: 'this is user 1',
                                age: 10,
                                dateOfBirth: null,
                                dbDefault: 'set-by-db',
                            }), {
                                image: new Image({
                                    id: 1,
                                    createdAt: null,
                                    updatedAt: null,
                                    userId: 1,
                                    categoryId: 1,
                                }),
                            }),
                        ]
                    );

                    await knex('image').where({ id: 2 }).delete();
                });
            });

            describe("with 'orWhere' configured on the child query", function () {
                it('fulfils the requested query on the joined model', async function () {
                    await knex('image').insert([
                        {
                            id: 2,
                            user_id: 1,
                            category_id: 1,
                        },
                    ]);

                    const query = new Query(User)
                        .with(
                            new Query(Image)
                                .where({ id: 1 })
                                .orWhere({ id: 2 })
                        );

                    await expect(
                        query.fetch(),
                        'to be fulfilled with sorted rows exhaustively satisfying',
                        [
                            Object.assign(new User({
                                id: 1,
                                createdAt: null,
                                updatedAt: null,
                                name: 'User 1',
                                confirmed: false,
                                description: 'this is user 1',
                                age: 10,
                                dateOfBirth: null,
                                dbDefault: 'set-by-db',
                            }), {
                                image: [
                                    new Image({
                                        id: 2,
                                        createdAt: null,
                                        updatedAt: null,
                                        userId: 1,
                                        categoryId: 1,
                                    }),
                                    new Image({
                                        id: 1,
                                        createdAt: null,
                                        updatedAt: null,
                                        userId: 1,
                                        categoryId: 1,
                                    }),
                                ],
                            }),
                        ]
                    );

                    await knex('image').where({ id: 2 }).delete();
                });
            });

            describe("with 'orWhereNot' configured on the child query", function () {
                it('fulfils the requested query on the joined model', async function () {
                    await knex('image').insert([
                        {
                            id: 2,
                            user_id: 1,
                            category_id: 1,
                        },
                        {
                            id: 3,
                            user_id: 1,
                            category_id: 1,
                        },
                    ]);

                    const query = new Query(User)
                        .with(
                            new Query(Image)
                                .orWhereNot({ id: [ 1, 2 ] })
                        );

                    await expect(
                        query.fetch(),
                        'to be fulfilled with sorted rows exhaustively satisfying',
                        [
                            Object.assign(new User({
                                id: 1,
                                createdAt: null,
                                updatedAt: null,
                                name: 'User 1',
                                confirmed: false,
                                description: 'this is user 1',
                                age: 10,
                                dateOfBirth: null,
                                dbDefault: 'set-by-db',
                            }), {
                                image: new Image({
                                    id: 3,
                                    createdAt: null,
                                    updatedAt: null,
                                    userId: 1,
                                    categoryId: 1,
                                }),
                            }),
                        ]
                    );

                    await knex('image').where({ id: 2 }).orWhere({ id: 3 }).delete();
                });
            });

            describe("with 'orderBy' configured on the child query", function () {
                it('fulfils the requested order on the joined model', async function () {
                    await knex('image').insert([
                        {
                            id: 2,
                            user_id: 1,
                            category_id: 1,
                        },
                    ]);

                    const query = new Query(User)
                        .where({ id: 1 })
                        .with(
                            new Query(Image)
                                .orderBy({ id: -1 })
                        );

                    await expect(
                        query.fetch(),
                        'to be fulfilled with value exhaustively satisfying',
                        [
                            Object.assign(new User({
                                id: 1,
                                createdAt: null,
                                updatedAt: null,
                                name: 'User 1',
                                confirmed: false,
                                description: 'this is user 1',
                                age: 10,
                                dateOfBirth: null,
                                dbDefault: 'set-by-db',
                            }), {
                                image: [
                                    new Image({
                                        id: 2,
                                        createdAt: null,
                                        updatedAt: null,
                                        userId: 1,
                                        categoryId: 1,
                                    }),
                                    new Image({
                                        id: 1,
                                        createdAt: null,
                                        updatedAt: null,
                                        userId: 1,
                                        categoryId: 1,
                                    }),
                                ],
                            }),
                        ]
                    );

                    await knex('image').where({ id: 2 }).delete();
                });
            });

            describe("with 'groupBy' configured on the child query", function () {
                it('fulfils the requested grouping on the joined model', async function () {
                    await knex('image').insert([
                        {
                            id: 2,
                            user_id: 1,
                            category_id: 1,
                        },
                    ]);

                    const query = new Query(User)
                        .where({ id: 1 })
                        .groupBy('id')
                        .with(
                            new Query(Image)
                                .groupBy([ 'id', 'userId' ])
                        );

                    await expect(
                        query.fetch(),
                        'to be fulfilled with sorted rows exhaustively satisfying',
                        [
                            Object.assign(new User({
                                id: 1,
                                createdAt: null,
                                updatedAt: null,
                                name: 'User 1',
                                confirmed: false,
                                description: 'this is user 1',
                                age: 10,
                                dateOfBirth: null,
                                dbDefault: 'set-by-db',
                            }), {
                                image: [
                                    new Image({
                                        id: 1,
                                        createdAt: null,
                                        updatedAt: null,
                                        userId: 1,
                                        categoryId: 1,
                                    }),
                                    new Image({
                                        id: 2,
                                        createdAt: null,
                                        updatedAt: null,
                                        userId: 1,
                                        categoryId: 1,
                                    }),
                                ],
                            }),
                        ]
                    );

                    await knex('image').where({ id: 2 }).delete();
                });
            });

            describe("with 'having' configured on the child query", function () {
                it('fulfils the requested order on the joined model', async function () {
                    await knex('image').insert([
                        {
                            id: 2,
                            user_id: 1,
                            category_id: 1,
                        },
                        {
                            id: 3,
                            user_id: 2,
                            category_id: 1,
                        },
                    ]);

                    const query = new Query(User)
                        .where({ id: 1 })
                        .groupBy('id')
                        .with(
                            new Query(Image)
                                .groupBy([ 'id', 'userId' ])
                                .having({ userId: 1  })
                        );

                    await expect(
                        query.fetch(),
                        'to be fulfilled with sorted rows exhaustively satisfying',
                        [
                            Object.assign(new User({
                                id: 1,
                                createdAt: null,
                                updatedAt: null,
                                name: 'User 1',
                                confirmed: false,
                                description: 'this is user 1',
                                age: 10,
                                dateOfBirth: null,
                                dbDefault: 'set-by-db',
                            }), {
                                image: [
                                    new Image({
                                        id: 1,
                                        createdAt: null,
                                        updatedAt: null,
                                        userId: 1,
                                        categoryId: 1,
                                    }),
                                    new Image({
                                        id: 2,
                                        createdAt: null,
                                        updatedAt: null,
                                        userId: 1,
                                        categoryId: 1,
                                    }),
                                ],
                            }),
                        ]
                    );

                    await knex('image').where({ id: 2 }).orWhere({ id: 3 }).delete();
                });
            });

            describe("with 'forge' disabled", function () {
                it('includes a plain object of the requested model', async function () {
                    const query = new Query(User)
                        .forge(false)
                        .with(new Query(Image));

                    await expect(
                        query.fetch(),
                        'to be fulfilled with sorted rows exhaustively satisfying',
                        [
                            {
                                id: 1,
                                createdAt: null,
                                updatedAt: null,
                                name: 'User 1',
                                confirmed: false,
                                description: 'this is user 1',
                                age: 10,
                                dateOfBirth: null,
                                dbDefault: 'set-by-db',
                                image: {
                                    id: 1,
                                    createdAt: null,
                                    updatedAt: null,
                                    userId: 1,
                                    categoryId: 1,
                                },
                            },
                            {
                                id: 2,
                                createdAt: null,
                                updatedAt: null,
                                name: 'User 2',
                                confirmed: true,
                                description: 'this is user 2',
                                age: 10,
                                dateOfBirth: null,
                                dbDefault: 'set-by-db',
                            },
                        ]
                    );
                });

                it('does not include the joined model if no rows were matched', async function () {
                    const query = new Query(User)
                        .with(new Query(Image))
                        .where({ id: 2 })
                        .forge(false);

                    await expect(
                        query.fetch(),
                        'to be fulfilled with sorted rows exhaustively satisfying',
                        [
                            {
                                id: 2,
                                createdAt: null,
                                updatedAt: null,
                                name: 'User 2',
                                confirmed: true,
                                description: 'this is user 2',
                                age: 10,
                                dateOfBirth: null,
                                dbDefault: 'set-by-db',
                                image: undefined,
                            },
                        ]
                    );
                });

                it('includes the joined model as an array if more than one rows are matched', async function () {
                    await knex('image').insert([
                        {
                            id: 2,
                            user_id: 1,
                            category_id: 1,
                        },
                    ]);

                    const query = new Query(User)
                        .where({ id: 1 })
                        .with(new Query(Image));
                    await expect(
                        query.fetch(),
                        'to be fulfilled with sorted rows exhaustively satisfying',
                        [
                            {
                                id: 1,
                                createdAt: null,
                                updatedAt: null,
                                name: 'User 1',
                                confirmed: false,
                                description: 'this is user 1',
                                age: 10,
                                dateOfBirth: null,
                                dbDefault: 'set-by-db',
                                image: [
                                    {
                                        id: 1,
                                        createdAt: null,
                                        updatedAt: null,
                                        userId: 1,
                                        categoryId: 1,
                                    },
                                    {
                                        id: 2,
                                        createdAt: null,
                                        updatedAt: null,
                                        userId: 1,
                                        categoryId: 1,
                                    },
                                ],
                            },
                        ]
                    );

                    await knex('image').where({ id: 2 }).delete();
                });
            });

            it('allows passing a model directly', async function () {
                const query = new Query(User).with(Image);
                await expect(
                    query.fetch(),
                    'to be fulfilled with sorted rows exhaustively satisfying',
                    [
                        Object.assign(new User({
                            id: 1,
                            createdAt: null,
                            updatedAt: null,
                            name: 'User 1',
                            confirmed: false,
                            description: 'this is user 1',
                            age: 10,
                            dateOfBirth: null,
                            dbDefault: 'set-by-db',
                        }), {
                            image: new Image({
                                id: 1,
                                createdAt: null,
                                updatedAt: null,
                                userId: 1,
                                categoryId: 1,
                            }),
                        }),
                        new User({
                            id: 2,
                            createdAt: null,
                            updatedAt: null,
                            name: 'User 2',
                            confirmed: true,
                            description: 'this is user 2',
                            age: 10,
                            dateOfBirth: null,
                            dbDefault: 'set-by-db',
                        }),
                    ]
                );
            });

            it('allows passing options when a model is passed directly', async function () {
                const query = new Query(User).with(Image, { require: true });
                await expect(
                    query.fetch(),
                    'to be fulfilled with sorted rows exhaustively satisfying',
                    [
                        Object.assign(new User({
                            id: 1,
                            createdAt: null,
                            updatedAt: null,
                            name: 'User 1',
                            confirmed: false,
                            description: 'this is user 1',
                            age: 10,
                            dateOfBirth: null,
                            dbDefault: 'set-by-db',
                        }), {
                            image: new Image({
                                id: 1,
                                createdAt: null,
                                updatedAt: null,
                                userId: 1,
                                categoryId: 1,
                            }),
                        }),
                    ]
                );
            });

            describe('with a reverse-reference join', function () {
                it('resolves with the correct data', async function () {
                    const query = new Query(Image).with(new Query(User));
                    await expect(
                        query.fetch(),
                        'to be fulfilled with sorted rows exhaustively satisfying',
                        [
                            Object.assign(new Image({
                                id: 1,
                                createdAt: null,
                                updatedAt: null,
                                userId: 1,
                                categoryId: 1,
                            }), {
                                user: new User({
                                    id: 1,
                                    createdAt: null,
                                    updatedAt: null,
                                    name: 'User 1',
                                    confirmed: false,
                                    description: 'this is user 1',
                                    age: 10,
                                    dateOfBirth: null,
                                    dbDefault: 'set-by-db',
                                }),
                            }),
                        ]
                    );
                });

                it("supports the 'on' option as a string", async function () {
                    const query = new Query(Image)
                        .with(
                            new Query(User)
                                .on('id')
                        );
                    await expect(
                        query.fetch(),
                        'to be fulfilled with sorted rows exhaustively satisfying',
                        [
                            Object.assign(new Image({
                                id: 1,
                                createdAt: null,
                                updatedAt: null,
                                userId: 1,
                                categoryId: 1,
                            }), {
                                user: new User({
                                    id: 1,
                                    createdAt: null,
                                    updatedAt: null,
                                    name: 'User 1',
                                    confirmed: false,
                                    description: 'this is user 1',
                                    age: 10,
                                    dateOfBirth: null,
                                    dbDefault: 'set-by-db',
                                }),
                            }),
                        ]
                    );
                });

                it("supports the 'on' option as a field object", async function () {
                    const query = new Query(Image)
                        .with(
                            new Query(User)
                                .on(User.fields.id)
                        );
                    await expect(
                        query.fetch(),
                        'to be fulfilled with sorted rows exhaustively satisfying',
                        [
                            Object.assign(new Image({
                                id: 1,
                                createdAt: null,
                                updatedAt: null,
                                userId: 1,
                                categoryId: 1,
                            }), {
                                user: new User({
                                    id: 1,
                                    createdAt: null,
                                    updatedAt: null,
                                    name: 'User 1',
                                    confirmed: false,
                                    description: 'this is user 1',
                                    age: 10,
                                    dateOfBirth: null,
                                    dbDefault: 'set-by-db',
                                }),
                            }),
                        ]
                    );
                });
            });

            describe("with a nested 'with' query", function () {
                it('includes the nested data in the returned data if rows are matched', async function () {
                    const query = new Query(User).with(
                        new Query(Image).with(
                            new Query(ImageCategory)
                        )
                    );
                    await expect(
                        query.fetch(),
                        'to be fulfilled with sorted rows exhaustively satisfying',
                        [
                            Object.assign(new User({
                                id: 1,
                                createdAt: null,
                                updatedAt: null,
                                name: 'User 1',
                                confirmed: false,
                                description: 'this is user 1',
                                age: 10,
                                dateOfBirth: null,
                                dbDefault: 'set-by-db',
                            }), {
                                image: Object.assign(new Image({
                                    id: 1,
                                    createdAt: null,
                                    updatedAt: null,
                                    userId: 1,
                                    categoryId: 1,
                                }), {
                                    imageCategory: new ImageCategory({
                                        id: 1,
                                        createdAt: null,
                                        updatedAt: null,
                                        name: 'User images',
                                    }),
                                }),
                            }),
                            new User({
                                id: 2,
                                createdAt: null,
                                updatedAt: null,
                                name: 'User 2',
                                confirmed: true,
                                description: 'this is user 2',
                                age: 10,
                                dateOfBirth: null,
                                dbDefault: 'set-by-db',
                            }),
                        ]
                    );
                });
            });

            describe("with a circular 'with' query", function () {
                it('includes the circular data in the returned data', async function () {
                    const query = new Query(User).with(
                        new Query(Image).with(
                            new Query(ImageCategory).with(
                                new Query(Image).with(
                                    new Query(User)
                                )
                            )
                        )
                    );
                    await expect(
                        query.fetch(),
                        'to be fulfilled with sorted rows exhaustively satisfying',
                        [
                            Object.assign(new User({
                                id: 1,
                                createdAt: null,
                                updatedAt: null,
                                name: 'User 1',
                                confirmed: false,
                                description: 'this is user 1',
                                age: 10,
                                dateOfBirth: null,
                                dbDefault: 'set-by-db',
                            }), {
                                image: Object.assign(new Image({
                                    id: 1,
                                    createdAt: null,
                                    updatedAt: null,
                                    userId: 1,
                                    categoryId: 1,
                                }), {
                                    imageCategory: Object.assign(new ImageCategory({
                                        id: 1,
                                        createdAt: null,
                                        updatedAt: null,
                                        name: 'User images',
                                    }), {
                                        image: Object.assign(new Image({
                                            id: 1,
                                            createdAt: null,
                                            updatedAt: null,
                                            userId: 1,
                                            categoryId: 1,
                                        }), {
                                            user: new User({
                                                id: 1,
                                                createdAt: null,
                                                updatedAt: null,
                                                name: 'User 1',
                                                confirmed: false,
                                                description: 'this is user 1',
                                                age: 10,
                                                dateOfBirth: null,
                                                dbDefault: 'set-by-db',
                                            }),
                                        }),
                                    }),
                                }),
                            }),
                            new User({
                                id: 2,
                                createdAt: null,
                                updatedAt: null,
                                name: 'User 2',
                                confirmed: true,
                                description: 'this is user 2',
                                age: 10,
                                dateOfBirth: null,
                                dbDefault: 'set-by-db',
                            }),
                        ]
                    );
                });
            });
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
                'to be rejected with error satisfying',
                error => {
                    expect(error, 'to be a', User.errors.CountError);
                    expect(error, 'to exhaustively satisfy', {
                        message: 'count error',
                        originalError: new Error('count error'),
                    });
                }
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
                const query = new Query(User).with(new Query(Image).require(true));
                await expect(
                    query.count(),
                    'to be fulfilled with',
                    1
                );
            });
        });
    });
});

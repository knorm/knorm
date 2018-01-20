const { snakeCase: fieldToColumn } = require('lodash');
const QueryBuilder = require('knex/lib/query/builder');
const Knorm = require('../lib/Knorm');
const KnormQuery = require('../lib/Query');
const knex = require('./lib/knex');
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

const { Model, Query } = new Knorm({ knex, fieldToColumn });

Model.fields = {
  id: {
    type: 'integer',
    required: true,
    primary: true,
    updated: false
  }
};

class User extends Model {}
User.table = 'user';
User.fields = {
  name: {
    type: 'string',
    required: true
  },
  description: {
    type: 'string'
  },
  age: {
    type: 'integer',
    default: null
  },
  confirmed: {
    type: 'boolean',
    required: true,
    default: false
  },
  dateOfBirth: {
    type: 'dateTime'
  },
  dbDefault: {
    type: 'string'
  },
  jsonField: {
    type: 'json',
    cast: {
      forSave(value) {
        if (value !== null) {
          return JSON.stringify(value);
        }
      }
    }
  },
  intToString: {
    type: 'integer',
    cast: {
      forFetch(value) {
        if (value !== null) {
          return String(value);
        }
      }
    }
  }
};

const createUserTable = table => {
  table.increments();
  table.string('name').notNullable();
  table.text('description');
  table.integer('age');
  table.boolean('confirmed').notNullable();
  table.dateTime('date_of_birth');
  table.string('db_default').defaultTo('set-by-db');
  table.jsonb('json_field');
  table.integer('int_to_string');
};

const truncateUserTable = async () => {
  return knex.schema.raw(`TRUNCATE "${User.table}" RESTART IDENTITY CASCADE`);
};

class ImageCategory extends Model {}
ImageCategory.table = 'image_category';
ImageCategory.fields = {
  name: {
    type: 'string',
    required: true
  }
};

const createImageCategoryTable = table => {
  table.increments();
  table.string('name').notNullable();
};

const truncateImageCategoryTable = async () => {
  return knex.schema.raw(
    `TRUNCATE "${ImageCategory.table}" RESTART IDENTITY CASCADE`
  );
};

class Image extends Model {}
Image.table = 'image';
Image.fields = {
  userId: {
    type: 'integer',
    references: User.fields.id
  },
  categoryId: {
    type: 'integer',
    references: ImageCategory.fields.id
  }
};

const createImageTable = table => {
  table.increments();
  table
    .integer('user_id')
    .references('id')
    .inTable(User.table);
  table
    .integer('category_id')
    .references('id')
    .inTable(User.table);
};

const truncateImageTable = async () => {
  return knex(Image.table).truncate();
};

class Message extends Model {}

Message.table = 'message';
Message.fields = {
  text: {
    type: 'text',
    required: true
  },
  senderId: {
    type: 'integer',
    references: User.fields.id
  },
  receiverId: {
    type: 'integer',
    references: User.fields.id
  }
};

const createMessageTable = table => {
  table.increments();
  table.timestamps();
  table.text('text').notNullable();
  table
    .integer('sender_id')
    .references('id')
    .inTable(User.table);
  table
    .integer('receiver_id')
    .references('id')
    .inTable(User.table);
};

const truncateMessageTable = async () => {
  return knex(Message.table).truncate();
};

describe('Query', function() {
  before(async function() {
    await knex.schema.createTable(User.table, createUserTable);
    await knex.schema.createTable(
      ImageCategory.table,
      createImageCategoryTable
    );
    await knex.schema.createTable(Image.table, createImageTable);
    await knex.schema.createTable(Message.table, createMessageTable);
  });

  after(async function() {
    await knex.schema.dropTable(Message.table);
    await knex.schema.dropTable(Image.table);
    await knex.schema.dropTable(ImageCategory.table);
    await knex.schema.dropTable(User.table);
  });

  describe('constructor', function() {
    it('throws an error if not passed a model', function() {
      expect(
        () => new Query(),
        'to throw',
        new Error('Query requires a Model class')
      );
    });

    it('throws an error if the passed model does not inherit from Model', function() {
      class Foo {}
      expect(
        () => new Query(Foo),
        'to throw',
        new Error('Query requires a subclass of Model')
      );
    });

    it("throws an error if the passed model's table-name is not set", function() {
      class Foo extends Model {}
      expect(
        () => new Query(Foo),
        'to throw',
        new Error("'Foo.table' is not configured")
      );
    });

    it('throws an error if Query.knex is not configured', function() {
      class Foo extends Model {}
      Foo.table = 'foo';
      expect(
        () => new KnormQuery(Foo),
        'to throw',
        new Error('Query.knex is not configured')
      );
    });
  });

  describe('Query.prototype.setOptions', function() {
    it('throws an error if passed an option that is not a Query method', function() {
      expect(
        () => new Query(User).setOptions({ foo: 'bar' }),
        'to throw',
        new Error("Unknown option 'foo'")
      );
    });

    it('throws an error if a db-method is passed as an option', function() {
      ['count', 'fetch', 'insert', 'update', 'save', 'delete'].forEach(
        method => {
          expect(
            () => new Query(User).setOptions({ [method]: 'bar' }),
            'to throw',
            new Error(`'${method}' is not an allowed option`)
          );
        }
      );
    });

    it('throws an error if `setOptions` is passed as an option', function() {
      expect(
        () => new Query(User).setOptions({ setOptions: 'bar' }),
        'to throw',
        new Error("'setOptions' is not an allowed option")
      );
    });

    it('throws an error if a private method is passed as an option', function() {
      expect(
        () => new Query(User).setOptions({ _addFields: 'bar' }),
        'to throw',
        new Error("'_addFields' is not an allowed option")
      );
    });
  });

  describe('Query.prototype.fetch', function() {
    before(async function() {
      await knex(User.table).insert([
        {
          id: 1,
          name: 'User 1',
          confirmed: false,
          description: 'this is user 1',
          age: 10,
          date_of_birth: null,
          json_field: null,
          int_to_string: 10
        },
        {
          id: 2,
          name: 'User 2',
          confirmed: true,
          description: 'this is user 2',
          age: 10,
          date_of_birth: null,
          json_field: null,
          int_to_string: null
        }
      ]);
    });

    after(async function() {
      await truncateUserTable();
    });

    it('resolves with all the rows in the table', async function() {
      const query = new Query(User);
      await expect(
        query.fetch(),
        'to be fulfilled with value satisfying',
        rows => expect(rows, 'to have length', 2)
      );
    });

    it('resolves with instances of the model', async function() {
      const query = new Query(User);
      await expect(query.fetch(), 'to be fulfilled with value satisfying', [
        expect.it('to be a', User),
        expect.it('to be a', User)
      ]);
    });

    it('populates the instances with data for all the fields', async function() {
      const query = new Query(User);
      await expect(
        query.fetch(),
        'to be fulfilled with sorted rows exhaustively satisfying',
        [
          new User({
            id: 1,
            name: 'User 1',
            confirmed: false,
            description: 'this is user 1',
            age: 10,
            dateOfBirth: null,
            dbDefault: 'set-by-db',
            jsonField: null,
            intToString: '10'
          }),
          new User({
            id: 2,
            name: 'User 2',
            confirmed: true,
            description: 'this is user 2',
            age: 10,
            dateOfBirth: null,
            dbDefault: 'set-by-db',
            jsonField: null,
            intToString: null
          })
        ]
      );
    });

    it('casts fields configured with post-fetch cast functions after fetching', async function() {
      const query = new Query(User);
      await expect(
        query.fetch(),
        'to be fulfilled with sorted rows exhaustively satisfying',
        [
          new User({
            id: 1,
            name: 'User 1',
            confirmed: false,
            description: 'this is user 1',
            age: 10,
            dateOfBirth: null,
            dbDefault: 'set-by-db',
            jsonField: null,
            intToString: '10'
          }),
          new User({
            id: 2,
            name: 'User 2',
            confirmed: true,
            description: 'this is user 2',
            age: 10,
            dateOfBirth: null,
            dbDefault: 'set-by-db',
            jsonField: null,
            intToString: null
          })
        ]
      );
    });

    it('accepts options', async function() {
      const query = new Query(User);
      await expect(
        query.fetch({ first: true, fields: ['id', 'name'] }),
        'to be fulfilled with value exhaustively satisfying',
        new User({
          id: 1,
          name: 'User 1'
        })
      );
    });

    it('rejects with a FetchError if a database error occurs', async function() {
      const stub = sinon
        .stub(QueryBuilder.prototype, 'select')
        .returns(Promise.reject(new Error('fetch error')));
      const query = new Query(User);
      await expect(
        query.fetch(),
        'to be rejected with error satisfying',
        new Query.FetchError({ error: new Error('fetch error'), query })
      );
      stub.restore();
    });

    describe('if no rows are matched', function() {
      let selectStub;

      before(function() {
        selectStub = sinon.stub(QueryBuilder.prototype, 'select');
      });

      beforeEach(function() {
        selectStub.reset();
        selectStub.returns(Promise.resolve([]));
      });

      after(function() {
        selectStub.restore();
      });

      it('resolves with an empty array', async function() {
        const query = new Query(User);
        await expect(
          query.fetch(),
          'to be fulfilled with value satisfying',
          []
        );
      });

      describe("with 'first' configured", function() {
        it('resolves with null', async function() {
          const query = new Query(User).first();
          await expect(
            query.fetch(),
            'to be fulfilled with value satisfying',
            null
          );
        });
      });

      describe("with 'require' configured", function() {
        it('rejects with a NoRowsFetchedError', async function() {
          const query = new Query(User).require();
          await expect(
            query.fetch(),
            'to be rejected with error satisfying',
            new Query.NoRowsFetchedError({ query })
          );
        });
      });
    });

    describe("with 'first' configured", function() {
      it('resolves with an instance populated with data from the first row', async function() {
        const query = new Query(User).first();
        await expect(
          query.fetch(),
          'to be fulfilled with value exhaustively satisfying',
          new User({
            id: 1,
            name: 'User 1',
            confirmed: false,
            description: 'this is user 1',
            age: 10,
            dateOfBirth: null,
            dbDefault: 'set-by-db',
            jsonField: null,
            intToString: '10'
          })
        );
      });
    });

    describe("with 'forge' disabled", function() {
      it('resolves with plain JS objects', async function() {
        const query = new Query(User).forge(false);
        await expect(query.fetch(), 'to be fulfilled with value satisfying', [
          expect.it('not to be a', User),
          expect.it('not to be a', User)
        ]);
      });

      it('casts fields with post-fetch cast functions', async function() {
        const query = new Query(User).forge(false);
        await expect(
          query.fetch(),
          'to be fulfilled with sorted rows satisfying',
          [
            {
              id: 1,
              intToString: '10'
            },
            {
              id: 2,
              intToString: null
            }
          ]
        );
      });

      it("uses the model's field names as the objects' keys", async function() {
        const query = new Query(User).forge(false);
        await expect(
          query.fetch(),
          'to be fulfilled with sorted rows exhaustively satisfying',
          [
            {
              id: 1,
              name: 'User 1',
              confirmed: false,
              description: 'this is user 1',
              age: 10,
              dateOfBirth: null,
              dbDefault: 'set-by-db',
              jsonField: null,
              intToString: '10'
            },
            {
              id: 2,
              name: 'User 2',
              confirmed: true,
              description: 'this is user 2',
              age: 10,
              dateOfBirth: null,
              dbDefault: 'set-by-db',
              jsonField: null,
              intToString: null
            }
          ]
        );
      });

      describe('vial the `lean` alias', function() {
        it('resolves with plain JS objects', async function() {
          const query = new Query(User).lean();
          await expect(query.fetch(), 'to be fulfilled with value satisfying', [
            expect.it('not to be a', User),
            expect.it('not to be a', User)
          ]);
        });
      });
    });

    describe("with a 'where' configured", function() {
      it('resolves with only the rows matching the query', async function() {
        const query = new Query(User).where({ id: 2 });
        await expect(
          query.fetch(),
          'to be fulfilled with sorted rows exhaustively satisfying',
          [
            new User({
              id: 2,
              name: 'User 2',
              confirmed: true,
              description: 'this is user 2',
              age: 10,
              dateOfBirth: null,
              dbDefault: 'set-by-db',
              jsonField: null,
              intToString: null
            })
          ]
        );
      });
    });

    describe("with 'fields' configured", function() {
      it('resolves with instances containing only the requested fields', async function() {
        const query = new Query(User).fields(['id', 'name']);
        await expect(
          query.fetch(),
          'to be fulfilled with sorted rows exhaustively satisfying',
          [
            new User({ id: 1, name: 'User 1' }),
            new User({ id: 2, name: 'User 2' })
          ]
        );
      });

      it('always includes the `id` field even if not requested', async function() {
        const query = new Query(User).fields('name');
        await expect(
          query.fetch(),
          'to be fulfilled with sorted rows exhaustively satisfying',
          [
            new User({ id: 1, name: 'User 1' }),
            new User({ id: 2, name: 'User 2' })
          ]
        );
      });

      it('resolves with instances containing only the requested fields', async function() {
        const query = new Query(User).fields(['name', 'confirmed']);
        await expect(
          query.fetch(),
          'to be fulfilled with sorted rows exhaustively satisfying',
          [
            new User({ id: 1, name: 'User 1', confirmed: false }),
            new User({ id: 2, name: 'User 2', confirmed: true })
          ]
        );
      });

      it('casts the fields requested if they have post-fetch cast functions', async function() {
        const query = new Query(User).fields('intToString');
        await expect(
          query.fetch(),
          'to be fulfilled with sorted rows exhaustively satisfying',
          [
            new User({ id: 1, intToString: '10' }),
            new User({ id: 2, intToString: null })
          ]
        );
      });

      it('throws an error of the string is an unknown field name', async function() {
        await expect(
          () => new Query(User).fields('foo'),
          'to throw',
          new Error("Unknown field 'User.foo'")
        );
      });

      describe('as a Field instance', function() {
        it('resolves with instances containing the requested fields', async function() {
          const query = new Query(User).fields(User.fields.name);
          await expect(
            query.fetch(),
            'to be fulfilled with sorted rows exhaustively satisfying',
            [
              new User({ id: 1, name: 'User 1' }),
              new User({ id: 2, name: 'User 2' })
            ]
          );
        });

        it('throws an error if the field does not belong to the model', async function() {
          await expect(
            () => new Query(User).fields(Image.fields.userId),
            'to throw',
            new Error("Field 'Image.userId' is not a field of 'User'")
          );
        });
      });

      describe('as an object with string values', function() {
        it('uses the string values as aliases for the fields', async function() {
          const query = new Query(User).fields({ age: 'ages' });
          await expect(
            query.fetch(),
            'to be fulfilled with sorted rows exhaustively satisfying',
            [
              Object.assign(new User({ id: 1 }), { ages: 10 }),
              Object.assign(new User({ id: 2 }), { ages: 10 })
            ]
          );
        });

        it('still casts the field values even when using aliases', async function() {
          const query = new Query(User).fields({ intToString: 'shouldBeCast' });
          await expect(
            query.fetch(),
            'to be fulfilled with sorted rows exhaustively satisfying',
            [
              Object.assign(new User({ id: 1 }), { shouldBeCast: '10' }),
              Object.assign(new User({ id: 2 }), { shouldBeCast: null })
            ]
          );
        });
      });

      describe('as an object with Field instance values', function() {
        it('resolves with instances containing the requested fields', async function() {
          const query = new Query(User).fields(User.fields);
          await expect(
            query.fetch(),
            'to be fulfilled with sorted rows exhaustively satisfying',
            [
              new User({
                id: 1,
                name: 'User 1',
                confirmed: false,
                description: 'this is user 1',
                age: 10,
                dateOfBirth: null,
                dbDefault: 'set-by-db'
              }),
              new User({
                id: 2,
                name: 'User 2',
                confirmed: true,
                description: 'this is user 2',
                age: 10,
                dateOfBirth: null,
                dbDefault: 'set-by-db'
              })
            ]
          );
        });

        it('throws an error if the keys are not fields that belong to the model', async function() {
          await expect(
            () => new Query(User).fields({ userId: Image.fields.userId }),
            'to throw',
            new Error("Unknown field 'User.userId'")
          );
        });

        it('throws an error if the field value does not belong to the model', async function() {
          await expect(
            () => new Query(User).fields({ age: Image.fields.userId }),
            'to throw',
            new Error("Field 'Image.userId' is not a field of 'User'")
          );
        });
      });

      describe('as an array of strings', function() {
        it('resolves with instances containing the requested fields', async function() {
          const query = new Query(User).fields(['name', 'age', 'confirmed']);
          await expect(
            query.fetch(),
            'to be fulfilled with sorted rows exhaustively satisfying',
            [
              new User({
                name: 'User 1',
                age: 10,
                confirmed: false
              }),
              new User({
                name: 'User 2',
                age: 10,
                confirmed: true
              })
            ]
          );
        });
      });

      describe('as an array of Field instances', function() {
        it('resolves with instances containing the requested fields', async function() {
          const query = new Query(User).fields([
            User.fields.age,
            User.fields.confirmed
          ]);
          await expect(
            query.fetch(),
            'to be fulfilled with sorted rows exhaustively satisfying',
            [
              new User({
                age: 10,
                confirmed: false
              }),
              new User({
                age: 10,
                confirmed: true
              })
            ]
          );
        });
      });
    });

    describe("with 'distinct' configured", function() {
      it('resolves with instances matching the distinct fields', async function() {
        await expect(
          new Query(User).distinct('age').fetch(),
          'to be fulfilled with value exhaustively satisfying',
          [new User({ age: 10 })]
        );
        await expect(
          new Query(User).distinct(['id', 'name']).fetch(),
          'to be fulfilled with sorted rows exhaustively satisfying',
          [
            new User({ id: 1, name: 'User 1' }),
            new User({ id: 2, name: 'User 2' })
          ]
        );
        await expect(
          new Query(User).distinct(['name']).fetch(),
          'to be fulfilled with value satisfying',
          rows =>
            expect(
              rows,
              'when sorted by',
              (a, b) => (a.name > b.name ? 1 : -1),
              'to exhaustively satisfy',
              [new User({ name: 'User 1' }), new User({ name: 'User 2' })]
            )
        );
      });

      it('resolves with all instances matching the query', async function() {
        await expect(
          new Query(User).distinct(['id', 'name']).fetch(),
          'to be fulfilled with sorted rows exhaustively satisfying',
          [
            new User({ id: 1, name: 'User 1' }),
            new User({ id: 2, name: 'User 2' })
          ]
        );
      });

      it('supports instances fetched without an id field', async function() {
        await expect(
          new Query(User).distinct(['name']).fetch(),
          'to be fulfilled with value satisfying',
          rows =>
            expect(
              rows,
              'when sorted by',
              (a, b) => (a.name > b.name ? 1 : -1),
              'to exhaustively satisfy',
              [new User({ name: 'User 1' }), new User({ name: 'User 2' })]
            )
        );
      });

      it('supports leftJoin', async function() {
        await expect(
          new Query(User)
            .distinct(['name'])
            .leftJoin(Image)
            .fetch(),
          'to be fulfilled with value satisfying',
          rows =>
            expect(
              rows,
              'when sorted by',
              (a, b) => (a.name > b.name ? 1 : -1),
              'to exhaustively satisfy',
              [new User({ name: 'User 1' }), new User({ name: 'User 2' })]
            )
        );
      });

      it('supports innerJoin', async function() {
        await knex(ImageCategory.table).insert([
          { id: 1, name: 'User images' }
        ]);
        await knex(Image.table).insert([{ id: 1, user_id: 1, category_id: 1 }]);
        await knex(Image.table).insert([{ id: 2, user_id: 2, category_id: 1 }]);
        await expect(
          new Query(User)
            .distinct(['id', 'name'])
            .innerJoin(Image)
            .fetch(),
          'to be fulfilled with sorted rows exhaustively satisfying',
          [
            new User({ id: 1, name: 'User 1' }),
            new User({ id: 2, name: 'User 2' })
          ]
        );
        await truncateImageTable();
        await truncateImageCategoryTable();
      });
    });

    describe("with a 'whereNot' configured", function() {
      it('resolves with only the rows matching the query', async function() {
        const query = new Query(User).whereNot({ id: 1 });
        await expect(
          query.fetch(),
          'to be fulfilled with sorted rows exhaustively satisfying',
          [
            new User({
              id: 2,
              name: 'User 2',
              confirmed: true,
              description: 'this is user 2',
              age: 10,
              dateOfBirth: null,
              dbDefault: 'set-by-db',
              jsonField: null,
              intToString: null
            })
          ]
        );
      });
    });

    describe("with an 'orWhere' configured", function() {
      it('resolves with only the rows matching the query', async function() {
        const query = new Query(User).where({ id: 1 }).orWhere({ id: 2 });
        await expect(
          query.fetch(),
          'to be fulfilled with sorted rows exhaustively satisfying',
          [
            new User({
              id: 1,
              name: 'User 1',
              confirmed: false,
              description: 'this is user 1',
              age: 10,
              dateOfBirth: null,
              dbDefault: 'set-by-db',
              jsonField: null,
              intToString: '10'
            }),
            new User({
              id: 2,
              name: 'User 2',
              confirmed: true,
              description: 'this is user 2',
              age: 10,
              dateOfBirth: null,
              dbDefault: 'set-by-db',
              jsonField: null,
              intToString: null
            })
          ]
        );
      });
    });

    describe("with an 'orWhereNot' configured", function() {
      it('resolves with only the rows matching the query', async function() {
        const query = new Query(User).whereNot({ id: 1 }).orWhereNot({ id: 3 });
        await expect(
          query.fetch(),
          'to be fulfilled with sorted rows exhaustively satisfying',
          [
            new User({
              id: 1,
              name: 'User 1',
              confirmed: false,
              description: 'this is user 1',
              age: 10,
              dateOfBirth: null,
              dbDefault: 'set-by-db',
              jsonField: null,
              intToString: '10'
            }),
            new User({
              id: 2,
              name: 'User 2',
              confirmed: true,
              description: 'this is user 2',
              age: 10,
              dateOfBirth: null,
              dbDefault: 'set-by-db',
              jsonField: null,
              intToString: null
            })
          ]
        );
      });
    });

    describe("with a 'whereRaw' configured", function() {
      it('resolves with only the rows matching the query', async function() {
        const query = new Query(User).whereRaw('id = ?', [1]);
        await expect(
          query.fetch(),
          'to be fulfilled with sorted rows exhaustively satisfying',
          [
            new User({
              id: 1,
              name: 'User 1',
              confirmed: false,
              description: 'this is user 1',
              age: 10,
              dateOfBirth: null,
              dbDefault: 'set-by-db',
              jsonField: null,
              intToString: '10'
            })
          ]
        );
      });
    });

    describe("with a 'groupBy' and 'having' configured", function() {
      it('resolves with the rows matching the grouping', async function() {
        const query = new Query(User)
          .groupBy(['id', 'age'])
          .having({ age: 10 });
        await expect(
          query.fetch(),
          'to be fulfilled with sorted rows exhaustively satisfying',
          [
            new User({
              id: 1,
              name: 'User 1',
              confirmed: false,
              description: 'this is user 1',
              age: 10,
              dateOfBirth: null,
              dbDefault: 'set-by-db',
              jsonField: null,
              intToString: '10'
            }),
            new User({
              id: 2,
              name: 'User 2',
              confirmed: true,
              description: 'this is user 2',
              age: 10,
              dateOfBirth: null,
              dbDefault: 'set-by-db',
              jsonField: null,
              intToString: null
            })
          ]
        );
      });
    });

    describe("with an 'orderBy' configured", function() {
      it('resolves with rows in the requested order', async function() {
        const query = new Query(User).orderBy({ id: 'desc' });
        await expect(
          query.fetch(),
          'to be fulfilled with value exhaustively satisfying',
          [
            new User({
              id: 2,
              name: 'User 2',
              confirmed: true,
              description: 'this is user 2',
              age: 10,
              dateOfBirth: null,
              dbDefault: 'set-by-db',
              jsonField: null,
              intToString: null
            }),
            new User({
              id: 1,
              name: 'User 1',
              confirmed: false,
              description: 'this is user 1',
              age: 10,
              dateOfBirth: null,
              dbDefault: 'set-by-db',
              jsonField: null,
              intToString: '10'
            })
          ]
        );
      });
    });

    describe("with a 'limit' configured", function() {
      it('resolves with rows matching the limit', async function() {
        const query = new Query(User).limit(1);
        await expect(
          query.fetch(),
          'to be fulfilled with value exhaustively satisfying',
          [
            new User({
              id: 1,
              name: 'User 1',
              confirmed: false,
              description: 'this is user 1',
              age: 10,
              dateOfBirth: null,
              dbDefault: 'set-by-db',
              jsonField: null,
              intToString: '10'
            })
          ]
        );
      });
    });

    describe("with an 'offset' configured", function() {
      it('resolves with rows starting from the offset', async function() {
        const query = new Query(User).offset(1);
        await expect(
          query.fetch(),
          'to be fulfilled with value exhaustively satisfying',
          [
            new User({
              id: 2,
              name: 'User 2',
              confirmed: true,
              description: 'this is user 2',
              age: 10,
              dateOfBirth: null,
              dbDefault: 'set-by-db',
              jsonField: null,
              intToString: null
            })
          ]
        );
      });
    });

    describe("with an 'transaction' configured", function() {
      it('does the fetch within the transaction', async function() {
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
              name: 'User 1',
              confirmed: false,
              description: 'this is user 1',
              age: 10,
              dateOfBirth: null,
              dbDefault: 'set-by-db',
              jsonField: null,
              intToString: '10'
            }),
            new User({
              id: 2,
              name: 'User 2',
              confirmed: true,
              description: 'this is user 2',
              age: 10,
              dateOfBirth: null,
              dbDefault: 'set-by-db',
              jsonField: null,
              intToString: null
            })
          ]
        );
        await expect(spy, 'to have calls satisfying', () => {
          spy(
            expect.it('to satisfy', {
              commit: expect.it('to be a function'),
              rollback: expect.it('to be a function')
            })
          );
        });
        spy.restore();
      });

      describe("via the 'within' alias", function() {
        it('does the fetch within the transaction', async function() {
          const spy = sinon.spy(QueryBuilder.prototype, 'transacting');
          await expect(
            knex.transaction(async transaction => {
              const users = await new Query(User).within(transaction).fetch();

              return users;
            }),
            'to be fulfilled with sorted rows exhaustively satisfying',
            [
              new User({
                id: 1,
                name: 'User 1',
                confirmed: false,
                description: 'this is user 1',
                age: 10,
                dateOfBirth: null,
                dbDefault: 'set-by-db',
                jsonField: null,
                intToString: '10'
              }),
              new User({
                id: 2,
                name: 'User 2',
                confirmed: true,
                description: 'this is user 2',
                age: 10,
                dateOfBirth: null,
                dbDefault: 'set-by-db',
                jsonField: null,
                intToString: null
              })
            ]
          );
          await expect(spy, 'to have calls satisfying', () => {
            spy(
              expect.it('to satisfy', {
                commit: expect.it('to be a function'),
                rollback: expect.it('to be a function')
              })
            );
          });
          spy.restore();
        });
      });
    });

    describe("with a 'leftJoin' configured", function() {
      before(async function() {
        await knex(ImageCategory.table).insert([
          { id: 1, name: 'User images' }
        ]);
        await knex(Image.table).insert([{ id: 1, user_id: 1, category_id: 1 }]);
        await knex(Message.table).insert([
          { id: 1, text: 'Hi User 2', sender_id: 1, receiver_id: 2 },
          { id: 2, text: 'Hi User 1', sender_id: 2, receiver_id: 1 }
        ]);
      });

      after(async function() {
        await truncateMessageTable();
        await truncateImageTable();
        await truncateImageCategoryTable();
      });

      it('throws an error if the models do not reference each other', function() {
        class Foo extends Model {}
        Foo.table = 'foo';
        expect(
          () => new Query(User).leftJoin(new Query(Foo)),
          'to throw',
          new Error("'User' has no references to 'Foo'")
        );
        expect(
          () => new Query(Foo).leftJoin(new Query(User)),
          'to throw',
          new Error("'Foo' has no references to 'User'")
        );
      });

      it("rejects with an error if a fetch is attempted from the joined model's query", async function() {
        const imageQuery = new Query(Image);
        new Query(User).leftJoin(imageQuery);
        await expect(
          imageQuery.fetch(),
          'to be rejected with error satisfying',
          new Error(
            "Cannot fetch from a child query. (Image.query is User.query's child)"
          )
        );
      });

      it('includes the joined model in the returned instance using a camel-cased property name', async function() {
        const query = new Query(User).leftJoin(new Query(Image));
        await expect(
          query.fetch(),
          'to be fulfilled with sorted rows exhaustively satisfying',
          [
            Object.assign(
              new User({
                id: 1,
                name: 'User 1',
                confirmed: false,
                description: 'this is user 1',
                age: 10,
                dateOfBirth: null,
                dbDefault: 'set-by-db',
                jsonField: null,
                intToString: '10'
              }),
              {
                image: new Image({
                  id: 1,
                  userId: 1,
                  categoryId: 1
                })
              }
            ),
            new User({
              id: 2,
              name: 'User 2',
              confirmed: true,
              description: 'this is user 2',
              age: 10,
              dateOfBirth: null,
              dbDefault: 'set-by-db',
              jsonField: null,
              intToString: null
            })
          ]
        );
      });

      it('does not include the joined model if no rows were matched', async function() {
        const query = new Query(User)
          .leftJoin(new Query(Image))
          .where({ id: 2 });

        const user2 = new User({
          id: 2,
          name: 'User 2',
          confirmed: true,
          description: 'this is user 2',
          age: 10,
          dateOfBirth: null,
          dbDefault: 'set-by-db',
          jsonField: null,
          intToString: null
        });
        user2.image = undefined;

        await expect(
          query.fetch(),
          'to be fulfilled with sorted rows exhaustively satisfying',
          [user2]
        );
      });

      it('includes the joined model as an array if more than one rows are matched', async function() {
        await knex('image').insert([
          {
            id: 2,
            user_id: 1,
            category_id: 1
          }
        ]);

        const query = new Query(User)
          .where({ id: 1 })
          .leftJoin(new Query(Image));
        await expect(
          query.fetch(),
          'to be fulfilled with sorted rows exhaustively satisfying',
          [
            Object.assign(
              new User({
                id: 1,
                name: 'User 1',
                confirmed: false,
                description: 'this is user 1',
                age: 10,
                dateOfBirth: null,
                dbDefault: 'set-by-db',
                jsonField: null,
                intToString: '10'
              }),
              {
                image: [
                  new Image({
                    id: 1,
                    userId: 1,
                    categoryId: 1
                  }),
                  new Image({
                    id: 2,
                    userId: 1,
                    categoryId: 1
                  })
                ]
              }
            )
          ]
        );

        await knex('image')
          .where({ id: 2 })
          .delete();
      });

      describe("with 'fields' configured on the child query", function() {
        it('returns only the requested fields from the joined model', async function() {
          const query = new Query(User)
            .where({ id: 1 })
            .leftJoin(new Query(Image).fields('id'));
          await expect(
            query.fetch(),
            'to be fulfilled with sorted rows exhaustively satisfying',
            [
              Object.assign(
                new User({
                  id: 1,
                  name: 'User 1',
                  confirmed: false,
                  description: 'this is user 1',
                  age: 10,
                  dateOfBirth: null,
                  dbDefault: 'set-by-db',
                  jsonField: null,
                  intToString: '10'
                }),
                {
                  image: new Image({
                    id: 1
                  })
                }
              )
            ]
          );
        });
      });

      describe("with 'as' configured on the child query", function() {
        it('uses the passed string as the property name of the joined model', async function() {
          const query = new Query(User)
            .where({ id: 1 })
            .leftJoin(new Query(Image).as('theImage'));
          await expect(
            query.fetch(),
            'to be fulfilled with sorted rows exhaustively satisfying',
            [
              Object.assign(
                new User({
                  id: 1,
                  name: 'User 1',
                  confirmed: false,
                  description: 'this is user 1',
                  age: 10,
                  dateOfBirth: null,
                  dbDefault: 'set-by-db',
                  jsonField: null,
                  intToString: '10'
                }),
                {
                  theImage: new Image({
                    id: 1,
                    userId: 1,
                    categoryId: 1
                  })
                }
              )
            ]
          );
        });
      });

      it('creates a left join to the referenced model on all fields', async function() {
        const query = new Query(User).leftJoin(new Query(Message));
        await expect(
          query.fetch(),
          'to be fulfilled with sorted rows exhaustively satisfying',
          [
            // this query doesn't match any messages since it joins
            // ON user.id = message.sender_id AND user.id = message.receiver_id
            new User({
              id: 1,
              name: 'User 1',
              confirmed: false,
              description: 'this is user 1',
              age: 10,
              dateOfBirth: null,
              dbDefault: 'set-by-db',
              jsonField: null,
              intToString: '10'
            }),
            new User({
              id: 2,
              name: 'User 2',
              confirmed: true,
              description: 'this is user 2',
              age: 10,
              dateOfBirth: null,
              dbDefault: 'set-by-db',
              jsonField: null,
              intToString: null
            })
          ]
        );
      });

      describe("with 'on' configured on the child query", function() {
        it('creates a join on the provided field', async function() {
          const query = new Query(User).leftJoin([
            new Query(Message).on(Message.fields.senderId).as('sentMessage'),
            new Query(Message).on('receiverId').as('receivedMessage')
          ]);
          await expect(
            query.fetch(),
            'to be fulfilled with sorted rows exhaustively satisfying',
            [
              Object.assign(
                new User({
                  id: 1,
                  name: 'User 1',
                  confirmed: false,
                  description: 'this is user 1',
                  age: 10,
                  dateOfBirth: null,
                  dbDefault: 'set-by-db',
                  jsonField: null,
                  intToString: '10'
                }),
                {
                  sentMessage: new Message({
                    id: 1,
                    text: 'Hi User 2',
                    senderId: 1,
                    receiverId: 2
                  }),
                  receivedMessage: new Message({
                    id: 2,
                    text: 'Hi User 1',
                    senderId: 2,
                    receiverId: 1
                  })
                }
              ),
              Object.assign(
                new User({
                  id: 2,
                  name: 'User 2',
                  confirmed: true,
                  description: 'this is user 2',
                  age: 10,
                  dateOfBirth: null,
                  dbDefault: 'set-by-db',
                  jsonField: null,
                  intToString: null
                }),
                {
                  sentMessage: new Message({
                    id: 2,
                    text: 'Hi User 1',
                    senderId: 2,
                    receiverId: 1
                  }),
                  receivedMessage: new Message({
                    id: 1,
                    text: 'Hi User 2',
                    senderId: 1,
                    receiverId: 2
                  })
                }
              )
            ]
          );
        });
      });

      describe("with 'where' configured on the child query", function() {
        it('fulfils the requested query on the joined model', async function() {
          await knex('image').insert([
            {
              id: 2,
              user_id: 1,
              category_id: 1
            }
          ]);

          const query = new Query(User).leftJoin(
            new Query(Image).where({ id: 2 })
          );

          await expect(
            query.fetch(),
            'to be fulfilled with sorted rows exhaustively satisfying',
            [
              Object.assign(
                new User({
                  id: 1,
                  name: 'User 1',
                  confirmed: false,
                  description: 'this is user 1',
                  age: 10,
                  dateOfBirth: null,
                  dbDefault: 'set-by-db',
                  jsonField: null,
                  intToString: '10'
                }),
                {
                  image: new Image({
                    id: 2,
                    userId: 1,
                    categoryId: 1
                  })
                }
              )
            ]
          );

          await knex('image')
            .where({ id: 2 })
            .delete();
        });
      });

      describe("with 'whereNot' configured on the child query", function() {
        it('fulfils the requested query on the joined model', async function() {
          await knex('image').insert([
            {
              id: 2,
              user_id: 1,
              category_id: 1
            }
          ]);

          const query = new Query(User).leftJoin(
            new Query(Image).whereNot({ id: 2 })
          );

          await expect(
            query.fetch(),
            'to be fulfilled with sorted rows exhaustively satisfying',
            [
              Object.assign(
                new User({
                  id: 1,
                  name: 'User 1',
                  confirmed: false,
                  description: 'this is user 1',
                  age: 10,
                  dateOfBirth: null,
                  dbDefault: 'set-by-db',
                  jsonField: null,
                  intToString: '10'
                }),
                {
                  image: new Image({
                    id: 1,
                    userId: 1,
                    categoryId: 1
                  })
                }
              )
            ]
          );

          await knex('image')
            .where({ id: 2 })
            .delete();
        });
      });

      describe("with 'orWhere' configured on the child query", function() {
        it('fulfils the requested query on the joined model', async function() {
          await knex('image').insert([
            {
              id: 2,
              user_id: 1,
              category_id: 1
            }
          ]);

          const query = new Query(User).leftJoin(
            new Query(Image).where({ id: 1 }).orWhere({ id: 2 })
          );

          await expect(
            query.fetch(),
            'to be fulfilled with sorted rows exhaustively satisfying',
            [
              Object.assign(
                new User({
                  id: 1,
                  name: 'User 1',
                  confirmed: false,
                  description: 'this is user 1',
                  age: 10,
                  dateOfBirth: null,
                  dbDefault: 'set-by-db',
                  jsonField: null,
                  intToString: '10'
                }),
                {
                  image: [
                    new Image({
                      id: 2,
                      userId: 1,
                      categoryId: 1
                    }),
                    new Image({
                      id: 1,
                      userId: 1,
                      categoryId: 1
                    })
                  ]
                }
              )
            ]
          );

          await knex('image')
            .where({ id: 2 })
            .delete();
        });
      });

      describe("with 'orWhereNot' configured on the child query", function() {
        it('fulfils the requested query on the joined model', async function() {
          await knex('image').insert([
            {
              id: 2,
              user_id: 1,
              category_id: 1
            },
            {
              id: 3,
              user_id: 1,
              category_id: 1
            }
          ]);

          const query = new Query(User).leftJoin(
            new Query(Image).orWhereNot({ id: [1, 2] })
          );

          await expect(
            query.fetch(),
            'to be fulfilled with sorted rows exhaustively satisfying',
            [
              Object.assign(
                new User({
                  id: 1,
                  name: 'User 1',
                  confirmed: false,
                  description: 'this is user 1',
                  age: 10,
                  dateOfBirth: null,
                  dbDefault: 'set-by-db',
                  jsonField: null,
                  intToString: '10'
                }),
                {
                  image: new Image({
                    id: 3,
                    userId: 1,
                    categoryId: 1
                  })
                }
              )
            ]
          );

          await knex('image')
            .where({ id: 2 })
            .orWhere({ id: 3 })
            .delete();
        });
      });

      describe("with 'orderBy' configured on the child query", function() {
        it('fulfils the requested order on the joined model', async function() {
          await knex('image').insert([
            {
              id: 2,
              user_id: 1,
              category_id: 1
            }
          ]);

          const query = new Query(User)
            .where({ id: 1 })
            .leftJoin(new Query(Image).orderBy({ id: -1 }));

          await expect(
            query.fetch(),
            'to be fulfilled with value exhaustively satisfying',
            [
              Object.assign(
                new User({
                  id: 1,
                  name: 'User 1',
                  confirmed: false,
                  description: 'this is user 1',
                  age: 10,
                  dateOfBirth: null,
                  dbDefault: 'set-by-db',
                  jsonField: null,
                  intToString: '10'
                }),
                {
                  image: [
                    new Image({
                      id: 2,
                      userId: 1,
                      categoryId: 1
                    }),
                    new Image({
                      id: 1,
                      userId: 1,
                      categoryId: 1
                    })
                  ]
                }
              )
            ]
          );

          await knex('image')
            .where({ id: 2 })
            .delete();
        });
      });

      describe("with 'groupBy' configured on the child query", function() {
        it('fulfils the requested grouping on the joined model', async function() {
          await knex('image').insert([
            {
              id: 2,
              user_id: 1,
              category_id: 1
            }
          ]);

          const query = new Query(User)
            .where({ id: 1 })
            .groupBy('id')
            .leftJoin(new Query(Image).groupBy(['id', 'userId']));

          await expect(
            query.fetch(),
            'to be fulfilled with sorted rows exhaustively satisfying',
            [
              Object.assign(
                new User({
                  id: 1,
                  name: 'User 1',
                  confirmed: false,
                  description: 'this is user 1',
                  age: 10,
                  dateOfBirth: null,
                  dbDefault: 'set-by-db',
                  jsonField: null,
                  intToString: '10'
                }),
                {
                  image: [
                    new Image({
                      id: 1,
                      userId: 1,
                      categoryId: 1
                    }),
                    new Image({
                      id: 2,
                      userId: 1,
                      categoryId: 1
                    })
                  ]
                }
              )
            ]
          );

          await knex('image')
            .where({ id: 2 })
            .delete();
        });
      });

      describe("with 'having' configured on the child query", function() {
        it('fulfils the requested order on the joined model', async function() {
          await knex('image').insert([
            {
              id: 2,
              user_id: 1,
              category_id: 1
            },
            {
              id: 3,
              user_id: 2,
              category_id: 1
            }
          ]);

          const query = new Query(User)
            .where({ id: 1 })
            .groupBy('id')
            .leftJoin(
              new Query(Image).groupBy(['id', 'userId']).having({ userId: 1 })
            );

          await expect(
            query.fetch(),
            'to be fulfilled with sorted rows exhaustively satisfying',
            [
              Object.assign(
                new User({
                  id: 1,
                  name: 'User 1',
                  confirmed: false,
                  description: 'this is user 1',
                  age: 10,
                  dateOfBirth: null,
                  dbDefault: 'set-by-db',
                  jsonField: null,
                  intToString: '10'
                }),
                {
                  image: [
                    new Image({
                      id: 1,
                      userId: 1,
                      categoryId: 1
                    }),
                    new Image({
                      id: 2,
                      userId: 1,
                      categoryId: 1
                    })
                  ]
                }
              )
            ]
          );

          await knex('image')
            .where({ id: 2 })
            .orWhere({ id: 3 })
            .delete();
        });
      });

      describe("with 'forge' disabled", function() {
        describe('on the parent query', function() {
          it('still forges the joined model', async function() {
            const query = new Query(User)
              .forge(false)
              .leftJoin(new Query(Image));

            await expect(
              query.fetch(),
              'to be fulfilled with sorted rows exhaustively satisfying',
              [
                {
                  id: 1,
                  name: 'User 1',
                  confirmed: false,
                  description: 'this is user 1',
                  age: 10,
                  dateOfBirth: null,
                  dbDefault: 'set-by-db',
                  jsonField: null,
                  intToString: '10',
                  image: new Image({
                    id: 1,
                    userId: 1,
                    categoryId: 1
                  })
                },
                {
                  id: 2,
                  name: 'User 2',
                  confirmed: true,
                  description: 'this is user 2',
                  age: 10,
                  dateOfBirth: null,
                  dbDefault: 'set-by-db',
                  jsonField: null,
                  intToString: null
                }
              ]
            );
          });
        });

        describe('on the joined model', function() {
          it('includes a plain object of the joined model', async function() {
            const query = new Query(User).leftJoin(
              new Query(Image).forge(false)
            );

            await expect(
              query.fetch(),
              'to be fulfilled with sorted rows exhaustively satisfying',
              [
                Object.assign(
                  new User({
                    id: 1,
                    name: 'User 1',
                    confirmed: false,
                    description: 'this is user 1',
                    age: 10,
                    dateOfBirth: null,
                    dbDefault: 'set-by-db',
                    jsonField: null,
                    intToString: '10'
                  }),
                  {
                    image: {
                      id: 1,
                      userId: 1,
                      categoryId: 1
                    }
                  }
                ),
                {
                  id: 2,
                  name: 'User 2',
                  confirmed: true,
                  description: 'this is user 2',
                  age: 10,
                  dateOfBirth: null,
                  dbDefault: 'set-by-db',
                  jsonField: null,
                  intToString: null
                }
              ]
            );
          });
        });

        describe('on both the parent and the joined models', function() {
          it('includes plain objects of the both models', async function() {
            const query = new Query(User)
              .forge(false)
              .leftJoin(new Query(Image).forge(false));

            await expect(
              query.fetch(),
              'to be fulfilled with sorted rows exhaustively satisfying',
              [
                {
                  id: 1,
                  name: 'User 1',
                  confirmed: false,
                  description: 'this is user 1',
                  age: 10,
                  dateOfBirth: null,
                  dbDefault: 'set-by-db',
                  jsonField: null,
                  intToString: '10',
                  image: {
                    id: 1,
                    userId: 1,
                    categoryId: 1
                  }
                },
                {
                  id: 2,
                  name: 'User 2',
                  confirmed: true,
                  description: 'this is user 2',
                  age: 10,
                  dateOfBirth: null,
                  dbDefault: 'set-by-db',
                  jsonField: null,
                  intToString: null
                }
              ]
            );
          });
        });

        it('does not include the joined model if no rows were matched', async function() {
          const query = new Query(User)
            .leftJoin(new Query(Image))
            .where({ id: 2 })
            .forge(false);

          await expect(
            query.fetch(),
            'to be fulfilled with sorted rows exhaustively satisfying',
            [
              {
                id: 2,
                name: 'User 2',
                confirmed: true,
                description: 'this is user 2',
                age: 10,
                dateOfBirth: null,
                dbDefault: 'set-by-db',
                jsonField: null,
                intToString: null,
                image: undefined
              }
            ]
          );
        });

        it('includes the joined model as an array if more than one rows are matched', async function() {
          await knex('image').insert([
            {
              id: 2,
              user_id: 1,
              category_id: 1
            }
          ]);

          const query = new Query(User)
            .where({ id: 1 })
            .leftJoin(new Query(Image));
          await expect(
            query.fetch(),
            'to be fulfilled with sorted rows exhaustively satisfying',
            [
              {
                id: 1,
                name: 'User 1',
                confirmed: false,
                description: 'this is user 1',
                age: 10,
                dateOfBirth: null,
                dbDefault: 'set-by-db',
                jsonField: null,
                intToString: '10',
                image: [
                  {
                    id: 1,
                    userId: 1,
                    categoryId: 1
                  },
                  {
                    id: 2,
                    userId: 1,
                    categoryId: 1
                  }
                ]
              }
            ]
          );

          await knex('image')
            .where({ id: 2 })
            .delete();
        });
      });

      it('allows passing a model directly', async function() {
        const query = new Query(User).leftJoin(Image);
        await expect(
          query.fetch(),
          'to be fulfilled with sorted rows exhaustively satisfying',
          [
            Object.assign(
              new User({
                id: 1,
                name: 'User 1',
                confirmed: false,
                description: 'this is user 1',
                age: 10,
                dateOfBirth: null,
                dbDefault: 'set-by-db',
                jsonField: null,
                intToString: '10'
              }),
              {
                image: new Image({
                  id: 1,
                  userId: 1,
                  categoryId: 1
                })
              }
            ),
            new User({
              id: 2,
              name: 'User 2',
              confirmed: true,
              description: 'this is user 2',
              age: 10,
              dateOfBirth: null,
              dbDefault: 'set-by-db',
              jsonField: null,
              intToString: null
            })
          ]
        );
      });

      it('allows passing options when a model is passed directly', async function() {
        const query = new Query(User).leftJoin(Image, { fields: 'id' });
        await expect(
          query.fetch(),
          'to be fulfilled with sorted rows exhaustively satisfying',
          [
            Object.assign(
              new User({
                id: 1,
                name: 'User 1',
                confirmed: false,
                description: 'this is user 1',
                age: 10,
                dateOfBirth: null,
                dbDefault: 'set-by-db',
                jsonField: null,
                intToString: '10'
              }),
              {
                image: new Image({
                  id: 1
                })
              }
            ),
            new User({
              id: 2,
              name: 'User 2',
              confirmed: true,
              description: 'this is user 2',
              age: 10,
              dateOfBirth: null,
              dbDefault: 'set-by-db',
              jsonField: null,
              intToString: null
            })
          ]
        );
      });

      describe('with a reverse-reference join', function() {
        it('resolves with the correct data (with values on the joined model casted)', async function() {
          const query = new Query(Image).leftJoin(new Query(User));
          await expect(
            query.fetch(),
            'to be fulfilled with sorted rows exhaustively satisfying',
            [
              Object.assign(
                new Image({
                  id: 1,
                  userId: 1,
                  categoryId: 1
                }),
                {
                  user: new User({
                    id: 1,
                    name: 'User 1',
                    confirmed: false,
                    description: 'this is user 1',
                    age: 10,
                    dateOfBirth: null,
                    dbDefault: 'set-by-db',
                    jsonField: null,
                    intToString: '10'
                  })
                }
              )
            ]
          );
        });

        it("supports the 'on' option as a string", async function() {
          const query = new Query(Image).leftJoin(new Query(User).on('id'));
          await expect(
            query.fetch(),
            'to be fulfilled with sorted rows exhaustively satisfying',
            [
              Object.assign(
                new Image({
                  id: 1,
                  userId: 1,
                  categoryId: 1
                }),
                {
                  user: new User({
                    id: 1,
                    name: 'User 1',
                    confirmed: false,
                    description: 'this is user 1',
                    age: 10,
                    dateOfBirth: null,
                    dbDefault: 'set-by-db',
                    jsonField: null,
                    intToString: '10'
                  })
                }
              )
            ]
          );
        });

        it("supports the 'on' option as a field object", async function() {
          const query = new Query(Image).leftJoin(
            new Query(User).on(User.fields.id)
          );
          await expect(
            query.fetch(),
            'to be fulfilled with sorted rows exhaustively satisfying',
            [
              Object.assign(
                new Image({
                  id: 1,
                  userId: 1,
                  categoryId: 1
                }),
                {
                  user: new User({
                    id: 1,
                    name: 'User 1',
                    confirmed: false,
                    description: 'this is user 1',
                    age: 10,
                    dateOfBirth: null,
                    dbDefault: 'set-by-db',
                    jsonField: null,
                    intToString: '10'
                  })
                }
              )
            ]
          );
        });

        it('resolves with the correct data when a field is referenced by multiple fields', async function() {
          const query = new Query(Message).leftJoin(new Query(User).on('id'));
          await expect(
            query.fetch(),
            'to be fulfilled with sorted rows exhaustively satisfying',
            [
              Object.assign(
                new Message({
                  id: 1,
                  senderId: 1,
                  receiverId: 2,
                  text: 'Hi User 2'
                }),
                {
                  user: new User({
                    id: 2,
                    name: 'User 2',
                    confirmed: true,
                    description: 'this is user 2',
                    age: 10,
                    dateOfBirth: null,
                    dbDefault: 'set-by-db',
                    jsonField: null,
                    intToString: null
                  })
                }
              ),
              Object.assign(
                new Message({
                  id: 2,
                  senderId: 2,
                  receiverId: 1,
                  text: 'Hi User 1'
                }),
                {
                  user: new User({
                    id: 1,
                    name: 'User 1',
                    confirmed: false,
                    description: 'this is user 1',
                    age: 10,
                    dateOfBirth: null,
                    dbDefault: 'set-by-db',
                    jsonField: null,
                    intToString: '10'
                  })
                }
              )
            ]
          );
        });
      });

      describe("with a nested 'leftJoin' query", function() {
        it('includes the nested data in the returned data if rows are matched', async function() {
          const query = new Query(User).leftJoin(
            new Query(Image).leftJoin(new Query(ImageCategory))
          );
          await expect(
            query.fetch(),
            'to be fulfilled with sorted rows exhaustively satisfying',
            [
              Object.assign(
                new User({
                  id: 1,
                  name: 'User 1',
                  confirmed: false,
                  description: 'this is user 1',
                  age: 10,
                  dateOfBirth: null,
                  dbDefault: 'set-by-db',
                  jsonField: null,
                  intToString: '10'
                }),
                {
                  image: Object.assign(
                    new Image({
                      id: 1,
                      userId: 1,
                      categoryId: 1
                    }),
                    {
                      imageCategory: new ImageCategory({
                        id: 1,
                        name: 'User images'
                      })
                    }
                  )
                }
              ),
              new User({
                id: 2,
                name: 'User 2',
                confirmed: true,
                description: 'this is user 2',
                age: 10,
                dateOfBirth: null,
                dbDefault: 'set-by-db',
                jsonField: null,
                intToString: null
              })
            ]
          );
        });
      });

      describe("with a circular 'leftJoin' query", function() {
        it('includes the circular data in the returned data', async function() {
          const query = new Query(User).leftJoin(
            new Query(Image).leftJoin(
              new Query(ImageCategory).leftJoin(
                new Query(Image).leftJoin(new Query(User))
              )
            )
          );
          await expect(
            query.fetch(),
            'to be fulfilled with sorted rows exhaustively satisfying',
            [
              Object.assign(
                new User({
                  id: 1,
                  name: 'User 1',
                  confirmed: false,
                  description: 'this is user 1',
                  age: 10,
                  dateOfBirth: null,
                  dbDefault: 'set-by-db',
                  jsonField: null,
                  intToString: '10'
                }),
                {
                  image: Object.assign(
                    new Image({
                      id: 1,
                      userId: 1,
                      categoryId: 1
                    }),
                    {
                      imageCategory: Object.assign(
                        new ImageCategory({
                          id: 1,
                          name: 'User images'
                        }),
                        {
                          image: Object.assign(
                            new Image({
                              id: 1,
                              userId: 1,
                              categoryId: 1
                            }),
                            {
                              user: new User({
                                id: 1,
                                name: 'User 1',
                                confirmed: false,
                                description: 'this is user 1',
                                age: 10,
                                dateOfBirth: null,
                                dbDefault: 'set-by-db',
                                jsonField: null,
                                intToString: '10'
                              })
                            }
                          )
                        }
                      )
                    }
                  )
                }
              ),
              new User({
                id: 2,
                name: 'User 2',
                confirmed: true,
                description: 'this is user 2',
                age: 10,
                dateOfBirth: null,
                dbDefault: 'set-by-db',
                jsonField: null,
                intToString: null
              })
            ]
          );
        });
      });

      describe('with the child query options passed as a second parameter', function() {
        it('passes the options to the child query via Query.prototype.setOptions', async function() {
          const imageQuery = new Query(Image);
          const spy = sinon.spy(imageQuery, 'setOptions');
          const query = new Query(User)
            .where({ id: 1 })
            .leftJoin(imageQuery, { fields: 'id' });
          await expect(spy, 'to have calls satisfying', () => {
            spy({ fields: 'id' });
          });
          await expect(
            query.fetch(),
            'to be fulfilled with sorted rows exhaustively satisfying',
            [
              Object.assign(
                new User({
                  id: 1,
                  name: 'User 1',
                  confirmed: false,
                  description: 'this is user 1',
                  age: 10,
                  dateOfBirth: null,
                  dbDefault: 'set-by-db',
                  jsonField: null,
                  intToString: '10'
                }),
                {
                  image: new Image({
                    id: 1
                  })
                }
              )
            ]
          );
        });
      });
    });

    describe("with an 'innerJoin' configured", function() {
      before(async function() {
        await knex(ImageCategory.table).insert([
          { id: 1, name: 'User images' }
        ]);
        await knex(Image.table).insert([{ id: 1, user_id: 1, category_id: 1 }]);
      });

      after(async function() {
        await truncateImageTable();
        await truncateImageCategoryTable();
      });

      it('returns the instances with matching data in the joined table (inner join)', async function() {
        const query = new Query(User).innerJoin(new Query(Image));
        await expect(
          query.fetch(),
          'to be fulfilled with sorted rows exhaustively satisfying',
          [
            Object.assign(
              new User({
                id: 1,
                name: 'User 1',
                confirmed: false,
                description: 'this is user 1',
                age: 10,
                dateOfBirth: null,
                dbDefault: 'set-by-db',
                jsonField: null,
                intToString: '10'
              }),
              {
                image: new Image({
                  id: 1,
                  userId: 1,
                  categoryId: 1
                })
              }
            )
          ]
        );
      });

      it("resolves with an empty array if the join doesn't match any rows", async function() {
        const query = new Query(User)
          .where({ id: 2 })
          .innerJoin(new Query(Image));

        await expect(
          query.fetch(),
          'to be fulfilled with sorted rows exhaustively satisfying',
          []
        );
      });
    });

    describe("with a 'join' configured", function() {
      before(async function() {
        await knex(ImageCategory.table).insert([
          {
            id: 1,
            name: 'User images'
          }
        ]);
        await knex(Image.table).insert([
          {
            id: 1,
            user_id: 1,
            category_id: 1
          }
        ]);
      });

      after(async function() {
        await truncateImageTable();
        await truncateImageCategoryTable();
      });

      it('returns the instances with matching data in the joined table (inner join)', async function() {
        const query = new Query(User).join(new Query(Image));
        await expect(
          query.fetch(),
          'to be fulfilled with sorted rows exhaustively satisfying',
          [
            Object.assign(
              new User({
                id: 1,
                name: 'User 1',
                confirmed: false,
                description: 'this is user 1',
                age: 10,
                dateOfBirth: null,
                dbDefault: 'set-by-db',
                jsonField: null,
                intToString: '10'
              }),
              {
                image: new Image({
                  id: 1,
                  userId: 1,
                  categoryId: 1
                })
              }
            )
          ]
        );
      });

      it("resolves wih an empty array if the join doesn't match any rows", async function() {
        const query = new Query(User)
          .where({ id: 2 })
          .innerJoin(new Query(Image));

        await expect(
          query.fetch(),
          'to be fulfilled with sorted rows exhaustively satisfying',
          []
        );
      });
    });
  });

  describe('Query.prototype.count', function() {
    before(async function() {
      await knex(User.table).insert([
        {
          id: 1,
          name: 'User 1',
          confirmed: false,
          description: 'this is user 1',
          age: 10,
          date_of_birth: null
        },
        {
          id: 2,
          name: 'User 2',
          confirmed: true,
          description: 'this is user 2',
          age: 10,
          date_of_birth: null
        }
      ]);
      await knex('image_category').insert([
        {
          id: 1,
          name: 'User images'
        }
      ]);
      await knex('image').insert([
        {
          id: 1,
          user_id: 1,
          category_id: 1
        }
      ]);
    });

    after(async function() {
      await truncateImageTable();
      await truncateImageCategoryTable();
      await truncateUserTable();
    });

    it('resolves with the count of all the rows in the table if not passed any options', async function() {
      const query = new Query(User);
      await expect(query.count(), 'to be fulfilled with', 2);
    });

    it("accepts a 'field' option specifying the field to count", async function() {
      const query = new Query(User);
      await expect(
        query.count({ field: 'dateOfBirth' }),
        'to be fulfilled with',
        0 // since date_of_birth is null in both rows
      );
    });

    it("accepts a 'distinct' option to count distinct fields", async function() {
      const query = new Query(User);
      await expect(
        query.count({ distinct: User.fields.age }),
        'to be fulfilled with',
        1
      );
    });

    it("throws an error if multiple 'distinct' fields are configured", async function() {
      const query = new Query(User);
      await expect(
        query.count({ distinct: ['id', User.fields.age] }),
        'to be rejected with error satisfying',
        new Error('Cannot count multiple distinct fields')
      );
    });

    it('accepts the other Query options', async function() {
      const query = new Query(User);
      await expect(
        query.count({ where: { confirmed: true } }),
        'to be fulfilled with',
        1
      );
    });

    it('rejects with a CountError if a database error occurs', async function() {
      const stub = sinon
        .stub(QueryBuilder.prototype, 'first')
        .returns(Promise.reject(new Error('count error')));
      const query = new Query(User);
      await expect(
        query.count(),
        'to be rejected with error satisfying',
        new Query.CountError({ error: new Error('count error'), query })
      );
      stub.restore();
    });

    describe("with a 'where' configured", function() {
      it('resolves with the count of rows matching the query', async function() {
        const query = new Query(User).where({ confirmed: true });
        await expect(query.count(), 'to be fulfilled with', 1);
      });
    });

    describe("with an 'innerJoin' configured", function() {
      it('resolves with the count of rows matching the join', async function() {
        const query = new Query(User).innerJoin(new Query(Image));
        await expect(query.count(), 'to be fulfilled with', 1);
      });
    });

    describe("with 'fields' configured", function() {
      it('does not add the fields to the query', async function() {
        const spy = sinon.spy(QueryBuilder.prototype, 'columns');
        const query = new Query(User).fields('dateOfBirth');
        await expect(query.count(), 'to be fulfilled');
        await expect(spy, 'was not called');
        spy.restore();
      });
    });

    describe('if no rows are counted', function() {
      it('resolves with zero', async function() {
        const query = new Query(User).where({ id: 3 });
        await expect(query.count(), 'to be fulfilled with value satisfying', 0);
      });

      describe("with 'require' option configured", function() {
        it('rejects with a NoRowsCountedError', async function() {
          const query = new Query(User).where({ id: 3 }).require();
          await expect(
            query.count(),
            'to be rejected with error satisfying',
            new Query.NoRowsCountedError({ query })
          );
        });
      });
    });
  });

  describe('Query.prototype.insert', function() {
    afterEach(async function() {
      await truncateUserTable();
    });

    it('inserts a row to the database table from a model instance', async function() {
      const query = new Query(User);
      const user = new User({ id: 1, name: 'John Doe', confirmed: true });
      await expect(query.insert(user), 'to be fulfilled');
      await expect(knex, 'with table', User.table, 'to have rows satisfying', [
        {
          id: 1,
          name: 'John Doe',
          confirmed: true
        }
      ]);
    });

    it('inserts a row to the database table from a plain object', async function() {
      const query = new Query(User);
      const user = { id: 1, name: 'John Doe', confirmed: true };
      await expect(query.insert(user), 'to be fulfilled');
      await expect(knex, 'with table', User.table, 'to have rows satisfying', [
        {
          id: 1,
          name: 'John Doe',
          confirmed: true
        }
      ]);
    });

    it('rejects with an error if the object contains invalid field names', async function() {
      const query = new Query(User);
      await expect(
        query.insert({ foo: 'bar' }),
        'to be rejected with error exhaustively satisfying',
        new Error("Unknown field or virtual 'User.foo'")
      );
    });

    it('rejects with an error if passed a non-object value', async function() {
      const query = new Query(User);
      await expect(
        query.insert(1),
        'to be rejected with error exhaustively satisfying',
        new Error("Cannot insert non-object '1'")
      );
    });

    it('rejects with an error if passed an instance of a different model', async function() {
      const query = new Query(User);
      await expect(
        query.insert(new Message()),
        'to be rejected with error exhaustively satisfying',
        new Error('Cannot insert an instance of Message with User.query')
      );
    });

    it('populates fields with default values before insert', async function() {
      const query = new Query(User);
      const user = new User({ id: 1, name: 'John Doe' });
      await expect(query.insert(user), 'to be fulfilled');
      await expect(knex, 'with table', User.table, 'to have rows satisfying', [
        {
          id: 1,
          name: 'John Doe',
          confirmed: false,
          age: null
        }
      ]);
    });

    it('casts fields configured with pre-save cast functions before insert', async function() {
      const query = new Query(User);
      const user = new User({
        id: 1,
        name: 'John Doe',
        jsonField: ['foo', 'bar']
      });
      await expect(query.insert(user), 'to be fulfilled');
      await expect(knex, 'with table', User.table, 'to have rows satisfying', [
        {
          id: 1,
          name: 'John Doe',
          json_field: expect.it(
            'when passed as parameter to',
            value => {
              if (typeof value === 'string') {
                // postgres 9.1. (on CI) doesn't automatically JSON.parse
                return JSON.parse(value);
              }
              return value;
            },
            'to equal',
            ['foo', 'bar']
          )
        }
      ]);
    });

    it("validates the instance's fields before saving", async function() {
      const query = new Query(User);
      const user = new User({ id: 1, name: 1 });
      await expect(query.insert(user), 'to be rejected with error satisfying', {
        name: 'ValidationError',
        type: 'TypeError'
      });
    });

    it("validates the object's fields before saving", async function() {
      const query = new Query(User);
      await expect(
        query.insert({ id: 1, name: 1 }),
        'to be rejected with error satisfying',
        {
          name: 'ValidationError',
          type: 'TypeError'
        }
      );
    });

    it('allows inserting instances without the id field set', async function() {
      const query = new Query(User);
      const user = new User({ name: 'John Doe' });
      await expect(query.insert(user), 'to be fulfilled');
      await expect(knex, 'with table', User.table, 'to have rows satisfying', [
        { id: 1, name: 'John Doe' }
      ]);
    });

    it('allows saving objects without the id field set', async function() {
      const query = new Query(User);
      await expect(query.insert({ name: 'John Doe' }), 'to be fulfilled');
      await expect(knex, 'with table', User.table, 'to have rows satisfying', [
        { id: 1, name: 'John Doe' }
      ]);
    });

    it('resolves with an array containing an instance of the model', async function() {
      const query = new Query(User);
      await expect(
        query.insert(new User({ name: 'John Doe' })),
        'to be fulfilled with value exhaustively satisfying',
        [expect.it('to be a', User)]
      );
    });

    it('resolves with the same instance that was passed', async function() {
      const query = new Query(User);
      const user = new User({ name: 'Johnie Doe' });
      await expect(
        query.insert(user),
        'to be fulfilled with value exhaustively satisfying',
        ([insertedUser]) => {
          expect(insertedUser === user, 'to be true');
        }
      );
    });

    it("doesn't modify other instance data properties", async function() {
      const query = new Query(User);
      const user = new User({ name: 'John Doe' });
      user.leaveMeIntact = 'okay';
      await expect(
        query.insert(user),
        'to be fulfilled with value satisfying',
        [{ leaveMeIntact: 'okay' }]
      );
    });

    it('populates the instance with all the fields from the database', async function() {
      const query = new Query(User);
      await expect(
        query.insert(new User({ name: 'John Doe' })),
        'to be fulfilled with value satisfying',
        [
          new User({
            id: 1,
            name: 'John Doe',
            confirmed: false,
            description: null,
            age: null,
            dateOfBirth: null,
            dbDefault: 'set-by-db',
            jsonField: null,
            intToString: null
          })
        ]
      );
    });

    it('casts fields configured with post-fetch cast functions after inserting', async function() {
      const query = new Query(User);
      const user = new User({ id: 1, name: 'John Doe', intToString: 10 });
      await expect(
        query.insert(user),
        'to be fulfilled with value satisfying',
        [{ intToString: '10' }]
      );
      await expect(knex, 'with table', User.table, 'to have rows satisfying', [
        {
          id: 1,
          name: 'John Doe',
          int_to_string: 10
        }
      ]);
    });

    it('accepts options', async function() {
      const query = new Query(User);
      await expect(
        query.insert(new User({ name: 'John Doe' }), { returning: 'name' }),
        'to be fulfilled with value satisfying',
        [new User({ name: 'John Doe' })]
      );
    });

    it('rejects with a InsertError if the insert operation fails', async function() {
      const stub = sinon
        .stub(QueryBuilder.prototype, 'insert')
        .returns(Promise.reject(new Error('insert error')));
      const query = new Query(User);
      await expect(
        query.insert(new User({ name: 'John Doe' })),
        'to be rejected with error satisfying',
        new Query.InsertError({
          error: new Error('insert error'),
          query
        })
      );
      stub.restore();
    });

    describe('with a `returning` option', function() {
      it('returns only the fields requested', async function() {
        const query = new Query(User).returning('name');
        await expect(
          query.insert(new User({ name: 'John Doe' })),
          'to be fulfilled with value satisfying',
          [new User({ name: 'John Doe' })]
        );
      });

      it('accepts an array of fields', async function() {
        const query = new Query(User).returning(['name', 'confirmed']);
        await expect(
          query.insert(new User({ name: 'John Doe' })),
          'to be fulfilled with value satisfying',
          [new User({ name: 'John Doe', confirmed: false })]
        );
      });

      it('accepts an array of field instances', async function() {
        const query = new Query(User).returning([
          User.fields.name,
          User.fields.confirmed
        ]);
        await expect(
          query.insert(new User({ name: 'John Doe' })),
          'to be fulfilled with value satisfying',
          [new User({ name: 'John Doe', confirmed: false })]
        );
      });

      it('allows using aliases for the fields returned from the database', async function() {
        const query = new Query(User).returning({
          name: 'theName',
          confirmed: 'theConfirmed'
        });
        await expect(
          query.insert(new User({ name: 'John Doe' })),
          'to be fulfilled with value satisfying',
          [
            Object.assign(new User(), {
              theName: 'John Doe',
              theConfirmed: false
            })
          ]
        );
      });
    });

    describe("with a 'transaction' configured", function() {
      it('does the insert within the transaction', async function() {
        const transact = async transaction => {
          await new Query(User)
            .transaction(transaction)
            .insert(new User({ name: 'John Doe' }));

          throw new Error('foo');
        };

        await expect(
          knex.transaction(transact),
          'to be rejected with error satisfying',
          new Error('foo')
        );

        await expect(knex, 'with table', User.table, 'to be empty');
      });

      describe("via the 'within' alias", function() {
        it('does the insert within the transaction', async function() {
          const transact = async transaction => {
            await new Query(User)
              .within(transaction)
              .insert(new User({ name: 'John Doe' }));

            throw new Error('foo');
          };

          await expect(
            knex.transaction(transact),
            'to be rejected with error satisfying',
            new Error('foo')
          );

          await expect(knex, 'with table', User.table, 'to be empty');
        });
      });
    });

    describe("with 'first' configured", function() {
      it('returns the first inserted instance', async function() {
        const query = new Query(User).first(true);
        await expect(
          query.insert(new User({ id: 1, name: 'John Doe' })),
          'to be fulfilled with value exhaustively satisfying',
          new User({
            id: 1,
            name: 'John Doe',
            confirmed: false,
            description: null,
            age: null,
            dateOfBirth: null,
            dbDefault: 'set-by-db',
            jsonField: null,
            intToString: null
          })
        );
      });
    });

    describe('if no row is inserted', function() {
      let insertStub;

      before(function() {
        insertStub = sinon.stub(QueryBuilder.prototype, 'insert');
      });

      beforeEach(function() {
        insertStub.reset();
        insertStub.returns(Promise.resolve([]));
      });

      after(function() {
        insertStub.restore();
      });

      it('resolves with an empty array', async function() {
        const query = new Query(User);
        await expect(
          query.insert(new User({ name: 'John Doe' })),
          'to be fulfilled with value satisfying',
          []
        );
      });

      it('resolves with `null` if the `first` option is configured', async function() {
        const query = new Query(User).first(true);
        await expect(
          query.insert(new User({ name: 'John Doe' })),
          'to be fulfilled with value satisfying',
          null
        );
      });

      describe("with 'require' option configured", function() {
        it('rejects with a NoRowsInsertedError', async function() {
          const query = new Query(User).require();
          await expect(
            query.insert(new User({ name: 'John Doe' })),
            'to be rejected with error satisfying',
            new Query.NoRowsInsertedError({ query })
          );
        });
      });
    });

    describe('when passed an array', function() {
      it('inserts rows to the database table from model instances', async function() {
        const query = new Query(User);
        await expect(
          query.insert([
            new User({ id: 1, name: 'John Doe', confirmed: true }),
            new User({ id: 2, name: 'Jane Doe', confirmed: false })
          ]),
          'to be fulfilled'
        );
        await expect(
          knex,
          'with table',
          User.table,
          'to have sorted rows satisfying',
          [
            { id: 1, name: 'John Doe', confirmed: true },
            { id: 2, name: 'Jane Doe', confirmed: false }
          ]
        );
      });

      it('inserts rows to the database table from plain objects', async function() {
        const query = new Query(User);
        await expect(
          query.insert([
            { id: 1, name: 'John Doe', confirmed: true },
            { id: 2, name: 'Jane Doe', confirmed: false }
          ]),
          'to be fulfilled'
        );
        await expect(
          knex,
          'with table',
          User.table,
          'to have sorted rows satisfying',
          [
            { id: 1, name: 'John Doe', confirmed: true },
            { id: 2, name: 'Jane Doe', confirmed: false }
          ]
        );
      });

      it('rejects with an error if one object contains invalid field names', async function() {
        const query = new Query(User);
        await expect(
          query.insert([{ name: 'foo' }, { foo: 'bar' }]),
          'to be rejected with error exhaustively satisfying',
          new Error("Unknown field or virtual 'User.foo'")
        );
      });

      it('rejects with an error if an item is not an object', async function() {
        const query = new Query(User);
        await expect(
          query.insert([1]),
          'to be rejected with error exhaustively satisfying',
          new Error("Cannot insert non-object '1'")
        );
      });

      it('rejects with an error if passed an instance of a different model', async function() {
        const query = new Query(User);
        await expect(
          query.insert([new User(), new Message()]),
          'to be rejected with error exhaustively satisfying',
          new Error('Cannot insert an instance of Message with User.query')
        );
      });

      it('populates fields with default values before insert', async function() {
        const query = new Query(User);
        await expect(
          query.insert([
            new User({ id: 1, name: 'John Doe' }),
            new User({ id: 2, name: 'Jane Doe', age: 10 })
          ]),
          'to be fulfilled'
        );
        await expect(
          knex,
          'with table',
          User.table,
          'to have sorted rows satisfying',
          [
            { id: 1, name: 'John Doe', confirmed: false, age: null },
            { id: 2, name: 'Jane Doe', confirmed: false, age: 10 }
          ]
        );
      });

      it('casts fields configured with pre-save cast functions before validating them', async function() {
        const query = new Query(User);
        await expect(
          query.insert([
            new User({ id: 1, name: 'John Doe' }),
            new User({ id: 2, name: 'Jane Doe', jsonField: ['foo', 'bar'] })
          ]),
          'to be fulfilled'
        );
        await expect(
          knex,
          'with table',
          User.table,
          'to have sorted rows satisfying',
          [
            { id: 1, name: 'John Doe' },
            {
              id: 2,
              name: 'Jane Doe',
              json_field: expect.it(
                'when passed as parameter to',
                value => {
                  if (typeof value === 'string') {
                    // postgres 9.1. (on CI) doesn't automatically JSON.parse
                    return JSON.parse(value);
                  }
                  return value;
                },
                'to equal',
                ['foo', 'bar']
              )
            }
          ]
        );
      });

      it("validates the instances' fields before saving", async function() {
        const query = new Query(User);
        await expect(
          query.insert([
            new User({ id: 1, name: 'John Doe' }),
            new User({ id: 1, name: 'Jane Doe', confirmed: 'false' })
          ]),
          'to be rejected with error satisfying',
          {
            name: 'ValidationError',
            type: 'TypeError',
            message: /confirmed/
          }
        );
      });

      it("validates the objects' fields before saving", async function() {
        const query = new Query(User);
        await expect(
          query.insert([
            { id: 1, name: 'John Doe' },
            { id: 1, name: 'Jane Doe', confirmed: 'false' }
          ]),
          'to be rejected with error satisfying',
          {
            name: 'ValidationError',
            type: 'TypeError',
            message: /confirmed/
          }
        );
      });

      it('allows inserting instances without the id field set', async function() {
        const query = new Query(User);
        await expect(
          query.insert([
            new User({ name: 'John Doe' }),
            new User({ name: 'Jane Doe' })
          ]),
          'to be fulfilled'
        );
        await expect(
          knex,
          'with table',
          User.table,
          'to have sorted rows satisfying',
          [{ id: 1, name: 'John Doe' }, { id: 2, name: 'Jane Doe' }]
        );
      });

      it('allows saving objects without the id field set', async function() {
        const query = new Query(User);
        await expect(
          query.insert([{ name: 'John Doe' }, { name: 'Jane Doe' }]),
          'to be fulfilled'
        );
        await expect(
          knex,
          'with table',
          User.table,
          'to have sorted rows satisfying',
          [{ id: 1, name: 'John Doe' }, { id: 2, name: 'Jane Doe' }]
        );
      });

      it('resolves with instances of the model', async function() {
        const query = new Query(User);
        await expect(
          query.insert([
            new User({ name: 'John Doe' }),
            new User({ name: 'Jane Doe' })
          ]),
          'to be fulfilled with value exhaustively satisfying',
          [expect.it('to be a', User), expect.it('to be a', User)]
        );
      });

      it('resolves with the same instances that were passed', async function() {
        const query = new Query(User);
        const user1 = new User({ name: 'John Doe' });
        const user2 = new User({ name: 'Jane Doe' });
        await expect(
          query.insert([user1, user2]),
          'to be fulfilled with sorted rows satisfying',
          [expect.it('to equal', user1), expect.it('to equal', user2)]
        );
      });

      it("doesn't modify other instance data properties", async function() {
        const query = new Query(User);
        const user1 = new User({ name: 'John Doe' });
        const user2 = new User({ name: 'Jane Doe' });
        user1.leaveMeIntact = 'okay';
        user2.alsoeLeaveMeIntact = 'okay';
        await expect(
          query.insert([user1, user2]),
          'to be fulfilled with sorted rows satisfying',
          [
            expect.it('to satisfy', { leaveMeIntact: 'okay' }),
            expect.it('to satisfy', { alsoeLeaveMeIntact: 'okay' })
          ]
        );
      });

      it('populates the instances with all the fields from the database', async function() {
        const query = new Query(User);
        await expect(
          query.insert([
            new User({ name: 'John Doe' }),
            new User({ name: 'Jane Doe' })
          ]),
          'to be fulfilled with sorted rows satisfying',
          [
            new User({
              id: 1,
              name: 'John Doe',
              confirmed: false,
              description: null,
              age: null,
              dateOfBirth: null,
              dbDefault: 'set-by-db',
              jsonField: null,
              intToString: null
            }),
            new User({
              id: 2,
              name: 'Jane Doe',
              confirmed: false,
              description: null,
              age: null,
              dateOfBirth: null,
              dbDefault: 'set-by-db',
              jsonField: null,
              intToString: null
            })
          ]
        );
      });

      it('casts fields configured with post-fetch cast functions after inserting', async function() {
        const query = new Query(User);
        await expect(
          query.insert([
            new User({ id: 1, name: 'John Doe', intToString: 10 }),
            new User({ id: 2, name: 'Jane Doe' })
          ]),
          'to be fulfilled with sorted rows satisfying',
          [{ id: 1, intToString: '10' }, { id: 2, intToString: null }]
        );
        await expect(
          knex,
          'with table',
          User.table,
          'to have sorted rows satisfying',
          [
            { id: 1, name: 'John Doe', int_to_string: 10 },
            { id: 2, name: 'Jane Doe' }
          ]
        );
      });

      it('does only one insert operation with an array of data', async function() {
        const spy = sinon.spy(QueryBuilder.prototype, 'insert');
        const query = new Query(User);
        await query.insert([
          new User({ name: 'John Doe' }),
          new User({ name: 'Jane Doe' })
        ]);
        await expect(spy, 'to have calls satisfying', () => {
          spy([{ name: 'John Doe' }, { name: 'Jane Doe' }]);
        });
        spy.restore();
      });

      describe('if no rows are inserted', function() {
        let insertStub;

        before(function() {
          insertStub = sinon.stub(QueryBuilder.prototype, 'insert');
        });

        beforeEach(function() {
          insertStub.reset();
          insertStub.returns(Promise.resolve([]));
        });

        after(function() {
          insertStub.restore();
        });

        it('resolves with am empty array', async function() {
          const query = new Query(User);
          await expect(
            query.insert([new User({ name: 'John Doe' })]),
            'to be fulfilled with value satisfying',
            []
          );
        });

        describe("with 'require' option configured", function() {
          it('rejects with a NoRowsInsertedError', async function() {
            const query = new Query(User).require();
            await expect(
              query.insert([new User({ name: 'John Doe' })]),
              'to be rejected with error satisfying',
              new Query.NoRowsInsertedError({ query })
            );
          });
        });
      });

      describe('with a `batchSize` configured', () => {
        it('does multiple insert operations with batched arrays of data', async function() {
          const spy = sinon.spy(QueryBuilder.prototype, 'insert');
          const query = new Query(User);
          await query
            .batchSize(1)
            .insert([
              new User({ name: 'John Doe' }),
              new User({ name: 'Jane Doe' })
            ]);
          await expect(spy, 'to have calls satisfying', () => {
            spy([{ name: 'John Doe' }]);
            spy([{ name: 'Jane Doe' }]);
          });
          spy.restore();
        });

        it('creates the right batches', async function() {
          const spy = sinon.spy(QueryBuilder.prototype, 'insert');
          const users = [
            { name: 'John Doe' },
            { name: 'Jane Doe' },
            { name: 'John Smith' },
            { name: 'Jane Smith' }
          ];

          await new Query(User).batchSize(1).insert(users);
          await expect(spy, 'to have calls satisfying', () => {
            spy([{ name: 'John Doe' }]);
            spy([{ name: 'Jane Doe' }]);
            spy([{ name: 'John Smith' }]);
            spy([{ name: 'Jane Smith' }]);
          });

          spy.reset();
          await new Query(User).batchSize(2).insert(users);
          await expect(spy, 'to have calls satisfying', () => {
            spy([{ name: 'John Doe' }, { name: 'Jane Doe' }]);
            spy([{ name: 'John Smith' }, { name: 'Jane Smith' }]);
          });

          spy.reset();
          await new Query(User).batchSize(3).insert(users);
          await expect(spy, 'to have calls satisfying', () => {
            spy([
              { name: 'John Doe' },
              { name: 'Jane Doe' },
              { name: 'John Smith' }
            ]);
            spy([{ name: 'Jane Smith' }]);
          });

          const allFourAtOnce = () => {
            spy([
              { name: 'John Doe' },
              { name: 'Jane Doe' },
              { name: 'John Smith' },
              { name: 'Jane Smith' }
            ]);
          };

          spy.reset();
          await new Query(User).batchSize(4).insert(users);
          await expect(spy, 'to have calls satisfying', allFourAtOnce);

          spy.reset();
          await new Query(User).batchSize(5).insert(users);
          await expect(spy, 'to have calls satisfying', allFourAtOnce);

          spy.reset();
          await new Query(User).batchSize(0).insert(users);
          await expect(spy, 'to have calls satisfying', allFourAtOnce);

          spy.restore();
        });

        it('returns a single array of inserted data', async function() {
          const query = new Query(User).batchSize(1);
          await expect(
            query.insert([
              new User({ id: 1, name: 'John Doe' }),
              new User({ id: 2, name: 'Jane Doe' }),
              new User({ id: 3, name: 'John Smith' })
            ]),
            'to be fulfilled with sorted rows satisfying',
            [
              new User({ id: 1, name: 'John Doe' }),
              new User({ id: 2, name: 'Jane Doe' }),
              new User({ id: 3, name: 'John Smith' })
            ]
          );
        });

        describe('if no rows are inserted', function() {
          let insertStub;

          before(function() {
            insertStub = sinon.stub(QueryBuilder.prototype, 'insert');
          });

          beforeEach(function() {
            insertStub.reset();
            insertStub.returns(Promise.resolve([]));
          });

          after(function() {
            insertStub.restore();
          });

          it('resolves with am empty array', async function() {
            const query = new Query(User).batchSize(1);
            await expect(
              query.insert([new User({ name: 'John Doe' })]),
              'to be fulfilled with value satisfying',
              []
            );
          });

          describe("with 'require' option configured", function() {
            it('rejects with a NoRowsInsertedError', async function() {
              const query = new Query(User).batchSize(1).require();
              await expect(
                query.insert([new User({ name: 'John Doe' })]),
                'to be rejected with error satisfying',
                new Query.NoRowsInsertedError({ query })
              );
            });
          });
        });
      });
    });
  });

  describe('Query.prototype.update', function() {
    let user;

    beforeEach(async function() {
      const query = new Query(User);
      user = await query
        .first(true)
        .insert(new User({ id: 1, name: 'John Doe' }));
    });

    afterEach(async function() {
      await truncateUserTable();
    });

    it.only('updates rows in the database table from a model instance', async function() {
      const query = new Query(User);
      user.name = 'Jane Doe';
      await expect(query.update(user), 'to be fulfilled');
      await expect(knex, 'with table', User.table, 'to have rows satisfying', [
        { id: 1, name: 'Jane Doe' }
      ]);
    });

    it('updates rows in the database table from a plain object', async function() {
      const query = new Query(User);
      const user = { id: 1, name: 'Jane Doe' };
      await expect(query.update(user), 'to be fulfilled');
      await expect(knex, 'with table', User.table, 'to have rows satisfying', [
        { id: 1, name: 'Jane Doe' }
      ]);
    });

    it('rejects with an error if the object contains invalid field names', async function() {
      const query = new Query(User);
      await expect(
        query.update({ foo: 'bar' }),
        'to be rejected with error exhaustively satisfying',
        new Error("Unknown field or virtual 'User.foo'")
      );
    });

    it('rejects with an error if passed a non-object value', async function() {
      const query = new Query(User);
      await expect(
        query.update(1),
        'to be rejected with error exhaustively satisfying',
        new Error("Cannot update non-object '1'")
      );
    });

    it('rejects with an error if passed an instance of a different model', async function() {
      const query = new Query(User);
      await expect(
        query.update(new Message()),
        'to be rejected with error exhaustively satisfying',
        new Error('Cannot update an instance of Message with User.query')
      );
    });

    it("validates the instance's fields before saving", async function() {
      const query = new Query(User);
      user.name = 1;
      await expect(query.update(user), 'to be rejected with error satisfying', {
        name: 'ValidationError',
        type: 'TypeError'
      });
    });

    it('casts updated fields configured with pre-save cast functions before update', async function() {
      const query = new Query(User);
      user.jsonField = ['foo', 'bar'];
      await expect(query.update(user), 'to be fulfilled');
      await expect(knex, 'with table', User.table, 'to have rows satisfying', [
        {
          id: 1,
          name: 'John Doe',
          json_field: expect.it(
            'when passed as parameter to',
            value => {
              if (typeof value === 'string') {
                // postgres 9.1. (on CI) doesn't automatically JSON.parse
                return JSON.parse(value);
              }
              return value;
            },
            'to equal',
            ['foo', 'bar']
          )
        }
      ]);
    });

    it('accepts options', async function() {
      await new Query(User).insert(new User({ id: 2, name: 'Jane Doe' }));
      const query = new Query(User);
      await expect(
        query.update({ name: 'Foo' }, { where: { id: 1 } }),
        'to be fulfilled'
      );
      await expect(
        knex,
        'with table',
        User.table,
        'to have sorted rows satisfying',
        [{ id: 1, name: 'Foo' }, { id: 2, name: 'Jane Doe' }]
      );
    });

    it('rejects with an UpdateError if the update operation fails', async function() {
      const stub = sinon
        .stub(QueryBuilder.prototype, 'update')
        .returns(Promise.reject(new Error('update error')));
      const query = new Query(User);
      user.name = 'Jane Doe';
      await expect(
        query.update(user),
        'to be rejected with error satisfying',
        new Query.UpdateError({
          error: new Error('update error'),
          query
        })
      );
      stub.restore();
    });

    describe("with a 'where' option", function() {
      it('updates only the rows matching the query', async function() {
        await new Query(User).insert(new User({ id: 2, name: 'Jane Doe' }));
        const query = new Query(User).where({ id: 1 });
        await expect(query.update({ name: 'Foo' }), 'to be fulfilled');
        await expect(
          knex,
          'with table',
          User.table,
          'to have sorted rows satisfying',
          [{ id: 1, name: 'Foo' }, { id: 2, name: 'Jane Doe' }]
        );
      });
    });

    describe("with a 'returning' option", function() {
      it('returns instances populated with only the requested fields', async function() {
        await new Query(User).insert(new User({ id: 2, name: 'Jane Doe' }));
        const query = new Query(User).returning(['id', 'name']);
        await expect(
          query.update({ name: 'Foo' }),
          'to be fulfilled with sorted rows exhaustively satisfying',
          [new User({ id: 1, name: 'Foo' }), new User({ id: 2, name: 'Foo' })]
        );
      });
    });

    describe("with 'first' configured", function() {
      it('returns the first updated instance', async function() {
        await new Query(User).insert(new User({ id: 2, name: 'Jane Doe' }));
        const query = new Query(User).first(true);
        await expect(
          query.update({ name: 'Foo' }),
          'to be fulfilled with value exhaustively satisfying',
          new User({
            id: 1,
            name: 'Foo',
            confirmed: false,
            description: null,
            age: null,
            dateOfBirth: null,
            dbDefault: 'set-by-db',
            jsonField: null,
            intToString: null
          })
        );
      });
    });

    describe('with multiple rows in the table', function() {
      beforeEach(async function() {
        await new Query(User).insert(new User({ id: 2, name: 'Jane Doe' }));
      });

      it('updates all rows', async function() {
        await expect(
          new Query(User).update({ name: 'Johnie Doe' }),
          'to be fulfilled'
        );
        await expect(
          knex,
          'with table',
          User.table,
          'to have sorted rows satisfying',
          [{ id: 1, name: 'Johnie Doe' }, { id: 2, name: 'Johnie Doe' }]
        );
      });

      it('resolves with instances of the model', async function() {
        const query = new Query(User);
        user.name = 'Jane Doe';
        await expect(
          query.update({ name: 'Johnie Doe' }),
          'to be fulfilled with value exhaustively satisfying',
          [expect.it('to be a', User), expect.it('to be a', User)]
        );
      });

      it('populates the instances with all the fields from the database', async function() {
        const query = new Query(User);
        await expect(
          query.update({ name: 'Johnie Doe' }),
          'to be fulfilled with value satisfying',
          [
            new User({
              id: 1,
              name: 'Johnie Doe',
              confirmed: false,
              description: null,
              age: null,
              dateOfBirth: null,
              dbDefault: 'set-by-db',
              jsonField: null,
              intToString: null
            }),
            new User({
              id: 2,
              name: 'Johnie Doe',
              confirmed: false,
              description: null,
              age: null,
              dateOfBirth: null,
              dbDefault: 'set-by-db',
              jsonField: null,
              intToString: null
            })
          ]
        );
      });

      it('casts fields configured with post-fetch cast functions', async function() {
        const query = new Query(User);
        user.intToString = 10;
        await expect(
          query.update({ intToString: 10 }),
          'to be fulfilled with value satisfying',
          [{ id: 1, intToString: '10' }, { id: 2, intToString: '10' }]
        );
        await expect(
          knex,
          'with table',
          User.table,
          'to have rows satisfying',
          [{ id: 1, int_to_string: 10 }, { id: 2, int_to_string: 10 }]
        );
      });
    });

    describe('with a `returning` option', function() {
      it('returns the `id` field and the fields requested', async function() {
        const query = new Query(User).returning('name');
        user.name = 'Jane Doe';
        await expect(
          query.update(user),
          'to be fulfilled with value exhaustively satisfying',
          [new User({ id: 1, name: 'Jane Doe' })]
        );
      });

      it('accepts an array of fields', async function() {
        const query = new Query(User).returning(['name', 'confirmed']);
        user.name = 'Jane Doe';
        await expect(
          query.update(user),
          'to be fulfilled with value exhaustively satisfying',
          [new User({ id: 1, name: 'Jane Doe', confirmed: false })]
        );
      });

      it('accepts an array of field objects', async function() {
        const query = new Query(User).returning([
          User.fields.name,
          User.fields.confirmed
        ]);
        user.name = 'Jane Doe';
        await expect(
          query.update(user),
          'to be fulfilled with value exhaustively satisfying',
          [new User({ id: 1, name: 'Jane Doe', confirmed: false })]
        );
      });

      it('allows using aliases for the returned fields', async function() {
        const query = new Query(User).returning({
          name: 'theName',
          confirmed: 'theConfirmed'
        });
        user.name = 'Jane Doe';
        await expect(
          query.update(user),
          'to be fulfilled with value exhaustively satisfying',
          [
            Object.assign(new User({ id: 1 }), {
              theName: 'Jane Doe',
              theConfirmed: false
            })
          ]
        );
      });
    });

    describe("with a 'transaction' configured", function() {
      it('does the update within the transaction', async function() {
        const transact = async transaction => {
          user.name = 'Jane Doe';
          await new Query(User).transaction(transaction).update(user);

          throw new Error('foo');
        };

        await expect(
          knex.transaction(transact),
          'to be rejected with error satisfying',
          new Error('foo')
        );

        await expect(
          knex,
          'with table',
          User.table,
          'to have rows satisfying',
          [
            {
              id: 1,
              name: 'John Doe'
            }
          ]
        );
      });

      describe("via the 'within' alias", function() {
        it('does the update within the transaction', async function() {
          const transact = async transaction => {
            user.name = 'Jane Doe';
            await new Query(User).transaction(transaction).update(user);

            throw new Error('foo');
          };

          await expect(
            knex.transaction(transact),
            'to be rejected with error satisfying',
            new Error('foo')
          );

          await expect(
            knex,
            'with table',
            User.table,
            'to have rows satisfying',
            [
              {
                id: 1,
                name: 'John Doe'
              }
            ]
          );
        });
      });
    });

    describe('if no row is updated', function() {
      let updateStub;

      before(function() {
        updateStub = sinon.stub(QueryBuilder.prototype, 'update');
      });

      beforeEach(function() {
        updateStub.reset();
        updateStub.returns(Promise.resolve([]));
      });

      after(function() {
        updateStub.restore();
      });

      it('resolves with an empty array', async function() {
        user.name = 'Jane Doe';
        const query = new Query(User);
        await expect(
          query.update(user),
          'to be fulfilled with value satisfying',
          []
        );
      });

      it('resolves with `null` if the `first` option is configured', async function() {
        user.name = 'Jane Doe';
        const query = new Query(User).first(true);
        await expect(
          query.update(user),
          'to be fulfilled with value satisfying',
          null
        );
      });

      describe("with 'require' option configured", function() {
        it('rejects with a NoRowsUpdatedError', async function() {
          user.name = 'Jane Doe';
          const query = new Query(User).require();
          await expect(
            query.update(user),
            'to be rejected with error satisfying',
            new Query.NoRowsUpdatedError({ query })
          );
        });
      });
    });

    describe("with 'where' option configured", function() {
      it('updates only the rows that match the where definition', async function() {
        await new Query(User).insert(new User({ id: 2, name: 'Jane Doe' }));
        const query = new Query(User).where({ id: 1 });
        await expect(query.update({ name: 'Johnie Doe' }), 'to be fulfilled');
        await expect(
          knex,
          'with table',
          User.table,
          'to have sorted rows satisfying',
          [{ id: 1, name: 'Johnie Doe' }, { id: 2, name: 'Jane Doe' }]
        );
      });
    });

    describe('with `Model.notUpdated` fields configured', function() {
      it('does not update those fields', async function() {
        const updateSpy = sinon.spy(QueryBuilder.prototype, 'update');
        user.name = 'Jane Doe';
        await new Query(User).update(user);
        await expect(updateSpy, 'to have calls satisfying', () => {
          updateSpy(expect.it('not to have key', 'id'));
        });
        updateSpy.restore();
      });
    });
  });

  describe('Query.prototype.save', function() {
    afterEach(async function() {
      await truncateUserTable();
    });

    it('proxies to Query.prototype.insert if passed an array', async function() {
      const spy = sinon.spy(Query.prototype, 'insert');
      const query = new Query(User);
      const user1 = new User({ name: 'John Doe' });
      const user2 = new User({ name: 'Jane Doe' });
      await expect(query.save([user1, user2]), 'to be fulfilled');
      await expect(spy, 'to have calls satisfying', () => {
        spy([user1, user2], undefined); // options are undefined
      });
      await expect(knex, 'with table', User.table, 'to have rows satisfying', [
        { id: 1, name: 'John Doe' },
        { id: 2, name: 'Jane Doe' }
      ]);
      spy.restore();
    });

    it('proxies options to Query.prototype.insert', async function() {
      const query = new Query(User);
      await expect(
        query.save([{ name: 'John Doe' }, { name: 'Jane Doe' }], {
          returning: 'id'
        }),
        'to be fulfilled with sorted rows exhaustively satisfying',
        [new User({ id: 1 }), new User({ id: 2 })]
      );
    });

    describe('when passed an object', function() {
      it('proxies to Query.prototype.insert if the primary field is not set on the data', async function() {
        const spy = sinon.spy(Query.prototype, 'insert');
        const query = new Query(User);
        const user = new User({ name: 'John Doe' });
        await expect(query.save(user), 'to be fulfilled');
        await expect(spy, 'to have calls satisfying', () => {
          spy(user, undefined); // options are undefined
        });
        await expect(
          knex,
          'with table',
          User.table,
          'to have rows satisfying',
          [{ id: 1, name: 'John Doe' }]
        );
        spy.restore();
      });

      it('proxies to Query.prototype.update if the primary field is set on the data', async function() {
        await new Query(User).insert(new User({ id: 1, name: 'John Doe' }));
        const spy = sinon.spy(Query.prototype, 'update');
        const query = new Query(User);
        const user = { id: 1, name: 'Jane Doe' };
        await expect(query.save(user), 'to be fulfilled');
        await expect(spy, 'to have calls satisfying', () => {
          spy(user, undefined); // options are undefined
        });
        await expect(
          knex,
          'with table',
          User.table,
          'to have rows satisfying',
          [{ id: 1, name: 'Jane Doe' }]
        );
        spy.restore();
      });

      it('proxies options to Query.prototype.update', async function() {
        await new Query(User).insert(new User({ id: 1, name: 'John Doe' }));
        const query = new Query(User);
        await expect(
          query.save(
            { id: 1, name: 'Jane Doe' },
            { returning: ['id', 'name', 'confirmed'] }
          ),
          'to be fulfilled with value exhaustively satisfying',
          [new User({ id: 1, name: 'Jane Doe', confirmed: false })]
        );
      });
    });
  });

  describe('Query.prototype.delete', function() {
    beforeEach(async function() {
      await knex(User.table).insert([
        {
          id: 1,
          name: 'John Doe',
          confirmed: true,
          int_to_string: 10
        },
        {
          id: 2,
          name: 'Jane Doe',
          confirmed: true,
          int_to_string: null
        }
      ]);
    });

    afterEach(async function() {
      await truncateUserTable();
    });

    it('deletes all rows from the database', async function() {
      await expect(new Query(User).delete(), 'to be fulfilled');
      await expect(knex, 'with table', User.table, 'to be empty');
    });

    it('resolves with populated instances of the deleted models', async function() {
      const query = new Query(User);
      await expect(
        query.delete(),
        'to be fulfilled with sorted rows exhaustively satisfying',
        [
          new User({
            id: 1,
            name: 'John Doe',
            confirmed: true,
            description: null,
            age: null,
            dateOfBirth: null,
            dbDefault: 'set-by-db',
            jsonField: null,
            intToString: '10'
          }),
          new User({
            id: 2,
            name: 'Jane Doe',
            confirmed: true,
            description: null,
            age: null,
            dateOfBirth: null,
            dbDefault: 'set-by-db',
            jsonField: null,
            intToString: null
          })
        ]
      );
    });

    it('casts fields configured with post-fetch cast functions after deleting', async function() {
      const query = new Query(User).where({ id: 1 });
      await expect(query.delete(), 'to be fulfilled with value satisfying', [
        {
          intToString: '10'
        }
      ]);
      await expect(knex, 'with table', User.table, 'to have rows satisfying', [
        {
          id: 2,
          name: 'Jane Doe',
          confirmed: true,
          age: null,
          json_field: null,
          int_to_string: null
        }
      ]);
    });

    it('accepts options', async function() {
      const query = new Query(User);
      await expect(query.delete({ where: { id: 1 } }), 'to be fulfilled');
      await expect(knex, 'with table', User.table, 'to have rows satisfying', [
        {
          id: 2,
          name: 'Jane Doe'
        }
      ]);
    });

    it('rejects with a DeleteError if the delete operation fails', async function() {
      const stub = sinon
        .stub(QueryBuilder.prototype, 'delete')
        .returns(Promise.reject(new Error('delete error')));
      const query = new Query(User);
      await expect(
        query.delete(),
        'to be rejected with error satisfying',
        new Query.DeleteError({
          error: new Error('delete error'),
          query
        })
      );
      stub.restore();
    });

    describe("with a 'where' option", function() {
      it('deletes only the rows matching the query', async function() {
        const query = new Query(User).where({ id: 1 });
        await expect(query.delete(), 'to be fulfilled with value satisfying', [
          new User({ id: 1, name: 'John Doe' })
        ]);
        await expect(
          knex,
          'with table',
          User.table,
          'to have rows satisfying',
          [{ id: 2, name: 'Jane Doe' }]
        );
      });
    });

    describe("with a 'returning' option", function() {
      it('resolves with the deleted models with only the fields specified', async function() {
        const query = new Query(User).returning(['id', 'name']);
        await expect(
          query.delete(),
          'to be fulfilled with sorted rows exhaustively satisfying',
          [
            new User({ id: 1, name: 'John Doe' }),
            new User({ id: 2, name: 'Jane Doe' })
          ]
        );
      });

      it('includes the `id` even if not requested', async function() {
        const query = new Query(User).returning('name');
        await expect(
          query.delete(),
          'to be fulfilled with sorted rows exhaustively satisfying',
          [
            new User({ id: 1, name: 'John Doe' }),
            new User({ id: 2, name: 'Jane Doe' })
          ]
        );
      });

      it('accepts an array of field objects', async function() {
        const query = new Query(User).returning([
          User.fields.name,
          User.fields.confirmed
        ]);
        await expect(
          query.delete(),
          'to be fulfilled with value exhaustively satisfying',
          [
            new User({ id: 1, name: 'John Doe', confirmed: true }),
            new User({ id: 2, name: 'Jane Doe', confirmed: true })
          ]
        );
      });

      it('allows using aliases for the returned fields', async function() {
        const query = new Query(User).returning({
          name: 'theName',
          confirmed: 'theConfirmed'
        });
        await expect(
          query.delete(),
          'to be fulfilled with value exhaustively satisfying',
          [
            Object.assign(new User({ id: 1 }), {
              theName: 'John Doe',
              theConfirmed: true
            }),
            Object.assign(new User({ id: 2 }), {
              theName: 'Jane Doe',
              theConfirmed: true
            })
          ]
        );
      });
    });

    describe("with 'first' configured", function() {
      it('resolves with the first deleted model', async function() {
        const query = new Query(User).first(true);
        await expect(
          query.delete(),
          'to be fulfilled with value exhaustively satisfying',
          new User({
            id: 1,
            name: 'John Doe',
            confirmed: true,
            description: null,
            age: null,
            dateOfBirth: null,
            dbDefault: 'set-by-db',
            jsonField: null,
            intToString: '10'
          })
        );
      });
    });

    describe('with forge disabled', function() {
      it('resolves with the deleted models as plain objects', async function() {
        const query = new Query(User).forge(false);
        await expect(
          query.delete(),
          'to be fulfilled with sorted rows exhaustively satisfying',
          [
            {
              id: 1,
              name: 'John Doe',
              confirmed: true,
              description: null,
              age: null,
              dateOfBirth: null,
              dbDefault: 'set-by-db',
              jsonField: null,
              intToString: '10'
            },
            {
              id: 2,
              name: 'Jane Doe',
              confirmed: true,
              description: null,
              age: null,
              dateOfBirth: null,
              dbDefault: 'set-by-db',
              jsonField: null,
              intToString: null
            }
          ]
        );
      });
    });

    describe("with a 'transaction' configured", function() {
      it('does the delete within the transaction', async function() {
        const transact = async transaction => {
          await new Query(User).transaction(transaction).delete();

          throw new Error('foo');
        };

        await expect(
          knex.transaction(transact),
          'to be rejected with error satisfying',
          new Error('foo')
        );

        await expect(knex, 'with table', User.table, 'not to be empty');
      });

      describe("via the 'within' alias", function() {
        it('does the delete within the transaction', async function() {
          const transact = async transaction => {
            await new Query(User).transaction(transaction).delete();

            throw new Error('foo');
          };

          await expect(
            knex.transaction(transact),
            'to be rejected with error satisfying',
            new Error('foo')
          );

          await expect(knex, 'with table', User.table, 'not to be empty');
        });
      });
    });

    describe('if no row is deleted', function() {
      let deleteStub;

      before(function() {
        deleteStub = sinon.stub(QueryBuilder.prototype, 'delete');
      });

      beforeEach(function() {
        deleteStub.reset();
        deleteStub.returns(Promise.resolve([]));
      });

      after(function() {
        deleteStub.restore();
      });

      it('resolves with an empty array', async function() {
        await expect(
          new Query(User).delete(),
          'to be fulfilled with value satisfying',
          []
        );
      });

      it('resolves with `null` if the `first` option is configured', async function() {
        await expect(
          new Query(User).first(true).delete(),
          'to be fulfilled with value satisfying',
          null
        );
      });

      describe("with 'require' option configured", function() {
        it('rejects with a NoRowsDeletedError', async function() {
          const query = new Query(User).require();
          await expect(
            query.delete(),
            'to be rejected with error satisfying',
            new Query.NoRowsDeletedError({ query })
          );
        });
      });
    });
  });
});

const knorm = require('@knorm/knorm');
const knormPostgres = require('@knorm/postgres');
const knormRelations = require('@knorm/relations');
const KnormPaginate = require('../lib/KnormPaginate');
const knormPaginate = require('../');
const sinon = require('sinon');
const knex = require('./lib/knex');
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

const { KnormPaginateError } = KnormPaginate;

describe('KnormPaginate', () => {
  const orm = knorm()
    .use(knormPostgres({ connection: knex.client.config.connection }))
    .use(knormRelations())
    .use(knormPaginate());

  const Query = orm.Query;

  class Model extends orm.Model {}
  Model.fields = {
    id: { type: 'integer', primary: true, updated: false }
  };

  class User extends Model {}
  User.table = 'user';
  User.fields = {
    name: { type: 'string', required: true },
    age: { type: 'integer', default: null },
    confirmed: 'boolean'
  };

  class Image extends Model {}
  Image.table = 'image';
  Image.fields = {
    user: { type: 'integer', references: User.fields.id }
  };

  before(async () => {
    await knex.schema.createTable(User.table, table => {
      table.increments();
      table.string('name');
      table.integer('age');
      table.boolean('confirmed');
    });
    await knex.schema.createTable(Image.table, table => {
      table.increments();
      table
        .integer('user')
        .references('id')
        .inTable(User.table);
    });
    await User.insert([
      { id: 1, name: 'User 1', age: 10 },
      { id: 2, name: 'User 2', age: 10 }
    ]);
    await Image.insert([{ id: 1, user: 1 }]);
  });

  after(async () => {
    await knex.schema.dropTable(Image.table);
    await knex.schema.dropTable(User.table);
  });

  describe('init', () => {
    it('throws if not passed a `Knorm` instance', () => {
      expect(
        () => new KnormPaginate().init(),
        'to throw',
        new KnormPaginateError('no Knorm instance provided')
      );
    });

    it('throws if passed an invalid `Knorm` instance', () => {
      expect(
        () => new KnormPaginate().init({}),
        'to throw',
        new KnormPaginateError('invalid Knorm instance provided')
      );
    });
  });

  describe('updateQuery', () => {
    describe('Query.prototype.count', () => {
      it('resolves with the count of all the rows in the table if not passed any options', async () => {
        const query = new Query(User);
        await expect(query.count(), 'to be fulfilled with', 2);
      });

      it("accepts a 'field' option specifying the field to count", async () => {
        const query = new Query(User);
        await expect(
          query.count({ field: 'confirmed' }),
          'to be fulfilled with',
          0 // since confirmed is null in both rows
        );
      });

      it("accepts a 'distinct' option to count distinct fields", async () => {
        const query = new Query(User);
        await expect(
          query.count({ distinct: 'age' }),
          'to be fulfilled with',
          1
        );
      });

      // this varies too much from db to db. write a raw query instead if needed
      it("does not support counting multiple 'distinct' fields", async () => {
        const query = new Query(User);
        await expect(
          query.count({ distinct: ['id', 'age'] }),
          'to be rejected with error satisfying',
          { name: 'CountError' }
        );
      });

      // this varies too much from db to db. write a raw query instead if needed
      it("does not support counting multiple 'fields'", async () => {
        const query = new Query(User).fields(['id', 'name']);
        await expect(query.count(), 'to be rejected with error satisfying', {
          name: 'CountError'
        });
      });

      it('rejects with a CountError if a database error occurs', async () => {
        const stub = sinon
          .stub(Query.prototype, 'query')
          .returns(Promise.reject(new Error('count error')));
        const query = new Query(User);
        await expect(
          query.count(),
          'to be rejected with error satisfying',
          new Query.CountError({ error: new Error('count error'), query })
        );
        stub.restore();
      });

      describe("with a 'where' configured", () => {
        it('resolves with the count of rows matching the query', async () => {
          const query = new Query(User).where({ id: 1 });
          await expect(query.count(), 'to be fulfilled with', 1);
        });
      });

      describe("with an 'innerJoin' configured", () => {
        it('resolves with the count of rows matching the join', async () => {
          const query = new Query(User).innerJoin(new Query(Image));
          await expect(query.count(), 'to be fulfilled with', 1);
        });
      });

      describe("with a 'leftJoin' configured", () => {
        it('resolves with the count of rows matching the join', async () => {
          const query = new Query(User).leftJoin(new Query(Image));
          await expect(query.count(), 'to be fulfilled with', 2);
        });
      });

      describe('if no rows are counted', () => {
        it('resolves with zero', async () => {
          const query = new Query(User).where({ id: 3 });
          await expect(
            query.count(),
            'to be fulfilled with value satisfying',
            0
          );
        });

        describe("with 'require' option configured", () => {
          it('rejects with a NoRowsCountedError', async () => {
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
  });

  describe('updateModel', () => {
    describe('Model.count', function() {
      it('counts models', async function() {
        await expect(User.count(), 'to be fulfilled with value satisfying', 2);
      });

      it('passes options along', async function() {
        await expect(
          User.count({ field: 'id' }),
          'to be fulfilled with value satisfying',
          2
        );
      });
    });
  });
});

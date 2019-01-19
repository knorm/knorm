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
  .use(require('unexpected-knex'));

const { KnormPaginateError } = KnormPaginate;

describe('KnormPaginate', () => {
  const orm = knorm()
    .use(knormPostgres({ connection: knex.client.config.connection }))
    .use(knormRelations())
    .use(knormPaginate({ page: 2, perPage: 2 }));

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

      describe('if a fetch error occurs', () => {
        let queryStub;

        beforeEach(() => {
          queryStub = sinon
            .stub(Query.prototype, 'query')
            .returns(Promise.reject(new Error('count error')));
        });

        afterEach(() => {
          queryStub.restore();
        });

        it('rejects with a CountError', async () => {
          const query = new Query(User);
          await expect(
            query.count(),
            'to be rejected with error satisfying',
            new Query.CountError({ error: new Error('count error'), query })
          );
        });

        it('attaches a parameterized sql string to the error', async () => {
          const query = new Query(User).where({ id: 1 });
          await expect(query.count(), 'to be rejected with error satisfying', {
            sql: 'SELECT COUNT(*) as "count" FROM "user" WHERE "user"."id" = $1'
          });
        });

        it('attaches a full sql string with values in `debug` mode', async () => {
          const query = new Query(User).where({ id: 1 }).debug(true);
          await expect(query.count(), 'to be rejected with error satisfying', {
            sql: 'SELECT COUNT(*) as "count" FROM "user" WHERE "user"."id" = 1'
          });
        });
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

      describe('with `debug` configured', () => {
        it('improves the CountError stack trace', async () => {
          const stub = sinon
            .stub(Query.prototype, 'query')
            .returns(Promise.reject(new Error('count error')));
          await expect(
            new Query(User).count(),
            'to be rejected with error satisfying',
            e => expect(e.stack, 'not to contain', 'test/KnormPaginate.spec.js')
          );
          await expect(
            new Query(User).debug(true).count(),
            'to be rejected with error satisfying',
            e => expect(e.stack, 'to contain', 'test/KnormPaginate.spec.js')
          );
          stub.restore();
        });
      });
    });

    describe('Query.prototype.fetch', () => {
      before(async () =>
        User.insert([
          { id: 3, name: 'User 3', age: 10 },
          { id: 4, name: 'User 4', age: 10 },
          { id: 5, name: 'User 5', age: 10 },
          { id: 6, name: 'User 6', age: 10 },
          { id: 7, name: 'User 7', age: 10 },
          { id: 8, name: 'User 8', age: 10 },
          { id: 9, name: 'User 9', age: 10 },
          { id: 10, name: 'User 10', age: 10 }
        ])
      );

      after(async () =>
        User.delete({ where: User.where.in({ id: [3, 4, 5, 6, 7, 8, 9, 10] }) })
      );

      describe('with no pagination options set', () => {
        it('returns all the rows', async () => {
          const query = new Query(User);
          await expect(
            query.fetch(),
            'to be fulfilled with value satisfying',
            expect.it('to have length', 10)
          );
        });

        it('passes options along', async () => {
          const query = new Query(User).fields(['name']);
          await expect(
            query.fetch(),
            'to be fulfilled with value exhaustively satisfying',
            [
              new User({ name: 'User 1' }),
              new User({ name: 'User 2' }),
              new User({ name: 'User 3' }),
              new User({ name: 'User 4' }),
              new User({ name: 'User 5' }),
              new User({ name: 'User 6' }),
              new User({ name: 'User 7' }),
              new User({ name: 'User 8' }),
              new User({ name: 'User 9' }),
              new User({ name: 'User 10' })
            ]
          );
        });
      });

      describe('with `page` and `perPage` set', () => {
        it('returns paginated rows and pagination data', async () => {
          const query = new Query(User).page(2).perPage(2);
          await expect(query.fetch(), 'to be fulfilled with value satisfying', {
            total: 10,
            page: 2,
            perPage: 2,
            rows: [{ id: 3, name: 'User 3' }, { id: 4, name: 'User 4' }]
          });
        });

        it('passes options along', async () => {
          const query = new Query(User)
            .page(3)
            .perPage(3)
            .fields(['name']);
          await expect(
            query.fetch(),
            'to be fulfilled with value exhaustively satisfying',
            {
              total: 10,
              page: 3,
              perPage: 3,
              rows: [
                new User({ name: 'User 7' }),
                new User({ name: 'User 8' }),
                new User({ name: 'User 9' })
              ]
            }
          );
        });

        it('supports `where`', async () => {
          const query = new Query(User)
            .page(2)
            .perPage(1)
            .where(User.where.in({ id: [1, 2, 3] }));
          await expect(query.fetch(), 'to be fulfilled with value satisfying', {
            total: 3,
            page: 2,
            perPage: 1,
            rows: [{ id: 2, name: 'User 2' }]
          });
        });

        it('supports `distinct`', async () => {
          const query = new Query(User)
            .page(1)
            .perPage(1)
            .distinct('age');
          await expect(query.fetch(), 'to be fulfilled with value satisfying', {
            total: 1,
            page: 1,
            perPage: 1,
            rows: [{ age: 10 }]
          });
        });

        it('overwrites any original `limit` and `offset` options passed', async () => {
          const query = new Query(User)
            .page(3)
            .perPage(3)
            .offset(1)
            .limit(5);
          await expect(query.fetch(), 'to be fulfilled with value satisfying', {
            total: 10,
            page: 3,
            perPage: 3,
            rows: [
              { id: 7, name: 'User 7' },
              { id: 8, name: 'User 8' },
              { id: 9, name: 'User 9' }
            ]
          });
        });

        it('unsets `fields` when counting total rows', async () => {
          const query = new Query(User)
            .page(3)
            .perPage(1)
            .fields(['max(age)']);
          await expect(query.fetch(), 'to be fulfilled with value satisfying', {
            total: 10
          });
        });

        it('unsets `groupBy` when counting total rows', async () => {
          const query = new Query(User)
            .page(3)
            .perPage(1)
            .fields(['max(age)'])
            .groupBy('id');
          await expect(query.fetch(), 'to be fulfilled with value satisfying', {
            total: 10
          });
        });

        it('unsets `orderBy` when counting total rows', async () => {
          const spy = sinon.spy(Query.prototype, 'query');
          const query = new Query(User)
            .page(3)
            .perPage(1)
            .orderBy('age');
          await expect(query.fetch(), 'to be fulfilled with value satisfying', {
            total: 10
          });
          await expect(spy, 'to have calls satisfying', () => {
            spy(
              expect.it(
                'when passed as parameter to',
                sql => sql.toString(),
                'not to contain',
                'ORDER BY'
              )
            ); // for the count query
            spy(expect.it('not to be undefined')); // for the fetch query
          });
        });

        it("supports `page: 'first'`", async () => {
          const query = new Query(User).page('first').perPage(2);
          await expect(query.fetch(), 'to be fulfilled with value satisfying', {
            total: 10,
            page: 1,
            perPage: 2,
            rows: [{ id: 1, name: 'User 1' }, { id: 2, name: 'User 2' }]
          });
        });

        it("supports `page: 'last'`", async () => {
          const query = new Query(User).page('last').perPage(3);
          await expect(query.fetch(), 'to be fulfilled with value satisfying', {
            total: 10,
            page: 4,
            perPage: 3,
            rows: [{ id: 10, name: 'User 10' }]
          });
        });

        it('casts `page` to an integer', async () => {
          const query = new Query(User).page('5').perPage(2);
          await expect(query.fetch(), 'to be fulfilled with value satisfying', {
            total: 10,
            page: 5,
            perPage: 2,
            rows: [{ id: 9, name: 'User 9' }, { id: 10, name: 'User 10' }]
          });
        });

        it('casts `perPage` to an integer', async () => {
          const query = new Query(User).page(5).perPage('1');
          await expect(query.fetch(), 'to be fulfilled with value satisfying', {
            total: 10,
            page: 5,
            perPage: 1,
            rows: [{ id: 5, name: 'User 5' }]
          });
        });
      });

      describe('if `page` is out of bounds', () => {
        it('rejects with a fetch error if `page` is 0', async () => {
          const query = new Query(User).page(0).perPage(1);
          await expect(
            query.fetch(),
            'to be rejected with error satisfying',
            new Query.FetchError({
              query,
              error: new Error('OFFSET must not be negative')
            })
          );
        });

        it('rejects with a fetch error if `page` is less than 0', async () => {
          const query = new Query(User).page(-1).perPage(1);
          await expect(
            query.fetch(),
            'to be rejected with error satisfying',
            new Query.FetchError({
              query,
              error: new Error('OFFSET must not be negative')
            })
          );
        });

        it('returns no rows if page is greater than max pages', async () => {
          const query = new Query(User).page(100).perPage(1);
          await expect(query.fetch(), 'to be fulfilled with value satisfying', {
            total: 10,
            page: 100,
            perPage: 1,
            rows: []
          });
        });
      });

      describe('if `perPage` is out of bounds', () => {
        it('returns no rows if `perPage` is 0', async () => {
          const query = new Query(User).page(1).perPage(0);
          await expect(query.fetch(), 'to be fulfilled with value satisfying', {
            total: 10,
            page: 1,
            perPage: 0,
            rows: []
          });
        });

        it('rejects with a fetch error if `perPage` is less than 0', async () => {
          const query = new Query(User).page(1).perPage(-1);
          await expect(
            query.fetch(),
            'to be rejected with error satisfying',
            new Query.FetchError({
              query,
              error: new Error('LIMIT must not be negative')
            })
          );
        });

        it('returns all rows if page is greater than total rows', async () => {
          const query = new Query(User).page(1).perPage(100);
          await expect(query.fetch(), 'to be fulfilled with value satisfying', {
            total: 10,
            page: 1,
            perPage: 100,
            rows: expect.it('to have length', 10)
          });
        });
      });

      describe('with only `page` set', () => {
        it('defaults `perPage` to the default configured value', async () => {
          const query = new Query(User).page(2);
          await expect(query.fetch(), 'to be fulfilled with value satisfying', {
            total: 10,
            page: 2,
            perPage: 2,
            rows: [{ id: 3, name: 'User 3' }, { id: 4, name: 'User 4' }]
          });
        });
      });

      describe('with only `perPage` set', () => {
        it('defaults `page` to the default configured value', async () => {
          const query = new Query(User).perPage(1);
          await expect(query.fetch(), 'to be fulfilled with value satisfying', {
            total: 10,
            page: 2,
            perPage: 1,
            rows: [{ id: 2, name: 'User 2' }]
          });
        });
      });

      describe('with `withPaginationData` set to `false`', () => {
        it('returns only an array of paginated rows', async () => {
          const query = new Query(User)
            .page(10)
            .perPage(1)
            .withPaginationData(false);
          await expect(query.fetch(), 'to be fulfilled with value satisfying', [
            { id: 10, name: 'User 10' }
          ]);
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

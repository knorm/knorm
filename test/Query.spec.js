const { snakeCase: fieldToColumn } = require('lodash');
const Knorm = require('../lib/Knorm');
const knex = require('./lib/knex');
const postgresPlugin = require('./lib/postgresPlugin');
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

describe('Query', () => {
  let Model;
  let Query;
  let BaseQuery;
  let QueryError;
  let User;
  let createUserTable;
  let truncateUserTable;

  before(async () => {
    const orm = new Knorm({ fieldToColumn });

    BaseQuery = orm.Query;

    orm.use(postgresPlugin);

    Model = orm.Model;
    Query = orm.Query;
    QueryError = Query.QueryError;

    Model.fields = {
      id: {
        type: 'integer',
        required: true,
        primary: true,
        updated: false
      }
    };

    User = class extends Model {};
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
        },
        schema: {
          type: 'array',
          maxLength: 2
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

    createUserTable = table => {
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

    truncateUserTable = async () => {
      return knex.schema.raw(
        `TRUNCATE "${User.table}" RESTART IDENTITY CASCADE`
      );
    };

    await knex.schema.createTable(User.table, createUserTable);
  });

  after(async () => {
    await knex.schema.dropTable(User.table);
  });

  describe('constructor', () => {
    it('throws an error if not passed a model', () => {
      expect(
        () => new Query(),
        'to throw',
        new QueryError('no model provided')
      );
    });

    it('throws an error if the passed model does not inherit from Model', () => {
      class Foo {}
      expect(
        () => new Query(Foo),
        'to throw',
        new QueryError('model should be a subclass of `Model`')
      );
    });

    it("throws an error if the passed model's table-name is not set", () => {
      class Foo extends Model {}
      expect(
        () => new Query(Foo),
        'to throw',
        new QueryError('`Foo.table` is not set')
      );
    });
  });

  describe('Query.prototype.setOptions', () => {
    it('throws an error if passed an option that is not a Query method', () => {
      expect(
        () => new Query(User).setOptions({ foo: 'bar' }),
        'to throw',
        new QueryError('User: unknown option `foo`')
      );
    });

    it('supports query builder methods', () => {
      expect(
        () => new Query(User).setOptions({ where: { foo: 'bar' } }),
        'not to throw'
      );
    });
  });

  describe('Query.prototype.clone', () => {
    it('returns a Query instance', () => {
      const query = new Query(User);
      expect(query.clone(), 'to be a', Query);
    });

    it('returns the correct instance with a Query subclass', () => {
      class FooQuery extends Query {}
      const query = new FooQuery(User);
      const clone = query.clone();
      expect(clone, 'to be a', FooQuery);
      expect(clone, 'to be a', Query);
    });

    it('returns an instance of the same constructor as the original', () => {
      class FooQuery extends Query {}
      const query = new FooQuery(User);
      const clone = query.clone();
      expect(clone.constructor, 'to be', query.constructor);
    });

    it('copies custom configs to the clone', () => {
      const query = new Query(User);
      query.config.foo = { foo: 'bar' };
      expect(query.clone(), 'to satisfy', { config: { foo: { foo: 'bar' } } });
    });

    it('copies added options to the clone', () => {
      const query = new Query(User)
        .fields(['id'])
        .forUpdate()
        .groupBy('id');
      expect(query.clone(), 'to satisfy', {
        options: { fields: { id: 'id' }, forUpdate: true, groupBy: [['id']] }
      });
    });
  });

  describe('Query.prototype.acquireClient', () => {
    it('throws a QueryError if not implemented', async () => {
      const query = new BaseQuery(User);
      await expect(
        () => query.acquireClient(),
        'to throw',
        new QueryError('`Query.prototype.acquireClient` is not implemented')
      );
    });
  });

  describe('Query.prototype.acquireClient', () => {
    it('throws a QueryError if not implemented', async () => {
      const query = new BaseQuery(User);
      await expect(
        () => query.acquireClient(),
        'to throw',
        new QueryError('`Query.prototype.acquireClient` is not implemented')
      );
    });
  });

  describe('Query.prototype.formatSql', () => {
    it('throws a QueryError if not implemented', async () => {
      const query = new BaseQuery(User);
      await expect(
        () => query.formatSql(),
        'to throw',
        new QueryError('`Query.prototype.formatSql` is not implemented')
      );
    });
  });

  describe('Query.prototype.runQuery', () => {
    it('throws a QueryError if not implemented', async () => {
      const query = new BaseQuery(User);
      await expect(
        () => query.runQuery(),
        'to throw',
        new QueryError('`Query.prototype.runQuery` is not implemented')
      );
    });
  });

  describe('Query.prototype.parseResult', () => {
    it('throws a QueryError if not implemented', async () => {
      const query = new BaseQuery(User);
      await expect(
        () => query.parseResult(),
        'to throw',
        new QueryError('`Query.prototype.parseResult` is not implemented')
      );
    });
  });

  describe('Query.prototype.releaseClient', () => {
    it('throws a QueryError if not implemented', async () => {
      const query = new BaseQuery(User);
      await expect(
        () => query.releaseClient(),
        'to throw',
        new QueryError('`Query.prototype.releaseClient` is not implemented')
      );
    });
  });

  describe('Query.prototype.query', () => {
    let query;
    const noop = () => {};

    beforeEach(() => {
      query = new BaseQuery(User);
      query.acquireClient = noop;
      query.formatSql = noop;
      query.runQuery = noop;
      query.parseResult = noop;
      query.releaseClient = noop;
    });

    it('calls Query.prototype.acquireClient', async () => {
      const acquireClient = sinon.spy();
      query.acquireClient = acquireClient;
      await query.query('the sql');
      await expect(acquireClient, 'to have calls satisfying', () => {
        acquireClient();
      });
    });

    it('calls Query.prototype.formatSql', async () => {
      const formatSql = sinon.spy();
      query.formatSql = formatSql;
      await query.query('the sql');
      await expect(formatSql, 'to have calls satisfying', () => {
        formatSql('the sql');
      });
    });

    it('calls Query.prototype.runQuery', async () => {
      const runQuery = sinon.spy();
      query.acquireClient = () => 'the client';
      query.formatSql = () => 'the formatted sql';
      query.runQuery = runQuery;
      await query.query('the sql');
      await expect(runQuery, 'to have calls satisfying', () => {
        runQuery('the client', 'the formatted sql');
      });
    });

    it('calls Query.prototype.parseResult', async () => {
      const parseResult = sinon.stub().returns('the parsed result');
      query.runQuery = () => 'the database result';
      query.parseResult = parseResult;
      await expect(
        query.query('the sql'),
        'to be fulfilled with value satisfying',
        'the parsed result'
      );
      await expect(parseResult, 'to have calls satisfying', () => {
        parseResult('the database result');
      });
    });

    it('calls Query.prototype.releaseClient', async () => {
      const releaseClient = sinon.spy();
      query.acquireClient = () => 'the client';
      query.releaseClient = releaseClient;
      await query.query('the sql');
      await expect(releaseClient, 'to have calls satisfying', () => {
        releaseClient('the client');
      });
    });

    it('supports an `async` Query.prototype.acquireClient', async () => {
      const releaseClient = sinon.spy();
      query.releaseClient = releaseClient;
      query.acquireClient = async () => 'the client';
      await query.query('the sql');
      await expect(releaseClient, 'to have calls satisfying', () => {
        releaseClient('the client');
      });
    });

    it('supports an `async` Query.prototype.formatSql', async () => {
      const runQuery = sinon.spy();
      query.acquireClient = () => 'the client';
      query.formatSql = async () => 'the formatted sql';
      query.runQuery = runQuery;
      await query.query('the sql');
      await expect(runQuery, 'to have calls satisfying', () => {
        runQuery('the client', 'the formatted sql');
      });
    });

    it('supports an `async` Query.prototype.runQuery', async () => {
      const parseResult = sinon.spy();
      query.runQuery = async () => 'the database result';
      query.parseResult = parseResult;
      await query.query('the sql');
      await expect(parseResult, 'to have calls satisfying', () => {
        parseResult('the database result');
      });
    });

    // FIXME: this doesn't really test what it's supposed to :/
    it('supports an `async` Query.prototype.parseResult', async () => {
      const parseResult = sinon
        .stub()
        .returns(Promise.resolve('the parsed result'));
      query.runQuery = () => 'the database result';
      query.parseResult = parseResult;
      await expect(
        query.query('the sql'),
        'to be fulfilled with value satisfying',
        'the parsed result'
      );
    });

    it('supports an `async` Query.prototype.releaseClient', async () => {
      let called;
      const delay = delay => new Promise(resolve => setTimeout(resolve, delay));
      query.releaseClient = () => delay(10).then(() => (called = true));
      await query.query('the sql');
      await expect(called, 'to be true');
    });

    describe('releases the client', () => {
      let releaseClient;

      beforeEach(() => {
        releaseClient = sinon.spy();
        query.acquireClient = () => 'the client';
        query.releaseClient = releaseClient;
      });

      it('if Query.prototype.formatSql throws', async () => {
        query.formatSql = () => {
          throw new Error('foo');
        };
        await expect(
          query.query('the sql'),
          'to be rejected with error satisfying',
          new Error('foo')
        );
        await expect(releaseClient, 'to have calls satisfying', () => {
          releaseClient('the client');
        });
      });

      it('if Query.prototype.runQuery throws', async () => {
        query.runQuery = () => {
          throw new Error('foo');
        };
        await expect(
          query.query('the sql'),
          'to be rejected with error satisfying',
          new Error('foo')
        );
        await expect(releaseClient, 'to have calls satisfying', () => {
          releaseClient('the client');
        });
      });

      it('if Query.prototype.parseResult throws', async () => {
        query.parseResult = () => {
          throw new Error('foo');
        };
        await expect(
          query.query('the sql'),
          'to be rejected with error satisfying',
          new Error('foo')
        );
        await expect(releaseClient, 'to have calls satisfying', () => {
          releaseClient('the client');
        });
      });
    });
  });

  describe('Query.prototype.fetch', () => {
    before(async () => {
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

    after(async () => {
      await truncateUserTable();
    });

    it('resolves with all the rows in the table', async () => {
      const query = new Query(User);
      await expect(
        query.fetch(),
        'to be fulfilled with value satisfying',
        rows => expect(rows, 'to have length', 2)
      );
    });

    it('resolves with instances of the model', async () => {
      const query = new Query(User);
      await expect(query.fetch(), 'to be fulfilled with value satisfying', [
        expect.it('to be a', User),
        expect.it('to be a', User)
      ]);
    });

    it('populates all fields of the instances', async () => {
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

    it('casts fields configured with post-fetch cast functions', async () => {
      const query = new Query(User);
      await expect(
        query.fetch(),
        'to be fulfilled with sorted rows satisfying',
        [
          new User({ id: 1, intToString: '10' }),
          new User({ id: 2, intToString: null })
        ]
      );
    });

    it('casts only fields returned in the fetched data', async () => {
      const spy = sinon.spy(User.prototype, 'cast');
      const query = new Query(User).fields(['id', 'name']);
      await expect(
        query.fetch(),
        'to be fulfilled with sorted rows exhaustively satisfying',
        [
          new User({ id: 1, name: 'User 1' }),
          new User({ id: 2, name: 'User 2' })
        ]
      );
      await expect(spy, 'to have calls satisfying', () => {
        // once per row
        spy({ fields: ['id', 'name'], forFetch: true });
        spy({ fields: ['id', 'name'], forFetch: true });
      });
      spy.restore();
    });

    it('works with a model `schema` configured', async () => {
      const spy = sinon.spy(Query.prototype, 'query');
      class OtherUser extends User {}
      OtherUser.schema = 'public';
      const query = new Query(OtherUser);
      await expect(
        query.fetch(),
        'to be fulfilled with sorted rows satisfying',
        [
          new OtherUser({ id: 1, name: 'User 1' }),
          new OtherUser({ id: 2, name: 'User 2' })
        ]
      );
      await expect(spy, 'to have calls satisfying', () => {
        spy(
          expect.it(
            'when passed as parameter to',
            sql => sql.toString(),
            'to contain',
            '"public"."user"'
          )
        );
      });
      spy.restore();
    });

    // regression test for @knorm/relations
    it('supports options with string values', async () => {
      const query = new Query(User);
      query.options.joinType = 'innerJoin';
      await expect(
        query.fetch(),
        'to be fulfilled with sorted rows exhaustively satisfying',
        [
          new User({ id: 1, name: 'User 1' }),
          new User({ id: 2, name: 'User 2' })
        ]
      );
    });

    describe('if a fetch error occurs', () => {
      let queryStub;

      beforeEach(() => {
        queryStub = sinon
          .stub(Query.prototype, 'query')
          .returns(Promise.reject(new Error('fetch error')));
      });

      afterEach(() => {
        queryStub.restore();
      });

      it('rejects with a FetchError', async () => {
        const query = new Query(User);
        await expect(
          query.fetch(),
          'to be rejected with error satisfying',
          new Query.FetchError({ error: new Error('fetch error'), query })
        );
      });

      it('attaches a parameterized sql string to the error', async () => {
        const query = new Query(User).field('id').where({ id: 1 });
        await expect(query.fetch(), 'to be rejected with error satisfying', {
          sql:
            'SELECT "user"."id" as "user.id" FROM "user" WHERE "user"."id" = $1'
        });
      });

      it('attaches a full sql string with values in `debug` mode', async () => {
        const query = new Query(User)
          .field('id')
          .where({ id: 1 })
          .debug(true);
        await expect(query.fetch(), 'to be rejected with error satisfying', {
          sql:
            'SELECT "user"."id" as "user.id" FROM "user" WHERE "user"."id" = 1'
        });
      });
    });

    describe('if no rows are fetched', () => {
      let selectStub;

      before(() => {
        selectStub = sinon.stub(Query.prototype, 'query');
      });

      beforeEach(() => {
        selectStub.resetHistory();
        selectStub.returns(Promise.resolve([]));
      });

      after(() => {
        selectStub.restore();
      });

      it('resolves with an empty array', async () => {
        const query = new Query(User);
        await expect(
          query.fetch(),
          'to be fulfilled with value satisfying',
          []
        );
      });

      describe("with 'first' configured", () => {
        it('resolves with null', async () => {
          const query = new Query(User).first();
          await expect(
            query.fetch(),
            'to be fulfilled with value satisfying',
            null
          );
        });
      });

      describe("with 'require' configured", () => {
        it('rejects with a NoRowsFetchedError', async () => {
          const query = new Query(User).require();
          await expect(
            query.fetch(),
            'to be rejected with error satisfying',
            new Query.NoRowsFetchedError({ query })
          );
        });
      });
    });

    describe("with 'first' configured", () => {
      it('resolves with the first row', async () => {
        const query = new Query(User).first();
        await expect(
          query.fetch(),
          'to be fulfilled with value satisfying',
          new User({ id: 1 })
        );
      });
    });

    describe("with 'forge' disabled", () => {
      it('resolves with plain JS objects', async () => {
        const query = new Query(User).forge(false);
        await expect(query.fetch(), 'to be fulfilled with value satisfying', [
          expect.it('to be an object').and('not to be a', User),
          expect.it('to be an object').and('not to be a', User)
        ]);
      });

      it('does not cast fields with post-fetch cast functions', async () => {
        const query = new Query(User).forge(false);
        await expect(
          query.fetch(),
          'to be fulfilled with sorted rows satisfying',
          [{ id: 1, intToString: 10 }, { id: 2, intToString: null }]
        );
      });

      it("uses the model's field names as the objects' keys", async () => {
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
              intToString: 10
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

      describe('via the `lean` alias', () => {
        it('resolves with plain JS objects', async () => {
          const query = new Query(User).lean();
          await expect(query.fetch(), 'to be fulfilled with value satisfying', [
            expect.it('to be an object').and('not to be a', User),
            expect.it('to be an object').and('not to be a', User)
          ]);
        });
      });
    });

    describe("with 'fields' configured", () => {
      it('resolves with instances containing only the requested fields', async () => {
        const query = new Query(User).fields(['name']);
        await expect(
          query.fetch(),
          'to be fulfilled with sorted rows exhaustively satisfying',
          [new User({ name: 'User 1' }), new User({ name: 'User 2' })]
        );
      });

      it('casts the fields requested if they have post-fetch cast functions', async () => {
        const query = new Query(User).fields('intToString');
        await expect(
          query.fetch(),
          'to be fulfilled with sorted rows exhaustively satisfying',
          [new User({ intToString: '10' }), new User({ intToString: null })]
        );
      });

      describe('as an object', () => {
        it('uses the objects keys as field aliases', async () => {
          const query = new Query(User).fields({ ages: 'age' });
          await expect(
            query.fetch(),
            'to be fulfilled with sorted rows exhaustively satisfying',
            [new User({ ages: 10 }), new User({ ages: 10 })]
          );
        });

        it('supports raw sql as object values as plain strings', async () => {
          const query = new Query(User).fields({ now: 'now()' });
          await expect(
            query.fetch(),
            'to be fulfilled with sorted rows exhaustively satisfying',
            [
              new User({ now: expect.it('to be a', Date) }),
              new User({ now: expect.it('to be a', Date) })
            ]
          );
        });

        it('supports raw sql as object values as sql-bricks instances', async () => {
          const query = new Query(User);
          query.fields({ now: query.sql('now()') });
          await expect(
            query.fetch(),
            'to be fulfilled with sorted rows exhaustively satisfying',
            [
              new User({ now: expect.it('to be a', Date) }),
              new User({ now: expect.it('to be a', Date) })
            ]
          );
        });
      });

      describe('as an array of strings', () => {
        it('resolves with instances containing the requested fields', async () => {
          const query = new Query(User).fields(['name', 'age', 'confirmed']);
          await expect(
            query.fetch(),
            'to be fulfilled with sorted rows exhaustively satisfying',
            [
              new User({ name: 'User 1', age: 10, confirmed: false }),
              new User({ name: 'User 2', age: 10, confirmed: true })
            ]
          );
        });
      });
    });

    describe("with 'returning' configured", () => {
      it('returns only the fields requested (synonymous with `fields` option)', async () => {
        const query = new Query(User).returning(['name']);
        await expect(
          query.fetch(),
          'to be fulfilled with sorted rows exhaustively satisfying',
          [new User({ name: 'User 1' }), new User({ name: 'User 2' })]
        );
      });
    });

    describe("with 'distinct' configured", () => {
      it('resolves with instances matching the distinct fields', async () => {
        await expect(
          new Query(User).distinct('age').fetch(),
          'to be fulfilled with value exhaustively satisfying',
          [new User({ age: 10 })]
        );
      });

      it('resolves with all instances matching the query', async () => {
        await expect(
          new Query(User).distinct(['id', 'name']).fetch(),
          'to be fulfilled with sorted rows exhaustively satisfying',
          [
            new User({ id: 1, name: 'User 1' }),
            new User({ id: 2, name: 'User 2' })
          ]
        );
      });

      it('supports instances fetched without an id field', async () => {
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

      it('supports `fields`', async () => {
        await expect(
          new Query(User)
            .distinct('name')
            .field('id')
            .fetch(),
          'to be fulfilled with sorted rows exhaustively satisfying',
          [
            new User({ id: 1, name: 'User 1' }),
            new User({ id: 2, name: 'User 2' })
          ]
        );
      });
    });

    // this also tests `having`
    describe("with a 'where' configured", () => {
      it('supports an object', async () => {
        const query = new Query(User).where({ id: 2 });
        await expect(
          query.fetch(),
          'to be fulfilled with sorted rows satisfying',
          [new User({ id: 2, name: 'User 2' })]
        );
      });

      it('supports chained `where` calls', async () => {
        const query = new Query(User)
          .where({ id: 2 })
          .where({ name: 'User 2' });
        await expect(
          query.fetch(),
          'to be fulfilled with sorted rows satisfying',
          [new User({ id: 2, name: 'User 2' })]
        );
      });

      it('supports "where true|false"', async () => {
        const query = new Query(User).where(false);
        await expect(
          query.fetch(),
          'to be fulfilled with sorted rows satisfying',
          []
        );
      });

      describe('with a field as the first argument', () => {
        it('supports "field, value"', async () => {
          const query = new Query(User);
          query.where('id', 2);
          await expect(
            query.fetch(),
            'to be fulfilled with sorted rows satisfying',
            [new User({ id: 2, name: 'User 2' })]
          );
        });

        it('supports "field, null"', async () => {
          const query = new Query(User);
          query.where('dateOfBirth', null);
          await expect(
            query.fetch(),
            'to be fulfilled with sorted rows satisfying',
            [
              new User({ id: 1, name: 'User 1' }),
              new User({ id: 2, name: 'User 2' })
            ]
          );
        });

        it('ignores everything after the second argument', async () => {
          const query = new Query(User);
          query.where('id', 1, 2);
          await expect(
            query.fetch(),
            'to be fulfilled with sorted rows satisfying',
            [new User({ id: 1, name: 'User 1' })]
          );
        });
      });

      describe('with non-fields', () => {
        it('supports var-args', async () => {
          const query = new Query(User);
          query.where('(id)', 2);
          await expect(
            query.fetch(),
            'to be fulfilled with sorted rows satisfying',
            [new User({ id: 2, name: 'User 2' })]
          );
        });

        it('supports objects', async () => {
          const query = new Query(User);
          query.where({ '(id)': 2 });
          await expect(
            query.fetch(),
            'to be fulfilled with sorted rows satisfying',
            [new User({ id: 2, name: 'User 2' })]
          );
        });

        it('supports where expressions with var-args', async () => {
          const query = new Query(User);
          const where = new Query.Where();
          query.where(where.like('(id || name)', '%2'));
          await expect(
            query.fetch(),
            'to be fulfilled with sorted rows satisfying',
            [new User({ id: 2, name: 'User 2' })]
          );
        });

        it('supports where expressions with an object', async () => {
          const query = new Query(User);
          const where = new Query.Where();
          query.where(where.like({ '(id || name)': '%2' }));
          await expect(
            query.fetch(),
            'to be fulfilled with sorted rows satisfying',
            [new User({ id: 2, name: 'User 2' })]
          );
        });
      });

      it('supports expressions', async () => {
        const query = new Query(User);
        const where = new Query.Where();
        query.where(where.not({ id: 1 }));
        await expect(
          query.fetch(),
          'to be fulfilled with sorted rows satisfying',
          [new User({ id: 2, name: 'User 2' })]
        );
      });

      it('supports multiple expressions', async () => {
        const query = new Query(User);
        const where = new Query.Where();
        query.where(where.notEqual('id', 1), where.between('id', 1, 2));
        await expect(
          query.fetch(),
          'to be fulfilled with sorted rows satisfying',
          [new User({ id: 2, name: 'User 2' })]
        );
      });

      it('supports objects and expressions', async () => {
        const query = new Query(User);
        const where = new Query.Where();
        query.where({ id: 1 }, where.between('id', 1, 2));
        await expect(
          query.fetch(),
          'to be fulfilled with sorted rows satisfying',
          [new User({ id: 1, name: 'User 1' })]
        );
      });

      it('supports expressions with objects', async () => {
        const query = new Query(User);
        const where = new Query.Where();
        query.where(where.notEqual({ id: 1 }));
        await expect(
          query.fetch(),
          'to be fulfilled with sorted rows satisfying',
          [new User({ id: 2, name: 'User 2' })]
        );
      });

      it('supports expressions with objects with multiple keys', async () => {
        const query = new Query(User);
        const where = new Query.Where();
        query.where(where.equal({ age: 10, name: 'User 2' }));
        await expect(
          query.fetch(),
          'to be fulfilled with sorted rows satisfying',
          [new User({ id: 2, name: 'User 2' })]
        );
      });

      it('does nothing if no arguments are passed', async () => {
        const query = new Query(User);
        query.where();
        await expect(
          query.fetch(),
          'to be fulfilled with sorted rows satisfying',
          [
            new User({ id: 1, name: 'User 1' }),
            new User({ id: 2, name: 'User 2' })
          ]
        );
      });

      it('does nothing for an empty object', async () => {
        const query = new Query(User);
        query.where({});
        await expect(
          query.fetch(),
          'to be fulfilled with sorted rows satisfying',
          [
            new User({ id: 1, name: 'User 1' }),
            new User({ id: 2, name: 'User 2' })
          ]
        );
      });

      describe('for `undefined` values', () => {
        it('rejects for "field, value"', async () => {
          const query = new Query(User);
          query.where('id');
          await expect(
            query.fetch(),
            'to be rejected with error satisfying',
            new QueryError(
              'User: undefined "where" value passed for field `id`'
            )
          );
        });

        it('rejects for objects', async () => {
          const query = new Query(User);
          query.where({ id: undefined });
          await expect(
            query.fetch(),
            'to be rejected with error satisfying',
            new QueryError(
              'User: undefined "where" value passed for field `id`'
            )
          );
        });

        it('rejects for expressions with "field, value"', async () => {
          const query = new Query(User);
          const where = new Query.Where();
          query.where(where.in('id'));
          await expect(
            query.fetch(),
            'to be rejected with error satisfying',
            new QueryError(
              'User: undefined "where" value passed for field `id`'
            )
          );
        });

        it('rejects for expressions with objects', async () => {
          const query = new Query(User);
          const where = new Query.Where();
          query.where(where.in({ id: undefined }));
          await expect(
            query.fetch(),
            'to be rejected with error satisfying',
            new QueryError(
              'User: undefined "where" value passed for field `id`'
            )
          );
        });

        it('works for "is null" expressions', async () => {
          const query = new Query(User);
          const where = new Query.Where();
          query.where(where.isNull('dateOfBirth'));
          await expect(
            query.fetch(),
            'to be fulfilled with sorted rows satisfying',
            [
              new User({ id: 1, name: 'User 1' }),
              new User({ id: 2, name: 'User 2' })
            ]
          );
        });

        it('works for "is not null" expressions', async () => {
          const query = new Query(User);
          const where = new Query.Where();
          query.where(where.isNotNull('dateOfBirth'));
          await expect(
            query.fetch(),
            'to be fulfilled with sorted rows satisfying',
            []
          );
        });
      });

      describe('for `where in`', () => {
        it('supports expressions', async () => {
          const query = new Query(User);
          const where = new Query.Where();
          query.where(where.in('id', [2]));
          await expect(
            query.fetch(),
            'to be fulfilled with sorted rows satisfying',
            [new User({ id: 2 })]
          );
        });

        it('supports object expressions', async () => {
          const query = new Query(User);
          const where = new Query.Where();
          query.where(where.in({ id: [2] }));
          await expect(
            query.fetch(),
            'to be fulfilled with sorted rows satisfying',
            [new User({ id: 2 })]
          );
        });

        it('turns an empty array value expression to a "where false"', async () => {
          const query = new Query(User);
          const where = new Query.Where();
          query.where(where.in('id', []));
          await expect(
            query.fetch(),
            'to be fulfilled with sorted rows satisfying',
            []
          );
        });
      });

      describe('for `between`', () => {
        it('supports an array', async () => {
          const query = new Query(User);
          const where = new Query.Where();
          query.where(where.between('id', [1, 2]));
          await expect(
            query.fetch(),
            'to be fulfilled with sorted rows satisfying',
            [
              new User({ id: 1, name: 'User 1' }),
              new User({ id: 2, name: 'User 2' })
            ]
          );
        });

        it('supports an object with an array value', async () => {
          const query = new Query(User);
          const where = new Query.Where();
          query.where(where.between({ id: [1, 2] }));
          await expect(
            query.fetch(),
            'to be fulfilled with sorted rows satisfying',
            [
              new User({ id: 1, name: 'User 1' }),
              new User({ id: 2, name: 'User 2' })
            ]
          );
        });

        it('rejects if the array is empty', async () => {
          const query = new Query(User);
          const where = new Query.Where();
          query.where(where.between({ id: [] }));
          await expect(
            query.fetch(),
            'to be rejected with error satisfying',
            new QueryError(
              'User: empty array passed for "between" for field `id`'
            )
          );
        });
      });

      describe('with an `or` grouping', () => {
        it('supports a single expression', async () => {
          const query = new Query(User);
          const where = new Query.Where();
          query.where(where.or(where.equal('id', 1)));
          await expect(
            query.fetch(),
            'to be fulfilled with sorted rows satisfying',
            [new User({ id: 1, name: 'User 1' })]
          );
        });

        it('supports multiple expressions', async () => {
          const query = new Query(User);
          const where = new Query.Where();
          query.where(
            where.or(where.equal('id', 1), where.like('name', 'User'))
          );
          await expect(
            query.fetch(),
            'to be fulfilled with sorted rows satisfying',
            [new User({ id: 1, name: 'User 1' })]
          );
        });

        it('supports a single object', async () => {
          const query = new Query(User);
          const where = new Query.Where();
          query.where(where.or({ id: 1 }));
          await expect(
            query.fetch(),
            'to be fulfilled with sorted rows satisfying',
            [new User({ id: 1, name: 'User 1' })]
          );
        });

        it('supports objects and expressions', async () => {
          const query = new Query(User);
          const where = new Query.Where();
          query.where(where.or({ id: 1 }, where.like('name', 'User')));
          await expect(
            query.fetch(),
            'to be fulfilled with sorted rows satisfying',
            [new User({ id: 1, name: 'User 1' })]
          );
        });
      });

      describe('with an `and` grouping', () => {
        it('supports a single expression', async () => {
          const query = new Query(User);
          const where = new Query.Where();
          query.where(where.and(where.equal('id', 1)));
          await expect(
            query.fetch(),
            'to be fulfilled with sorted rows satisfying',
            [new User({ id: 1, name: 'User 1' })]
          );
        });

        it('supports multiple expressions', async () => {
          const query = new Query(User);
          const where = new Query.Where();
          query.where(
            where.and(where.equal('id', 1), where.like('name', 'User%'))
          );
          await expect(
            query.fetch(),
            'to be fulfilled with sorted rows satisfying',
            [new User({ id: 1, name: 'User 1' })]
          );
        });

        it('supports a single object', async () => {
          const query = new Query(User);
          const where = new Query.Where();
          query.where(where.and({ id: 1 }));
          await expect(
            query.fetch(),
            'to be fulfilled with sorted rows satisfying',
            [new User({ id: 1, name: 'User 1' })]
          );
        });

        it('supports objects and expressions', async () => {
          const query = new Query(User);
          const where = new Query.Where();
          query.where(where.and({ id: 1 }, where.like('name', 'User%')));
          await expect(
            query.fetch(),
            'to be fulfilled with sorted rows satisfying',
            [new User({ id: 1, name: 'User 1' })]
          );
        });
      });

      describe('with `not` expressions', () => {
        it('supports a single expression', async () => {
          const query = new Query(User);
          const where = new Query.Where();
          query.where(where.not(where.equal('id', 1)));
          await expect(
            query.fetch(),
            'to be fulfilled with sorted rows satisfying',
            [new User({ id: 2, name: 'User 2' })]
          );
        });

        it('supports multiple expressions', async () => {
          const query = new Query(User);
          const where = new Query.Where();
          query.where(
            where.not(where.equal('id', 1)),
            where.not(where.like('name', 'User%'))
          );
          await expect(
            query.fetch(),
            'to be fulfilled with sorted rows satisfying',
            []
          );
        });

        it('supports a single object', async () => {
          const query = new Query(User);
          const where = new Query.Where();
          query.where(where.not({ id: 1 }));
          await expect(
            query.fetch(),
            'to be fulfilled with sorted rows satisfying',
            [new User({ id: 2, name: 'User 2' })]
          );
        });

        it('supports objects and expressions', async () => {
          const query = new Query(User);
          const where = new Query.Where();
          query.where(
            where.not({ id: 1 }),
            where.not(where.like('name', 'User%'))
          );
          await expect(
            query.fetch(),
            'to be fulfilled with sorted rows satisfying',
            []
          );
        });
      });

      describe('with raw `sql` clauses', () => {
        it('supports raw sql as where-clause values', async () => {
          const query = new Query(User);
          query.where({ name: query.sql(`trim('  User 1  ')`) });
          await expect(
            query.fetch(),
            'to be fulfilled with sorted rows satisfying',
            [new User({ id: 1, name: 'User 1' })]
          );
        });

        it('supports parameterized raw sql as where-clause values', async () => {
          const query = new Query(User);
          query.where({ name: query.sql(`trim($1)`, '  User 1  ') });
          await expect(
            query.fetch(),
            'to be fulfilled with sorted rows satisfying',
            [new User({ id: 1, name: 'User 1' })]
          );
        });

        it('supports a single expression', async () => {
          const query = new Query(User);
          const where = new Query.Where();
          query.where(where.sql(`id <> $1`, 1));
          await expect(
            query.fetch(),
            'to be fulfilled with sorted rows satisfying',
            [new User({ id: 2, name: 'User 2' })]
          );
        });

        it('supports a `not` wrapper for a single expression', async () => {
          const query = new Query(User);
          const where = new Query.Where();
          query.where(where.not(where.sql(`id = $1`, 1)));
          await expect(
            query.fetch(),
            'to be fulfilled with sorted rows satisfying',
            [new User({ id: 2, name: 'User 2' })]
          );
        });

        it('supports multiple `not` wrappers', async () => {
          const query = new Query(User);
          const where = new Query.Where();
          query.where(
            where.not(where.sql(`id = $1`, 1)),
            where.not(where.sql(`name like $1`, 'User%'))
          );
          await expect(
            query.fetch(),
            'to be fulfilled with sorted rows satisfying',
            []
          );
        });

        it('supports an `and` wrapper', async () => {
          const query = new Query(User);
          const where = new Query.Where();
          query.where(
            where.and(
              where.sql(`id = $1`, 1),
              where.sql(`name like $1`, 'User%')
            )
          );
          await expect(
            query.fetch(),
            'to be fulfilled with sorted rows satisfying',
            [new User({ id: 1, name: 'User 1' })]
          );
        });

        it('supports an `or` wrapper', async () => {
          const query = new Query(User);
          const where = new Query.Where();
          query.where(
            where.or(
              where.sql(`id = $1`, 1),
              where.sql(`name like $1`, 'User%')
            )
          );
          await expect(
            query.fetch(),
            'to be fulfilled with sorted rows satisfying',
            [
              new User({ id: 1, name: 'User 1' }),
              new User({ id: 2, name: 'User 2' })
            ]
          );
        });
      });
    });

    describe("with 'where' and 'having' configured", () => {
      it('fulfils the query', async () => {
        const query = new Query(User)
          .fields({ maxAge: 'MAX(age)' })
          .groupBy('id')
          .where({ id: 2 });
        await expect(
          query.fetch(),
          'to be fulfilled with sorted rows exhaustively satisfying',
          [new User({ maxAge: 10 })]
        );
      });
    });

    describe("with 'having' configured", () => {
      it('supports SQL functions', async () => {
        const query = new Query(User)
          .fields({ maxAge: 'MAX(age)' })
          .groupBy('id')
          .having({ 'MAX(age)': 10 });
        await expect(
          query.fetch(),
          'to be fulfilled with sorted rows exhaustively satisfying',
          [new User({ maxAge: 10 }), new User({ maxAge: 10 })]
        );
      });

      it('supports SQL functions with where expressions', async () => {
        const query = new Query(User)
          .fields({ maxAge: 'MAX(age)' })
          .groupBy('id')
          .having(Query.where.greaterThan({ 'MAX(age)': 5 }));
        await expect(
          query.fetch(),
          'to be fulfilled with sorted rows exhaustively satisfying',
          [new User({ maxAge: 10 }), new User({ maxAge: 10 })]
        );
      });
    });

    describe("with 'groupBy' configured", () => {
      it('supports a single field', async () => {
        const query = new Query(User);
        const where = new Query.Where();
        query.groupBy('id').having(where.equal('age', 10));
        await expect(
          query.fetch(),
          'to be fulfilled with sorted rows exhaustively satisfying',
          [
            new User({ id: 1, name: 'User 1', age: 10 }),
            new User({ id: 2, name: 'User 2', age: 10 })
          ]
        );
      });

      it('supports multiple fields', async () => {
        const query = new Query(User);
        const where = new Query.Where();
        query.groupBy(['id', 'age']).having(where.equal('age', 10));
        await expect(
          query.fetch(),
          'to be fulfilled with sorted rows exhaustively satisfying',
          [
            new User({ id: 1, name: 'User 1', age: 10 }),
            new User({ id: 2, name: 'User 2', age: 10 })
          ]
        );
      });
    });

    describe("with 'orderBy' configured", () => {
      it("supports { field: 'asc' }", async () => {
        const query = new Query(User).orderBy({ id: 'asc' });
        await expect(query.fetch(), 'to be fulfilled with value satisfying', [
          new User({ id: 1, name: 'User 1' }),
          new User({ id: 2, name: 'User 2' })
        ]);
      });

      it("supports { field: 'desc' }", async () => {
        const query = new Query(User).orderBy({ id: 'desc' });
        await expect(query.fetch(), 'to be fulfilled with value satisfying', [
          new User({ id: 2, name: 'User 2' }),
          new User({ id: 1, name: 'User 1' })
        ]);
      });

      it('supports { field: 1 }', async () => {
        const query = new Query(User).orderBy({ id: 1 });
        await expect(query.fetch(), 'to be fulfilled with value satisfying', [
          new User({ id: 1, name: 'User 1' }),
          new User({ id: 2, name: 'User 2' })
        ]);
      });

      it('supports { field: -1 }', async () => {
        const query = new Query(User).orderBy({ id: -1 });
        await expect(query.fetch(), 'to be fulfilled with value satisfying', [
          new User({ id: 2, name: 'User 2' }),
          new User({ id: 1, name: 'User 1' })
        ]);
      });

      it("defaults to 'asc' for { field: 'unknown stuff' }", async () => {
        const query = new Query(User).orderBy({ id: 'foo' });
        await expect(query.fetch(), 'to be fulfilled with value satisfying', [
          new User({ id: 1, name: 'User 1' }),
          new User({ id: 2, name: 'User 2' })
        ]);
      });

      it('supports a single field', async () => {
        const query = new Query(User).orderBy('id');
        await expect(query.fetch(), 'to be fulfilled with value satisfying', [
          new User({ id: 1, name: 'User 1' }),
          new User({ id: 2, name: 'User 2' })
        ]);
      });

      it('supports multiple fields', async () => {
        const query = new Query(User).orderBy(['id', 'name']);
        await expect(query.fetch(), 'to be fulfilled with value satisfying', [
          new User({ id: 1, name: 'User 1' }),
          new User({ id: 2, name: 'User 2' })
        ]);
      });

      it('supports multiple objects', async () => {
        const query = new Query(User).orderBy({ id: 1 }, { name: 'desc' });
        await expect(query.fetch(), 'to be fulfilled with value satisfying', [
          new User({ id: 1, name: 'User 1' }),
          new User({ id: 2, name: 'User 2' })
        ]);
      });
    });

    describe('with `forUpdate` configured', () => {
      it('supports `forUpdate`', async () => {
        const spy = sinon.spy(Query.prototype, 'query');
        const query = new Query(User).forUpdate();
        await expect(query.fetch(), 'to be fulfilled with value satisfying', [
          new User({ id: 1, name: 'User 1' }),
          new User({ id: 2, name: 'User 2' })
        ]);
        await expect(spy, 'to have calls satisfying', () => {
          spy(
            expect.it(
              'when passed as parameter to',
              sql => sql.toString(),
              'to contain',
              'FOR UPDATE'
            )
          );
        });
        spy.restore();
      });

      it('supports `of`', async () => {
        const spy = sinon.spy(Query.prototype, 'query');
        const query = new Query(User).forUpdate().of('user');
        await expect(query.fetch(), 'to be fulfilled with value satisfying', [
          new User({ id: 1, name: 'User 1' }),
          new User({ id: 2, name: 'User 2' })
        ]);
        await expect(spy, 'to have calls satisfying', () => {
          spy(
            expect.it(
              'when passed as parameter to',
              sql => sql.toString(),
              'to contain',
              'OF "user"'
            )
          );
        });
        spy.restore();
      });

      it('supports `of` with an array', async () => {
        const spy = sinon.spy(Query.prototype, 'query');
        const query = new Query(User).forUpdate().of(['user', 'user']);
        await expect(query.fetch(), 'to be fulfilled with value satisfying', [
          new User({ id: 1, name: 'User 1' }),
          new User({ id: 2, name: 'User 2' })
        ]);
        await expect(spy, 'to have calls satisfying', () => {
          spy(
            expect.it(
              'when passed as parameter to',
              sql => sql.toString(),
              'to contain',
              'OF "user", "user"'
            )
          );
        });
        spy.restore();
      });

      it('supports multiple `of` invocations', async () => {
        const spy = sinon.spy(Query.prototype, 'query');
        const query = new Query(User)
          .forUpdate()
          .of('user')
          .of(['user']);
        await expect(query.fetch(), 'to be fulfilled with value satisfying', [
          new User({ id: 1, name: 'User 1' }),
          new User({ id: 2, name: 'User 2' })
        ]);
        await expect(spy, 'to have calls satisfying', () => {
          spy(
            expect.it(
              'when passed as parameter to',
              sql => sql.toString(),
              'to contain',
              'OF "user", "user"'
            )
          );
        });
        spy.restore();
      });

      it('supports `noWait`', async () => {
        const spy = sinon.spy(Query.prototype, 'query');
        const query = new Query(User).forUpdate().noWait();
        await expect(query.fetch(), 'to be fulfilled with value satisfying', [
          new User({ id: 1, name: 'User 1' }),
          new User({ id: 2, name: 'User 2' })
        ]);
        await expect(spy, 'to have calls satisfying', () => {
          spy(
            expect.it(
              'when passed as parameter to',
              sql => sql.toString(),
              'to contain',
              'NOWAIT'
            )
          );
        });
        spy.restore();
      });

      it('supports `of` with `noWait`', async () => {
        const spy = sinon.spy(Query.prototype, 'query');
        const query = new Query(User)
          .forUpdate()
          .of('user')
          .noWait();
        await expect(query.fetch(), 'to be fulfilled with value satisfying', [
          new User({ id: 1, name: 'User 1' }),
          new User({ id: 2, name: 'User 2' })
        ]);
        await expect(spy, 'to have calls satisfying', () => {
          spy(
            expect.it(
              'when passed as parameter to',
              sql => sql.toString(),
              'to contain',
              'OF "user" NOWAIT'
            )
          );
        });
        spy.restore();
      });
    });

    describe('with `debug` configured', () => {
      it('improves the FetchError stack trace', async () => {
        const stub = sinon
          .stub(Query.prototype, 'query')
          .returns(Promise.reject(new Error('fetch error')));
        await expect(
          new Query(User).fetch(),
          'to be rejected with error satisfying',
          e => expect(e.stack, 'not to contain', 'test/Query.spec.js')
        );
        await expect(
          new Query(User).debug(true).fetch(),
          'to be rejected with error satisfying',
          e => expect(e.stack, 'to contain', 'test/Query.spec.js')
        );
        stub.restore();
      });

      it('improves the InsertError stack trace', async () => {
        const stub = sinon
          .stub(Query.prototype, 'query')
          .returns(Promise.reject(new Error('insert error')));
        await expect(
          new Query(User).insert({ name: 'foo' }),
          'to be rejected with error satisfying',
          e => expect(e.stack, 'not to contain', 'test/Query.spec.js')
        );
        await expect(
          new Query(User).debug(true).insert({ name: 'foo' }),
          'to be rejected with error satisfying',
          e => expect(e.stack, 'to contain', 'test/Query.spec.js')
        );
        stub.restore();
      });

      it('improves the UpdateError stack trace', async () => {
        const stub = sinon
          .stub(Query.prototype, 'query')
          .returns(Promise.reject(new Error('update error')));
        await expect(
          new Query(User).update({ name: 'foo' }),
          'to be rejected with error satisfying',
          e => expect(e.stack, 'not to contain', 'test/Query.spec.js')
        );
        await expect(
          new Query(User).debug(true).update({ name: 'foo' }),
          'to be rejected with error satisfying',
          e => expect(e.stack, 'to contain', 'test/Query.spec.js')
        );
        stub.restore();
      });

      it('improves the DeleteError stack trace', async () => {
        const stub = sinon
          .stub(Query.prototype, 'query')
          .returns(Promise.reject(new Error('delete error')));
        await expect(
          new Query(User).delete(),
          'to be rejected with error satisfying',
          e => expect(e.stack, 'not to contain', 'test/Query.spec.js')
        );
        await expect(
          new Query(User).debug(true).delete(),
          'to be rejected with error satisfying',
          e => expect(e.stack, 'to contain', 'test/Query.spec.js')
        );
        stub.restore();
      });
    });
  });

  describe('Query.prototype.insert', () => {
    afterEach(async () => {
      await truncateUserTable();
    });

    it('inserts a row to the database table from a model instance', async () => {
      const query = new Query(User);
      const user = new User({ id: 1, name: 'John Doe', confirmed: true });
      await expect(query.insert(user), 'to be fulfilled');
      await expect(knex, 'with table', User.table, 'to have rows satisfying', [
        { id: 1, name: 'John Doe', confirmed: true }
      ]);
    });

    it('inserts a row to the database table from a plain object', async () => {
      const query = new Query(User);
      const user = { id: 1, name: 'John Doe', confirmed: true };
      await expect(query.insert(user), 'to be fulfilled');
      await expect(knex, 'with table', User.table, 'to have rows satisfying', [
        { id: 1, name: 'John Doe', confirmed: true }
      ]);
    });

    it('populates fields with default values before insert', async () => {
      const query = new Query(User);
      const user = new User({ id: 1, name: 'John Doe' });
      await expect(query.insert(user), 'to be fulfilled');
      await expect(knex, 'with table', User.table, 'to have rows satisfying', [
        { id: 1, name: 'John Doe', confirmed: false, age: null }
      ]);
    });

    it('casts fields configured with pre-save cast functions before insert', async () => {
      const query = new Query(User);
      const user = new User({
        id: 1,
        name: 'John Doe',
        jsonField: ['foo', 'bar']
      });
      await expect(query.insert(user), 'to be fulfilled');
      await expect(knex, 'with table', User.table, 'to have rows satisfying', [
        { id: 1, name: 'John Doe', json_field: ['foo', 'bar'] }
      ]);
    });

    it("validates the instance's fields before saving", async () => {
      const query = new Query(User);
      const user = new User({ id: 1, name: 1 });
      await expect(query.insert(user), 'to be rejected with error satisfying', {
        name: 'ValidationError',
        type: 'TypeError'
      });
    });

    it("validates the object's fields before saving", async () => {
      const query = new Query(User);
      await expect(
        query.insert({ id: 1, name: 1 }),
        'to be rejected with error satisfying',
        { name: 'ValidationError', type: 'TypeError' }
      );
    });

    it('allows inserting instances without the id field set', async () => {
      const query = new Query(User);
      const user = new User({ name: 'John Doe' });
      await expect(query.insert(user), 'to be fulfilled');
      await expect(knex, 'with table', User.table, 'to have rows satisfying', [
        { id: 1, name: 'John Doe' }
      ]);
    });

    it('allows saving objects without the id field set', async () => {
      const query = new Query(User);
      await expect(query.insert({ name: 'John Doe' }), 'to be fulfilled');
      await expect(knex, 'with table', User.table, 'to have rows satisfying', [
        { id: 1, name: 'John Doe' }
      ]);
    });

    it('resolves with an array containing an instance of the model', async () => {
      const query = new Query(User);
      await expect(
        query.insert(new User({ name: 'John Doe' })),
        'to be fulfilled with value exhaustively satisfying',
        [expect.it('to be a', User)]
      );
    });

    it('populates the instance with all the fields from the database', async () => {
      const query = new Query(User);
      await expect(
        query.insert(new User({ name: 'John Doe' })),
        'to be fulfilled with value exhaustively satisfying',
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

    it('casts fields configured with post-fetch cast functions after inserting', async () => {
      const query = new Query(User);
      const user = new User({ id: 1, name: 'John Doe', intToString: 10 });
      await expect(
        query.insert(user),
        'to be fulfilled with value satisfying',
        [new User({ intToString: '10' })]
      );
      await expect(knex, 'with table', User.table, 'to have rows satisfying', [
        { id: 1, name: 'John Doe', int_to_string: 10 }
      ]);
    });

    it('casts only fields returned in the inserted data', async () => {
      const spy = sinon.spy(User.prototype, 'cast');
      const query = new Query(User).returning(['name']);
      const user = new User({ id: 1, name: 'John Doe', intToString: 10 });
      await expect(
        query.insert(user),
        'to be fulfilled with sorted rows exhaustively satisfying',
        [new User({ name: 'John Doe' })]
      );
      await expect(spy, 'to have calls satisfying', () => {
        spy({ fields: expect.it('to be an array'), forSave: true }); // for the insert
        spy({ fields: ['name'], forFetch: true });
      });
      spy.restore();
    });

    it('accepts options', async () => {
      const query = new Query(User);
      await expect(
        query.insert(new User({ name: 'John Doe' }), { returning: 'name' }),
        'to be fulfilled with value exhaustively satisfying',
        [new User({ name: 'John Doe' })]
      );
    });

    it('ignores `where` and other "non-insert" options', async () => {
      const query = new Query(User);
      await expect(
        query.insert(new User({ name: 'John Doe' }), { where: { foo: 'bar' } }),
        'to be fulfilled with value satisfying',
        [new User({ id: 1, name: 'John Doe' })]
      );
    });

    it('quotes column names', async () => {
      const spy = sinon.spy(Query.prototype, 'query');
      await new Query(User).insert(new User({ name: 'John Doe' }));
      await expect(spy, 'to have calls satisfying', () => {
        spy(
          expect.it(
            'when passed as parameter to',
            query => query.toString(),
            expect.it('to contain', '"name"')
          )
        );
      });
      spy.restore();
    });

    it('allows inserting raw sql values', async () => {
      const query = new Query(User);
      await expect(
        query.insert(new User({ name: query.sql(`lower('John Doe')`) })),
        'to be fulfilled with value satisfying',
        [new User({ name: 'john doe' })]
      );
    });

    it('works with a model `schema` configured', async () => {
      const spy = sinon.spy(Query.prototype, 'query');
      class OtherUser extends User {}
      OtherUser.schema = 'public';
      const query = new Query(OtherUser);
      await expect(
        query.insert(new OtherUser({ name: 'John Doe' })),
        'to be fulfilled with value satisfying',
        [new OtherUser({ name: 'John Doe' })]
      );
      await expect(spy, 'to have calls satisfying', () => {
        spy(
          expect.it(
            'when passed as parameter to',
            sql => sql.toString(),
            'to contain',
            '"public"."user"'
          )
        );
      });
      spy.restore();
    });

    describe('if an insert error occurs', () => {
      let queryStub;

      beforeEach(() => {
        queryStub = sinon
          .stub(Query.prototype, 'query')
          .returns(Promise.reject(new Error('insert error')));
      });

      afterEach(() => {
        queryStub.restore();
      });

      it('rejects with a InsertError', async () => {
        const query = new Query(User);
        await expect(
          query.insert(new User({ name: 'John Doe' })),
          'to be rejected with error satisfying',
          new Query.InsertError({ error: new Error('insert error'), query })
        );
      });

      it('attaches a parameterized sql string to the error', async () => {
        const query = new Query(User).returning('id');
        await expect(
          query.insert(new User({ name: 'John Doe' })),
          'to be rejected with error satisfying',
          {
            sql:
              'INSERT INTO "user" ("name", "age", "confirmed") VALUES ($1, $2, $3) RETURNING "user"."id" as "user.id"'
          }
        );
      });

      it('attaches a full sql string with values in `debug` mode', async () => {
        const query = new Query(User).returning('id').debug(true);
        await expect(
          query.insert(new User({ name: 'John Doe' })),
          'to be rejected with error satisfying',
          {
            sql: `INSERT INTO "user" ("name", "age", "confirmed") VALUES ('John Doe', null, FALSE) RETURNING "user"."id" as "user.id"`
          }
        );
      });
    });

    describe('when data is empty', () => {
      it('does not send a db query', async () => {
        const spy = sinon.stub(Query.prototype, 'query');
        const query = new Query(User);
        await expect(
          query.insert([]),
          'to be fulfilled with value satisfying',
          []
        );
        await expect(
          query.insert({}),
          'to be fulfilled with value satisfying',
          []
        );
        await expect(spy, 'was not called');
        spy.restore();
      });

      it('resolves with `null` if `first` is configured', async () => {
        const query = new Query(User).first();
        await expect(
          query.insert([]),
          'to be fulfilled with value satisfying',
          null
        );
      });

      it('rejects with a NoRowsInsertedError if `require` is configured', async () => {
        const query = new Query(User).require();
        await expect(
          query.insert({}),
          'to be rejected with error satisfying',
          new Query.NoRowsInsertedError({ query })
        );
      });
    });

    describe('with a `returning` option', () => {
      it('returns only the fields requested', async () => {
        const query = new Query(User).returning('name');
        await expect(
          query.insert(new User({ name: 'John Doe' })),
          'to be fulfilled with value exhaustively satisfying',
          [new User({ name: 'John Doe' })]
        );
      });

      it('accepts an array of fields', async () => {
        const query = new Query(User).returning(['name', 'confirmed']);
        await expect(
          query.insert(new User({ name: 'John Doe' })),
          'to be fulfilled with value satisfying',
          [new User({ name: 'John Doe', confirmed: false })]
        );
      });

      it('supports multiple calls with an array', async () => {
        const query = new Query(User).returning('name').returning('confirmed');
        await expect(
          query.insert(new User({ name: 'John Doe' })),
          'to be fulfilled with value satisfying',
          [new User({ name: 'John Doe', confirmed: false })]
        );
      });

      it('allows using aliases for the fields returned from the database', async () => {
        const query = new Query(User).returning({
          theName: 'name',
          theConfirmed: 'confirmed'
        });
        await expect(
          query.insert(new User({ name: 'John Doe' })),
          'to be fulfilled with value satisfying',
          [new User({ theName: 'John Doe', theConfirmed: false })]
        );
      });
    });

    describe('with `fields` configured', () => {
      it('returns only the fields requested (synonymous with `returning`)', async () => {
        const query = new Query(User).fields('name');
        await expect(
          query.insert(new User({ name: 'John Doe' })),
          'to be fulfilled with value exhaustively satisfying',
          [new User({ name: 'John Doe' })]
        );
      });
    });

    describe("with 'first' configured", () => {
      it('returns the first inserted instance', async () => {
        const query = new Query(User).first(true);
        await expect(
          query.insert(new User({ id: 1, name: 'John Doe' })),
          'to be fulfilled with value satisfying',
          new User({ id: 1, name: 'John Doe' })
        );
      });
    });

    describe("with 'forge' disabled", () => {
      it('resolves with plain JS objects', async () => {
        const query = new Query(User).forge(false);
        await expect(
          query.insert(new User({ id: 1, name: 'John Doe' })),
          'to be fulfilled with value satisfying',
          [expect.it('to be an object').and('not to be a', User)]
        );
      });

      it('does not cast fields with post-fetch cast functions', async () => {
        const query = new Query(User).forge(false);
        await expect(
          query.insert(new User({ id: 1, name: 'John Doe', intToString: 10 })),
          'to be fulfilled with sorted rows satisfying',
          [{ id: 1, name: 'John Doe', intToString: 10 }]
        );
      });
    });

    describe('if no row is inserted', () => {
      let insertStub;

      before(() => {
        insertStub = sinon.stub(Query.prototype, 'query');
      });

      beforeEach(() => {
        insertStub.resetHistory();
        insertStub.returns(Promise.resolve([]));
      });

      after(() => {
        insertStub.restore();
      });

      it('resolves with an empty array', async () => {
        const query = new Query(User);
        await expect(
          query.insert(new User({ name: 'John Doe' })),
          'to be fulfilled with value satisfying',
          []
        );
      });

      it('resolves with `null` if the `first` option is configured', async () => {
        const query = new Query(User).first(true);
        await expect(
          query.insert(new User({ name: 'John Doe' })),
          'to be fulfilled with value satisfying',
          null
        );
      });

      describe("with 'require' option configured", () => {
        it('rejects with a NoRowsInsertedError', async () => {
          const query = new Query(User).require();
          await expect(
            query.insert(new User({ name: 'John Doe' })),
            'to be rejected with error satisfying',
            new Query.NoRowsInsertedError({ query })
          );
        });
      });
    });

    describe('when passed an array', () => {
      it('inserts rows to the database table from model instances', async () => {
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

      it('inserts rows to the database table from plain objects', async () => {
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

      it('populates fields with default values before insert', async () => {
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

      it('throws an error if instances have mismatching field counts', async () => {
        const query = new Query(User);
        await expect(
          query.insert([
            new User({ id: 1, name: 'John Doe' }),
            new User({ id: 2, name: 'Jane Doe', jsonField: ['foo', 'bar'] })
          ]),
          'to be rejected with error satisfying',
          new QueryError(
            'User: all objects for insert should have the same number of fields'
          )
        );
      });

      it('casts fields configured with pre-save cast functions before validating them', async () => {
        const query = new Query(User);
        await expect(
          query.insert([
            new User({ id: 1, name: 'John Doe', jsonField: null }),
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
            { id: 1, name: 'John Doe', json_field: null },
            { id: 2, name: 'Jane Doe', json_field: ['foo', 'bar'] }
          ]
        );
      });

      it("validates the instances' fields before saving", async () => {
        const query = new Query(User);
        await expect(
          query.insert([
            new User({ id: 1, name: 'John Doe' }),
            new User({ id: 1, name: 'Jane Doe', confirmed: 'false' })
          ]),
          'to be rejected with error satisfying',
          { name: 'ValidationError', type: 'TypeError', message: /confirmed/ }
        );
      });

      it("validates the objects' fields before saving", async () => {
        const query = new Query(User);
        await expect(
          query.insert([
            { id: 1, name: 'John Doe' },
            { id: 1, name: 'Jane Doe', confirmed: 'false' }
          ]),
          'to be rejected with error satisfying',
          { name: 'ValidationError', type: 'TypeError', message: /confirmed/ }
        );
      });

      it('allows inserting instances without the id field set', async () => {
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

      it('allows saving objects without the id field set', async () => {
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

      it('resolves with instances of the model', async () => {
        const query = new Query(User);
        await expect(
          query.insert([
            new User({ name: 'John Doe' }),
            new User({ name: 'Jane Doe' })
          ]),
          'to be fulfilled with value satisfying',
          [expect.it('to be a', User), expect.it('to be a', User)]
        );
      });

      it('populates the instances with all the fields from the database', async () => {
        const query = new Query(User);
        await expect(
          query.insert([
            new User({ name: 'John Doe' }),
            new User({ name: 'Jane Doe' })
          ]),
          'to be fulfilled with sorted rows exhaustively satisfying',
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

      it('casts fields configured with post-fetch cast functions', async () => {
        const query = new Query(User);
        await expect(
          query.insert([
            new User({ id: 1, name: 'John Doe', intToString: 10 }),
            new User({ id: 2, name: 'Jane Doe', intToString: null })
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
            { id: 2, name: 'Jane Doe', int_to_string: null }
          ]
        );
      });

      it('runs a single insert query', async () => {
        const spy = sinon.spy(Query.prototype, 'insert');
        const query = new Query(User);
        await query.insert([
          new User({ name: 'John Doe' }),
          new User({ name: 'Jane Doe' })
        ]);
        await expect(spy, 'was called once');
        spy.restore();
      });

      describe('if no rows are inserted', () => {
        let insertStub;

        before(() => {
          insertStub = sinon.stub(Query.prototype, 'query');
        });

        beforeEach(() => {
          insertStub.resetHistory();
          insertStub.returns(Promise.resolve([]));
        });

        after(() => {
          insertStub.restore();
        });

        it('resolves with am empty array', async () => {
          const query = new Query(User);
          await expect(
            query.insert([new User({ name: 'John Doe' })]),
            'to be fulfilled with value satisfying',
            []
          );
        });

        describe("with 'require' option configured", () => {
          it('rejects with a NoRowsInsertedError', async () => {
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
        it('does multiple insert operations with batched arrays of data', async () => {
          const spy = sinon.spy(Query.prototype, 'query');
          const query = new Query(User);
          await query
            .batchSize(1)
            .insert([
              new User({ name: 'John Doe' }),
              new User({ name: 'Jane Doe' })
            ]);
          await expect(spy, 'was called twice');
          spy.restore();
        });

        it('creates the right batches', async () => {
          const spy = sinon.spy(Query.prototype, 'query');
          const users = [
            { name: 'John Doe' },
            { name: 'Jane Doe' },
            { name: 'John Smith' },
            { name: 'Jane Smith' }
          ];

          await new Query(User).batchSize(1).insert(users);
          await expect(spy, 'was called times', 4);

          spy.resetHistory();
          await new Query(User).batchSize(2).insert(users);
          await expect(spy, 'was called twice');

          spy.resetHistory();
          await new Query(User).batchSize(3).insert(users);
          await expect(spy, 'was called twice');

          spy.resetHistory();
          await new Query(User).batchSize(4).insert(users);
          await expect(spy, 'was called once');

          spy.resetHistory();
          await new Query(User).batchSize(5).insert(users);
          await expect(spy, 'was called once');

          spy.resetHistory();
          await new Query(User).batchSize(0).insert(users);
          await expect(spy, 'was called once');

          spy.restore();
        });

        it('returns a single array of inserted data', async () => {
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
      });
    });
  });

  describe('Query.prototype.update', () => {
    let user;

    beforeEach(async () => {
      user = await new Query(User)
        .first(true)
        .insert(new User({ id: 1, name: 'John Doe' }));
    });

    afterEach(async () => {
      await truncateUserTable();
    });

    it('updates rows in the database table from a model instance', async () => {
      const query = new Query(User);
      user.name = 'Jane Doe';
      await expect(query.update(user), 'to be fulfilled');
      await expect(knex, 'with table', User.table, 'to have rows satisfying', [
        { id: 1, name: 'Jane Doe' }
      ]);
    });

    it('updates rows in the database table from a plain object', async () => {
      const query = new Query(User);
      const user = { id: 1, name: 'Jane Doe' };
      await expect(query.update(user), 'to be fulfilled');
      await expect(knex, 'with table', User.table, 'to have rows satisfying', [
        { id: 1, name: 'Jane Doe' }
      ]);
    });

    it("validates the instance's fields before saving", async () => {
      const query = new Query(User);
      user.name = 1;
      await expect(query.update(user), 'to be rejected with error satisfying', {
        name: 'ValidationError',
        type: 'TypeError'
      });
    });

    it('casts updated fields configured with pre-save cast functions before update', async () => {
      const query = new Query(User);
      user.jsonField = ['foo', 'bar'];
      await expect(query.update(user), 'to be fulfilled');
      await expect(knex, 'with table', User.table, 'to have rows satisfying', [
        { id: 1, name: 'John Doe', json_field: ['foo', 'bar'] }
      ]);
    });

    it('casts only fields returned in the updated data for post-fetch casts', async () => {
      const spy = sinon.spy(User.prototype, 'cast');
      const query = new Query(User).returning(['name']);
      user.jsonField = ['foo', 'bar'];
      await expect(
        query.update(user),
        'to be fulfilled with sorted rows exhaustively satisfying',
        [new User({ name: 'John Doe' })]
      );
      await expect(spy, 'to have calls satisfying', () => {
        spy({ fields: expect.it('to be an array'), forSave: true }); // for the update
        spy({ fields: ['name'], forFetch: true });
      });
      spy.restore();
    });

    it('accepts options', async () => {
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

    it('quotes column names', async () => {
      const spy = sinon.spy(Query.prototype, 'query');
      user.name = 'Jane Doe';
      await new Query(User).update(user);
      await expect(spy, 'to have calls satisfying', () => {
        spy(
          expect.it(
            'when passed as parameter to',
            query => query.toString(),
            expect.it('to contain', '"name" =')
          )
        );
      });
      spy.restore();
    });

    it('allows updating with raw sql values', async () => {
      const query = new Query(User);
      user.name = query.sql(`lower('Jane Doe')`);
      await expect(
        query.update(user),
        'to be fulfilled with sorted rows exhaustively satisfying',
        [new User({ name: 'jane doe' })]
      );
    });

    it('allows updating with raw sql values with columns', async () => {
      const query = new Query(User);
      user.name = query.sql(`name || name`);
      await expect(
        query.update(user),
        'to be fulfilled with sorted rows exhaustively satisfying',
        [new User({ name: 'John DoeJohn Doe' })]
      );
    });

    it('allows updating with raw sql values with quoted columns', async () => {
      const query = new Query(User);
      user.name = query.sql(`"name" || ' ' || upper("name")`);
      await expect(
        query.update(user),
        'to be fulfilled with sorted rows exhaustively satisfying',
        [new User({ name: 'John Doe JOHN DOE' })]
      );
    });

    it('works with a model `schema` configured', async () => {
      const spy = sinon.spy(Query.prototype, 'query');
      class OtherUser extends User {}
      OtherUser.schema = 'public';
      const query = new Query(OtherUser);
      const otherUser = new OtherUser(user);
      otherUser.name = 'Jane Doe';
      await expect(
        query.update(otherUser),
        'to be fulfilled with value satisfying',
        [new OtherUser({ name: 'Jane Doe' })]
      );
      await expect(spy, 'to have calls satisfying', () => {
        spy(
          expect.it(
            'when passed as parameter to',
            sql => sql.toString(),
            'to contain',
            '"public"."user"'
          )
        );
      });
      spy.restore();
    });

    describe('when data is empty', () => {
      it('does not send a db query', async () => {
        const spy = sinon.stub(Query.prototype, 'query');
        const query = new Query(User);
        await expect(
          query.update([]),
          'to be fulfilled with value satisfying',
          []
        );
        await expect(
          query.update({}),
          'to be fulfilled with value satisfying',
          []
        );
        await expect(spy, 'was not called');
        spy.restore();
      });

      it('resolves with `null` if `first` is configured', async () => {
        user.name = 'Jane Doe';
        const query = new Query(User).first();
        await expect(
          query.update({}),
          'to be fulfilled with value satisfying',
          null
        );
      });

      it('rejects with a NoRowsUpdatedError if `require` is configured', async () => {
        user.name = 'Jane Doe';
        const query = new Query(User).require();
        await expect(
          query.update({}),
          'to be rejected with error satisfying',
          new Query.NoRowsUpdatedError({ query })
        );
      });
    });

    describe('if an update error occurs', () => {
      let queryStub;

      beforeEach(() => {
        queryStub = sinon
          .stub(Query.prototype, 'query')
          .returns(Promise.reject(new Error('update error')));
      });

      afterEach(() => {
        queryStub.restore();
      });

      it('rejects with an UpdateError', async () => {
        const query = new Query(User);
        user.name = 'Jane Doe';
        await expect(
          query.update(user),
          'to be rejected with error satisfying',
          new Query.UpdateError({ error: new Error('update error'), query })
        );
      });

      it('attaches a parameterized sql string to the error', async () => {
        const query = new Query(User).returning('id');
        await expect(
          query.update({ name: 'Jane Doe' }),
          'to be rejected with error satisfying',
          {
            sql:
              'UPDATE "user" SET "name" = $1 RETURNING "user"."id" as "user.id"'
          }
        );
      });

      it('attaches a full sql string with values in `debug` mode', async () => {
        const query = new Query(User).returning('id').debug(true);
        await expect(
          query.update({ name: 'Jane Doe' }),
          'to be rejected with error satisfying',
          {
            sql: `UPDATE "user" SET "name" = 'Jane Doe' RETURNING "user"."id" as "user.id"`
          }
        );
      });
    });

    describe("with a 'where' option", () => {
      it('updates only the rows matching the query', async () => {
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

    describe("with 'first' configured", () => {
      it('returns the first updated instance', async () => {
        await new Query(User).insert(new User({ id: 2, name: 'Jane Doe' }));
        const query = new Query(User).first(true);
        await expect(
          query.update({ name: 'Foo' }),
          'to be fulfilled with value satisfying',
          new User({ id: 1, name: 'Foo' })
        );
      });
    });

    describe('with multiple rows in the table', () => {
      beforeEach(async () => {
        await new Query(User).insert(new User({ id: 2, name: 'Jane Doe' }));
      });

      it('updates all rows', async () => {
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

      it('resolves with instances of the model', async () => {
        const query = new Query(User);
        await expect(
          query.update({ name: 'Jane Doe' }),
          'to be fulfilled with value satisfying',
          [expect.it('to be a', User), expect.it('to be a', User)]
        );
      });

      it('populates the instances with all the fields from the database', async () => {
        const query = new Query(User);
        await expect(
          query.update({ name: 'Johnie Doe' }),
          'to be fulfilled with value exhaustively satisfying',
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

      it('casts fields configured with post-fetch cast functions', async () => {
        const query = new Query(User);
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

      it('updates only the matching row if the primary field is set', async () => {
        await expect(
          new Query(User).update({ id: 1, name: 'foo' }),
          'to be fulfilled'
        );
        await expect(
          knex,
          'with table',
          User.table,
          'to have sorted rows satisfying',
          [{ id: 1, name: 'foo' }, { id: 2, name: 'Jane Doe' }]
        );
      });
    });

    describe('with a `returning` option', () => {
      it('returns only the requested fields', async () => {
        const query = new Query(User).returning('name');
        user.name = 'Jane Doe';
        await expect(
          query.update(user),
          'to be fulfilled with value exhaustively satisfying',
          [new User({ name: 'Jane Doe' })]
        );
      });

      it('accepts an array of fields', async () => {
        const query = new Query(User).returning(['name', 'confirmed']);
        user.name = 'Jane Doe';
        await expect(
          query.update(user),
          'to be fulfilled with value exhaustively satisfying',
          [new User({ name: 'Jane Doe', confirmed: false })]
        );
      });

      it('allows using aliases for the returned fields', async () => {
        const query = new Query(User).returning({
          theName: 'name',
          theConfirmed: 'confirmed'
        });
        user.name = 'Jane Doe';
        await expect(
          query.update(user),
          'to be fulfilled with value exhaustively satisfying',
          [new User({ theName: 'Jane Doe', theConfirmed: false })]
        );
      });
    });

    describe("with 'forge' disabled", () => {
      it('resolves with plain JS objects', async () => {
        const query = new Query(User).forge(false);
        await expect(
          query.update(new User({ name: 'Jane Doe' })),
          'to be fulfilled with value satisfying',
          [expect.it('to be an object').and('not to be a', User)]
        );
      });

      it('does not cast fields with post-fetch cast functions', async () => {
        const query = new Query(User).forge(false);
        await expect(
          query.update(new User({ name: 'Jane Doe', intToString: 10 })),
          'to be fulfilled with sorted rows satisfying',
          [{ id: 1, name: 'Jane Doe', intToString: 10 }]
        );
      });
    });

    describe('if no row is updated', () => {
      let updateStub;

      beforeEach(() => {
        updateStub = sinon
          .stub(Query.prototype, 'query')
          .returns(Promise.resolve([]));
      });

      afterEach(() => {
        updateStub.restore();
      });

      it('resolves with an empty array', async () => {
        user.name = 'Jane Doe';
        const query = new Query(User);
        await expect(
          query.update(user),
          'to be fulfilled with value satisfying',
          []
        );
      });

      it('resolves with `null` if the `first` option is configured', async () => {
        user.name = 'Jane Doe';
        const query = new Query(User).first(true);
        await expect(
          query.update(user),
          'to be fulfilled with value satisfying',
          null
        );
      });

      describe("with 'require' option configured", () => {
        it('rejects with a NoRowsUpdatedError', async () => {
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

    describe("with 'where' option configured", () => {
      it('updates only the rows that match the where definition', async () => {
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

    describe('with `Model.notUpdated` fields configured', () => {
      it('does not update those fields', async () => {
        const spy = sinon.spy(Query.prototype, 'prepareUpdateBatch');
        user.name = 'Jane Doe';
        await new Query(User).update(user);
        await expect(spy, 'to have calls satisfying', () => {
          spy([
            expect.it('to have key', '"name"').and('not to have key', '"id"')
          ]);
        });
        spy.restore();
      });
    });
  });

  describe('Query.prototype.save', () => {
    afterEach(async () => {
      await truncateUserTable();
    });

    it('proxies to Query.prototype.insert if passed an array', async () => {
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

    it('proxies options to Query.prototype.insert', async () => {
      const query = new Query(User);
      await expect(
        query.save([{ name: 'John Doe' }, { name: 'Jane Doe' }], {
          returning: 'id'
        }),
        'to be fulfilled with sorted rows exhaustively satisfying',
        [new User({ id: 1 }), new User({ id: 2 })]
      );
    });

    describe('when passed an object', () => {
      it('proxies to Query.prototype.insert if the primary field is not set on the data', async () => {
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

      it('proxies to Query.prototype.update if the primary field is set on the data', async () => {
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

      it('proxies options to Query.prototype.update', async () => {
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

  describe('Query.prototype.delete', () => {
    beforeEach(async () => {
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

    afterEach(async () => {
      await truncateUserTable();
    });

    it('deletes all rows from the database', async () => {
      await expect(new Query(User).delete(), 'to be fulfilled');
      await expect(knex, 'with table', User.table, 'to be empty');
    });

    it('resolves with populated instances of the deleted models', async () => {
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

    it('casts fields configured with post-fetch cast functions after deleting', async () => {
      const query = new Query(User).where({ id: 1 });
      await expect(query.delete(), 'to be fulfilled with value satisfying', [
        new User({ intToString: '10' })
      ]);
    });

    it('accepts options', async () => {
      const query = new Query(User);
      await expect(query.delete({ where: { id: 1 } }), 'to be fulfilled');
      await expect(knex, 'with table', User.table, 'to have rows satisfying', [
        { id: 2, name: 'Jane Doe' }
      ]);
    });

    it('works with a model `schema` configured', async () => {
      const spy = sinon.spy(Query.prototype, 'query');
      class OtherUser extends User {}
      OtherUser.schema = 'public';
      const query = new Query(OtherUser);
      await expect(
        query.delete(),
        'to be fulfilled with sorted rows satisfying',
        [
          new OtherUser({ id: 1, name: 'John Doe' }),
          new OtherUser({ id: 2, name: 'Jane Doe' })
        ]
      );
      await expect(spy, 'to have calls satisfying', () => {
        spy(
          expect.it(
            'when passed as parameter to',
            sql => sql.toString(),
            'to contain',
            '"public"."user"'
          )
        );
      });
      spy.restore();
    });

    describe('if a delete error occurs', () => {
      let queryStub;

      beforeEach(() => {
        queryStub = sinon
          .stub(Query.prototype, 'query')
          .returns(Promise.reject(new Error('delete error')));
      });

      afterEach(() => {
        queryStub.restore();
      });

      it('rejects with a DeleteError if the delete operation fails', async () => {
        const query = new Query(User);
        await expect(
          query.delete(),
          'to be rejected with error satisfying',
          new Query.DeleteError({ error: new Error('delete error'), query })
        );
      });

      it('attaches a parameterized sql string to the error', async () => {
        const query = new Query(User).returning('id').where({ id: 1 });
        await expect(query.delete(), 'to be rejected with error satisfying', {
          sql:
            'DELETE FROM "user" WHERE "user"."id" = $1 RETURNING "user"."id" as "user.id"'
        });
      });

      it('attaches a full sql string with values in `debug` mode', async () => {
        const query = new Query(User)
          .returning('id')
          .where({ id: 1 })
          .debug(true);
        await expect(query.delete(), 'to be rejected with error satisfying', {
          sql: `DELETE FROM "user" WHERE "user"."id" = 1 RETURNING "user"."id" as "user.id"`
        });
      });
    });

    describe("with a 'where' option", () => {
      it('deletes only the rows matching the query', async () => {
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

    describe("with a 'returning' option", () => {
      it('resolves with the deleted models with only the fields specified', async () => {
        const query = new Query(User).returning(['name']);
        await expect(
          query.delete(),
          'to be fulfilled with sorted rows exhaustively satisfying',
          [new User({ name: 'John Doe' }), new User({ name: 'Jane Doe' })]
        );
      });

      it('allows using aliases for the returned fields', async () => {
        const query = new Query(User).returning({
          theName: 'name',
          theConfirmed: 'confirmed'
        });
        await expect(
          query.delete(),
          'to be fulfilled with value exhaustively satisfying',
          [
            new User({ theName: 'John Doe', theConfirmed: true }),
            new User({ theName: 'Jane Doe', theConfirmed: true })
          ]
        );
      });
    });

    describe("with 'first' configured", () => {
      it('resolves with the first deleted model', async () => {
        const query = new Query(User).first(true);
        await expect(
          query.delete(),
          'to be fulfilled with value satisfying',
          new User({ id: 1, name: 'John Doe' })
        );
      });
    });

    describe("with 'forge' disabled", () => {
      it('resolves with plain JS objects', async () => {
        const query = new Query(User).forge(false);
        await expect(query.delete(), 'to be fulfilled with value satisfying', [
          expect.it('to be an object').and('not to be a', User),
          expect.it('to be an object').and('not to be a', User)
        ]);
      });

      it('does not cast fields with post-fetch cast functions', async () => {
        const query = new Query(User).forge(false);
        await expect(
          query.delete(),
          'to be fulfilled with sorted rows satisfying',
          [{ id: 1, intToString: 10 }, { id: 2, intToString: null }]
        );
      });
    });

    describe('if no row is deleted', () => {
      let deleteStub;

      beforeEach(() => {
        deleteStub = sinon
          .stub(Query.prototype, 'query')
          .returns(Promise.resolve([]));
      });

      afterEach(() => {
        deleteStub.restore();
      });

      it('resolves with an empty array', async () => {
        await expect(
          new Query(User).delete(),
          'to be fulfilled with value satisfying',
          []
        );
      });

      it('resolves with `null` if the `first` option is configured', async () => {
        await expect(
          new Query(User).first(true).delete(),
          'to be fulfilled with value satisfying',
          null
        );
      });

      describe("with 'require' option configured", () => {
        it('rejects with a NoRowsDeletedError', async () => {
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

  describe('Query.where', function() {
    it('returns a `Query.Where` instance', function() {
      expect(Query.where, 'to be a', Query.Where);
    });
  });
});

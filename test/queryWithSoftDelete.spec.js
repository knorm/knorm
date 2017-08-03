const { Model: KnormModel, Query: KnormQuery } = require('knorm');
const sinon = require('sinon');
const expect = require('unexpected')
  .clone()
  .use(require('unexpected-sinon'))
  .use(require('unexpected-knex'))
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
const modelWithSoftDelete = require('../lib/modelWithSoftDelete');
const queryWithSoftDelete = require('../lib/queryWithSoftDelete');
const knex = require('./lib/knex');

describe('queryWithSoftDelete', () => {
  it('throws an error if not passed a knorm query subclass', () => {
    class Foo {}
    expect(
      () => queryWithSoftDelete(Foo),
      'to throw',
      new Error('base class is not a knorm query class')
    );
  });

  it("accepts knorm's query class as the base class", () => {
    expect(() => queryWithSoftDelete(KnormQuery), 'not to throw');
  });

  it('returns a knorm query subclass', () => {
    class Foo extends KnormQuery {}
    const Bar = queryWithSoftDelete(Foo);
    expect(Bar.prototype, 'to be a', KnormQuery);
  });

  describe('with `deleted` and `deletedAt` fields configured', () => {
    class Query extends queryWithSoftDelete(KnormQuery) {}
    Query.knex = knex;

    class Model extends KnormModel {}
    Model.Query = Query;
    Model.fields = {
      id: {
        type: 'integer',
        required: true
      }
    };

    class User extends modelWithSoftDelete(Model, {
      deleted: true,
      deletedAt: true
    }) {}
    User.table = 'user';

    before(async () => {
      await knex.schema.createTable(User.table, table => {
        table.increments();
        table.boolean('deleted');
        table.dateTime('deleted_at');
      });
    });

    after(async () => {
      await knex.schema.dropTable(User.table);
    });

    afterEach(async () => {
      await knex(User.table).truncate();
    });

    describe('insert', () => {
      it('sets `deleted` to `false`', async () => {
        await new User({ id: 1 }).insert();
        await expect(
          knex,
          'with table',
          User.table,
          'to have rows satisfying',
          [{ id: 1, deleted: false }]
        );
      });

      it('does not set `deletedAt`', async () => {
        await new User({ id: 1 }).insert();
        await expect(
          knex,
          'with table',
          User.table,
          'to have rows satisfying',
          [{ id: 1, deleted_at: null }]
        );
      });
    });

    describe('delete', () => {
      it('sets `deleted` to `true` on the row', async () => {
        const user1 = await new User({ id: 1 }).insert();
        await new User({ id: 2 }).insert();
        await user1.delete();
        await expect(
          knex,
          'with table',
          User.table,
          'to have sorted rows satisfying',
          [{ id: 1, deleted: true }, { id: 2, deleted: false }]
        );
      });

      it('sets `deletedAt` to the current timestamp', async () => {
        const clock = sinon.useFakeTimers('Date');
        const user1 = await new User({ id: 1 }).insert();
        await new User({ id: 2 }).insert();
        clock.tick(2000);
        await user1.delete();
        await expect(
          knex,
          'with table',
          User.table,
          'to have sorted rows satisfying',
          [{ id: 1, deleted_at: new Date(2000) }, { id: 2, deleted_at: null }]
        );
        clock.restore();
      });
    });
  });
});

const { Model: KnormModel, Query: KnormQuery } = require('knorm');
const sinon = require('sinon');
const expect = require('unexpected').clone().use(require('unexpected-knex'));
const modelWithTimestamps = require('../lib/modelWithTimestamps');
const queryWithTimestamps = require('../lib/queryWithTimestamps');
const knex = require('./lib/knex');

describe('queryWithTimestamps', () => {
  it('throws an error if not passed a knorm query subclass', () => {
    class Foo {}
    expect(
      () => queryWithTimestamps(Foo),
      'to throw',
      new Error('base class is not a knorm query class')
    );
  });

  it("accepts knorm's query class as the base class", () => {
    expect(() => queryWithTimestamps(KnormQuery), 'not to throw');
  });

  it('returns a knorm query subclass', () => {
    class Foo extends KnormQuery {}
    const Bar = queryWithTimestamps(Foo);
    expect(Bar.prototype, 'to be a', KnormQuery);
  });

  describe('with `createdAt` and `updatedAt` timestamps configured with defaults', () => {
    class Query extends queryWithTimestamps(KnormQuery) {}
    Query.knex = knex;

    class Model extends KnormModel {}
    Model.Query = Query;
    Model.fields = {
      id: {
        type: 'integer',
        required: true
      }
    };

    class User extends modelWithTimestamps(Model, {
      createdAt: { default: () => new Date() },
      updatedAt: { default: () => new Date() }
    }) {}
    User.table = 'user';

    before(async () => {
      await knex.schema.createTable(User.table, table => {
        table.increments();
        table.timestamps();
      });
    });

    after(async () => {
      await knex.schema.dropTable(User.table);
    });

    afterEach(async () => {
      await knex(User.table).truncate();
    });

    let clock;
    beforeEach(() => {
      clock = sinon.useFakeTimers({ toFake: ['Date'] });
    });

    after(() => {
      clock.restore();
    });

    describe('insert', () => {
      it('sets `createdAt` and `updatedAt` to the current timestamp', async () => {
        clock.tick(2000);
        await new User({ id: 1 }).insert();
        await expect(
          knex,
          'with table',
          User.table,
          'to have rows satisfying',
          [
            {
              id: 1,
              created_at: new Date(2000),
              updated_at: new Date(2000)
            }
          ]
        );
      });
    });

    describe('update', () => {
      it('sets `updatedAt` to the current timestamp', async () => {
        const user = await new User({ id: 1 }).insert();
        clock.tick(2000);
        await expect(user.update(), 'to be fulfilled');
        await expect(
          knex,
          'with table',
          User.table,
          'to have rows satisfying',
          [
            {
              id: 1,
              created_at: new Date(0),
              updated_at: new Date(2000)
            }
          ]
        );
      });

      it('unsets `createdAt` if it is set', async () => {
        const user = await new User({ id: 1 }).insert();
        await expect(
          knex,
          'with table',
          User.table,
          'to have rows satisfying',
          [{ created_at: new Date(0) }]
        );
        clock.tick(2000);
        user.createdAt = new Date();
        await expect(user.update(), 'to be fulfilled');
        await expect(
          knex,
          'with table',
          User.table,
          'to have rows satisfying',
          [
            {
              created_at: new Date(0),
              updated_at: new Date(2000)
            }
          ]
        );
      });
    });
  });
});

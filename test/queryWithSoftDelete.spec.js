const { Model: KnormModel, Query: KnormQuery } = require('knorm');
const sinon = require('sinon');
const modelWithSoftDelete = require('../lib/modelWithSoftDelete');
const queryWithSoftDelete = require('../lib/queryWithSoftDelete');
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
      },
      name: {
        type: 'string'
      }
    };

    class User extends modelWithSoftDelete(Model, { deletedAt: true }) {}
    User.table = 'user';

    before(async () => {
      await knex.schema.createTable(User.table, table => {
        table.increments();
        table.string('name');
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

    describe('Query.prototype.insert', () => {
      it('sets `deleted` to `false`', async () => {
        await new Query(User).insert(new User({ id: 1, name: 'one' }));
        await expect(
          knex,
          'with table',
          User.table,
          'to have rows satisfying',
          [{ id: 1, deleted: false }]
        );
      });

      it('does not set `deletedAt`', async () => {
        await new Query(User).insert(new User({ id: 1, name: 'one' }));
        await expect(
          knex,
          'with table',
          User.table,
          'to have rows satisfying',
          [{ id: 1, deleted_at: null }]
        );
      });
    });

    describe('Query.prototype.delete', () => {
      beforeEach(async () => {
        await new Query(User).insert(new User({ id: 1, name: 'one' }));
      });

      it('sets `deleted` to `true` on the row', async () => {
        await new Query(User).delete();
        await expect(
          knex,
          'with table',
          User.table,
          'to have rows satisfying',
          [{ id: 1, deleted: true }]
        );
      });

      it('sets `deletedAt` to the current timestamp', async () => {
        const clock = sinon.useFakeTimers(2000, 'Date');
        await new Query(User).delete();
        await expect(
          knex,
          'with table',
          User.table,
          'to have rows satisfying',
          [{ id: 1, deleted_at: new Date(2000) }]
        );
        clock.restore();
      });

      it('resolves with the soft-deleted record', async () => {
        await expect(
          new Query(User).where({ id: 1 }).delete(),
          'to be fulfilled with value satisfying',
          new User({
            id: 1,
            deleted: true,
            deletedAt: expect.it('to be a date')
          })
        );
      });

      it('resolves with the soft-deleted records if more than one are matched', async () => {
        await new User({ id: 2, name: 'two' }).insert();
        await expect(
          new Query(User).delete(),
          'to be fulfilled with sorted rows satisfying',
          [
            new User({
              id: 1,
              name: 'one',
              deleted: true,
              deletedAt: expect.it('to be a date')
            }),
            new User({
              id: 2,
              name: 'two',
              deleted: true,
              deletedAt: expect.it('to be a date')
            })
          ]
        );
      });

      it('does not soft-delete already soft-deleted records', async () => {
        await new User({ id: 2, name: 'two' }).insert();
        const clock = sinon.useFakeTimers(1000, 'Date');
        await new Query(User).where({ id: 1 }).delete();
        clock.tick(1000);
        await new Query(User).where({ id: 2 }).delete();
        await expect(
          knex,
          'with table',
          User.table,
          'to have sorted rows satisfying',
          [
            { id: 1, deleted_at: new Date(1000) },
            { id: 2, deleted_at: new Date(2000) }
          ]
        );
        clock.restore();
      });

      it('transforms a NoRowsUpdatedError to NoRowsDeletedError', async () => {
        await new Query(User).delete();
        const query = new Query(User).require();
        await expect(
          query.delete(),
          'to be rejected with error satisfying',
          new Query.errors.NoRowsDeletedError('no rows deleted', query)
        );
      });

      it('throws updateErrors as usual', async () => {
        const stub = sinon
          .stub(Query.prototype, 'update')
          .returns(Promise.reject(new Error('update error')));
        await expect(
          new Query(User).delete(),
          'to be rejected with error satisfying',
          new Error('update error')
        );
        stub.restore();
      });
    });

    describe('Query.prototype.restore', () => {
      beforeEach(async () => {
        await new Query(User).insert(
          new User({ id: 1, name: 'one', deleted: true, deletedAt: new Date() })
        );
        await new Query(User).insert(new User({ id: 2, name: 'two' }));
      });

      it('sets `deleted` to `false` on soft-deleted rows', async () => {
        await new Query(User).restore();
        await expect(
          knex,
          'with table',
          User.table,
          'to have sorted rows satisfying',
          [{ id: 1, deleted: false }, { id: 2, deleted: false }]
        );
      });

      it('unsets `deletedAt` on the soft-deleted rows', async () => {
        await new Query(User).restore();
        await expect(
          knex,
          'with table',
          User.table,
          'to have sorted rows satisfying',
          [{ id: 1, deleted_at: null }, { id: 2, deleted_at: null }]
        );
      });

      it('resolves with the restored record', async () => {
        await expect(
          new Query(User).where({ id: 1 }).restore(),
          'to be fulfilled with value satisfying',
          new User({ id: 1, deleted: false, deletedAt: null })
        );
      });

      it('resolves with the restored records if more than one are matched', async () => {
        await new Query(User).where({ id: 2 }).delete();
        await expect(
          new Query(User).restore(),
          'to be fulfilled with sorted rows satisfying',
          [
            new User({ id: 1, name: 'one', deleted: false, deletedAt: null }),
            new User({ id: 2, name: 'two', deleted: false, deletedAt: null })
          ]
        );
      });

      it('does not restore already restored records', async () => {
        await new Query(User).restore();
        await expect(
          new Query(User).restore(),
          'to be fulfilled with value satisfying',
          null
        );
      });

      it('transforms a NoRowsUpdatedError to NoRowsRestoredError', async () => {
        await new Query(User).restore();
        const query = new Query(User).require();
        await expect(
          query.restore(),
          'to be rejected with error satisfying',
          new Query.errors.NoRowsRestoredError('no rows restored', query)
        );
      });

      it('throws updateErrors as usual', async () => {
        const stub = sinon
          .stub(Query.prototype, 'update')
          .returns(Promise.reject(new Error('update error')));
        await expect(
          new Query(User).restore(),
          'to be rejected with error satisfying',
          new Error('update error')
        );
        stub.restore();
      });
    });

    describe('Query.prototype.onlyDeleted', () => {
      beforeEach(async () => {
        await new Query(User).insert(new User({ id: 1, name: 'one' }));
        await new Query(User).insert(new User({ id: 2, name: 'two' }));
      });

      it('returns only the soft-deleted rows', async () => {
        await new Query(User).where({ id: 1 }).delete();
        await expect(
          new Query(User).onlyDeleted().fetch(),
          'to be fulfilled with value satisfying',
          [{ id: 1 }]
        );
      });
    });

    describe('Query.prototype.withDeleted', () => {
      beforeEach(async () => {
        await new Query(User).insert(new User({ id: 1, name: 'one' }));
        await new Query(User).insert(new User({ id: 2, name: 'two' }));
      });

      it('allows fetching both non-deleted and soft-deleted rows', async () => {
        await new Query(User).where({ id: 1 }).delete();
        await expect(
          new Query(User).withDeleted().fetch(),
          'to be fulfilled with sorted rows satisfying',
          [{ id: 1 }, { id: 2 }]
        );
      });

      it('does not inadvertently include other rows by doing an OR WHERE match', async () => {
        await new Query(User).where({ id: 1 }).delete();
        await expect(
          new Query(User).withDeleted().where({ id: 1 }).fetch(),
          'to be fulfilled with value satisfying',
          [{ id: 1 }]
        );
      });
    });

    describe('Query.prototype.fetch', () => {
      beforeEach(async () => {
        await new Query(User).insert(new User({ id: 1, name: 'one' }));
        await new Query(User).insert(new User({ id: 2, name: 'two' }));
      });

      it('does not return the soft-deleted rows', async () => {
        await new Query(User).where({ id: 1 }).delete();
        await expect(
          new Query(User).fetch(),
          'to be fulfilled with sorted rows satisfying',
          [{ id: 2 }]
        );
      });

      it('allows fetching soft-deleted rows', async () => {
        await new Query(User).where({ id: 1 }).delete();
        await expect(
          new Query(User).where({ deleted: true }).fetch(),
          'to be fulfilled with sorted rows satisfying',
          [{ id: 1 }]
        );
      });

      it('allows fetching both non-deleted and soft-deleted rows', async () => {
        await new Query(User).where({ id: 1 }).delete();
        await expect(
          new Query(User)
            .where({ deleted: true })
            .orWhere({ deleted: false })
            .fetch(),
          'to be fulfilled with sorted rows satisfying',
          [{ id: 1 }, { id: 2 }]
        );
        await expect(
          new Query(User)
            .where({ deleted: false })
            .orWhere({ deleted: true })
            .fetch(),
          'to be fulfilled with sorted rows satisfying',
          [{ id: 1 }, { id: 2 }]
        );
      });
    });

    describe('Query.prototype.update', () => {
      beforeEach(async () => {
        await new Query(User).insert(new User({ id: 1, name: 'one' }));
        await new Query(User).insert(new User({ id: 2, name: 'two' }));
      });

      it('does not update the soft-deleted rows', async () => {
        await new Query(User).where({ id: 1 }).delete();
        await new Query(User).update({ name: 'foo' });
        await expect(
          knex,
          'with table',
          User.table,
          'to have sorted rows satisfying',
          [{ id: 1, name: 'one' }, { id: 2, name: 'foo' }]
        );
      });
    });

    describe('Query.prototype.count', () => {
      beforeEach(async () => {
        await new Query(User).insert(new User({ id: 1, name: 'one' }));
        await new Query(User).insert(new User({ id: 2, name: 'two' }));
      });

      it('does not count the soft-deleted rows', async () => {
        await new Query(User).where({ id: 1 }).delete();
        await expect(
          new Query(User).count(),
          'to be fulfilled with value satisfying',
          1
        );
      });
    });

    describe('Model.prototype.restore', () => {
      it('restores a soft-deleted record', async () => {
        const user = await new User({
          id: 1,
          name: 'one',
          deleted: true,
          deletedAt: new Date()
        }).insert();
        await user.restore();
        await expect(
          knex,
          'with table',
          User.table,
          'to have sorted rows satisfying',
          [{ id: 1, deleted: false }]
        );
      });
    });

    describe('Model.restore', () => {
      it('restores a soft-deleted record', async () => {
        await User.insert({
          id: 1,
          name: 'one',
          deleted: true,
          deletedAt: new Date()
        });
        await User.restore({ where: { id: 1 } });
        await expect(
          knex,
          'with table',
          User.table,
          'to have sorted rows satisfying',
          [{ id: 1, deleted: false }]
        );
      });
    });
  });
});

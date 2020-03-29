const knorm = require('@knorm/knorm');
const knormPaginate = require('@knorm/paginate');
const knormPostgres = require('@knorm/postgres');
const KnormSoftDelete = require('../src/KnormSoftDelete');
const knormSoftDelete = require('../src/');
const sinon = require('sinon');
const createKnex = require('../../../util/create-knex');
const expect = require('unexpected')
  .clone()
  .use(require('unexpected-sinon'))
  .use(require('unexpected-knex'));

const {
  Knorm: { Query: KnormQuery },
} = knorm;
const { KnormSoftDeleteError } = KnormSoftDelete;
const knex = createKnex('knorm-soft-delete');

describe('KnormSoftDelete', () => {
  describe('init', () => {
    it('throws if not passed a `Knorm` instance', () => {
      expect(
        () => new KnormSoftDelete().init(),
        'to throw',
        new KnormSoftDeleteError('no Knorm instance provided')
      );
    });

    it('throws if passed an invalid `Knorm` instance', () => {
      expect(
        () => new KnormSoftDelete().init({}),
        'to throw',
        new KnormSoftDeleteError('invalid Knorm instance provided')
      );
    });
  });

  describe('updateModel', () => {
    const updateModel = config => knorm().use(knormSoftDelete(config));

    it('adds a `deleted` field by default', () => {
      const { Model } = updateModel();
      expect(Model.fields, 'to satisfy', {
        deleted: {
          type: 'boolean',
          column: 'deleted',
        },
      });
    });

    describe('with a `deleted` config', () => {
      it('allows configuring the `deleted` field-name', () => {
        const { Model } = updateModel({ deleted: { name: 'isDeleted' } });
        expect(Model.fields, 'to satisfy', {
          deleted: undefined,
          isDeleted: {
            type: 'boolean',
          },
        });
      });

      it('allows configuring the `deleted` field column-name', () => {
        const { Model } = updateModel({ deleted: { column: 'is_deleted' } });
        expect(Model.fields, 'to satisfy', {
          deleted: {
            column: 'is_deleted',
          },
        });
      });
    });

    describe('with a `deletedAt` config', () => {
      it('adds a `deletedAt` field', () => {
        const { Model } = updateModel({ deletedAt: true });
        expect(Model.fields, 'to satisfy', {
          deletedAt: {
            type: 'dateTime',
            column: 'deleted_at',
          },
        });
      });

      it('allows configuring the `deletedAt` field-name', () => {
        const { Model } = updateModel({ deletedAt: { name: 'deleted' } });
        expect(Model.fields, 'to satisfy', {
          deletedAt: undefined,
          deleted: {
            type: 'dateTime',
          },
        });
      });

      it('allows configuring the `deletedAt` field column-name', () => {
        const { Model } = updateModel({ deletedAt: { column: 'deleted' } });
        expect(Model.fields, 'to satisfy', {
          deletedAt: {
            column: 'deleted',
          },
        });
      });
    });
  });

  describe('updateQuery', () => {
    let Query;
    let User;

    before(() => {
      const orm = knorm()
        .use(knormPostgres({ connection: knex.client.config.connection }))
        .use(knormPaginate())
        .use(knormSoftDelete({ deletedAt: true }));

      Query = orm.Query;

      User = class extends orm.Model {};

      User.table = 'user';
      User.fields = {
        id: {
          type: 'integer',
          required: true,
          primary: true,
          updated: false,
        },
        name: {
          type: 'string',
        },
      };
    });

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
        const clock = sinon.useFakeTimers({ now: 2000, toFake: ['Date'] });
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

      it('passes options passed to Query.prototype.update', async () => {
        const spy = sinon.spy(Query.prototype, 'update');
        await new Query(User).delete({ fields: 'name' });
        await expect(spy, 'to have calls satisfying', () => {
          spy(expect.it('to be an object'), { fields: 'name' });
        });
        spy.restore();
      });

      it('resolves with an array of soft-deleted records', async () => {
        await new User({ id: 2, name: 'two' }).insert();
        await expect(
          new Query(User).delete(),
          'to be fulfilled with sorted rows satisfying',
          [
            new User({
              id: 1,
              name: 'one',
              deleted: true,
              deletedAt: expect.it('to be a date'),
            }),
            new User({
              id: 2,
              name: 'two',
              deleted: true,
              deletedAt: expect.it('to be a date'),
            }),
          ]
        );
      });

      it('does not soft-delete already soft-deleted records', async () => {
        await new User({ id: 2, name: 'two' }).insert();
        const clock = sinon.useFakeTimers({ now: 1000, toFake: ['Date'] });
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
            { id: 2, deleted_at: new Date(2000) },
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
          new Query.NoRowsDeletedError({ query })
        );
      });

      it("throws knorm's UpdateErrors without modification", async () => {
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
          new User({
            id: 1,
            name: 'one',
            deleted: true,
            deletedAt: new Date(),
          })
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
          [
            { id: 1, deleted: false },
            { id: 2, deleted: false },
          ]
        );
      });

      it('unsets `deletedAt` on the soft-deleted rows', async () => {
        await new Query(User).restore();
        await expect(
          knex,
          'with table',
          User.table,
          'to have sorted rows satisfying',
          [
            { id: 1, deleted_at: null },
            { id: 2, deleted_at: null },
          ]
        );
      });

      it('passes options passed to Query.prototype.update', async () => {
        const spy = sinon.spy(Query.prototype, 'update');
        await new Query(User).restore({ fields: 'name' });
        await expect(spy, 'to have calls satisfying', () => {
          spy(expect.it('to be an object'), { fields: 'name' });
        });
        spy.restore();
      });

      it('resolves with the restored record', async () => {
        await expect(
          new Query(User).where({ id: 1 }).restore(),
          'to be fulfilled with value satisfying',
          [new User({ id: 1, deleted: false, deletedAt: null })]
        );
      });

      it('resolves with the restored records if more than one are matched', async () => {
        await new Query(User).where({ id: 2 }).delete();
        await expect(
          new Query(User).restore(),
          'to be fulfilled with sorted rows satisfying',
          [
            new User({ id: 1, name: 'one', deleted: false, deletedAt: null }),
            new User({ id: 2, name: 'two', deleted: false, deletedAt: null }),
          ]
        );
      });

      it('does not restore already restored records', async () => {
        await new Query(User).restore();
        await expect(
          new Query(User).restore(),
          'to be fulfilled with value satisfying',
          []
        );
      });

      it('transforms a NoRowsUpdatedError to NoRowsRestoredError', async () => {
        await new Query(User).restore();
        const query = new Query(User).require();
        await expect(
          query.restore(),
          'to be rejected with error satisfying',
          new Query.NoRowsRestoredError({ query })
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
          new Query(User)
            .withDeleted()
            .where({ id: 1 })
            .fetch(),
          'to be fulfilled with value satisfying',
          [{ id: 1 }]
        );
      });
    });

    describe('Query.prototype.hardDelete', () => {
      beforeEach(async () => {
        await new Query(User).insert(
          new User({
            id: 1,
            name: 'one',
            deleted: true,
            deletedAt: new Date(),
          })
        );
        await new Query(User).insert(new User({ id: 2, name: 'two' }));
      });

      it('can hard-delete soft-deleted rows', async () => {
        await new Query(User).where({ id: 1 }).hardDelete();
        await expect(
          knex,
          'with table',
          User.table,
          'to have rows satisfying',
          [{ id: 2, deleted: false }]
        );
      });

      it('can hard-delete rows that are not soft-deleted', async () => {
        await new Query(User).where({ id: 2 }).hardDelete();
        await expect(
          knex,
          'with table',
          User.table,
          'to have rows satisfying',
          [{ id: 1, deleted: true }]
        );
      });

      it('can hard-delete all rows', async () => {
        await new Query(User).hardDelete();
        await expect(knex, 'with table', User.table, 'to be empty');
      });

      it('passes options passed to KnormQuery.prototype.delete', async () => {
        const spy = sinon.spy(KnormQuery.prototype, 'delete');
        await new Query(User).hardDelete({ fields: 'name' });
        await expect(spy, 'to have calls satisfying', () => {
          spy({ fields: 'name' });
        });
        spy.restore();
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

      it('allows fetching soft-deleted rows with a string field-name', async () => {
        await new Query(User).where({ id: 1 }).delete();
        await expect(
          new Query(User).where({ deleted: true }).fetch(),
          'to be fulfilled with sorted rows satisfying',
          [{ id: 1 }]
        );
      });

      it('allows fetching both non-deleted and soft-deleted rows', async () => {
        await new Query(User).where({ id: 1 }).delete();
        const where = new Query.Where();
        await expect(
          new Query(User).where(where.in({ deleted: [true, false] })).fetch(),
          'to be fulfilled with sorted rows satisfying',
          [{ id: 1 }, { id: 2 }]
        );
      });

      it('allows fetching soft-deleted rows with `where not`', async () => {
        await new Query(User).where({ id: 1 }).delete();
        const where = new Query.Where();
        await expect(
          new Query(User)
            .where({ id: 1 })
            .where(where.not({ deleted: false }))
            .fetch(),
          'to be fulfilled with sorted rows satisfying',
          [{ id: 1 }]
        );
      });

      it('allows fetching soft-deleted rows with `and where not`', async () => {
        await new Query(User).where({ id: 1 }).delete();
        const where = new Query.Where();
        await expect(
          new Query(User)
            .where(where.and({ id: 1 }, where.not({ deleted: false })))
            .fetch(),
          'to be fulfilled with sorted rows satisfying',
          [{ id: 1 }]
        );
      });

      it('allows fetching soft-deleted rows with `and where not` with a string field-name', async () => {
        await new Query(User).where({ id: 1 }).delete();
        const where = new Query.Where();
        await expect(
          new Query(User)
            .where(where.and({ id: 1 }, where.not({ deleted: false })))
            .fetch(),
          'to be fulfilled with sorted rows satisfying',
          [{ id: 1 }]
        );
      });

      it('allows fetching soft-deleted rows with `or where`', async () => {
        await new Query(User).where({ id: 1 }).delete();
        const where = new Query.Where();
        await expect(
          new Query(User).where(where.or({ id: 2 }, { deleted: true })).fetch(),
          'to be fulfilled with sorted rows satisfying',
          [{ id: 1 }, { id: 2 }]
        );
      });

      it('allows fetching soft-deleted rows with `or where not`', async () => {
        await new Query(User).where({ id: 1 }).delete();
        const where = new Query.Where();
        await expect(
          new Query(User)
            .where(where.or({ id: 2 }, where.not({ deleted: false })))
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
          [
            { id: 1, name: 'one' },
            { id: 2, name: 'foo' },
          ]
        );
      });

      it('sets `deletedAt` if called with `deleted` set to true', async () => {
        const clock = sinon.useFakeTimers({ now: 2000, toFake: ['Date'] });
        await new Query(User).update({ deleted: true });
        await expect(
          knex,
          'with table',
          User.table,
          'to have rows satisfying',
          [
            { id: 1, deleted_at: new Date(2000) },
            { id: 2, deleted_at: new Date(2000) },
          ]
        );
        clock.restore();
      });

      it('does not overwrite `deletedAt` if called with `deleted` and `deletedAt`', async () => {
        const clock = sinon.useFakeTimers({ now: 2000, toFake: ['Date'] });
        await new Query(User).update({
          deleted: true,
          deletedAt: new Date(3000),
        });
        await expect(
          knex,
          'with table',
          User.table,
          'to have rows satisfying',
          [
            { id: 1, deleted_at: new Date(3000) },
            { id: 2, deleted_at: new Date(3000) },
          ]
        );
        clock.restore();
      });

      it('passes options passed to Query.prototype.update', async () => {
        const spy = sinon.spy(Query.prototype, 'update');
        await new Query(User).update({ deleted: true }, { fields: 'name' });
        await expect(spy, 'to have calls satisfying', () => {
          spy(expect.it('to be an object'), { fields: 'name' });
        });
        spy.restore();
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
          deletedAt: new Date(),
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

      it('passes options along', async () => {
        const user = await new User({
          id: 1,
          name: 'one',
          deleted: true,
          deletedAt: new Date(),
        }).insert();
        const execute = sinon.spy(Query.prototype, 'execute');
        await user.restore({ returning: 'id' });
        await expect(execute, 'to have calls satisfying', () => {
          execute(
            expect.it(
              'when passed as parameter to',
              query => query.toString(),
              'to end with',
              'RETURNING "user"."id" AS "user.id"'
            )
          );
        });
        execute.restore();
      });
    });

    describe('Model.restore', () => {
      it('restores a soft-deleted record', async () => {
        await User.insert({
          id: 1,
          name: 'one',
          deleted: true,
          deletedAt: new Date(),
        });
        await User.restore();
        await expect(
          knex,
          'with table',
          User.table,
          'to have sorted rows satisfying',
          [{ id: 1, deleted: false }]
        );
      });

      it('passes options passed to Query.prototype.restore', async () => {
        const spy = sinon.spy(Query.prototype, 'restore');
        await User.restore({ where: { id: 1 } });
        await expect(spy, 'to have calls satisfying', () => {
          spy({ where: { id: 1 } });
        });
        spy.restore();
      });
    });

    describe('Model.prototype.hardDelete', () => {
      it('hard-deletes a record', async () => {
        const user = await new User({ id: 1, name: 'one' }).insert();
        await user.hardDelete();
        await expect(knex, 'with table', User.table, 'to be empty');
      });

      it('hard-deletes a soft-deleted record', async () => {
        const user = await new User({
          id: 1,
          name: 'one',
          deleted: true,
          deletedAt: new Date(),
        }).insert();
        await user.hardDelete();
        await expect(knex, 'with table', User.table, 'to be empty');
      });

      it('passes options passed to Query.prototype.setOptions', async () => {
        const user = await new User({ id: 1, name: 'one' }).insert();
        const execute = sinon.spy(Query.prototype, 'execute');
        await user.hardDelete({ returning: 'id' });
        await expect(execute, 'to have calls satisfying', () => {
          execute(
            expect.it(
              'when passed as parameter to',
              query => query.toString(),
              'to end with',
              'RETURNING "user"."id" AS "user.id"'
            )
          );
        });
        execute.restore();
      });
    });

    describe('Model.hardDelete', () => {
      it('hard-deletes records', async () => {
        await User.insert({ id: 1, name: 'one' });
        await User.hardDelete();
        await expect(knex, 'with table', User.table, 'to be empty');
      });

      it('hard-deletes soft-deleted records', async () => {
        await User.insert({
          id: 1,
          name: 'one',
          deleted: true,
          deletedAt: new Date(),
        });
        await User.hardDelete();
        await expect(knex, 'with table', User.table, 'to be empty');
      });

      it('passes options passed to Query.prototype.hardDelete', async () => {
        const spy = sinon.spy(Query.prototype, 'hardDelete');
        await User.hardDelete({ where: { id: 1 } });
        await expect(spy, 'to have calls satisfying', () => {
          spy({ where: { id: 1 } });
        });
        spy.restore();
      });
    });
  });
});

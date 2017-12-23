const knorm = require('knorm');
const { KnormError } = knorm;
const knex = require('./lib/knex');
const KnormTimestamps = require('../lib/KnormTimestamps');
const knormTimestamps = require('../');
const sinon = require('sinon');
const expect = require('unexpected')
  .clone()
  .use(require('unexpected-knex'));

describe('KnormTimestamps', () => {
  describe('init', () => {
    it('throws if not passed a `Knorm` instance', () => {
      expect(
        () => new KnormTimestamps().init(),
        'to throw',
        new KnormError('KnormTimestamps: no Knorm instance provided')
      );
    });

    it('throws if passed an invalid `Knorm` instance', () => {
      expect(
        () => new KnormTimestamps().init({}),
        'to throw',
        new KnormError('KnormTimestamps: invalid Knorm instance provided')
      );
    });
  });

  describe('updateModel', () => {
    const updateModel = config =>
      knorm({ knex() {} }).use(knormTimestamps(config));

    describe('with a `createdAt` config', () => {
      it('allows configuring the `createdAt` field-name', () => {
        const { Model } = updateModel({ createdAt: { name: 'created' } });
        expect(Model.fields, 'to satisfy', {
          createdAt: undefined,
          created: { type: 'dateTime' }
        });
      });

      it('allows configuring the `createdAt` field column-name', () => {
        const { Model } = updateModel({ createdAt: { column: 'created' } });
        expect(Model.fields, 'to satisfy', {
          createdAt: { column: 'created' }
        });
      });
    });

    describe('with a `updatedAt` config', () => {
      it('allows configuring the `updatedAt` field-name', () => {
        const { Model } = updateModel({ updatedAt: { name: 'updated' } });
        expect(Model.fields, 'to satisfy', {
          updatedAt: undefined,
          updated: { type: 'dateTime' }
        });
      });

      it('allows configuring the `updatedAt` field column-name', () => {
        const { Model } = updateModel({ updatedAt: { column: 'updated' } });
        expect(Model.fields, 'to satisfy', {
          updatedAt: { column: 'updated' }
        });
      });
    });
  });

  describe('updateQuery', () => {
    const { Model } = knorm({ knex }).use(knormTimestamps());

    class User extends Model {}

    User.table = 'user';
    User.fields = {
      id: {
        type: 'integer',
        required: true,
        primary: true,
        updated: false
      }
    };

    before(async () =>
      knex.schema.createTable(User.table, table => {
        table.increments();
        table.timestamps();
      })
    );

    after(async () => knex.schema.dropTable(User.table));
    afterEach(async () => knex(User.table).truncate());

    let clock;

    beforeEach(() => (clock = sinon.useFakeTimers({ toFake: ['Date'] })));
    after(() => clock.restore());

    describe('insert', () => {
      it('sets `createdAt` and `updatedAt` to the current timestamp', async () => {
        clock.tick(2000);
        await new User({ id: 1 }).insert();
        await expect(
          knex,
          'with table',
          User.table,
          'to have rows satisfying',
          [{ id: 1, created_at: new Date(2000), updated_at: new Date(2000) }]
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
          [{ id: 1, created_at: new Date(0), updated_at: new Date(2000) }]
        );
      });

      it('does not save `createdAt` if it is set', async () => {
        const user = await new User({ id: 1 }).insert();
        await expect(
          knex,
          'with table',
          User.table,
          'to have rows satisfying',
          [{ created_at: new Date(0) }]
        );
        user.createdAt = new Date(2000);
        await expect(user.update(), 'to be fulfilled');
        await expect(
          knex,
          'with table',
          User.table,
          'to have rows satisfying',
          [{ created_at: new Date(0) }]
        );
      });

      it('passes options to Query.prototype.update', async () => {
        await new User({ id: 1 }).insert();
        await expect(
          User.update({}, { where: { id: 1 }, first: true }),
          'to be fulfilled with value satisfying',
          new User({ id: 1 })
        );
      });
    });
  });
});

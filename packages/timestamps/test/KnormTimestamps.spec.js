const knorm = require('@knorm/knorm');
const knormPostgres = require('@knorm/postgres');
const KnormTimestamps = require('../src/KnormTimestamps');
const knormTimestamps = require('../src/');
const createKnex = require('../../../util/create-knex');
const sinon = require('sinon');
const expect = require('unexpected').clone().use(require('unexpected-knex'));

const { KnormTimestampsError } = KnormTimestamps;
const knex = createKnex('knorm-timestamps');

describe('KnormTimestamps', () => {
  describe('init', () => {
    it('throws if not passed a `Knorm` instance', () => {
      expect(
        () => new KnormTimestamps().init(),
        'to throw',
        new KnormTimestampsError('no Knorm instance provided')
      );
    });

    it('throws if passed an invalid `Knorm` instance', () => {
      expect(
        () => new KnormTimestamps().init({}),
        'to throw',
        new KnormTimestampsError('invalid Knorm instance provided')
      );
    });
  });

  describe('updateModel', () => {
    const updateModel = (config) => knorm().use(knormTimestamps(config));

    describe('with a `createdAt` config', () => {
      it('allows configuring the `createdAt` field-name', () => {
        const { Model } = updateModel({ createdAt: { name: 'created' } });
        expect(Model.fields, 'to satisfy', {
          createdAt: undefined,
          created: { type: 'dateTime' },
        });
      });

      it('allows configuring the `createdAt` field column-name', () => {
        const { Model } = updateModel({ createdAt: { column: 'created' } });
        expect(Model.fields, 'to satisfy', {
          createdAt: { column: 'created' },
        });
      });
    });

    describe('with a `updatedAt` config', () => {
      it('allows configuring the `updatedAt` field-name', () => {
        const { Model } = updateModel({ updatedAt: { name: 'updated' } });
        expect(Model.fields, 'to satisfy', {
          updatedAt: undefined,
          updated: { type: 'dateTime' },
        });
      });

      it('allows configuring the `updatedAt` field column-name', () => {
        const { Model } = updateModel({ updatedAt: { column: 'updated' } });
        expect(Model.fields, 'to satisfy', {
          updatedAt: { column: 'updated' },
        });
      });
    });
  });

  describe('updateQuery', () => {
    let User;

    before(() => {
      const { Model } = knorm()
        .use(knormPostgres({ connection: knex.client.config.connection }))
        .use(knormTimestamps());

      User = class extends Model {};

      User.table = 'user';
      User.fields = {
        id: {
          type: 'integer',
          required: true,
          primary: true,
          updated: false,
        },
      };
    });

    before(async () =>
      knex.schema.createTable(User.table, (table) => {
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
          'to have sorted rows satisfying',
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
          'to have sorted rows satisfying',
          [{ id: 1, created_at: new Date(0), updated_at: new Date(2000) }]
        );
      });

      it('allows updating multiple records', async () => {
        const users = await User.insert([{ id: 1 }, { id: 2 }]);
        clock.tick(2000);
        await expect(User.update(users), 'to be fulfilled');
        await expect(
          knex,
          'with table',
          User.table,
          'to have sorted rows satisfying',
          [
            { id: 1, created_at: new Date(0), updated_at: new Date(2000) },
            { id: 2, created_at: new Date(0), updated_at: new Date(2000) },
          ]
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

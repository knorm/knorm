const Knorm = require('../../lib/Knorm');
const sinon = require('sinon');
const expect = require('unexpected')
  .clone()
  .use(require('unexpected-sinon'));

describe.only('Insert', () => {
  let Model;
  let Query;
  let User;
  let Sql;
  let Raw;
  let Insert;

  let UserWithSchema;

  before(() => {
    const orm = new Knorm({});

    Model = orm.Model;
    Query = orm.Query;
    Sql = orm.Sql;
    Raw = Sql.Raw;
    Insert = Sql.Insert;

    User = class extends Model {};
    User.table = 'user';
    User.fields = {
      id: 'integer',
      name: 'string',
      description: 'text',
      confirmed: 'boolean'
    };

    UserWithSchema = class extends User {};
    UserWithSchema.schema = 'public';
  });

  let insert;

  beforeEach(() => {
    insert = new Insert(User);
  });

  describe('Insert.prototype.formatInto', () => {
    it('returns a `FROM` clause with `Model.table`', () => {
      expect(insert.formatInto(), 'to equal', {
        sql: 'INTO user'
      });
    });

    describe('with `Model.schema` configured', () => {
      it('returns a `FROM` clause with `Model.schema` and `Model.table`', () => {
        expect(new Insert(UserWithSchema).formatInto(), 'to equal', {
          sql: 'INTO public.user'
        });
      });
    });

    describe('with the `alias` option set', () => {
      it('returns an aliased table-name with the quoted alias', () => {
        expect(insert.formatInto({ alias: 'user' }), 'to equal', {
          sql: 'INTO user AS user'
        });
      });
    });
  });

  describe('Insert.prototype.formatColumns', () => {
    describe('with the `data` option not set', () => {
      it('returns `undefined`', () => {
        expect(insert.formatColumns(), 'to be undefined');
      });
    });

    describe('with the `data` option set', () => {
      describe('as a Raw instance', () => {
        it('returns `undefined`', () => {
          expect(
            insert.formatColumns({ data: new Raw(User, 'SELECT * FROM user') }),
            'to be undefined'
          );
        });
      });

      describe('as a Query instance', () => {
        it('returns `undefined`', () => {
          expect(
            insert.formatColumns({ data: new Query(User) }),
            'to be undefined'
          );
        });
      });

      describe('as an array of objects', () => {
        it('returns formatted columns from the keys of the first object', () => {
          expect(
            insert.formatColumns({ data: [{ id: 1, name: 'foo' }] }),
            'to equal',
            { sql: '(id, name)' }
          );
        });

        it('propagates options', () => {
          const formatColumn = sinon.spy(Insert.prototype, 'formatColumn');
          expect(
            insert.formatColumns({ data: [{ id: 1, name: 'foo' }] }),
            'to equal',
            { sql: '(id, name)' }
          );
          expect(formatColumn, 'to have calls satisfying', () => {
            formatColumn('id', { data: [{ id: 1, name: 'foo' }] });
            formatColumn('name', { data: [{ id: 1, name: 'foo' }] });
          });
          formatColumn.restore();
        });
      });
    });
  });

  describe('Insert.prototype.formatValue', () => {
    describe('when passed a Query instance', () => {
      it('returns a formatted SELECT statement from the instance', () => {
        expect(
          insert.formatValue(
            new Query(User).setOptions({
              fields: ['id'],
              where: { name: 'foo' }
            })
          ),
          'to equal',
          {
            sql: '(SELECT user.id FROM user WHERE user.name = ?)',
            values: ['foo']
          }
        );
      });

      it('does not propagate options to the (isolate) Query instance', () => {
        const formatSelect = sinon.spy(Query.prototype, 'formatSelect');
        expect(
          insert.formatValue(new Query(User), { field: 'id' }),
          'to equal',
          { sql: '(SELECT FROM user)' }
        );
        expect(formatSelect, 'to have calls satisfying', () => formatSelect());
        formatSelect.restore();
      });
    });

    describe('when passed a Raw instance', () => {
      it('returns formatted sql and values from the instance', () => {
        expect(
          insert.formatValue(new Raw(User, 'SELECT * FROM user')),
          'to equal',
          { sql: 'SELECT * FROM user' }
        );
      });

      it('propagates options', () => {
        const formatRaw = sinon.spy(Raw.prototype, 'formatRaw');
        expect(
          insert.formatValue(new Raw(User, 'SELECT 1'), { field: 'id' }),
          'to equal',
          { sql: 'SELECT 1' }
        );
        expect(formatRaw, 'to have calls satisfying', () =>
          formatRaw({ field: 'id' })
        );
        formatRaw.restore();
      });
    });

    describe('when passed any other value', () => {
      it('returns formatted sql and values', () => {
        expect(insert.formatValue(1), 'to equal', { sql: '?', values: [1] });
      });
    });
  });

  describe('Insert.prototype.formatRow', () => {
    describe('when passed a Query instance', () => {
      it('returns a formatted SELECT statement from the instance', () => {
        expect(
          insert.formatRow(
            new Query(User).setOptions({
              fields: ['id'],
              where: { name: 'foo' }
            })
          ),
          'to equal',
          {
            sql: '(SELECT user.id FROM user WHERE user.name = ?)',
            values: ['foo']
          }
        );
      });

      it('does not propagate options to the (isolate) Query instance', () => {
        const formatSelect = sinon.spy(Query.prototype, 'formatSelect');
        expect(insert.formatRow(new Query(User), { field: 'id' }), 'to equal', {
          sql: '(SELECT FROM user)'
        });
        expect(formatSelect, 'to have calls satisfying', () => formatSelect());
        formatSelect.restore();
      });
    });

    describe('when passed a Raw instance', () => {
      it('returns formatted sql and values from the instance', () => {
        expect(
          insert.formatRow(new Raw(User, 'SELECT * FROM user')),
          'to equal',
          { sql: 'SELECT * FROM user' }
        );
      });

      it('propagates options', () => {
        const formatRaw = sinon.spy(Raw.prototype, 'formatRaw');
        expect(
          insert.formatRow(new Raw(User, 'SELECT 1'), { field: 'id' }),
          'to equal',
          { sql: 'SELECT 1' }
        );
        expect(formatRaw, 'to have calls satisfying', () =>
          formatRaw({ field: 'id' })
        );
        formatRaw.restore();
      });
    });

    describe('when passed an object', () => {
      it('returns formatted sql and values for the objects', () => {
        expect(insert.formatRow({ id: 1, name: 'foo' }), 'to equal', {
          sql: '?, ?',
          values: [1, 'foo']
        });
      });

      it('propagates options', () => {
        const formatValue = sinon.spy(Insert.prototype, 'formatValue');
        expect(
          insert.formatRow({ id: 1, name: 'foo' }, { field: 'id' }),
          'to equal',
          { sql: '?, ?', values: [1, 'foo'] }
        );
        expect(formatValue, 'to have calls satisfying', () => {
          formatValue(1, { field: 'id' });
          formatValue('foo', { field: 'id' });
        });
        formatValue.restore();
      });
    });
  });

  describe('Insert.prototype.formatData', () => {
    describe('when passed a Query instance', () => {
      it('returns a formatted SELECT statement from the instance', () => {
        expect(
          insert.formatData(
            new Query(User).setOptions({
              fields: ['id'],
              where: { name: 'foo' }
            })
          ),
          'to equal',
          {
            sql: '(SELECT user.id FROM user WHERE user.name = ?)',
            values: ['foo']
          }
        );
      });

      it('does not propagate options to the (isolate) Query instance', () => {
        const formatSelect = sinon.spy(Query.prototype, 'formatSelect');
        expect(
          insert.formatData(new Query(User), { field: 'id' }),
          'to equal',
          { sql: '(SELECT FROM user)' }
        );
        expect(formatSelect, 'to have calls satisfying', () => formatSelect());
        formatSelect.restore();
      });
    });

    describe('when passed a Raw instance', () => {
      it('returns formatted sql and values from the instance', () => {
        expect(
          insert.formatData(new Raw(User, 'SELECT * FROM user')),
          'to equal',
          { sql: 'SELECT * FROM user' }
        );
      });

      it('propagates options', () => {
        const formatRaw = sinon.spy(Raw.prototype, 'formatRaw');
        expect(
          insert.formatData(new Raw(User, 'SELECT 1'), { field: 'id' }),
          'to equal',
          { sql: 'SELECT 1' }
        );
        expect(formatRaw, 'to have calls satisfying', () =>
          formatRaw({ field: 'id' })
        );
        formatRaw.restore();
      });
    });

    describe('when passed an array of objects', () => {
      it('returns formatted sql and values for all objects', () => {
        expect(
          insert.formatData([{ id: 1, name: 'foo' }, { id: 2, name: 'bar' }]),
          'to equal',
          { sql: '(?, ?), (?, ?)', values: [1, 'foo', 2, 'bar'] }
        );
      });

      it('propagates options', () => {
        const formatRow = sinon.spy(Insert.prototype, 'formatRow');
        expect(
          insert.formatData([{ id: 1, name: 'foo' }, { id: 2, name: 'bar' }], {
            field: 'id'
          }),
          'to equal',
          { sql: '(?, ?), (?, ?)', values: [1, 'foo', 2, 'bar'] }
        );
        expect(formatRow, 'to have calls satisfying', () => {
          formatRow({ id: 1, name: 'foo' }, { field: 'id' });
          formatRow({ id: 2, name: 'bar' }, { field: 'id' });
        });
        formatRow.restore();
      });
    });
  });

  describe('Insert.prototype.formatValues', () => {
    describe('with the `data` option not set', () => {
      it('returns `undefined`', () => {
        expect(insert.formatValues(), 'to be undefined');
      });
    });

    describe('with the `data` option set', () => {
      it('returns a formatted `VALUES` sql and values', () => {
        expect(
          insert.formatValues({
            data: [
              { id: 1, name: 'foo', confirmed: true },
              { id: 2, name: 'bar', confirmed: false },
              { id: 3, name: null, confirmed: null }
            ]
          }),
          'to equal',
          {
            sql: 'VALUES (?, ?, ?), (?, ?, ?), (?, ?, ?)',
            values: [1, 'foo', true, 2, 'bar', false, 3, null, null]
          }
        );
      });

      it('propagates options', () => {
        const formatData = sinon.spy(Insert.prototype, 'formatData');
        expect(
          insert.formatValues({ data: [{ id: 1, name: 'foo' }] }),
          'to equal',
          { sql: 'VALUES (?, ?)', values: [1, 'foo'] }
        );
        expect(formatData, 'to have calls satisfying', () =>
          formatData([{ id: 1, name: 'foo' }], {
            data: [{ id: 1, name: 'foo' }]
          })
        );
        formatData.restore();
      });
    });
  });

  describe('Insert.prototype.formatInsert', () => {
    describe('with no options set', () => {
      it('returns a basic `INSERT INTO` statement', () => {
        expect(insert.formatInsert(), 'to equal', { sql: 'INSERT INTO user' });
      });
    });

    describe('with the `data` option set', () => {
      it('returns a formatted `INSERT` statement with values', () => {
        expect(
          insert.formatInsert({
            data: [
              { id: 1, name: 'foo', confirmed: true },
              new Query(User).setOptions({
                fields: ['id', 'name', 'confirmed'],
                where: { id: 2 }
              }),
              new Raw(User, {
                sql: '(SELECT id, name, confirmed FROM user WHERE id = ?)',
                values: [3]
              }),
              {
                id: 4,
                name: new Raw(User, {
                  sql: '(SELECT name FROM user WHERE id = ?)',
                  values: [4]
                }),
                confirmed: null
              }
            ]
          }),
          'to equal',
          {
            sql: [
              'INSERT INTO user (id, name, confirmed) VALUES ',
              '(?, ?, ?), ',
              '((SELECT user.id, user.name, user.confirmed FROM user WHERE user.id = ?)), ',
              '((SELECT id, name, confirmed FROM user WHERE id = ?)), ',
              '(?, (SELECT name FROM user WHERE id = ?), ?)'
            ].join(''),
            values: [1, 'foo', true, 2, 3, 4, 4, null]
          }
        );
      });
    });

    describe('with the `fields` option set', () => {
      it('includes a formatted `RETURNING` claus with aliases', () => {
        expect(
          insert.formatInsert({
            data: [{ id: 1, name: 'foo', confirmed: true }],
            fields: ['id', 'name']
          }),
          'to equal',
          {
            sql: [
              'INSERT INTO user (id, name, confirmed) VALUES ',
              '(?, ?, ?) ',
              'RETURNING user.id, user.name'
            ].join(''),
            aliases: ['id', 'name'],
            values: [1, 'foo', true]
          }
        );
      });

      it('supports Raw instances', () => {
        expect(
          insert.formatInsert({
            data: [{ id: 1, name: 'foo', confirmed: true }],
            fields: [
              {
                id: 'id',
                name: 'name',
                upper: new Raw(User, { sql: 'UPPER(?)', values: ['foo'] })
              }
            ]
          }),
          'to equal',
          {
            sql: [
              'INSERT INTO user (id, name, confirmed) VALUES ',
              '(?, ?, ?) ',
              'RETURNING user.id, user.name, UPPER(?)'
            ].join(''),
            aliases: ['id', 'name', 'upper'],
            values: [1, 'foo', true, 'foo']
          }
        );
      });

      it('supports the `alias` option', () => {
        expect(
          insert.formatInsert({
            data: [{ id: 1, name: 'foo', confirmed: true }],
            fields: ['id', 'name'],
            alias: 'alias'
          }),
          'to equal',
          {
            sql: [
              'INSERT INTO user AS alias (id, name, confirmed) VALUES ',
              '(?, ?, ?) ',
              'RETURNING alias.id, alias.name'
            ].join(''),
            aliases: ['id', 'name'],
            values: [1, 'foo', true]
          }
        );
      });
    });
  });
});

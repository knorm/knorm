const Knorm = require('../../lib/Knorm');
const expect = require('unexpected').clone();

describe.only('Grouping', () => {
  let Model;
  let Query;
  let User;
  let Sql;
  let Raw;
  let Condition;
  let Grouping;

  before(() => {
    const orm = new Knorm({});

    Model = orm.Model;
    Query = orm.Query;
    Sql = orm.Sql;
    Raw = Sql.Raw;
    Condition = Sql.Condition;
    Grouping = Sql.Grouping;

    User = class extends Model {};
    User.table = 'user';
    User.fields = { id: { type: 'integer', primary: true }, name: 'string' };
  });

  let sql;

  beforeEach(() => {
    sql = new Sql(User);
  });

  describe('Grouping.prototype.formatGrouping', () => {
    it('returns a correctly formatted clause for `AND` groupings', () => {
      const grouping = new Grouping({ type: 'and', value: [true, true] });
      expect(grouping.formatGrouping(sql), 'to equal', {
        sql: '(? AND ?)',
        values: [true, true]
      });
    });

    it('returns a correctly formatted clause for `OR` groupings', () => {
      const grouping = new Grouping({ type: 'or', value: [true, false] });
      expect(grouping.formatGrouping(sql), 'to equal', {
        sql: '(? OR ?)',
        values: [true, false]
      });
    });

    it('supports groupings of a single value', () => {
      const grouping = new Grouping({ type: 'and', value: true });
      expect(grouping.formatGrouping(sql), 'to equal', {
        sql: '?',
        values: [true]
      });
    });

    it('supports groupings of array values', () => {
      const grouping = new Grouping({ type: 'or', value: [[1, 2], [3, 4]] });
      expect(grouping.formatGrouping(sql), 'to equal', {
        sql: '(? OR ?)',
        values: [[1, 2], [3, 4]]
      });
    });

    it('supports groupings of Query instances', () => {
      const grouping = new Grouping({
        type: 'and',
        value: [new Query(User), new Query(User)]
      });
      expect(grouping.formatGrouping(sql), 'to equal', {
        sql: '((SELECT FROM user) AND (SELECT FROM user))'
      });
    });

    it('supports groupings of Query instances with options', () => {
      const grouping = new Grouping({
        type: 'and',
        value: [
          new Query(User).setOptions({ field: 'id', where: { id: 1 } }),
          new Query(User).setOptions({ field: 'name', where: { name: 'foo' } })
        ]
      });
      expect(grouping.formatGrouping(sql), 'to equal', {
        sql: [
          '((SELECT user.id FROM user WHERE user.id = ?) AND ',
          '(SELECT user.name FROM user WHERE user.name = ?))'
        ].join(''),
        values: [1, 'foo']
      });
    });

    it('supports groupings of Grouping instances', () => {
      const grouping = new Grouping({
        type: 'or',
        value: [
          new Grouping({ type: 'and', value: [1, 2] }),
          new Grouping({ type: 'and', value: [3, 4] })
        ]
      });
      expect(grouping.formatGrouping(sql), 'to equal', {
        sql: '((? AND ?) OR (? AND ?))',
        values: [1, 2, 3, 4]
      });
    });

    it('supports groupings of Condition instances', () => {
      const grouping = new Grouping({
        type: 'and',
        value: [
          new Condition({ type: 'equalTo', field: 'id', value: 10 }),
          new Condition({ type: 'like', field: 'name', value: 'foo' })
        ]
      });
      expect(grouping.formatGrouping(sql), 'to equal', {
        sql: '(user.id = ? AND user.name LIKE ?)',
        values: [10, 'foo']
      });
    });

    it('supports groupings of Raw instances', () => {
      const grouping = new Grouping({
        type: 'and',
        value: [
          new Raw({ sql: '(SELECT true)' }),
          new Raw({ sql: '(SELECT false)' })
        ]
      });
      expect(grouping.formatGrouping(sql), 'to equal', {
        sql: '((SELECT true) AND (SELECT false))'
      });
    });

    it('supports groupings of Raw instances with values', () => {
      const grouping = new Grouping({
        type: 'and',
        value: [
          new Raw({ sql: 'UPPER(name) = ?', values: ['FOO'] }),
          new Raw({ sql: 'LOWER(name) = ?', values: ['foo'] })
        ]
      });
      expect(grouping.formatGrouping(sql), 'to equal', {
        sql: '(UPPER(name) = ? AND LOWER(name) = ?)',
        values: ['FOO', 'foo']
      });
    });

    it('supports groupings of objects', () => {
      const grouping = new Grouping({
        type: 'and',
        value: { id: 1, name: 'foo' }
      });
      expect(grouping.formatGrouping(sql), 'to equal', {
        sql: '(user.id = ? AND user.name = ?)',
        values: [1, 'foo']
      });
    });

    it('supports groupings of arrays of objects', () => {
      const grouping = new Grouping({
        type: 'or',
        value: [{ id: 1, name: 'foo' }, { id: 2, name: 'bar' }]
      });
      expect(grouping.formatGrouping(sql), 'to equal', {
        sql:
          '((user.id = ? AND user.name = ?) OR (user.id = ? AND user.name = ?))',
        values: [1, 'foo', 2, 'bar']
      });
    });

    describe('for groupings of objects', () => {
      let grouping;

      beforeEach(() => {
        grouping = new Grouping({ type: 'and' });
      });

      it('supports array object values', () => {
        grouping.value = { id: [1], name: ['foo'] };
        expect(grouping.formatGrouping(sql), 'to equal', {
          sql: '(user.id = ? AND user.name = ?)',
          values: [[1], ['foo']]
        });
      });

      it('supports Query-instance object values', () => {
        grouping.value = {
          id: new Query(User).setOptions({ field: 'id', where: { id: 1 } }),
          name: new Query(User).setOptions({
            field: 'name',
            where: { name: 'foo' }
          })
        };
        expect(grouping.formatGrouping(sql), 'to equal', {
          sql: [
            '(user.id = (SELECT user.id FROM user WHERE user.id = ?) AND ',
            'user.name = (SELECT user.name FROM user WHERE user.name = ?))'
          ].join(''),
          values: [1, 'foo']
        });
      });

      it('supports Grouping-instance object values', () => {
        grouping.value = {
          id: new Grouping({ type: 'and', value: [1, 2] }),
          name: new Grouping({ type: 'and', value: ['foo', 'bar'] })
        };
        expect(grouping.formatGrouping(sql), 'to equal', {
          sql: '(user.id = (? AND ?) AND user.name = (? AND ?))',
          values: [1, 2, 'foo', 'bar']
        });
      });

      it('supports Condition-instance object values', () => {
        grouping.value = {
          id: new Condition({ type: 'not', value: 10 }),
          name: new Condition({
            type: 'exists',
            value: new Raw({ sql: '(SELECT true)' })
          })
        };
        expect(grouping.formatGrouping(sql), 'to equal', {
          sql: '(user.id = NOT ? AND user.name = EXISTS (SELECT true))',
          values: [10]
        });
      });

      it('supports Raw-instances object values', () => {
        grouping.value = {
          id: new Raw({ sql: '(SELECT true)' }),
          name: new Raw({ sql: 'LOWER(?)', values: ['foo'] })
        };
        expect(grouping.formatGrouping(sql), 'to equal', {
          sql: '(user.id = (SELECT true) AND user.name = LOWER(?))',
          values: ['foo']
        });
      });
    });
  });
});

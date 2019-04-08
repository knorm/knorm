const Knorm = require('../../lib/Knorm');
const expect = require('unexpected').clone();

describe.only('Condition', () => {
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

  describe('Condition.prototype.formatValue', () => {
    let condition;

    beforeEach(() => {
      condition = new Condition({});
    });

    describe('as a primitive', () => {
      it('returns correctly formatted sql and values', () => {
        condition.value = 10;
        expect(condition.formatValue(sql), 'to equal', {
          sql: '?',
          values: [10]
        });
      });
    });

    describe('as an array', () => {
      it('returns correctly formatted sql and values', () => {
        condition.value = [1, 2, 3];
        expect(condition.formatValue(sql), 'to equal', {
          sql: '?',
          values: [[1, 2, 3]]
        });
      });
    });

    describe('as a Query instance', () => {
      it('returns correctly formatted sql and values', () => {
        condition.value = new Query(User);
        expect(condition.formatValue(sql), 'to equal', {
          sql: '(SELECT FROM user)'
        });
      });

      it('supports `fields` on the Query', () => {
        condition.value = new Query(User).setOption('field', 'name');
        expect(condition.formatValue(sql), 'to equal', {
          sql: '(SELECT user.name FROM user)'
        });
      });

      it('supports `where` on the Query', () => {
        condition.value = new Query(User).setOption('where', { name: 'foo' });
        expect(condition.formatValue(sql), 'to equal', {
          sql: '(SELECT FROM user WHERE user.name = ?)',
          values: ['foo']
        });
      });

      it('supports `where` groupings on the Query', () => {
        condition.value = new Query(User).setOption(
          'where',
          new Grouping({
            type: 'or',
            value: [
              new Condition({ type: 'not', value: true }),
              new Grouping({
                type: 'and',
                value: [
                  new Condition({
                    type: 'equalTo',
                    field: 'name',
                    value: 'foo'
                  }),
                  {
                    id: new Condition({
                      type: 'any',
                      value: new Raw({ sql: '(SELECT * FROM "bar")' })
                    })
                  }
                ]
              })
            ]
          })
        );
        expect(condition.formatValue(sql), 'to equal', {
          sql:
            '(SELECT FROM user WHERE (NOT ? OR (user.name = ? AND user.id = ANY (SELECT * FROM "bar"))))',
          values: [true, 'foo']
        });
      });

      it('supports `in` conditions', () => {
        condition.type = 'in';
        condition.value = new Query(User).setOption('where', { name: 'foo' });
        expect(condition.formatValue(sql), 'to equal', {
          sql: '(SELECT FROM user WHERE user.name = ?)',
          values: ['foo']
        });
      });
    });

    describe('as a Raw instance', () => {
      it('returns correctly formatted sql', () => {
        condition.value = new Raw({ sql: '(SELECT * FROM "user")' });
        expect(condition.formatValue(sql), 'to equal', {
          sql: '(SELECT * FROM "user")'
        });
      });

      it('supports Raw instances with values', () => {
        condition.value = new Raw({
          sql: '(SELECT * FROM "user" WHERE ?)',
          values: [false]
        });
        expect(condition.formatValue(sql), 'to equal', {
          sql: '(SELECT * FROM "user" WHERE ?)',
          values: [false]
        });
      });

      it('supports `in` conditions', () => {
        condition.type = 'in';
        condition.value = new Raw({
          sql: '(SELECT ?)',
          values: [false]
        });
        expect(condition.formatValue(sql), 'to equal', {
          sql: '(SELECT ?)',
          values: [false]
        });
      });
    });

    describe('as a Grouping instance', () => {
      it('returns correctly formatted sql', () => {
        condition.value = new Grouping({
          type: 'or',
          value: [
            new Condition({ type: 'lessThan', field: 'id', value: 10 }),
            new Condition({ type: 'equalTo', field: 'name', value: 'bar' })
          ]
        });
        expect(condition.formatValue(sql), 'to equal', {
          sql: '(user.id < ? OR user.name = ?)',
          values: [10, 'bar']
        });
      });
    });

    describe('as a Condition instance', () => {
      it('returns correctly formatted sql', () => {
        condition.value = new Condition({
          type: 'notEqualTo',
          field: 'name',
          value: 'foo'
        });
        expect(condition.formatValue(sql), 'to equal', {
          sql: 'user.name <> ?',
          values: ['foo']
        });
      });

      it('supports nested Condition instances', () => {
        condition.value = new Condition({
          type: 'not',
          value: new Condition({ type: 'equalTo', field: 'name', value: 'foo' })
        });
        expect(condition.formatValue(sql), 'to equal', {
          sql: 'NOT user.name = ?',
          values: ['foo']
        });
      });

      it('supports nested Query instances', () => {
        condition.value = new Condition({
          type: 'not',
          value: new Query(User)
        });
        expect(condition.formatValue(sql), 'to equal', {
          sql: 'NOT (SELECT FROM user)'
        });
      });

      it('supports nested Query instances with options', () => {
        condition.value = new Condition({
          type: 'not',
          value: new Query(User).setOptions({
            field: 'name',
            where: { name: 'foo' }
          })
        });
        expect(condition.formatValue(sql), 'to equal', {
          sql: 'NOT (SELECT user.name FROM user WHERE user.name = ?)',
          values: ['foo']
        });
      });

      it('supports nested Raw instances', () => {
        condition.value = new Condition({
          type: 'not',
          value: new Raw({ sql: '(SELECT name FROM user)' })
        });
        expect(condition.formatValue(sql), 'to equal', {
          sql: 'NOT (SELECT name FROM user)'
        });
      });

      it('supports nested Raw instances with values', () => {
        condition.value = new Condition({
          type: 'not',
          value: new Raw({
            sql: '(SELECT name FROM user WHERE name = ?)',
            values: ['foo']
          })
        });
        expect(condition.formatValue(sql), 'to equal', {
          sql: 'NOT (SELECT name FROM user WHERE name = ?)',
          values: ['foo']
        });
      });

      it('supports nested Grouping instances', () => {
        condition.value = new Condition({
          type: 'not',
          value: new Grouping({
            type: 'or',
            value: [
              new Condition({ type: 'equalTo', field: 'name', value: 'foo' }),
              new Condition({ type: 'equalTo', field: 'name', value: 'bar' })
            ]
          })
        });
        expect(condition.formatValue(sql), 'to equal', {
          sql: 'NOT (user.name = ? OR user.name = ?)',
          values: ['foo', 'bar']
        });
      });
    });

    describe('for `between`', () => {
      beforeEach(() => {
        condition = new Condition({ type: 'between' });
      });

      it('returns correctly formatted sql and values', () => {
        condition.value = [1, 2];
        expect(condition.formatValue(sql), 'to equal', {
          sql: '? AND ?',
          values: [1, 2]
        });
      });

      it('only returns the first two array values', () => {
        condition.value = [1, 2, 3];
        expect(condition.formatValue(sql), 'to equal', {
          sql: '? AND ?',
          values: [1, 2]
        });
      });
    });

    describe('for `in`', () => {
      beforeEach(() => {
        condition = new Condition({ type: 'in' });
      });

      it('returns correctly formatted sql and values', () => {
        condition.value = [1, 2, 3];
        expect(condition.formatValue(sql), 'to equal', {
          sql: '(?, ?, ?)',
          values: [1, 2, 3]
        });
      });

      it('converts the clause to `IN (null)` if the array is empty', () => {
        condition.value = [];
        expect(condition.formatValue(sql), 'to equal', {
          sql: '(?)',
          values: [null]
        });
      });
    });
  });

  describe('Condition.prototype.formatCondition', () => {
    it('supports `NOT`', () => {
      const condition = new Condition({ type: 'not', value: true });
      expect(condition.formatCondition(sql), 'to equal', {
        sql: 'NOT ?',
        values: [true]
      });
    });

    it('supports `EXISTS`', () => {
      const condition = new Condition({
        type: 'exists',
        value: new Query(User).setOptions({
          field: 'id',
          where: { name: 'foo' }
        })
      });
      expect(condition.formatCondition(sql), 'to equal', {
        sql: 'EXISTS (SELECT user.id FROM user WHERE user.name = ?)',
        values: ['foo']
      });
    });

    it('supports `ANY`', () => {
      const condition = new Condition({
        type: 'any',
        value: new Query(User).setOptions({
          field: 'id',
          where: { name: 'foo' }
        })
      });
      expect(condition.formatCondition(sql), 'to equal', {
        sql: 'ANY (SELECT user.id FROM user WHERE user.name = ?)',
        values: ['foo']
      });
    });

    it('supports `SOME`', () => {
      const condition = new Condition({
        type: 'some',
        value: new Query(User).setOptions({
          field: 'id',
          where: { name: 'foo' }
        })
      });
      expect(condition.formatCondition(sql), 'to equal', {
        sql: 'SOME (SELECT user.id FROM user WHERE user.name = ?)',
        values: ['foo']
      });
    });

    it('supports `ALL`', () => {
      const condition = new Condition({
        type: 'all',
        value: new Query(User).setOptions({
          field: 'id',
          where: { name: 'foo' }
        })
      });
      expect(condition.formatCondition(sql), 'to equal', {
        sql: 'ALL (SELECT user.id FROM user WHERE user.name = ?)',
        values: ['foo']
      });
    });

    it('supports `IS NULL`', () => {
      const condition = new Condition({
        field: 'id',
        type: 'isNull'
      });
      expect(condition.formatCondition(sql), 'to equal', {
        sql: 'user.id IS NULL'
      });
    });

    it('supports `IS NOT NULL`', () => {
      const condition = new Condition({
        field: 'id',
        type: 'isNotNull'
      });
      expect(condition.formatCondition(sql), 'to equal', {
        sql: 'user.id IS NOT NULL'
      });
    });

    it('supports `=`', () => {
      const condition = new Condition({
        field: 'id',
        type: 'equalTo',
        value: 1
      });
      expect(condition.formatCondition(sql), 'to equal', {
        sql: 'user.id = ?',
        values: [1]
      });
    });

    it('supports `<>`', () => {
      const condition = new Condition({
        field: 'id',
        type: 'notEqualTo',
        value: 1
      });
      expect(condition.formatCondition(sql), 'to equal', {
        sql: 'user.id <> ?',
        values: [1]
      });
    });

    it('supports `>`', () => {
      const condition = new Condition({
        field: 'id',
        type: 'greaterThan',
        value: 1
      });
      expect(condition.formatCondition(sql), 'to equal', {
        sql: 'user.id > ?',
        values: [1]
      });
    });

    it('supports `>=`', () => {
      const condition = new Condition({
        field: 'id',
        type: 'greaterThanOrEqualTo',
        value: 1
      });
      expect(condition.formatCondition(sql), 'to equal', {
        sql: 'user.id >= ?',
        values: [1]
      });
    });

    it('supports `<`', () => {
      const condition = new Condition({
        field: 'id',
        type: 'lessThan',
        value: 1
      });
      expect(condition.formatCondition(sql), 'to equal', {
        sql: 'user.id < ?',
        values: [1]
      });
    });

    it('supports `<=`', () => {
      const condition = new Condition({
        field: 'id',
        type: 'lessThanOrEqualTo',
        value: 1
      });
      expect(condition.formatCondition(sql), 'to equal', {
        sql: 'user.id <= ?',
        values: [1]
      });
    });

    it('supports `LIKE`', () => {
      const condition = new Condition({
        field: 'name',
        type: 'like',
        value: '%foo%'
      });
      expect(condition.formatCondition(sql), 'to equal', {
        sql: 'user.name LIKE ?',
        values: ['%foo%']
      });
    });

    it('supports `BETWEEN`', () => {
      const condition = new Condition({
        field: 'id',
        type: 'between',
        value: [1, 2]
      });
      expect(condition.formatCondition(sql), 'to equal', {
        sql: 'user.id BETWEEN ? AND ?',
        values: [1, 2]
      });
    });

    it('supports `IN`', () => {
      const condition = new Condition({
        field: 'id',
        type: 'in',
        value: [1, 2, 3]
      });
      expect(condition.formatCondition(sql), 'to equal', {
        sql: 'user.id IN (?, ?, ?)',
        values: [1, 2, 3]
      });
    });

    it('supports fields as Raw instances', () => {
      const condition = new Condition({
        field: new Raw({ sql: `lower('FOO')` }),
        type: 'equalTo',
        value: 'foo'
      });
      expect(condition.formatCondition(sql), 'to equal', {
        sql: `lower('FOO') = ?`,
        values: ['foo']
      });
    });

    it('supports fields as Raw instances with values', () => {
      const condition = new Condition({
        field: new Raw({ sql: 'lower(?)', values: ['FOO'] }),
        type: 'equalTo',
        value: 'foo'
      });
      expect(condition.formatCondition(sql), 'to equal', {
        sql: 'lower(?) = ?',
        values: ['FOO', 'foo']
      });
    });
  });
});

const Knorm = require('../../../lib/Knorm');
const expect = require('unexpected').clone();

describe('Condition', () => {
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
    Sql = Query.Sql;
    Raw = Query.Sql.Raw;
    Condition = Query.Sql.Condition;
    Grouping = Query.Sql.Grouping;

    User = class extends Model {};
    User.table = 'user';
    User.fields = { id: { type: 'integer', primary: true }, name: 'string' };
  });

  let sql;

  beforeEach(() => {
    sql = new Sql(new Query(User));
  });

  describe('Condition.prototype.getColumn', () => {
    let condition;

    beforeEach(() => {
      condition = new Condition({});
    });

    it('returns a formatted column via Sql.prototype.getColumn', () => {
      condition.field = 'id';
      expect(condition.getColumn(sql), 'to equal', {
        column: 'user.id',
        values: []
      });
    });

    it('supports Raw instances', () => {
      condition.field = new Raw({ sql: `lower('FOO')` });
      expect(condition.getColumn(sql), 'to equal', {
        column: `lower('FOO')`,
        values: []
      });
    });

    it('supports Raw instances with values', () => {
      condition.field = new Raw({ sql: 'lower(?)', values: ['FOO'] });
      expect(condition.getColumn(sql), 'to equal', {
        column: 'lower(?)',
        values: ['FOO']
      });
    });
  });

  describe('Condition.prototype.getPlaceholder', () => {
    let condition;

    beforeEach(() => {
      condition = new Condition({});
    });

    describe('as a primitive', () => {
      it('returns a correctly formatted placeholder and values', () => {
        condition.value = 10;
        expect(condition.getPlaceholder(sql), 'to equal', {
          placeholder: '?',
          values: [10]
        });
      });
    });

    describe('as an array', () => {
      it('returns a correctly formatted placeholder and values', () => {
        condition.value = [1, 2, 3];
        expect(condition.getPlaceholder(sql), 'to equal', {
          placeholder: '?',
          values: [[1, 2, 3]]
        });
      });
    });

    describe('as a Query instance', () => {
      it('returns a correctly formatted placeholder and values', () => {
        condition.value = new Query(User);
        expect(condition.getPlaceholder(sql), 'to equal', {
          placeholder: '(SELECT FROM user)',
          values: []
        });
      });

      it('supports `fields` on the Query', () => {
        condition.value = new Query(User).setOption('field', 'name');
        expect(condition.getPlaceholder(sql), 'to equal', {
          placeholder: '(SELECT user.name FROM user)',
          values: []
        });
      });

      it('supports `where` on the Query', () => {
        condition.value = new Query(User).setOption('where', { name: 'foo' });
        expect(condition.getPlaceholder(sql), 'to equal', {
          placeholder: '(SELECT FROM user WHERE user.name = ?)',
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
        expect(condition.getPlaceholder(sql), 'to equal', {
          placeholder:
            '(SELECT FROM user WHERE (NOT ? OR (user.name = ? AND user.id = ANY (SELECT * FROM "bar"))))',
          values: [true, 'foo']
        });
      });

      it('supports `in` conditions', () => {
        condition.type = 'in';
        condition.value = new Query(User).setOption('where', { name: 'foo' });
        expect(condition.getPlaceholder(sql), 'to equal', {
          placeholder: '(SELECT FROM user WHERE user.name = ?)',
          values: ['foo']
        });
      });
    });

    describe('as a Raw instance', () => {
      it('returns a correctly formatted placeholder', () => {
        condition.value = new Raw({ sql: '(SELECT * FROM "user")' });
        expect(condition.getPlaceholder(sql), 'to equal', {
          placeholder: '(SELECT * FROM "user")',
          values: []
        });
      });

      it('supports Raw instances with values', () => {
        condition.value = new Raw({
          sql: '(SELECT * FROM "user" WHERE ?)',
          values: [false]
        });
        expect(condition.getPlaceholder(sql), 'to equal', {
          placeholder: '(SELECT * FROM "user" WHERE ?)',
          values: [false]
        });
      });

      it('supports `in` conditions', () => {
        condition.type = 'in';
        condition.value = new Raw({
          sql: '(SELECT ?)',
          values: [false]
        });
        expect(condition.getPlaceholder(sql), 'to equal', {
          placeholder: '(SELECT ?)',
          values: [false]
        });
      });
    });

    describe('as a Grouping instance', () => {
      it('returns a correctly formatted placeholder', () => {
        condition.value = new Grouping({
          type: 'or',
          value: [
            new Condition({
              type: 'lessThan',
              field: 'id',
              value: 10
            }),
            new Condition({
              type: 'equalTo',
              field: 'name',
              value: 'bar'
            })
          ]
        });
        expect(condition.getPlaceholder(sql), 'to equal', {
          placeholder: '(user.id < ? OR user.name = ?)',
          values: [10, 'bar']
        });
      });
    });

    describe('as a Condition instance', () => {
      it('returns a correctly formatted placeholder', () => {
        condition.value = new Condition({
          type: 'notEqualTo',
          field: 'name',
          value: 'foo'
        });
        expect(condition.getPlaceholder(sql), 'to equal', {
          placeholder: 'user.name <> ?',
          values: ['foo']
        });
      });

      it('supports nested Condition instances', () => {
        condition.value = new Condition({
          type: 'not',
          value: new Condition({
            type: 'equalTo',
            field: 'name',
            value: 'foo'
          })
        });
        expect(condition.getPlaceholder(sql), 'to equal', {
          placeholder: 'NOT user.name = ?',
          values: ['foo']
        });
      });

      it('supports nested Query instances', () => {
        condition.value = new Condition({
          type: 'not',
          value: new Query(User)
        });
        expect(condition.getPlaceholder(sql), 'to equal', {
          placeholder: 'NOT (SELECT FROM user)',
          values: []
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
        expect(condition.getPlaceholder(sql), 'to equal', {
          placeholder: 'NOT (SELECT user.name FROM user WHERE user.name = ?)',
          values: ['foo']
        });
      });

      it('supports nested Raw instances', () => {
        condition.value = new Condition({
          type: 'not',
          value: new Raw({ sql: '(SELECT name FROM user)' })
        });
        expect(condition.getPlaceholder(sql), 'to equal', {
          placeholder: 'NOT (SELECT name FROM user)',
          values: []
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
        expect(condition.getPlaceholder(sql), 'to equal', {
          placeholder: 'NOT (SELECT name FROM user WHERE name = ?)',
          values: ['foo']
        });
      });

      it('supports nested Grouping instances', () => {
        condition.value = new Condition({
          type: 'not',
          value: new Grouping({
            type: 'or',
            value: [
              new Condition({
                type: 'equalTo',
                field: 'name',
                value: 'foo'
              }),
              new Condition({
                type: 'equalTo',
                field: 'name',
                value: 'bar'
              })
            ]
          })
        });
        expect(condition.getPlaceholder(sql), 'to equal', {
          placeholder: 'NOT (user.name = ? OR user.name = ?)',
          values: ['foo', 'bar']
        });
      });
    });

    describe('for `between`', () => {
      beforeEach(() => {
        condition = new Condition({ type: 'between' });
      });

      it('returns a correctly formatted placeholder and values', () => {
        condition.value = [1, 2];
        expect(condition.getPlaceholder(sql), 'to equal', {
          placeholder: '? AND ?',
          values: [1, 2]
        });
      });

      it('only returns the first two array values', () => {
        condition.value = [1, 2, 3];
        expect(condition.getPlaceholder(sql), 'to equal', {
          placeholder: '? AND ?',
          values: [1, 2]
        });
      });
    });

    describe('for `in`', () => {
      beforeEach(() => {
        condition = new Condition({ type: 'in' });
      });

      it('returns a correctly formatted placeholder and values', () => {
        condition.value = [1, 2, 3];
        expect(condition.getPlaceholder(sql), 'to equal', {
          placeholder: '(?, ?, ?)',
          values: [1, 2, 3]
        });
      });

      it('converts the clause to a `WHERE false` if the array is empty', () => {
        condition.value = [];
        expect(condition.getPlaceholder(sql), 'to equal', {
          placeholder: '?',
          values: [false]
        });
      });
    });
  });

  describe('Condition.prototype.getWhere', () => {
    it('supports `NOT`', () => {
      const condition = new Condition({ type: 'not', value: true });
      expect(condition.getWhere(sql), 'to equal', {
        where: 'NOT ?',
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
      expect(condition.getWhere(sql), 'to equal', {
        where: 'EXISTS (SELECT user.id FROM user WHERE user.name = ?)',
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
      expect(condition.getWhere(sql), 'to equal', {
        where: 'ANY (SELECT user.id FROM user WHERE user.name = ?)',
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
      expect(condition.getWhere(sql), 'to equal', {
        where: 'ALL (SELECT user.id FROM user WHERE user.name = ?)',
        values: ['foo']
      });
    });

    it('supports `IS NULL`', () => {
      const condition = new Condition({
        field: 'id',
        type: 'isNull'
      });
      expect(condition.getWhere(sql), 'to equal', {
        where: 'user.id IS NULL',
        values: []
      });
    });

    it('supports `IS NOT NULL`', () => {
      const condition = new Condition({
        field: 'id',
        type: 'isNotNull'
      });
      expect(condition.getWhere(sql), 'to equal', {
        where: 'user.id IS NOT NULL',
        values: []
      });
    });

    it('supports `=`', () => {
      const condition = new Condition({
        field: 'id',
        type: 'equalTo',
        value: 1
      });
      expect(condition.getWhere(sql), 'to equal', {
        where: 'user.id = ?',
        values: [1]
      });
    });

    it('supports `<>`', () => {
      const condition = new Condition({
        field: 'id',
        type: 'notEqualTo',
        value: 1
      });
      expect(condition.getWhere(sql), 'to equal', {
        where: 'user.id <> ?',
        values: [1]
      });
    });

    it('supports `>`', () => {
      const condition = new Condition({
        field: 'id',
        type: 'greaterThan',
        value: 1
      });
      expect(condition.getWhere(sql), 'to equal', {
        where: 'user.id > ?',
        values: [1]
      });
    });

    it('supports `>=`', () => {
      const condition = new Condition({
        field: 'id',
        type: 'greaterThanOrEqualTo',
        value: 1
      });
      expect(condition.getWhere(sql), 'to equal', {
        where: 'user.id >= ?',
        values: [1]
      });
    });

    it('supports `<`', () => {
      const condition = new Condition({
        field: 'id',
        type: 'lessThan',
        value: 1
      });
      expect(condition.getWhere(sql), 'to equal', {
        where: 'user.id < ?',
        values: [1]
      });
    });

    it('supports `<=`', () => {
      const condition = new Condition({
        field: 'id',
        type: 'lessThanOrEqualTo',
        value: 1
      });
      expect(condition.getWhere(sql), 'to equal', {
        where: 'user.id <= ?',
        values: [1]
      });
    });

    it('supports `LIKE`', () => {
      const condition = new Condition({
        field: 'name',
        type: 'like',
        value: '%foo%'
      });
      expect(condition.getWhere(sql), 'to equal', {
        where: 'user.name LIKE ?',
        values: ['%foo%']
      });
    });

    it('supports `BETWEEN`', () => {
      const condition = new Condition({
        field: 'id',
        type: 'between',
        value: [1, 2]
      });
      expect(condition.getWhere(sql), 'to equal', {
        where: 'user.id BETWEEN ? AND ?',
        values: [1, 2]
      });
    });

    it('supports `IN`', () => {
      const condition = new Condition({
        field: 'id',
        type: 'in',
        value: [1, 2, 3]
      });
      expect(condition.getWhere(sql), 'to equal', {
        where: 'user.id IN (?, ?, ?)',
        values: [1, 2, 3]
      });
    });

    it('supports fields as Raw instances', () => {
      const condition = new Condition({
        field: new Raw({ sql: `lower('FOO')` }),
        type: 'equalTo',
        value: 'foo'
      });
      expect(condition.getWhere(sql), 'to equal', {
        where: `lower('FOO') = ?`,
        values: ['foo']
      });
    });

    it('supports fields as Raw instances with values', () => {
      const condition = new Condition({
        field: new Raw({ sql: 'lower(?)', values: ['FOO'] }),
        type: 'equalTo',
        value: 'foo'
      });
      expect(condition.getWhere(sql), 'to equal', {
        where: 'lower(?) = ?',
        values: ['FOO', 'foo']
      });
    });
  });
});

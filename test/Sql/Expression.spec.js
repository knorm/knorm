const Knorm = require('../../lib/Knorm');
const sinon = require('sinon');
const expect = require('unexpected')
  .clone()
  .use(require('unexpected-sinon'));

describe.only('Expression', () => {
  let Model;
  let Query;
  let User;
  let Sql;
  let Raw;
  let Expression;

  before(() => {
    const orm = new Knorm({});

    Model = orm.Model;
    Query = orm.Query;
    Sql = orm.Sql;
    Raw = Sql.Raw;
    Expression = Sql.Expression;

    User = class extends Model {};
    User.table = 'user';
    User.fields = { id: { type: 'integer', primary: true }, name: 'string' };
  });

  let expression;

  beforeEach(() => {
    expression = new Expression(User, {});
  });

  describe('Expression.prototype.formatArray', () => {
    it('returns a placeholder and the array as is', () => {
      expect(expression.formatArray([1]), 'to equal', {
        sql: '?',
        values: [[1]]
      });
    });
  });

  describe('Expression.prototype.formatObject', () => {
    describe('for `and` and `or` expressions', () => {
      it('returns correctly formatted sql and values', () => {
        expression.type = 'and';
        expect(expression.formatObject({ id: 1, name: 'foo' }), 'to equal', {
          sql: '(user.id = ? AND user.name = ?)',
          values: [1, 'foo']
        });
      });

      it('propagates options', () => {
        const formatExpression = sinon.spy(
          Expression.prototype,
          'formatExpression'
        );
        expression.type = 'or';
        expect(
          expression.formatObject({ id: 1, name: 'foo' }, { alias: 'alias' }),
          'to equal',
          { sql: '(alias.id = ? AND alias.name = ?)', values: [1, 'foo'] }
        );
        expect(formatExpression, 'to have calls satisfying', () => {
          formatExpression({ alias: 'alias' }); // for the object
          formatExpression({ alias: 'alias' }); // for the 'id' field
          formatExpression({ alias: 'alias' }); // for the 'name' field
        });
        formatExpression.restore();
      });

      it('supports nested Expression instances', () => {
        expression.type = 'and';
        expect(
          expression.formatValue({
            id: new Expression(User, {
              type: 'any',
              value: new Query(User).setOptions({
                field: 'id',
                where: { name: 'foo' }
              })
            })
          }),
          'to equal',
          {
            sql: 'user.id = ANY (SELECT user.id FROM user WHERE user.name = ?)',
            values: ['foo']
          }
        );
      });

      it('supports nested Query instances', () => {
        expression.type = 'or';
        expect(
          expression.formatValue({
            id: new Query(User).setOptions({ field: 'id', where: { id: 1 } })
          }),
          'to equal',
          {
            sql: 'user.id = (SELECT user.id FROM user WHERE user.id = ?)',
            values: [1]
          }
        );
      });

      it('supports nested Raw instances', () => {
        expression.type = 'and';
        expect(
          expression.formatValue({
            name: new Raw(User, {
              sql: '(SELECT name FROM user WHERE name = ?)',
              values: ['foo']
            })
          }),
          'to equal',
          {
            sql: 'user.name = (SELECT name FROM user WHERE name = ?)',
            values: ['foo']
          }
        );
      });

      it('supports nested `and` and `or` expressions', () => {
        expression.type = 'or';
        expect(
          expression.formatValue({
            name: new Expression(User, {
              type: 'or',
              value: [
                new Expression(User, {
                  type: 'equalTo',
                  field: 'name',
                  value: 'foo'
                }),
                new Expression(User, {
                  type: 'equalTo',
                  field: 'name',
                  value: 'bar'
                })
              ]
            })
          }),
          'to equal',
          {
            sql: 'user.name = (user.name = ? OR user.name = ?)',
            values: ['foo', 'bar']
          }
        );
      });
    });

    describe('for all other expressions', () => {
      it('returns a plceholder and the object as is', () => {
        expression.type = 'equalTo';
        expect(expression.formatObject({ id: 1, name: 'foo' }), 'to equal', {
          sql: '?',
          values: [{ id: 1, name: 'foo' }]
        });
      });
    });
  });

  describe('Expression.prototype.formatPrimitive', () => {
    it('returns a placeholder and the primitive as is', () => {
      expect(expression.formatPrimitive(1), 'to equal', {
        sql: '?',
        values: [1]
      });
    });

    it('supports falsy values', () => {
      expect(expression.formatPrimitive(false), 'to equal', {
        sql: '?',
        values: [false]
      });
    });

    it('supports `undefined`', () => {
      expect(expression.formatPrimitive(undefined), 'to equal', {
        sql: '?'
      });
    });
  });

  describe('Expression.prototype.formatValue', () => {
    it('supports Query instances', () => {
      expect(expression.formatValue(new Query(User)), 'to equal', {
        sql: '(SELECT FROM user)'
      });
    });

    it('supports Expression instances', () => {
      expect(
        expression.formatValue(
          new Expression(User, {
            type: 'notEqualTo',
            field: 'name',
            value: 'foo'
          })
        ),
        'to equal',
        { sql: 'user.name <> ?', values: ['foo'] }
      );
    });

    it('supports Raw instances', () => {
      expect(
        expression.formatValue(new Raw(User, '(SELECT * FROM "user")')),
        'to equal',
        { sql: '(SELECT * FROM "user")' }
      );
    });

    it('supports arrays', () => {
      expect(expression.formatValue([1, 2]), 'to equal', {
        sql: '?',
        values: [[1, 2]]
      });
    });

    it('supports objects', () => {
      expression.type = 'and';
      expect(expression.formatObject({ id: 1 }), 'to equal', {
        sql: 'user.id = ?',
        values: [1]
      });
    });

    it('supports primitives', () => {
      expect(expression.formatValue(10), 'to equal', {
        sql: '?',
        values: [10]
      });
    });

    describe('for Query instances', () => {
      it('supports Query options', () => {
        expect(
          expression.formatValue(
            new Query(User).setOptions({
              field: 'name',
              where: { name: 'foo' }
            })
          ),
          'to equal',
          {
            sql: '(SELECT user.name FROM user WHERE user.name = ?)',
            aliases: ['name'],
            values: ['foo']
          }
        );
      });

      it('does not propagate options to the (isolate) Query instance', () => {
        const formatSelect = sinon.spy(Query.prototype, 'formatSelect');
        expect(
          expression.formatValue(new Query(User), { fields: ['id'] }),
          'to equal',
          { sql: '(SELECT FROM user)' }
        );
        expect(formatSelect, 'to have calls satisfying', () => formatSelect());
        formatSelect.restore();
      });
    });

    describe('for Expression instances', () => {
      it('propagates options', () => {
        const formatExpression = sinon.spy(
          Expression.prototype,
          'formatExpression'
        );
        expect(
          expression.formatValue(
            new Expression(User, {
              type: 'equalTo',
              field: 'name',
              value: 'foo'
            }),
            { alias: 'alias' }
          ),
          'to equal',
          {
            sql: 'alias.name = ?',
            values: ['foo']
          }
        );
        expect(formatExpression, 'to have calls satisfying', () =>
          formatExpression({ alias: 'alias' })
        );
        formatExpression.restore();
      });
    });

    describe('for Raw instances', () => {
      it('supports values', () => {
        expect(
          expression.formatValue(
            new Raw(User, {
              sql: '(SELECT * FROM "user" WHERE ?)',
              values: [false]
            })
          ),
          'to equal',
          { sql: '(SELECT * FROM "user" WHERE ?)', values: [false] }
        );
      });

      it('propagates options', () => {
        const formatRaw = sinon.spy(Raw.prototype, 'formatRaw');
        expect(
          expression.formatValue(
            new Raw(User, { sql: '(SELECT * FROM "user")' }),
            { fields: ['id'] }
          ),
          'to equal',
          { sql: '(SELECT * FROM "user")' }
        );
        expect(formatRaw, 'to have calls satisfying', () =>
          formatRaw({ fields: ['id'] })
        );
        formatRaw.restore();
      });
    });

    describe('for arrays', () => {
      it('propagates options', () => {
        const formatArray = sinon.spy(Expression.prototype, 'formatArray');
        expect(expression.formatValue([10], { fields: ['id'] }), 'to equal', {
          sql: '?',
          values: [[10]]
        });
        expect(formatArray, 'to have calls satisfying', () =>
          formatArray([10], { fields: ['id'] })
        );
        formatArray.restore();
      });
    });

    describe('for objects', () => {
      it('propagates options', () => {
        const formatObject = sinon.spy(Expression.prototype, 'formatObject');
        expression.type = 'and';
        expect(
          expression.formatValue({ id: 1 }, { alias: 'alias' }),
          'to equal',
          { sql: 'alias.id = ?', values: [1] }
        );
        expect(formatObject, 'to have calls satisfying', () =>
          formatObject({ id: 1 }, { alias: 'alias' })
        );
        formatObject.restore();
      });
    });

    describe('for primitives', () => {
      it('propagates options', () => {
        const formatPrimitive = sinon.spy(
          Expression.prototype,
          'formatPrimitive'
        );
        expect(expression.formatPrimitive(10, { fields: ['id'] }), 'to equal', {
          sql: '?',
          values: [10]
        });
        expect(formatPrimitive, 'to have calls satisfying', () =>
          formatPrimitive(10, { fields: ['id'] })
        );
        formatPrimitive.restore();
      });
    });
  });

  describe('Expressions.prototype.formatValues', () => {
    it('returns an array of formatted sqls (per value) and values', () => {
      expect(
        expression.formatValues([
          new Query(User),
          new Expression(User, { type: 'equalTo', field: 'id', value: 1 }),
          new Raw(User, { sql: '(SELECT ?)', values: [false] }),
          [1, 2],
          { id: 1 },
          1
        ]),
        'to equal',
        {
          sqls: [
            '(SELECT FROM user)',
            'user.id = ?',
            '(SELECT ?)',
            '?',
            '?',
            '?'
          ],
          values: [1, false, [1, 2], { id: 1 }, 1]
        }
      );
    });

    it('propagates options', () => {
      const formatValue = sinon.spy(Expression.prototype, 'formatValue');
      expect(
        expression.formatValues(
          [
            new Query(User),
            new Expression(User, { type: 'equalTo', field: 'id', value: 1 }),
            new Raw(User, { sql: '(SELECT ?)', values: [false] }),
            [1, 2],
            { id: 1 },
            1
          ],
          { alias: 'alias' }
        ),
        'to equal',
        {
          sqls: [
            '(SELECT FROM user)',
            'alias.id = ?',
            '(SELECT ?)',
            '?',
            '?',
            '?'
          ],
          values: [1, false, [1, 2], { id: 1 }, 1]
        }
      );
      expect(formatValue, 'to have calls satisfying', () => {
        formatValue(new Query(User), { alias: 'alias' });
        formatValue(
          new Expression(User, { type: 'equalTo', field: 'id', value: 1 }),
          { alias: 'alias' }
        );
        formatValue(1, { alias: 'alias' }); // the value from the Expression
        formatValue(new Raw(User, { sql: '(SELECT ?)', values: [false] }), {
          alias: 'alias'
        });
        formatValue([1, 2], { alias: 'alias' });
        formatValue({ id: 1 }, { alias: 'alias' });
        formatValue(1, { alias: 'alias' });
      });
      formatValue.restore();
    });
  });

  describe('Expressions.prototype.formatGrouping', () => {
    it('supports `and` expressions', () => {
      expression.type = 'and';
      expect(expression.formatGrouping([true, true]), 'to equal', {
        sql: '(? AND ?)',
        values: [true, true]
      });
    });

    it('supports `or` expressions', () => {
      expression.type = 'or';
      expect(expression.formatGrouping([true, false]), 'to equal', {
        sql: '(? OR ?)',
        values: [true, false]
      });
    });

    it('supports single values', () => {
      expression.type = 'and';
      expect(expression.formatGrouping(true), 'to equal', {
        sql: '?',
        values: [true]
      });
    });

    it('supports array values', () => {
      expression.type = 'or';
      expect(expression.formatGrouping([[1, 2], [3, 4]]), 'to equal', {
        sql: '(? OR ?)',
        values: [[1, 2], [3, 4]]
      });
    });

    it('supports Query instances', () => {
      expression.type = 'and';
      expect(
        expression.formatGrouping([
          new Query(User).setOptions({ field: 'id', where: { id: 1 } }),
          new Query(User).setOptions({ field: 'name', where: { name: 'foo' } })
        ]),
        'to equal',
        {
          sql: [
            '((SELECT user.id FROM user WHERE user.id = ?) AND ',
            '(SELECT user.name FROM user WHERE user.name = ?))'
          ].join(''),
          values: [1, 'foo']
        }
      );
    });

    it('supports Expression instances', () => {
      expression.type = 'or';
      expect(
        expression.formatGrouping([
          new Expression(User, { type: 'equalTo', field: 'id', value: 10 }),
          new Expression(User, { type: 'like', field: 'name', value: 'foo' })
        ]),
        'to equal',
        { sql: '(user.id = ? OR user.name LIKE ?)', values: [10, 'foo'] }
      );
    });

    it('supports `and` and `or` Expression instances', () => {
      expression.type = 'and';
      expect(
        expression.formatGrouping([
          new Expression(User, { type: 'and', value: [1, 2] }),
          new Expression(User, { type: 'or', value: [3, 4] })
        ]),
        'to equal',
        { sql: '((? AND ?) AND (? OR ?))', values: [1, 2, 3, 4] }
      );
    });

    it('supports Raw instances', () => {
      expression.type = 'or';
      expect(
        expression.formatGrouping([
          new Raw(User, { sql: 'UPPER(name) = ?', values: ['FOO'] }),
          new Raw(User, { sql: 'LOWER(name) = ?', values: ['foo'] })
        ]),
        'to equal',
        { sql: '(UPPER(name) = ? OR LOWER(name) = ?)', values: ['FOO', 'foo'] }
      );
    });

    it('supports objects', () => {
      expression.type = 'and';
      expect(expression.formatGrouping({ id: 1, name: 'foo' }), 'to equal', {
        sql: '(user.id = ? AND user.name = ?)',
        values: [1, 'foo']
      });
    });

    it('supports arrays of objects', () => {
      expression.type = 'or';
      expect(
        expression.formatGrouping([
          { id: 1, name: 'foo' },
          { id: 2, name: 'bar' }
        ]),
        'to equal',
        {
          sql:
            '((user.id = ? AND user.name = ?) OR (user.id = ? AND user.name = ?))',
          values: [1, 'foo', 2, 'bar']
        }
      );
    });

    it('propagates options', () => {
      const formatValues = sinon.spy(Expression.prototype, 'formatValues');
      expression.type = 'and';
      expect(
        expression.formatGrouping({ id: 1, name: 'foo' }, { alias: 'alias' }),
        'to equal',
        {
          sql: '(alias.id = ? AND alias.name = ?)',
          values: [1, 'foo']
        }
      );
      expect(formatValues, 'to have calls satisfying', () => {
        formatValues([{ id: 1, name: 'foo' }], { alias: 'alias' });
        formatValues(
          [
            new Expression(User, { type: 'equalTo', field: 'id', value: 1 }),
            new Expression(User, {
              type: 'equalTo',
              field: 'name',
              value: 'foo'
            })
          ],
          { alias: 'alias' }
        );
      });
      formatValues.restore();
    });
  });

  describe('Expressions.prototype.formatBetween', () => {
    it('returns correctly formatted sql and values', () => {
      expect(expression.formatBetween([1, 2]), 'to equal', {
        sql: '? AND ?',
        values: [1, 2]
      });
    });

    it('only formats the first two array values', () => {
      expect(expression.formatBetween([1, 2, 3]), 'to equal', {
        sql: '? AND ?',
        values: [1, 2]
      });
    });

    it('supports Query instances', () => {
      expect(
        expression.formatBetween([
          new Query(User).setOptions({ field: 'id', where: { id: 1 } }),
          new Query(User).setOptions({ field: 'id', where: { id: 2 } })
        ]),
        'to equal',
        {
          sql: [
            '(SELECT user.id FROM user WHERE user.id = ?) AND ',
            '(SELECT user.id FROM user WHERE user.id = ?)'
          ].join(''),
          values: [1, 2]
        }
      );
    });

    it('supports Expression instances', () => {
      expect(
        expression.formatBetween([
          new Expression(User, { type: 'not', value: false }),
          new Expression(User, { type: 'not', value: true })
        ]),
        'to equal',
        {
          sql: 'NOT ? AND NOT ?',
          values: [false, true]
        }
      );
    });

    it('supports Raw instances', () => {
      expect(
        expression.formatBetween([
          new Raw(User, {
            sql: '(SELECT user.id FROM user WHERE user.id = ?)',
            values: [1]
          }),
          new Raw(User, {
            sql: '(SELECT user.id FROM user WHERE user.id = ?)',
            values: [2]
          })
        ]),
        'to equal',
        {
          sql: [
            '(SELECT user.id FROM user WHERE user.id = ?) AND ',
            '(SELECT user.id FROM user WHERE user.id = ?)'
          ].join(''),
          values: [1, 2]
        }
      );
    });

    it('propagates options', () => {
      const formatValues = sinon.spy(Expression.prototype, 'formatValues');
      expect(expression.formatBetween([1, 2], { alias: 'alias' }), 'to equal', {
        sql: '? AND ?',
        values: [1, 2]
      });
      expect(formatValues, 'to have calls satisfying', () => {
        formatValues([1, 2], { alias: 'alias' });
      });
      formatValues.restore();
    });
  });

  describe('Expressions.prototype.formatIn', () => {
    it('returns correctly formatted sql and values', () => {
      expect(expression.formatIn([1, 2]), 'to equal', {
        sql: '(?, ?)',
        values: [1, 2]
      });
    });

    it('converts the clause to `IN (null)` for empty arrays', () => {
      expect(expression.formatIn([]), 'to equal', {
        sql: '(?)',
        values: [null]
      });
    });

    it('supports Query instances', () => {
      expect(
        expression.formatIn([
          new Query(User).setOptions({ field: 'id', where: { name: 'foo' } }),
          new Query(User).setOptions({ field: 'id', where: { name: 'bar' } })
        ]),
        'to equal',
        {
          sql: [
            '((SELECT user.id FROM user WHERE user.name = ?), ',
            '(SELECT user.id FROM user WHERE user.name = ?))'
          ].join(''),
          values: ['foo', 'bar']
        }
      );
    });

    it('supports Expression instances', () => {
      expect(
        expression.formatIn([
          new Expression(User, { type: 'not', value: false }),
          new Expression(User, { type: 'not', value: true })
        ]),
        'to equal',
        {
          sql: '(NOT ?, NOT ?)',
          values: [false, true]
        }
      );
    });

    it('supports Raw instances', () => {
      expect(
        expression.formatIn([
          new Raw(User, {
            sql: '(SELECT user.id FROM user WHERE user.name = ?)',
            values: ['foo']
          }),
          new Raw(User, {
            sql: '(SELECT user.id FROM user WHERE user.name = ?)',
            values: ['bar']
          })
        ]),
        'to equal',
        {
          sql: [
            '((SELECT user.id FROM user WHERE user.name = ?), ',
            '(SELECT user.id FROM user WHERE user.name = ?))'
          ].join(''),
          values: ['foo', 'bar']
        }
      );
    });

    it('propagates options', () => {
      const formatValues = sinon.spy(Expression.prototype, 'formatValues');
      expect(expression.formatIn([1, 2], { alias: 'alias' }), 'to equal', {
        sql: '(?, ?)',
        values: [1, 2]
      });
      expect(formatValues, 'to have calls satisfying', () => {
        formatValues([1, 2], { alias: 'alias' });
      });
      formatValues.restore();
    });
  });

  describe('Expression.prototype.formatExpression', () => {
    it('supports `AND`', () => {
      const expression = new Expression(User, {
        type: 'and',
        value: [true, true]
      });
      expect(expression.formatExpression(), 'to equal', {
        sql: '(? AND ?)',
        values: [true, true]
      });
    });

    it('supports `OR`', () => {
      const expression = new Expression(User, {
        type: 'or',
        value: [true, false, true]
      });
      expect(expression.formatExpression(), 'to equal', {
        sql: '(? OR ? OR ?)',
        values: [true, false, true]
      });
    });

    it('supports `NOT`', () => {
      const expression = new Expression(User, { type: 'not', value: true });
      expect(expression.formatExpression(), 'to equal', {
        sql: 'NOT ?',
        values: [true]
      });
    });

    it('supports `EXISTS`', () => {
      const expression = new Expression(User, {
        type: 'exists',
        value: new Query(User).setOptions({
          field: 'id',
          where: { name: 'foo' }
        })
      });
      expect(expression.formatExpression(), 'to equal', {
        sql: 'EXISTS (SELECT user.id FROM user WHERE user.name = ?)',
        values: ['foo']
      });
    });

    it('supports `ANY`', () => {
      const expression = new Expression(User, {
        type: 'any',
        value: new Query(User).setOptions({
          field: 'id',
          where: { name: 'foo' }
        })
      });
      expect(expression.formatExpression(), 'to equal', {
        sql: 'ANY (SELECT user.id FROM user WHERE user.name = ?)',
        values: ['foo']
      });
    });

    it('supports `SOME`', () => {
      const expression = new Expression(User, {
        type: 'some',
        value: new Query(User).setOptions({
          field: 'id',
          where: { name: 'foo' }
        })
      });
      expect(expression.formatExpression(), 'to equal', {
        sql: 'SOME (SELECT user.id FROM user WHERE user.name = ?)',
        values: ['foo']
      });
    });

    it('supports `ALL`', () => {
      const expression = new Expression(User, {
        type: 'all',
        value: new Query(User).setOptions({
          field: 'id',
          where: { name: 'foo' }
        })
      });
      expect(expression.formatExpression(), 'to equal', {
        sql: 'ALL (SELECT user.id FROM user WHERE user.name = ?)',
        values: ['foo']
      });
    });

    it('supports `DISTINCT`', () => {
      const expression = new Expression(User, {
        type: 'distinct',
        value: new Query(User).setOptions({
          field: 'id',
          where: { name: 'foo' }
        })
      });
      expect(expression.formatExpression(), 'to equal', {
        sql: 'DISTINCT (SELECT user.id FROM user WHERE user.name = ?)',
        values: ['foo']
      });
    });

    it('supports `IS NULL`', () => {
      const expression = new Expression(User, {
        field: 'id',
        type: 'isNull'
      });
      expect(expression.formatExpression(), 'to equal', {
        sql: 'user.id IS NULL',
        values: []
      });
    });

    it('supports `IS NOT NULL`', () => {
      const expression = new Expression(User, {
        field: 'id',
        type: 'isNotNull'
      });
      expect(expression.formatExpression(), 'to equal', {
        sql: 'user.id IS NOT NULL',
        values: []
      });
    });

    it('supports `=`', () => {
      const expression = new Expression(User, {
        field: 'id',
        type: 'equalTo',
        value: 1
      });
      expect(expression.formatExpression(), 'to equal', {
        sql: 'user.id = ?',
        values: [1]
      });
    });

    it('supports `<>`', () => {
      const expression = new Expression(User, {
        field: 'id',
        type: 'notEqualTo',
        value: 1
      });
      expect(expression.formatExpression(), 'to equal', {
        sql: 'user.id <> ?',
        values: [1]
      });
    });

    it('supports `>`', () => {
      const expression = new Expression(User, {
        field: 'id',
        type: 'greaterThan',
        value: 1
      });
      expect(expression.formatExpression(), 'to equal', {
        sql: 'user.id > ?',
        values: [1]
      });
    });

    it('supports `>=`', () => {
      const expression = new Expression(User, {
        field: 'id',
        type: 'greaterThanOrEqualTo',
        value: 1
      });
      expect(expression.formatExpression(), 'to equal', {
        sql: 'user.id >= ?',
        values: [1]
      });
    });

    it('supports `<`', () => {
      const expression = new Expression(User, {
        field: 'id',
        type: 'lessThan',
        value: 1
      });
      expect(expression.formatExpression(), 'to equal', {
        sql: 'user.id < ?',
        values: [1]
      });
    });

    it('supports `<=`', () => {
      const expression = new Expression(User, {
        field: 'id',
        type: 'lessThanOrEqualTo',
        value: 1
      });
      expect(expression.formatExpression(), 'to equal', {
        sql: 'user.id <= ?',
        values: [1]
      });
    });

    it('supports `LIKE`', () => {
      const expression = new Expression(User, {
        field: 'name',
        type: 'like',
        value: '%foo%'
      });
      expect(expression.formatExpression(), 'to equal', {
        sql: 'user.name LIKE ?',
        values: ['%foo%']
      });
    });

    it('supports `BETWEEN`', () => {
      const expression = new Expression(User, {
        field: 'id',
        type: 'between',
        value: [1, 2]
      });
      expect(expression.formatExpression(), 'to equal', {
        sql: 'user.id BETWEEN ? AND ?',
        values: [1, 2]
      });
    });

    it('supports `IN`', () => {
      const expression = new Expression(User, {
        field: 'id',
        type: 'in',
        value: [1, 2, 3]
      });
      expect(expression.formatExpression(), 'to equal', {
        sql: 'user.id IN (?, ?, ?)',
        values: [1, 2, 3]
      });
    });

    it('supports fields as Raw instances', () => {
      const expression = new Expression(User, {
        field: new Raw(User, { sql: `lower('FOO')` }),
        type: 'equalTo',
        value: 'foo'
      });
      expect(expression.formatExpression(), 'to equal', {
        sql: `lower('FOO') = ?`,
        values: ['foo']
      });
    });

    it('supports fields as Raw instances with values', () => {
      const expression = new Expression(User, {
        field: new Raw(User, { sql: 'lower(?)', values: ['FOO'] }),
        type: 'equalTo',
        value: 'foo'
      });
      expect(expression.formatExpression(), 'to equal', {
        sql: 'lower(?) = ?',
        values: ['FOO', 'foo']
      });
    });

    it('supports falsy values', () => {
      const expression = new Expression(User, {
        field: 'id',
        type: 'equalTo',
        value: 0
      });
      expect(expression.formatExpression(), 'to equal', {
        sql: 'user.id = ?',
        values: [0]
      });
    });

    it('supports `null` values', () => {
      const expression = new Expression(User, {
        field: 'id',
        type: 'equalTo',
        value: null
      });
      expect(expression.formatExpression(), 'to equal', {
        sql: 'user.id = ?',
        values: [null]
      });
    });

    it('supports `undefined` values', () => {
      const expression = new Expression(User, {
        field: 'id',
        type: 'equalTo',
        value: undefined
      });
      expect(expression.formatExpression(), 'to equal', {
        sql: 'user.id = ?',
        values: []
      });
    });

    it('propagates options when formatting the field', () => {
      const formatField = sinon.spy(Expression.prototype, 'formatField');
      const expression = new Expression(User, {
        field: 'id',
        type: 'equalTo',
        value: 1
      });
      expect(expression.formatExpression({ alias: 'alias' }), 'to equal', {
        sql: 'alias.id = ?',
        values: [1]
      });
      expect(formatField, 'to have calls satisfying', () => {
        formatField('id', { alias: 'alias' });
      });
      formatField.restore();
    });

    it('propagates options when formatting the value', () => {
      const formatValue = sinon.spy(Expression.prototype, 'formatValue');
      const expression = new Expression(User, {
        field: 'id',
        type: 'equalTo',
        value: 1
      });
      expect(expression.formatExpression({ alias: 'alias' }), 'to equal', {
        sql: 'alias.id = ?',
        values: [1]
      });
      expect(formatValue, 'to have calls satisfying', () => {
        formatValue(1, { alias: 'alias' });
      });
      formatValue.restore();
    });

    it('propagates options for `and` expressions', () => {
      const formatGrouping = sinon.spy(Expression.prototype, 'formatGrouping');
      const expression = new Expression(User, {
        type: 'and',
        value: { id: 1, name: 'foo' }
      });
      expect(expression.formatExpression({ alias: 'alias' }), 'to equal', {
        sql: '(alias.id = ? AND alias.name = ?)',
        values: [1, 'foo']
      });
      expect(formatGrouping, 'to have calls satisfying', () => {
        formatGrouping({ id: 1, name: 'foo' }, { alias: 'alias' });
        formatGrouping(
          [
            new Expression(User, { type: 'equalTo', field: 'id', value: 1 }),
            new Expression(User, {
              type: 'equalTo',
              field: 'name',
              value: 'foo'
            })
          ],
          { alias: 'alias' }
        );
      });
      formatGrouping.restore();
    });

    it('propagates options for `or` expressions', () => {
      const formatGrouping = sinon.spy(Expression.prototype, 'formatGrouping');
      const expression = new Expression(User, {
        type: 'or',
        value: { id: 1, name: 'foo' }
      });
      expect(expression.formatExpression({ alias: 'alias' }), 'to equal', {
        sql: '(alias.id = ? AND alias.name = ?)',
        values: [1, 'foo']
      });
      expect(formatGrouping, 'to have calls satisfying', () => {
        formatGrouping({ id: 1, name: 'foo' }, { alias: 'alias' });
        formatGrouping(
          [
            new Expression(User, { type: 'equalTo', field: 'id', value: 1 }),
            new Expression(User, {
              type: 'equalTo',
              field: 'name',
              value: 'foo'
            })
          ],
          { alias: 'alias' }
        );
      });
      formatGrouping.restore();
    });

    it('propagates options for `between` expressions', () => {
      const formatBetween = sinon.spy(Expression.prototype, 'formatBetween');
      const expression = new Expression(User, {
        field: 'id',
        type: 'between',
        value: [1, 2]
      });
      expect(expression.formatExpression({ alias: 'alias' }), 'to equal', {
        sql: 'alias.id BETWEEN ? AND ?',
        values: [1, 2]
      });
      expect(formatBetween, 'to have calls satisfying', () => {
        formatBetween([1, 2], { alias: 'alias' });
      });
      formatBetween.restore();
    });

    it('propagates options for `in` expressions', () => {
      const formatIn = sinon.spy(Expression.prototype, 'formatIn');
      const expression = new Expression(User, {
        field: 'id',
        type: 'in',
        value: [1, 2]
      });
      expect(expression.formatExpression({ alias: 'alias' }), 'to equal', {
        sql: 'alias.id IN (?, ?)',
        values: [1, 2]
      });
      expect(formatIn, 'to have calls satisfying', () => {
        formatIn([1, 2], { alias: 'alias' });
      });
      formatIn.restore();
    });
  });
});

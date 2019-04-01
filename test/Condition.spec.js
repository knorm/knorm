const Sql = require('../lib/Sql');
const Raw = require('../lib/Raw');
const Knorm = require('../lib/Knorm');
const Condition = require('../lib/Condition');
const Grouping = require('../lib/Grouping');
const expect = require('unexpected').clone();

describe.only('Condition', () => {
  let Model;
  let Query;
  let User;

  before(() => {
    const orm = new Knorm({});

    Model = orm.Model;
    Query = orm.Query;

    User = class extends Model {};
    User.table = 'user';
    User.fields = {
      id: { type: 'integer', primary: true },
      name: 'string',
      description: 'string',
      age: 'integer',
      confirmed: 'boolean'
    };
  });

  let sql;

  beforeEach(() => {
    sql = new Sql(new Query(User));
  });

  describe('Condition.protoype.getColumn', () => {
    let condition;

    beforeEach(() => {
      condition = new Condition({});
    });

    describe('with `Condition.prototype.field` unset', () => {
      it('returns `undefined`', () => {
        expect(condition.getColumn(sql), 'to be undefined');
      });
    });

    describe('with `Condition.prototype.field` set', () => {
      it('returns a formatted column via Sql.prototype.getColumn', () => {
        condition.field = 'id';
        expect(condition.getColumn(sql), 'to be', 'user.id');
      });
    });
  });

  describe('Condition.protoype.getValue', () => {
    let condition;

    beforeEach(() => {
      condition = new Condition({});
    });

    describe('with `Condition.prototype.value` unset', () => {
      it('returns `undefined`', () => {
        expect(condition.getValue(sql), 'to be undefined');
      });
    });

    describe('with `Condition.prototype.value` set', () => {
      describe('as a primitive', () => {
        it('returns a correctly formatted placeholder and values', () => {
          condition.value = 10;
          expect(condition.getValue(sql), 'to equal', {
            placeholder: '?',
            values: [10]
          });
        });
      });

      describe('as an array', () => {
        it('returns a correctly formatted placeholder and values', () => {
          condition.value = [1, 2, 3];
          expect(condition.getValue(sql), 'to equal', {
            placeholder: '?',
            values: [[1, 2, 3]]
          });
        });

        describe('for `between`', () => {
          beforeEach(() => {
            condition = new Condition({ type: 'between' });
          });

          it('returns a correctly formatted placeholder and values', () => {
            condition.value = [1, 2];
            expect(condition.getValue(sql), 'to equal', {
              placeholder: '? AND ?',
              values: [1, 2]
            });
          });

          it('only returns the first two array values', () => {
            condition.value = [1, 2, 3];
            expect(condition.getValue(sql), 'to equal', {
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
            expect(condition.getValue(sql), 'to equal', {
              placeholder: '(?, ?, ?)',
              values: [1, 2, 3]
            });
          });

          it('converts the value to a `WHERE false` if the array is empty', () => {
            condition.value = [];
            expect(condition.getValue(sql), 'to equal', {
              placeholder: '?',
              values: [false]
            });
          });
        });
      });

      describe('as a Query instance', () => {
        it('returns a correctly formatted placeholder and values', () => {
          condition.value = new Query(User);
          expect(condition.getValue(sql), 'to equal', {
            placeholder: '(SELECT FROM user)',
            values: []
          });
        });

        it('supports `fields` on the Query', () => {
          condition.value = new Query(User).setOption('field', 'name');
          expect(condition.getValue(sql), 'to equal', {
            placeholder: '(SELECT user.name FROM user)',
            values: []
          });
        });

        it('supports `where` on the Query', () => {
          condition.value = new Query(User).setOption('where', { name: 'foo' });
          expect(condition.getValue(sql), 'to equal', {
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
                        value: new Raw('(SELECT * FROM "bar")')
                      })
                    }
                  ]
                })
              ]
            })
          );
          expect(condition.getValue(sql), 'to equal', {
            placeholder:
              '(SELECT FROM user WHERE (NOT ? OR (user.name = ? AND user.id = ANY (SELECT * FROM "bar"))))',
            values: [true, 'foo']
          });
        });

        it('supports `in` conditions', () => {
          condition.type = 'in';
          condition.value = new Query(User).setOption('where', { name: 'foo' });
          expect(condition.getValue(sql), 'to equal', {
            placeholder: '(SELECT FROM user WHERE user.name = ?)',
            values: ['foo']
          });
        });
      });

      describe('as a Raw instance', () => {
        it('returns a correctly formatted placeholder', () => {
          condition.value = new Raw('(SELECT * FROM "user")');
          expect(condition.getValue(sql), 'to equal', {
            placeholder: '(SELECT * FROM "user")',
            values: []
          });
        });

        it('supports Raw instances with values', () => {
          condition.value = new Raw({
            sql: '(SELECT * FROM "user" WHERE ?)',
            values: [false]
          });
          expect(condition.getValue(sql), 'to equal', {
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
          expect(condition.getValue(sql), 'to equal', {
            placeholder: '(SELECT ?)',
            values: [false]
          });
        });
      });
    });
  });

  describe('Condition.protoype.getWhere', () => {
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

    describe('for `not` conditions', () => {
      it('supports boolean values', () => {
        const condition = new Condition({ type: 'not', value: true });
        expect(condition.getWhere(sql), 'to equal', {
          where: 'NOT ?',
          values: [true]
        });
      });

      it('supports Raw instances', () => {
        const condition = new Condition({
          type: 'not',
          value: new Raw('(SELECT false)')
        });
        expect(condition.getWhere(sql), 'to equal', {
          where: 'NOT (SELECT false)',
          values: []
        });
      });

      it('supports Raw instances with values', () => {
        const condition = new Condition({
          type: 'not',
          value: new Raw({ sql: '(SELECT ?)', values: [true] })
        });
        expect(condition.getWhere(sql), 'to equal', {
          where: 'NOT (SELECT ?)',
          values: [true]
        });
      });
    });
  });
});

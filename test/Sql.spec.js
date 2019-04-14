const Knorm = require('../lib/Knorm');
const sinon = require('sinon');
const expect = require('unexpected')
  .clone()
  .use(require('unexpected-sinon'));

describe.only('Sql', () => {
  let Model;
  let Query;
  let User;
  let Sql;

  let Raw;
  let Select;
  let Insert;
  let Expression;

  let SqlError;
  let UserWithSchema;

  before(() => {
    const orm = new Knorm({});

    Model = orm.Model;
    Query = orm.Query;
    Sql = orm.Sql;

    Raw = Sql.Raw;
    Select = Sql.Select;
    Insert = Sql.Insert;
    Expression = Sql.Expression;

    SqlError = Sql.SqlError;

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

  let sql;

  beforeEach(() => {
    sql = new Sql(User);
  });

  describe('Sql.prototype.raw', () => {
    it('returns a new Raw instance', () => {
      expect(
        sql.raw({ sql: 'SELECT ?', values: [1] }),
        'to equal',
        new Raw(User, { sql: 'SELECT ?', values: [1] })
      );
    });
  });

  describe('Sql.prototype.and', () => {
    it('returns a new `and` Expression', () => {
      expect(
        sql.and([{ id: 1 }]),
        'to equal',
        new Expression(User, { type: 'and', value: [{ id: 1 }] })
      );
    });
  });

  describe('Sql.prototype.or', () => {
    it('returns a new `or` Expression', () => {
      expect(
        sql.or([{ id: 1 }]),
        'to equal',
        new Expression(User, { type: 'or', value: [{ id: 1 }] })
      );
    });
  });

  describe('Sql.prototype.not', () => {
    it('returns a new `not` Expression', () => {
      expect(
        sql.not(false),
        'to equal',
        new Expression(User, { type: 'not', value: false })
      );
    });
  });

  describe('Sql.prototype.any', () => {
    it('returns a new `any` Expression', () => {
      expect(
        sql.any(new Query(User)),
        'to equal',
        new Expression(User, { type: 'any', value: new Query(User) })
      );
    });
  });

  describe('Sql.prototype.some', () => {
    it('returns a new `some` Expression', () => {
      expect(
        sql.some(new Query(User)),
        'to equal',
        new Expression(User, { type: 'some', value: new Query(User) })
      );
    });
  });

  describe('Sql.prototype.all', () => {
    it('returns a new `all` Expression', () => {
      expect(
        sql.all(new Raw('(SELECT 1)')),
        'to equal',
        new Expression(User, { type: 'all', value: new Raw('(SELECT 1)') })
      );
    });
  });

  describe('Sql.prototype.distinct', () => {
    it('returns a new `distinct` Expression', () => {
      expect(
        sql.distinct(new Raw('(SELECT 1)')),
        'to equal',
        new Expression(User, { type: 'distinct', value: new Raw('(SELECT 1)') })
      );
    });
  });

  describe('Sql.prototype.exists', () => {
    it('returns a new `exists` Expression', () => {
      expect(
        sql.exists(new Raw('(SELECT 1)')),
        'to equal',
        new Expression(User, { type: 'exists', value: new Raw('(SELECT 1)') })
      );
    });
  });

  describe('Sql.prototype.isNull', () => {
    it('returns a new `isNull` Expression', () => {
      expect(
        sql.isNull('id'),
        'to equal',
        new Expression(User, { type: 'isNull', field: 'id' })
      );
    });
  });

  describe('Sql.prototype.isNotNull', () => {
    it('returns a new `isNotNull` Expression', () => {
      expect(
        sql.isNotNull('name'),
        'to equal',
        new Expression(User, { type: 'isNotNull', field: 'name' })
      );
    });
  });

  describe('Sql.prototype.equalTo', () => {
    it('returns a new `equalTo` Expression', () => {
      expect(
        sql.equalTo('id', 1),
        'to equal',
        new Expression(User, { type: 'equalTo', field: 'id', value: 1 })
      );
    });
  });

  describe('Sql.prototype.notEqualTo', () => {
    it('returns a new `notEqualTo` Expression', () => {
      expect(
        sql.notEqualTo('id', 1),
        'to equal',
        new Expression(User, { type: 'notEqualTo', field: 'id', value: 1 })
      );
    });
  });

  describe('Sql.prototype.greaterThan', () => {
    it('returns a new `greaterThan` Expression', () => {
      expect(
        sql.greaterThan('id', 1),
        'to equal',
        new Expression(User, { type: 'greaterThan', field: 'id', value: 1 })
      );
    });
  });

  describe('Sql.prototype.greaterThanOrEqualTo', () => {
    it('returns a new `greaterThanOrEqualTo` Expression', () => {
      expect(
        sql.greaterThanOrEqualTo('id', 1),
        'to equal',
        new Expression(User, {
          type: 'greaterThanOrEqualTo',
          field: 'id',
          value: 1
        })
      );
    });
  });

  describe('Sql.prototype.lessThan', () => {
    it('returns a new `lessThan` Expression', () => {
      expect(
        sql.lessThan('id', 1),
        'to equal',
        new Expression(User, { type: 'lessThan', field: 'id', value: 1 })
      );
    });
  });

  describe('Sql.prototype.lessThanOrEqualTo', () => {
    it('returns a new `lessThanOrEqualTo` Expression', () => {
      expect(
        sql.lessThanOrEqualTo('id', 1),
        'to equal',
        new Expression(User, {
          type: 'lessThanOrEqualTo',
          field: 'id',
          value: 1
        })
      );
    });
  });

  describe('Sql.prototype.like', () => {
    it('returns a new `like` Expression', () => {
      expect(
        sql.like('name', 'foo'),
        'to equal',
        new Expression(User, { type: 'like', field: 'name', value: 'foo' })
      );
    });
  });

  describe('Sql.prototype.between', () => {
    it('returns a new `between` Expression', () => {
      expect(
        sql.between('id', [1, 2]),
        'to equal',
        new Expression(User, { type: 'between', field: 'id', value: [1, 2] })
      );
    });
  });

  describe('Sql.prototype.in', () => {
    it('returns a new `in` Expression', () => {
      expect(
        sql.in('id', [1, 2, 3]),
        'to equal',
        new Expression(User, { type: 'in', field: 'id', value: [1, 2, 3] })
      );
    });
  });

  describe('Sql.prototype.quoteIdentifier', () => {
    it('returns the identifier as is', () => {
      expect(sql.quoteIdentifier('order'), 'to be', 'order');
    });
  });

  describe('Sql.prototype.throwSqlError', () => {
    it('throws an SqlError', () => {
      expect(
        () => sql.throwSqlError(),
        'to throw',
        expect.it('to be an', SqlError)
      );
    });

    it('attaches the Sql instance to the error', () => {
      expect(
        () => sql.throwSqlError(),
        'to throw',
        expect.it('to satisfy', { sql })
      );
    });
  });

  describe('Sql.prototype.formatSchema', () => {
    describe('with `Model.schema` not set', () => {
      it('returns `undefined`', () => {
        expect(sql.formatSchema(), 'to be undefined');
      });
    });

    describe('with `Model.schema` configured', () => {
      it('returns a quoted `Model.schema`', () => {
        expect(new Sql(UserWithSchema).formatSchema(), 'to equal', {
          sql: 'public'
        });
      });
    });
  });

  describe('Sql.prototype.formatTable', () => {
    it('returns a quoted `Model.table`', () => {
      expect(sql.formatTable(), 'to equal', { sql: 'user' });
    });

    describe('with `Model.table` not configured', () => {
      it('throws an SqlError', () => {
        class Foo extends Model {}
        const sql = new Sql(Foo);
        expect(
          () => sql.formatTable(),
          'to throw',
          new SqlError({ message: 'Foo: `Foo.table` is not configured', sql })
        );
      });
    });

    describe('with `Model.schema` configured', () => {
      it('returns a quoted `Model.schema` and `Model.table`', () => {
        expect(new Sql(UserWithSchema).formatTable(), 'to equal', {
          sql: 'public.user'
        });
      });
    });
  });

  describe('Sql.prototype.formatAlias', () => {
    describe('with the `alias` option not set', () => {
      it('returns `undefined`', () => {
        expect(sql.formatAlias(), 'to be undefined');
      });
    });

    describe('with the `alias` option set', () => {
      it('returns a quoted alias', () => {
        expect(sql.formatAlias({ alias: 'foo' }), 'to equal', {
          sql: 'foo'
        });
      });
    });
  });

  describe('Sql.prototype.formatColumn', () => {
    it('returns a quoted unprefixed column', () => {
      expect(sql.formatColumn('id'), 'to equal', {
        sql: 'id'
      });
    });

    describe('with custom columns configured', () => {
      let OtherUser;

      beforeEach(() => {
        OtherUser = class extends User {};
        OtherUser.fields = { id: { type: 'integer', column: 'ID' } };
      });

      it('uses the configured columns', () => {
        expect(new Sql(OtherUser).formatColumn('id'), 'to equal', {
          sql: 'ID'
        });
      });
    });

    describe('with an unknown field-name', () => {
      it('throws an SqlError', () => {
        expect(
          () => sql.formatColumn({}),
          'to throw',
          new SqlError({
            message: 'User: Unknown field `[object Object]`',
            sql
          })
        );
      });
    });
  });

  describe('Sql.prototype.formatField', () => {
    it('returns a quoted table-name-prefixed column and no values', () => {
      expect(sql.formatField('id'), 'to equal', {
        sql: 'user.id'
      });
    });

    it('propagates options', () => {
      expect(sql.formatField('id', { alias: 'alias' }), 'to equal', {
        sql: 'alias.id'
      });
    });

    describe('with custom columns configured', () => {
      let OtherUser;

      beforeEach(() => {
        OtherUser = class extends User {};
        OtherUser.fields = { id: { type: 'integer', column: 'ID' } };
      });

      it('uses the configured columns', () => {
        expect(new Sql(OtherUser).formatField('id'), 'to equal', {
          sql: 'user.ID'
        });
      });
    });

    describe('with `Model.schema` configured', () => {
      it('returns a schema and table-name prefixed column', () => {
        expect(new Sql(UserWithSchema).formatField('id'), 'to equal', {
          sql: 'public.user.id'
        });
      });
    });

    describe('with the field is a Raw instance', () => {
      it('returns `Raw.prototype.sql` as the sql', () => {
        expect(
          sql.formatField(new Raw(User, { sql: 'COUNT(*)' })),
          'to equal',
          { sql: 'COUNT(*)' }
        );
      });

      it('returns `Raw.prototype.values` as values if set', () => {
        expect(
          sql.formatField(new Raw(User, { sql: 'UPPER(?)', values: ['foo'] })),
          'to equal',
          { sql: 'UPPER(?)', values: ['foo'] }
        );
      });
    });
  });

  describe('Sql.prototype.formatFields', () => {
    describe('with the `fields` option not set', () => {
      it('returns `undefined`', () => {
        expect(sql.formatFields(), 'to be undefined');
      });
    });

    describe('with the `fields` option set', () => {
      it('supports strings', () => {
        expect(sql.formatFields({ fields: ['id'] }), 'to equal', {
          sql: 'user.id',
          aliases: ['id'],
          values: []
        });
      });

      it('supports objects with string values', () => {
        expect(
          sql.formatFields({ fields: [{ theId: 'id', theName: 'name' }] }),
          'to equal',
          {
            sql: 'user.id, user.name',
            aliases: ['theId', 'theName'],
            values: []
          }
        );
      });

      it('supports objects with Raw-instance values', () => {
        expect(
          sql.formatFields({
            fields: [
              {
                count: new Raw(User, { sql: 'COUNT(*)' }),
                upperCaseFoo: new Raw(User, {
                  sql: 'UPPER(?)',
                  values: ['foo']
                })
              }
            ]
          }),
          'to equal',
          {
            sql: 'COUNT(*), UPPER(?)',
            aliases: ['count', 'upperCaseFoo'],
            values: ['foo']
          }
        );
      });

      it('propagates options', () => {
        const formatAlias = sinon.spy(Sql.prototype, 'formatAlias');
        expect(
          sql.formatFields({ fields: ['id'], alias: 'alias' }),
          'to equal',
          { sql: 'alias.id', aliases: ['id'], values: [] }
        );
        expect(formatAlias, 'to have calls satisfying', () => {
          formatAlias({ alias: 'alias' });
        });
        formatAlias.restore();
      });
    });
  });

  describe('Sql.prototype.formatReturning', () => {
    describe('with the `fields` option not set', () => {
      it('returns `undefined`', () => {
        expect(sql.formatReturning(), 'to be undefined');
      });
    });

    describe('with the `fields` option set', () => {
      it('returns a formatted `RETURNING` clause with values and aliases', () => {
        expect(
          sql.formatReturning({
            fields: [
              'id',
              { theName: 'name' },
              { upper: new Raw(User, { sql: 'UPPER(?)', values: ['foo'] }) }
            ]
          }),
          'to equal',
          {
            sql: 'RETURNING user.id, user.name, UPPER(?)',
            aliases: ['id', 'theName', 'upper'],
            values: ['foo']
          }
        );
      });

      it('propagates options', () => {
        const formatFields = sinon.spy(Sql.prototype, 'formatFields');
        expect(
          sql.formatReturning({ fields: ['id'], alias: 'alias' }),
          'to equal',
          { sql: 'RETURNING alias.id', aliases: ['id'], values: [] }
        );
        expect(formatFields, 'to have calls satisfying', () => {
          formatFields({ alias: 'alias' });
        });
        formatFields.restore();
      });
    });
  });

  describe('Sql.prototype.formatDistinct', () => {
    describe('with the `distinct` option not set', () => {
      it('returns `undefined`', () => {
        expect(sql.formatDistinct(), 'to be undefined');
      });
    });

    describe('with the `distinct` option set', () => {
      it('returns a `DISTINCT` clause', () => {
        expect(sql.formatDistinct({ distinct: true }), 'to equal', {
          sql: 'DISTINCT'
        });
      });
    });
  });

  describe('Sql.prototype.formatFrom', () => {
    it('returns a `FROM` clause with `Model.table`', () => {
      expect(sql.formatFrom(), 'to equal', {
        sql: 'FROM user'
      });
    });

    describe('with `Model.schema` configured', () => {
      it('returns a `FROM` clause with `Model.schema` and `Model.table`', () => {
        expect(new Sql(UserWithSchema).formatFrom(), 'to equal', {
          sql: 'FROM public.user'
        });
      });
    });

    describe('with the `alias` option set', () => {
      it('returns an aliased table-name with the quoted alias', () => {
        expect(sql.formatFrom({ alias: 'user' }), 'to equal', {
          sql: 'FROM user AS user'
        });
      });
    });
  });

  describe('Sql.prototype.formatWhere', () => {
    describe('with the `where` option not set', () => {
      it('returns `undefined`', () => {
        expect(sql.formatWhere(), 'to be undefined');
      });
    });

    describe('with the `where` option set', () => {
      it('supports objects', () => {
        expect(sql.formatWhere({ where: { id: 1, name: 'Foo' } }), 'to equal', {
          sql: 'WHERE (user.id = ? AND user.name = ?)',
          values: [1, 'Foo']
        });
      });

      it('supports arrays of objects', () => {
        expect(
          sql.formatWhere({ where: [{ id: 1, name: 'Foo' }] }),
          'to equal',
          {
            sql: 'WHERE (user.id = ? AND user.name = ?)',
            values: [1, 'Foo']
          }
        );
      });

      it('supports Expression instances', () => {
        expect(
          sql.formatWhere({
            where: new Expression(User, {
              field: 'id',
              type: 'equalTo',
              value: 1
            })
          }),
          'to equal',
          {
            sql: 'WHERE user.id = ?',
            values: [1]
          }
        );
      });

      it('supports Expression instances with fields as Raw instances', () => {
        expect(
          sql.formatWhere({
            where: new Expression(User, {
              field: new Raw(User, { sql: 'LOWER(?)', values: ['FOO'] }),
              type: 'equalTo',
              value: 'foo'
            })
          }),
          'to equal',
          {
            sql: 'WHERE LOWER(?) = ?',
            values: ['FOO', 'foo']
          }
        );
      });

      it('supports `and` Expression instances', () => {
        expect(
          sql.formatWhere({
            where: new Expression(User, {
              type: 'and',
              value: [
                new Expression(User, {
                  field: 'id',
                  type: 'equalTo',
                  value: 1
                }),
                new Expression(User, {
                  field: 'name',
                  type: 'equalTo',
                  value: 'foo'
                })
              ]
            })
          }),
          'to equal',
          {
            sql: 'WHERE (user.id = ? AND user.name = ?)',
            values: [1, 'foo']
          }
        );
      });

      it('supports `or` Expression instances', () => {
        expect(
          sql.formatWhere({
            where: new Expression(User, {
              type: 'or',
              value: [
                new Expression(User, {
                  field: 'id',
                  type: 'equalTo',
                  value: 1
                }),
                new Expression(User, {
                  field: 'name',
                  type: 'equalTo',
                  value: 'foo'
                })
              ]
            })
          }),
          'to equal',
          {
            sql: 'WHERE (user.id = ? OR user.name = ?)',
            values: [1, 'foo']
          }
        );
      });

      it('supports Query instances', () => {
        expect(sql.formatWhere({ where: new Query(User) }), 'to equal', {
          sql: 'WHERE (SELECT FROM user)',
          values: []
        });
      });

      it('supports Raw instances', () => {
        expect(
          sql.formatWhere({ where: new Raw(User, { sql: '(SELECT true)' }) }),
          'to equal',
          { sql: 'WHERE (SELECT true)', values: [] }
        );
      });

      it('supports Raw instances with values', () => {
        expect(
          sql.formatWhere({
            where: new Raw(User, { sql: 'LOWER(?)', values: ['FOO'] })
          }),
          'to equal',
          { sql: 'WHERE LOWER(?)', values: ['FOO'] }
        );
      });
    });
  });

  describe('Sql.prototype.formatHaving', () => {
    describe('with the `having` option not set', () => {
      it('returns `undefined`', () => {
        expect(sql.formatHaving(), 'to be undefined');
      });
    });

    describe('with the `having` option set', () => {
      it('supports objects', () => {
        expect(
          sql.formatHaving({ having: { id: 1, name: 'Foo' } }),
          'to equal',
          {
            sql: 'HAVING (user.id = ? AND user.name = ?)',
            values: [1, 'Foo']
          }
        );
      });

      it('supports arrays of objects', () => {
        expect(
          sql.formatHaving({ having: [{ id: 1, name: 'Foo' }] }),
          'to equal',
          {
            sql: 'HAVING (user.id = ? AND user.name = ?)',
            values: [1, 'Foo']
          }
        );
      });

      it('supports Expression instances', () => {
        expect(
          sql.formatHaving({
            having: new Expression(User, {
              field: 'id',
              type: 'equalTo',
              value: 1
            })
          }),
          'to equal',
          {
            sql: 'HAVING user.id = ?',
            values: [1]
          }
        );
      });

      it('supports Expression instances with fields as Raw instances', () => {
        expect(
          sql.formatHaving({
            having: new Expression(User, {
              field: new Raw(User, { sql: 'LOWER(?)', values: ['FOO'] }),
              type: 'equalTo',
              value: 'foo'
            })
          }),
          'to equal',
          {
            sql: 'HAVING LOWER(?) = ?',
            values: ['FOO', 'foo']
          }
        );
      });

      it('supports `and` Expression instances', () => {
        expect(
          sql.formatHaving({
            having: new Expression(User, {
              type: 'and',
              value: [
                new Expression(User, {
                  field: 'id',
                  type: 'equalTo',
                  value: 1
                }),
                new Expression(User, {
                  field: 'name',
                  type: 'equalTo',
                  value: 'foo'
                })
              ]
            })
          }),
          'to equal',
          {
            sql: 'HAVING (user.id = ? AND user.name = ?)',
            values: [1, 'foo']
          }
        );
      });

      it('supports `or` Expression instances', () => {
        expect(
          sql.formatHaving({
            having: new Expression(User, {
              type: 'or',
              value: [
                new Expression(User, {
                  field: 'id',
                  type: 'equalTo',
                  value: 1
                }),
                new Expression(User, {
                  field: 'name',
                  type: 'equalTo',
                  value: 'foo'
                })
              ]
            })
          }),
          'to equal',
          {
            sql: 'HAVING (user.id = ? OR user.name = ?)',
            values: [1, 'foo']
          }
        );
      });

      it('supports Query instances', () => {
        expect(sql.formatHaving({ having: new Query(User) }), 'to equal', {
          sql: 'HAVING (SELECT FROM user)',
          values: []
        });
      });

      it('supports Raw instances', () => {
        expect(
          sql.formatHaving({ having: new Raw(User, { sql: '(SELECT true)' }) }),
          'to equal',
          { sql: 'HAVING (SELECT true)', values: [] }
        );
      });

      it('supports Raw instances with values', () => {
        expect(
          sql.formatHaving({
            having: new Raw(User, { sql: 'LOWER(?)', values: ['FOO'] })
          }),
          'to equal',
          { sql: 'HAVING LOWER(?)', values: ['FOO'] }
        );
      });
    });
  });

  describe('Sql.prototype.formatParts', () => {
    it('returns formatted parts joined by a space', () => {
      expect(
        sql.formatParts([{ sql: 'part 1' }, { sql: 'part 2' }]),
        'to equal',
        { sql: 'part 1 part 2' }
      );
    });

    it('returns values if a part contains them', () => {
      expect(
        sql.formatParts([
          { sql: 'part 1', values: ['foo'] },
          { sql: 'part 2' }
        ]),
        'to equal',
        { sql: 'part 1 part 2', values: ['foo'] }
      );
    });

    it('merges values from multiple parts into one array', () => {
      expect(
        sql.formatParts([
          { sql: 'part 1', values: ['foo'] },
          { sql: 'part 2', values: ['bar'] }
        ]),
        'to equal',
        { sql: 'part 1 part 2', values: ['foo', 'bar'] }
      );
    });

    it('returns aliases if a part contains them', () => {
      expect(
        sql.formatParts([
          { sql: 'part 1', aliases: ['foo'] },
          { sql: 'part 2' }
        ]),
        'to equal',
        { sql: 'part 1 part 2', aliases: ['foo'] }
      );
    });

    it('merges aliases from multiple parts into one array', () => {
      expect(
        sql.formatParts([
          { sql: 'part 1', aliases: ['foo'] },
          { sql: 'part 2', aliases: ['bar'] }
        ]),
        'to equal',
        { sql: 'part 1 part 2', aliases: ['foo', 'bar'] }
      );
    });
  });

  describe('Sql.prototype.formatSelect', () => {
    it('returns a formatted `SELECT` clause with values and aliases', () => {
      expect(
        sql.formatSelect({
          fields: ['id'],
          where: { name: 'foo' }
        }),
        'to equal',
        {
          sql: 'SELECT user.id FROM user WHERE user.name = ?',
          aliases: ['id'],
          values: ['foo']
        }
      );
    });

    it('propagates options', () => {
      const formatSelect = sinon.spy(Select.prototype, 'formatSelect');
      expect(sql.formatSelect({ fields: ['id'], alias: 'alias' }), 'to equal', {
        sql: 'SELECT alias.id FROM user AS alias',
        aliases: ['id']
      });
      expect(formatSelect, 'to have calls satisfying', () => {
        formatSelect({ fields: ['id'], alias: 'alias' });
      });
      formatSelect.restore();
    });
  });

  describe('Sql.prototype.formatInsert', () => {
    it('returns a formatted `INSERT` clause with values and aliases', () => {
      expect(
        sql.formatInsert({ data: [{ id: 1 }], fields: ['id'] }),
        'to equal',
        {
          sql: 'INSERT INTO user (id) VALUES (?) RETURNING user.id',
          aliases: ['id'],
          values: [1]
        }
      );
    });

    it('propagates options', () => {
      const formatInsert = sinon.spy(Insert.prototype, 'formatInsert');
      expect(
        sql.formatInsert({ data: [{ id: 1 }], fields: ['id'] }),
        'to equal',
        {
          sql: 'INSERT INTO user (id) VALUES (?) RETURNING user.id',
          aliases: ['id'],
          values: [1]
        }
      );
      expect(formatInsert, 'to have calls satisfying', () => {
        formatInsert({ data: [{ id: 1 }], fields: ['id'] });
      });
      formatInsert.restore();
    });
  });

  describe('Sql.updateRaw', () => {
    let Foo;
    let FooSql;

    before(() => {
      Foo = class {};
      FooSql = class extends Sql {};
    });

    it('updates Sql.Raw', () => {
      FooSql.updateRaw(Foo);
      expect(FooSql.Raw, 'to be', Foo);
      expect(Sql.Raw, 'not to be', Foo);
    });

    it('allows chaining', () => {
      expect(FooSql.updateRaw(Foo), 'to be', FooSql);
    });
  });

  describe('Sql.updateExpression', () => {
    let Foo;
    let FooSql;

    before(() => {
      Foo = class {};
      FooSql = class extends Sql {};
    });

    it('updates Sql.Expression', () => {
      FooSql.updateExpression(Foo);
      expect(FooSql.Expression, 'to be', Foo);
      expect(Sql.Expression, 'not to be', Foo);
    });

    it('allows chaining', () => {
      expect(FooSql.updateExpression(Foo), 'to be', FooSql);
    });
  });

  describe('Sql.updateSelect', () => {
    let Foo;
    let FooSql;

    before(() => {
      Foo = class {};
      FooSql = class extends Sql {};
    });

    it('updates Sql.Select', () => {
      FooSql.updateSelect(Foo);
      expect(FooSql.Select, 'to be', Foo);
      expect(Sql.Select, 'not to be', Foo);
    });

    it('allows chaining', () => {
      expect(FooSql.updateSelect(Foo), 'to be', FooSql);
    });
  });

  describe('Sql.updateInsert', () => {
    let Foo;
    let FooSql;

    before(() => {
      Foo = class {};
      FooSql = class extends Sql {};
    });

    it('updates Sql.Insert', () => {
      FooSql.updateInsert(Foo);
      expect(FooSql.Insert, 'to be', Foo);
      expect(Sql.Insert, 'not to be', Foo);
    });

    it('allows chaining', () => {
      expect(FooSql.updateSelect(Foo), 'to be', FooSql);
    });
  });

  describe('Sql.updateSqlError', () => {
    let Foo;
    let FooSql;

    before(() => {
      Foo = class {};
      FooSql = class extends Sql {};
    });

    it('updates Sql.SqlError', () => {
      FooSql.updateSqlError(Foo);
      expect(FooSql.SqlError, 'to be', Foo);
      expect(Sql.SqlError, 'not to be', Foo);
    });

    it('allows chaining', () => {
      expect(FooSql.updateSqlError(Foo), 'to be', FooSql);
    });
  });
});

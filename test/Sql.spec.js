const Knorm = require('../lib/Knorm');
const expect = require('unexpected').clone();

describe.only('Sql', () => {
  let Model;
  let Query;
  let User;
  let Sql;
  let Raw;
  let Condition;
  let Grouping;
  let QuotedSql;
  let UserWithSchema;

  before(() => {
    const orm = new Knorm({});

    Model = orm.Model;
    Query = orm.Query;
    Sql = orm.Sql;
    Raw = Sql.Raw;
    Condition = Sql.Condition;
    Grouping = Sql.Grouping;

    QuotedSql = class extends Sql {
      quoteIdentifier(identifier) {
        return `"${identifier}"`;
      }
    };

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
    sql = new QuotedSql(User);
  });

  describe('Sql.prototype.quoteIdentifier', () => {
    it('returns the identifier as is', () => {
      expect(new Sql(User).quoteIdentifier('order'), 'to be', 'order');
    });
  });

  describe('Sql.prototype.formatSchema', () => {
    describe('with `Model.schema` not set', () => {
      it('returns `undefined`', () => {
        expect(sql.formatSchema(), 'to be undefined');
      });
    });

    describe('with `Model.schema` set', () => {
      it('returns a quoted `Model.schema`', () => {
        expect(new QuotedSql(UserWithSchema).formatSchema(), 'to equal', {
          sql: '"public"'
        });
      });
    });
  });

  describe('Sql.prototype.formatTable', () => {
    it('returns a quoted `Model.table`', () => {
      expect(sql.formatTable(), 'to equal', { sql: '"user"' });
    });

    describe('with `Model.schema` set', () => {
      it('returns a quoted `Model.schema` and `Model.table`', () => {
        expect(new QuotedSql(UserWithSchema).formatTable(), 'to equal', {
          sql: '"public"."user"'
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
          sql: '"foo"'
        });
      });
    });
  });

  describe('Sql.prototype.formatField', () => {
    it('returns a quoted table-name-prefixed column and no values', () => {
      expect(sql.formatField('id'), 'to equal', {
        sql: '"user"."id"'
      });
    });

    describe('with custom columns configured', () => {
      let OtherUser;

      beforeEach(() => {
        OtherUser = class extends User {};
        OtherUser.fields = { id: { type: 'integer', column: 'ID' } };
      });

      it('uses the configured columns', () => {
        expect(new QuotedSql(OtherUser).formatField('id'), 'to equal', {
          sql: '"user"."ID"'
        });
      });
    });

    describe('with `Model.schema` set', () => {
      it('returns a schema and table-name prefixed column', () => {
        expect(new QuotedSql(UserWithSchema).formatField('id'), 'to equal', {
          sql: '"public"."user"."id"'
        });
      });
    });

    describe('with the field is a Raw instance', () => {
      it('returns `Raw.prototype.sql` as the sql', () => {
        expect(sql.formatField(new Raw({ sql: 'COUNT(*)' })), 'to equal', {
          sql: 'COUNT(*)'
        });
      });

      it('returns `Raw.prototype.values` as values if set', () => {
        expect(
          sql.formatField(new Raw({ sql: 'UPPER(?)', values: ['foo'] })),
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
          sql: '"user"."id"',
          aliases: ['id']
        });
      });

      it('supports objects with string values', () => {
        expect(
          sql.formatFields({
            fields: [{ theId: 'id', theName: 'name' }]
          }),
          'to equal',
          {
            sql: '"user"."id", "user"."name"',
            aliases: ['theId', 'theName']
          }
        );
      });

      it('supports objects with Raw-instance values', () => {
        expect(
          sql.formatFields({
            fields: [
              {
                count: new Raw({ sql: 'COUNT(*)' }),
                upperCaseFoo: new Raw({ sql: 'UPPER(?)', values: ['foo'] })
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
        sql: 'FROM "user"'
      });
    });

    describe('with `Model.schema` set', () => {
      it('returns a `FROM` clause with `Model.schema` and `Model.table`', () => {
        expect(new QuotedSql(UserWithSchema).formatFrom(), 'to equal', {
          sql: 'FROM "public"."user"'
        });
      });
    });

    describe('with the `alias` option set', () => {
      it('returns an aliased table-name with the quoted alias', () => {
        expect(sql.formatFrom({ alias: 'user' }), 'to equal', {
          sql: 'FROM "user" AS "user"'
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
          sql: 'WHERE ("user"."id" = ? AND "user"."name" = ?)',
          values: [1, 'Foo']
        });
      });

      it('supports arrays of object', () => {
        expect(
          sql.formatWhere({ where: [{ id: 1, name: 'Foo' }] }),
          'to equal',
          {
            sql: 'WHERE ("user"."id" = ? AND "user"."name" = ?)',
            values: [1, 'Foo']
          }
        );
      });

      it('supports Condition instances', () => {
        expect(
          sql.formatWhere({
            where: new Condition({ field: 'id', type: 'equalTo', value: 1 })
          }),
          'to equal',
          {
            sql: 'WHERE "user"."id" = ?',
            values: [1]
          }
        );
      });

      it('supports Condition instances with fields as Raw instances', () => {
        expect(
          sql.formatWhere({
            where: new Condition({
              field: new Raw({ sql: 'LOWER(?)', values: ['FOO'] }),
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

      it('supports Grouping instances', () => {
        expect(
          sql.formatWhere({
            where: new Grouping({
              type: 'and',
              value: [
                new Condition({ field: 'id', type: 'equalTo', value: 1 }),
                new Condition({ field: 'name', type: 'equalTo', value: 'foo' })
              ]
            })
          }),
          'to equal',
          {
            sql: 'WHERE ("user"."id" = ? AND "user"."name" = ?)',
            values: [1, 'foo']
          }
        );
      });

      it('supports Query instances', () => {
        expect(sql.formatWhere({ where: new Query(User) }), 'to equal', {
          sql: 'WHERE (SELECT FROM user)'
        });
      });

      it('supports Raw instances', () => {
        expect(
          sql.formatWhere({ where: new Raw({ sql: '(SELECT true)' }) }),
          'to equal',
          { sql: 'WHERE (SELECT true)' }
        );
      });

      it('supports Raw instances with values', () => {
        expect(
          sql.formatWhere({
            where: new Raw({ sql: 'LOWER(?)', values: ['FOO'] })
          }),
          'to equal',
          { sql: 'WHERE LOWER(?)', values: ['FOO'] }
        );
      });
    });
  });
});

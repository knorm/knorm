const Knorm = require('../../lib/Knorm');
const expect = require('unexpected').clone();

describe('Sql', () => {
  let Model;
  let Query;
  let User;
  let Sql;
  let Raw;
  let Condition;
  let Grouping;
  let QuotedSql;

  before(() => {
    const orm = new Knorm({});

    Model = orm.Model;
    Query = orm.Query;
    Sql = Query.Sql;
    Raw = Query.Sql.Raw;
    Condition = Query.Sql.Condition;
    Grouping = Query.Sql.Grouping;

    QuotedSql = class extends Sql {
      quote(identifier) {
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
  });

  describe('Sql.prototype.quote', () => {
    it('returns the identifier as is', () => {
      expect(new Sql(User).quote('order'), 'to be', 'order');
    });
  });

  describe('Sql.prototype.formatSchema', () => {
    describe('with `Model.schema` not set', () => {
      it('returns `undefined`', () => {
        expect(new QuotedSql(User).formatSchema(), 'to be undefined');
      });
    });

    describe('with `Model.schema` set', () => {
      let OtherUser;

      beforeEach(() => {
        OtherUser = class extends User {};
        OtherUser.schema = 'public';
      });

      it('returns a quoted `Model.schema`', () => {
        expect(new QuotedSql(OtherUser).formatSchema(), 'to be', '"public"');
      });
    });
  });

  describe('Sql.prototype.formatTable', () => {
    it('returns a quoted `Model.table`', () => {
      expect(new QuotedSql(User).formatTable(), 'to be', '"user"');
    });

    describe('with `Model.schema` set', () => {
      let OtherUser;

      beforeEach(() => {
        OtherUser = class extends User {};
        OtherUser.schema = 'public';
      });

      it('returns a quoted `Model.schema` and `Model.table`', () => {
        expect(
          new QuotedSql(OtherUser).formatTable(),
          'to be',
          '"public"."user"'
        );
      });
    });
  });

  describe('Sql.prototype.formatDistinct', () => {
    describe('with the `distinct` option not set', () => {
      it('returns an empty string', () => {
        expect(new QuotedSql(User).formatDistinct(), 'to be', '');
      });
    });

    describe('with the `distinct` option set', () => {
      it('returns a `DISTINCT` clause', () => {
        expect(
          new QuotedSql(User).formatDistinct({ distinct: true }),
          'to be',
          'DISTINCT'
        );
      });
    });
  });

  describe('Sql.prototype.formatFrom', () => {
    it('returns a `FROM` clause with `Model.table`', () => {
      expect(new QuotedSql(User).formatFrom(), 'to be', 'FROM "user"');
    });

    describe('with `Model.schema` set', () => {
      let OtherUser;

      beforeEach(() => {
        OtherUser = class extends User {};
        OtherUser.schema = 'public';
      });

      it('returns a `FROM` clause with `Model.schema` and `Model.table`', () => {
        expect(
          new QuotedSql(OtherUser).formatFrom(),
          'to be',
          'FROM "public"."user"'
        );
      });
    });
  });

  describe('Sql.prototype.formatColumn', () => {
    it('returns a quoted table-name-prefixed column and no values', () => {
      expect(new QuotedSql(User).formatColumn('id'), 'to equal', {
        column: '"user"."id"',
        values: []
      });
    });

    describe('with custom columns configured', () => {
      let OtherUser;

      beforeEach(() => {
        OtherUser = class extends User {};
        OtherUser.fields = { id: { type: 'integer', column: 'ID' } };
      });

      it('uses the configured columns', () => {
        expect(new QuotedSql(OtherUser).formatColumn('id'), 'to equal', {
          column: '"user"."ID"',
          values: []
        });
      });
    });

    describe('with `Model.schema` set', () => {
      let OtherUser;

      beforeEach(() => {
        OtherUser = class extends User {};
        OtherUser.schema = 'public';
      });

      it('returns a schema and table-name prefixed column', () => {
        expect(new QuotedSql(OtherUser).formatColumn('id'), 'to equal', {
          column: '"public"."user"."id"',
          values: []
        });
      });
    });

    describe('with the field is a Raw instance', () => {
      it('returns `Raw.prototype.sql` as the column', () => {
        expect(
          new QuotedSql(User).formatColumn(new Raw({ sql: 'COUNT(*)' })),
          'to equal',
          { column: 'COUNT(*)', values: [] }
        );
      });

      it('returns `Raw.prototype.values` as values if set', () => {
        expect(
          new QuotedSql(User).formatColumn(
            new Raw({ sql: 'UPPER(?)', values: ['foo'] })
          ),
          'to equal',
          { column: 'UPPER(?)', values: ['foo'] }
        );
      });
    });
  });

  describe('Sql.prototype.formatColumns', () => {
    describe('with the `fields` option not set', () => {
      it('returns empty columns, aliases and values', () => {
        expect(new QuotedSql(User).formatColumns(), 'to equal', {
          columns: '',
          aliases: [],
          values: []
        });
      });
    });

    describe('with the `fields` option set', () => {
      it('supports strings', () => {
        expect(
          new QuotedSql(User).formatColumns({ fields: ['id'] }),
          'to equal',
          {
            columns: '"user"."id"',
            aliases: ['id'],
            values: []
          }
        );
      });

      it('supports objects with string values', () => {
        expect(
          new QuotedSql(User).formatColumns({
            fields: [{ theId: 'id', theName: 'name' }]
          }),
          'to equal',
          {
            columns: '"user"."id", "user"."name"',
            aliases: ['theId', 'theName'],
            values: []
          }
        );
      });

      it('supports objects with Raw-instance values', () => {
        expect(
          new QuotedSql(User).formatColumns({
            fields: [
              {
                count: new Raw({ sql: 'COUNT(*)' }),
                upperCaseFoo: new Raw({ sql: 'UPPER(?)', values: ['foo'] })
              }
            ]
          }),
          'to equal',
          {
            columns: 'COUNT(*), UPPER(?)',
            aliases: ['count', 'upperCaseFoo'],
            values: ['foo']
          }
        );
      });
    });
  });

  describe('Sql.prototype.formatWhere', () => {
    describe('with the `where` option not set', () => {
      it('returns empty WHERE clause and values', () => {
        expect(new QuotedSql(User).formatWhere(), 'to equal', {
          where: '',
          values: []
        });
      });
    });

    describe('with the `where` option set', () => {
      it('supports objects', () => {
        expect(
          new QuotedSql(User).formatWhere({ where: { id: 1, name: 'Foo' } }),
          'to equal',
          {
            where: 'WHERE ("user"."id" = ? AND "user"."name" = ?)',
            values: [1, 'Foo']
          }
        );
      });

      it('supports arrays of object', () => {
        expect(
          new QuotedSql(User).formatWhere({ where: [{ id: 1, name: 'Foo' }] }),
          'to equal',
          {
            where: 'WHERE ("user"."id" = ? AND "user"."name" = ?)',
            values: [1, 'Foo']
          }
        );
      });

      it('supports Condition instances', () => {
        expect(
          new QuotedSql(User).formatWhere({
            where: new Condition({ field: 'id', type: 'equalTo', value: 1 })
          }),
          'to equal',
          {
            where: 'WHERE "user"."id" = ?',
            values: [1]
          }
        );
      });

      it('supports Condition instances with fields as Raw instances', () => {
        expect(
          new QuotedSql(User).formatWhere({
            where: new Condition({
              field: new Raw({ sql: 'LOWER(?)', values: ['FOO'] }),
              type: 'equalTo',
              value: 'foo'
            })
          }),
          'to equal',
          {
            where: 'WHERE LOWER(?) = ?',
            values: ['FOO', 'foo']
          }
        );
      });

      it('supports Grouping instances', () => {
        expect(
          new QuotedSql(User).formatWhere({
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
            where: 'WHERE ("user"."id" = ? AND "user"."name" = ?)',
            values: [1, 'foo']
          }
        );
      });

      it('supports Query instances', () => {
        expect(
          new QuotedSql(User).formatWhere({ where: new Query(User) }),
          'to equal',
          {
            where: 'WHERE (SELECT FROM user)',
            values: []
          }
        );
      });

      it('supports Raw instances', () => {
        expect(
          new QuotedSql(User).formatWhere({
            where: new Raw({ sql: '(SELECT true)' })
          }),
          'to equal',
          {
            where: 'WHERE (SELECT true)',
            values: []
          }
        );
      });

      it('supports Raw instances with values', () => {
        expect(
          new QuotedSql(User).formatWhere({
            where: new Raw({ sql: 'LOWER(?)', values: ['FOO'] })
          }),
          'to equal',
          {
            where: 'WHERE LOWER(?)',
            values: ['FOO']
          }
        );
      });
    });
  });
});

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
      // TODO: do not require primary field?
      id: { type: 'integer', primary: true },
      name: 'string',
      description: 'string',
      age: 'integer',
      confirmed: 'boolean'
    };
  });

  let query;

  beforeEach(() => {
    query = new Query(User);
  });

  describe('Sql.prototype.quote', () => {
    it('returns the identifier as is', () => {
      expect(new Sql(query).quote('order'), 'to be', 'order');
    });
  });

  describe('Sql.prototype.getDistinct', () => {
    describe('with the `distinct` query option not set', () => {
      it('returns an empty string', () => {
        expect(new Sql(query).getDistinct(), 'to be', '');
      });
    });

    describe('with the `distinct` query option set', () => {
      beforeEach(() => {
        query.setOption('distinct', true);
      });

      it('returns `DISTINCT`', () => {
        expect(new Sql(query).getDistinct(), 'to be', 'DISTINCT');
      });
    });
  });

  describe('Sql.prototype.getTable', () => {
    it('returns a quoted `Model.table`', () => {
      expect(new QuotedSql(query).getTable(), 'to be', '"user"');
    });

    describe('with `Model.schema` set', () => {
      beforeEach(() => {
        class OtherUser extends User {}
        OtherUser.schema = 'public';
        query = new Query(OtherUser);
      });

      it('returns a quoted `Model.schema` and `Model.table`', () => {
        expect(new QuotedSql(query).getTable(), 'to be', '"public"."user"');
      });
    });
  });

  describe('Sql.prototype.getFrom', () => {
    describe('with the `from` query option not set', () => {
      it('returns a quoted `Model.table`', () => {
        expect(new QuotedSql(query).getFrom(), 'to be', 'FROM "user"');
      });

      describe('with `Model.schema` set', () => {
        beforeEach(() => {
          class OtherUser extends User {}
          OtherUser.schema = 'public';
          query = new Query(OtherUser);
        });

        it('returns a quoted `Model.schema` and `Model.table`', () => {
          expect(
            new QuotedSql(query).getFrom(),
            'to be',
            'FROM "public"."user"'
          );
        });
      });
    });
  });

  describe('Sql.prototype.getColumn', () => {
    it('returns a quoted table-name-prefixed column and no values', () => {
      expect(new QuotedSql(query).getColumn('id'), 'to equal', {
        column: '"user"."id"',
        values: []
      });
    });

    describe('with custom columns set', () => {
      beforeEach(() => {
        class OtherUser extends User {}
        OtherUser.fields = {
          id: { type: 'integer', primary: true, column: 'ID' }
        };
        query = new Query(OtherUser);
      });

      it('uses the set columns', () => {
        expect(new QuotedSql(query).getColumn('id'), 'to equal', {
          column: '"user"."ID"',
          values: []
        });
      });
    });

    describe('with `Model.schema` set', () => {
      beforeEach(() => {
        class OtherUser extends User {}
        OtherUser.schema = 'public';
        query = new Query(OtherUser);
      });

      it('returns a schema and table-name prefixed column', () => {
        expect(new QuotedSql(query).getColumn('id'), 'to equal', {
          column: '"public"."user"."id"',
          values: []
        });
      });
    });

    describe('with the field is a Raw instance', () => {
      it('returns the instance `sql` as the column', () => {
        expect(
          new QuotedSql(query).getColumn(new Raw({ sql: 'COUNT(*)' })),
          'to equal',
          { column: 'COUNT(*)', values: [] }
        );
      });

      it('returns the instance `values` if set', () => {
        expect(
          new QuotedSql(query).getColumn(
            new Raw({ sql: 'UPPER(?)', values: ['foo'] })
          ),
          'to equal',
          { column: 'UPPER(?)', values: ['foo'] }
        );
      });
    });
  });

  describe('Sql.prototype.getColumns', () => {
    describe('with the `fields` query option not set', () => {
      it('returns empty columns, aliases and values', () => {
        expect(new QuotedSql(query).getColumns(), 'to equal', {
          columns: '',
          aliases: [],
          values: []
        });
      });
    });

    describe('with the `fields` query option set', () => {
      it('supports strings', () => {
        query.setOption('fields', 'id');
        expect(new QuotedSql(query).getColumns(), 'to equal', {
          columns: '"user"."id"',
          aliases: ['id'],
          values: []
        });
      });

      it('supports objects with string values', () => {
        query.setOption('fields', { theId: 'id', theName: 'name' });
        expect(new QuotedSql(query).getColumns(), 'to equal', {
          columns: '"user"."id", "user"."name"',
          aliases: ['theId', 'theName'],
          values: []
        });
      });

      it('supports objects with Raw-instance values', () => {
        query.setOption('fields', {
          count: new Raw({ sql: 'COUNT(*)' }),
          upperCaseFoo: new Raw({ sql: 'UPPER(?)', values: ['foo'] })
        });
        expect(new QuotedSql(query).getColumns(), 'to equal', {
          columns: 'COUNT(*), UPPER(?)',
          aliases: ['count', 'upperCaseFoo'],
          values: ['foo']
        });
      });

      it('supports arrays of strings', () => {
        query.setOption('fields', ['id', 'name']);
        expect(new QuotedSql(query).getColumns(), 'to equal', {
          columns: '"user"."id", "user"."name"',
          aliases: ['id', 'name'],
          values: []
        });
      });

      it('supports', () => {
        query.setOption('fields', [
          'id',
          { theName: 'name' },
          { upperCaseFoo: new Raw({ sql: 'UPPER(?)', values: ['foo'] }) }
        ]);
        expect(new QuotedSql(query).getColumns(), 'to equal', {
          columns: '"user"."id", "user"."name", UPPER(?)',
          aliases: ['id', 'theName', 'upperCaseFoo'],
          values: ['foo']
        });
      });
    });
  });

  describe('Sql.prototype.getWhere', () => {
    describe('with the `where` query option not set', () => {
      it('returns empty WHERE clause and values', () => {
        expect(new QuotedSql(query).getWhere(), 'to equal', {
          where: '',
          values: []
        });
      });
    });

    describe('with the `where` query option set', () => {
      it('supports objects', () => {
        query.setOption('where', { id: 1, name: 'Foo' });
        expect(new QuotedSql(query).getWhere(), 'to equal', {
          where: 'WHERE ("user"."id" = ? AND "user"."name" = ?)',
          values: [1, 'Foo']
        });
      });

      it('supports Condition instances', () => {
        query.setOption(
          'where',
          new Condition({ field: 'id', type: 'equalTo', value: 1 })
        );
        expect(new QuotedSql(query).getWhere(), 'to equal', {
          where: 'WHERE "user"."id" = ?',
          values: [1]
        });
      });

      it('supports Condition instances with fields as Raw instances', () => {
        query.setOption(
          'where',
          new Condition({
            field: new Raw({ sql: 'LOWER(?)', values: ['FOO'] }),
            type: 'equalTo',
            value: 'foo'
          })
        );
        expect(new QuotedSql(query).getWhere(), 'to equal', {
          where: 'WHERE LOWER(?) = ?',
          values: ['FOO', 'foo']
        });
      });

      it('supports Grouping instances', () => {
        query.setOption(
          'where',
          new Grouping({
            type: 'and',
            value: [
              new Condition({ field: 'id', type: 'equalTo', value: 1 }),
              new Condition({ field: 'name', type: 'equalTo', value: 'foo' })
            ]
          })
        );
        expect(new QuotedSql(query).getWhere(), 'to equal', {
          where: 'WHERE ("user"."id" = ? AND "user"."name" = ?)',
          values: [1, 'foo']
        });
      });

      it('supports Query instances', () => {
        query.setOption('where', new Query(User));
        expect(new QuotedSql(query).getWhere(), 'to equal', {
          where: 'WHERE (SELECT FROM user)',
          values: []
        });
      });

      it('supports Raw instances', () => {
        query.setOption('where', new Raw({ sql: '(SELECT true)' }));
        expect(new QuotedSql(query).getWhere(), 'to equal', {
          where: 'WHERE (SELECT true)',
          values: []
        });
      });

      it('supports Raw instances with values', () => {
        query.setOption('where', new Raw({ sql: 'LOWER(?)', values: ['FOO'] }));
        expect(new QuotedSql(query).getWhere(), 'to equal', {
          where: 'WHERE LOWER(?)',
          values: ['FOO']
        });
      });
    });
  });
});

const Sql = require('../lib/Sql');
const Condition = require('../lib/Condition');
const Knorm = require('../lib/Knorm');
const expect = require('unexpected').clone();

describe.only('Sql', () => {
  let Model;
  let Query;
  let User;

  class QuotedSql extends Sql {
    quote(identifier) {
      return `"${identifier}"`;
    }
  }

  before(() => {
    const orm = new Knorm({});

    Model = orm.Model;
    Query = orm.Query;

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

  describe('Sql.prototype.getPlaceholder', () => {
    it('returns `?`', () => {
      expect(new Sql(query).getPlaceholder(), 'to be', '?');
    });
  });

  describe('Sql.prototype.quote', () => {
    it('returns the identifier as is', () => {
      expect(new Sql(query).quote('order'), 'to be', 'order');
    });
  });

  describe('Sql.prototype.getDistinct', () => {
    it('returns an empty string', () => {
      expect(new Sql(query).getDistinct(), 'to be', '');
    });

    describe('with the `distinct` query option configured', () => {
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

    describe('with `Model.schema` configured', () => {
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
    describe('with no `from` query option configured', () => {
      it('returns a quoted `Model.table`', () => {
        expect(new QuotedSql(query).getFrom(), 'to be', 'FROM "user"');
      });

      describe('with `Model.schema` configured', () => {
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
    it('returns a quoted table-name-prefixed column', () => {
      expect(new QuotedSql(query).getColumn('id'), 'to be', '"user"."id"');
    });

    describe('with custom columns configured', () => {
      beforeEach(() => {
        class OtherUser extends User {}
        OtherUser.fields = {
          id: { type: 'integer', primary: true, column: 'ID' }
        };
        query = new Query(OtherUser);
      });

      it('uses the configured columns', () => {
        expect(new QuotedSql(query).getColumn('id'), 'to be', '"user"."ID"');
      });
    });

    describe('with `Model.schema` configured', () => {
      beforeEach(() => {
        class OtherUser extends User {}
        OtherUser.schema = 'public';
        query = new Query(OtherUser);
      });

      it('returns a schema and table-name prefixed column', () => {
        expect(
          new QuotedSql(query).getColumn('id'),
          'to be',
          '"public"."user"."id"'
        );
      });
    });
  });

  describe('Sql.prototype.getColumns', () => {
    describe('with no `fields` query option configured', () => {
      it('returns empty columns and fields', () => {
        expect(new QuotedSql(query).getColumns(), 'to equal', {
          columns: '',
          fields: []
        });
      });
    });

    describe('with the `fields` query option configured', () => {
      describe('as `null`', () => {
        beforeEach(() => {
          query.setOption('fields', null);
        });

        it('returns empty columns and fields', () => {
          expect(new QuotedSql(query).getColumns(), 'to equal', {
            columns: '',
            fields: []
          });
        });
      });

      describe('as a string', () => {
        beforeEach(() => {
          query.setOption('fields', 'id');
        });

        it('returns a quoted table-name-prefixed column', () => {
          expect(new QuotedSql(query).getColumns(), 'to satisfy', {
            columns: '"user"."id"'
          });
        });

        it('returns the field as a return field', () => {
          expect(new QuotedSql(query).getColumns(), 'to satisfy', {
            fields: ['id']
          });
        });
      });

      describe('as an object', () => {
        beforeEach(() => {
          query.setOption('fields', { theId: 'id', theName: 'name' });
        });

        it('returns a comma-separated table-name-prefixed column-list', () => {
          expect(new QuotedSql(query).getColumns(), 'to satisfy', {
            columns: '"user"."id", "user"."name"'
          });
        });

        it('returns the object keys as return fields', () => {
          expect(new QuotedSql(query).getColumns(), 'to satisfy', {
            fields: ['theId', 'theName']
          });
        });
      });

      describe('as a string-array', () => {
        beforeEach(() => {
          query.setOption('fields', ['id', 'name']);
        });

        it('returns a quoted table-name-prefixed column-list', () => {
          expect(new QuotedSql(query).getColumns(), 'to satisfy', {
            columns: '"user"."id", "user"."name"'
          });
        });

        it('returns the fields as return fields', () => {
          expect(new QuotedSql(query).getColumns(), 'to satisfy', {
            fields: ['id', 'name']
          });
        });
      });

      describe('as an object-array', () => {
        beforeEach(() => {
          query.setOption('fields', [{ theId: 'id' }, { theName: 'name' }]);
        });

        it('returns a comma-separated table-name-prefixed column-list', () => {
          expect(new QuotedSql(query).getColumns(), 'to satisfy', {
            columns: '"user"."id", "user"."name"'
          });
        });

        it(`stores the objects' keys as aliases`, () => {
          expect(new QuotedSql(query).getColumns(), 'to satisfy', {
            fields: ['theId', 'theName']
          });
        });
      });
    });
  });

  describe('Sql.prototype.getWhere', () => {
    describe('with no `where` query option configured', () => {
      it('returns empty WHERE clause and values', () => {
        expect(new QuotedSql(query).getWhere(), 'to equal', {
          where: '',
          values: []
        });
      });
    });

    describe('with the `where` query option configured', () => {
      describe('as `null`', () => {
        beforeEach(() => {
          query.setOption('where', null);
        });

        it('returns empty WHERE clause and values', () => {
          expect(new QuotedSql(query).getWhere(), 'to equal', {
            where: '',
            values: []
          });
        });
      });

      describe('as a Condition', () => {
        describe('of type `equalTo`', () => {
          beforeEach(() => {
            query.setOption(
              'where',
              new Condition({ type: 'equalTo', field: 'id', value: 1 })
            );
          });

          it('returns a `WHERE =` clause with placeholders', () => {
            expect(new QuotedSql(query).getWhere(), 'to satisfy', {
              where: 'WHERE "user"."id" = ?'
            });
          });

          it('returns the `WHERE =` value separately', () => {
            expect(new QuotedSql(query).getWhere(), 'to satisfy', {
              values: [1]
            });
          });
        });
      });

      describe('as an object', () => {
        describe('with plain values', () => {
          beforeEach(() => {
            query.setOption('where', { id: 1, name: 'Foo' });
          });

          it('returns the WHERE clause with formatted columns and placeholders', () => {
            expect(new QuotedSql(query).getWhere(), 'to satisfy', {
              where: 'WHERE ("user"."id" = ? AND "user"."name" = ?)'
            });
          });

          it('returns the WHERE values', () => {
            expect(new QuotedSql(query).getWhere(), 'to satisfy', {
              values: [1, 'Foo']
            });
          });
        });
      });

      describe('with the field as raw sql', () => {});
    });
  });
});

const Sql = require('../lib/Sql');
const Knorm = require('../lib/Knorm');
const expect = require('unexpected').clone();

describe('Sql', () => {
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

  describe('Sql.prototype.placeholder', () => {
    it('returns `?`', () => {
      expect(new Sql(query).placeholder(), 'to be', '?');
    });
  });

  describe('Sql.prototype.quote', () => {
    it('returns the identifier as is', () => {
      expect(new Sql(query).quote('order'), 'to be', 'order');
    });
  });

  describe('Sql.prototype.distinct', () => {
    it('returns an empty string', () => {
      expect(new Sql(query).distinct(), 'to be', '');
    });

    describe('with the `distinct` query option configured', () => {
      it('returns `DISTINCT`', () => {
        query.setOption('distinct', true);
        expect(new Sql(query).distinct(), 'to be', 'DISTINCT');
      });
    });
  });

  describe('Sql.prototype.table', () => {
    it('returns a quoted `Model.table`', () => {
      expect(new QuotedSql(query).table(), 'to be', '"user"');
    });

    describe('with `Model.schema` configured', () => {
      beforeEach(() => {
        class OtherUser extends User {}
        OtherUser.schema = 'public';
        query = new Query(OtherUser);
      });

      it('returns a quoted `Model.schema` and `Model.table`', () => {
        expect(new QuotedSql(query).table(), 'to be', '"public"."user"');
      });
    });
  });

  describe('Sql.prototype.from', () => {
    describe('with no `from` query option configured', () => {
      it('returns a quoted `Model.table`', () => {
        expect(new QuotedSql(query).from(), 'to be', '"user"');
      });

      describe('with `Model.schema` configured', () => {
        beforeEach(() => {
          class OtherUser extends User {}
          OtherUser.schema = 'public';
          query = new Query(OtherUser);
        });

        it('returns a quoted `Model.schema` and `Model.table`', () => {
          expect(new QuotedSql(query).from(), 'to be', '"public"."user"');
        });
      });
    });
  });

  describe('Sql.prototype.columns', () => {
    describe('with no `fields` query option configured', () => {
      it('returns an empty string', () => {
        expect(new QuotedSql(query).columns(), 'to be', '');
      });
    });

    describe('with `fields` query option configured', () => {
      describe('as `null`', () => {
        beforeEach(() => {
          query.setOption('fields', null);
        });

        it('returns an empty string', () => {
          expect(new QuotedSql(query).columns(), 'to be', '');
        });
      });

      describe('as a string', () => {
        beforeEach(() => {
          query.setOption('fields', 'id');
        });

        it('returns quoted table-name-prefixed column', () => {
          expect(new QuotedSql(query).columns(), 'to be', '"user"."id"');
        });

        it('stores the field-name as an alias', () => {
          new QuotedSql(query).columns();
          expect(query.options.aliases, 'to equal', ['id']);
        });
      });

      describe('as an object', () => {
        beforeEach(() => {
          query.setOption('fields', { theId: 'id', theName: 'name' });
        });

        it('returns a comma-separated table-name-prefixed column-list', () => {
          expect(
            new QuotedSql(query).columns(),
            'to be',
            '"user"."id", "user"."name"'
          );
        });

        it('stores the object keys as aliases', () => {
          new QuotedSql(query).columns();
          expect(query.options.aliases, 'to equal', ['theId', 'theName']);
        });
      });

      describe('as an string-array', () => {
        beforeEach(() => {
          query.setOption('fields', ['id', 'name']);
        });

        it('returns a quoted table-name-prefixed column-list', () => {
          expect(
            new QuotedSql(query).columns(),
            'to be',
            '"user"."id", "user"."name"'
          );
        });

        it('stores the field-names as aliases', () => {
          new QuotedSql(query).columns();
          expect(query.options.aliases, 'to equal', ['id', 'name']);
        });
      });

      describe('as an object-array', () => {
        beforeEach(() => {
          query.setOption('fields', [{ theId: 'id' }, { theName: 'name' }]);
        });

        it('returns a comma-separated table-name-prefixed column-list', () => {
          expect(
            new QuotedSql(query).columns(),
            'to be',
            '"user"."id", "user"."name"'
          );
        });

        it(`stores the objects' keys as aliases`, () => {
          new QuotedSql(query).columns();
          expect(query.options.aliases, 'to equal', ['theId', 'theName']);
        });
      });

      describe('with field column-names configured', () => {
        beforeEach(() => {
          class OtherUser extends User {}
          OtherUser.fields = {
            id: { type: 'integer', primary: true, column: 'ID' },
            name: { type: 'string', column: 'NAME' }
          };
          query = new Query(OtherUser);
        });

        describe('for `fields` as a string', () => {
          beforeEach(() => {
            query.setOption('fields', 'id');
          });

          it('uses the configured field column-names', () => {
            expect(new QuotedSql(query).columns(), 'to be', '"user"."ID"');
          });
        });

        describe('for `fields` as an object string', () => {
          beforeEach(() => {
            query.setOption('fields', { theId: 'id', theName: 'name' });
          });

          it('uses the configured field column-names', () => {
            expect(
              new QuotedSql(query).columns(),
              'to be',
              '"user"."ID", "user"."NAME"'
            );
          });
        });

        describe('for `fields` as an string-array', () => {
          beforeEach(() => {
            query.setOption('fields', ['id', 'name']);
          });

          it('uses the configured field column-names', () => {
            expect(
              new QuotedSql(query).columns(),
              'to be',
              '"user"."ID", "user"."NAME"'
            );
          });
        });

        describe('for `fields` as an object-array', () => {
          beforeEach(() => {
            query.setOption('fields', [{ theId: 'id' }, { theName: 'name' }]);
          });

          it('uses the configured field column-names', () => {
            expect(
              new QuotedSql(query).columns(),
              'to be',
              '"user"."ID", "user"."NAME"'
            );
          });
        });
      });

      describe('with `Model.schema` configured', () => {
        beforeEach(() => {
          class OtherUser extends User {}
          OtherUser.schema = 'public';
          query = new Query(OtherUser);
        });

        describe('for `fields` as a string', () => {
          beforeEach(() => {
            query.setOption('fields', 'id');
          });

          it('returns a schema and table-name prefixed column', () => {
            expect(
              new QuotedSql(query).columns(),
              'to be',
              '"public"."user"."id"'
            );
          });
        });

        describe('for `fields` as an object', () => {
          beforeEach(() => {
            query.setOption('fields', { theId: 'id', theName: 'name' });
          });

          it('returns a comma-separated schema and table-name prefixed column-list', () => {
            expect(
              new QuotedSql(query).columns(),
              'to be',
              '"public"."user"."id", "public"."user"."name"'
            );
          });
        });

        describe('for `fields` as an string-array', () => {
          beforeEach(() => {
            query.setOption('fields', ['id', 'name']);
          });

          it('returns a comma-separated schema and table-name prefixed column-list', () => {
            expect(
              new QuotedSql(query).columns(),
              'to be',
              '"public"."user"."id", "public"."user"."name"'
            );
          });
        });

        describe('for `fields` as an object-array', () => {
          beforeEach(() => {
            query.setOption('fields', [{ theId: 'id' }, { theName: 'name' }]);
          });

          it('returns a comma-separated schema and table-name prefixed column-list', () => {
            expect(
              new QuotedSql(query).columns(),
              'to be',
              '"public"."user"."id", "public"."user"."name"'
            );
          });
        });
      });
    });
  });
});

const expect = require('unexpected').clone();
const createUser = require('./lib/createUser');
const Dummy = require('./lib/Dummy');
const Where = require('../../lib/Sql/Where');

describe('Sql/Where', () => {
  let User;
  let where;

  before(() => {
    User = createUser();
  });

  beforeEach(() => {
    where = new Where(User);
  });

  // TODO: move these tests to Sql.prototype.formatConditionExpressions
  describe('Where.prototype.formatValue', () => {
    it('returns formatted fields and values', () => {
      where.setValue([{ id: 1 }]);
      expect(where.formatValue(), 'to be', '"user"."id" = ?');
    });

    it('joins items with an `AND` expression', () => {
      where.setValue([{ id: 1 }, { name: 'foo' }]);
      expect(
        where.formatValue(),
        'to be',
        '"user"."id" = ? AND "user"."name" = ?'
      );
    });

    it('joins object entries with an `AND` expression', () => {
      where.setValue([{ id: 1, name: 'foo' }]);
      expect(
        where.formatValue(),
        'to be',
        '"user"."id" = ? AND "user"."name" = ?'
      );
    });

    it('supports expressions', () => {
      where.setValue([new Dummy(User)]);
      expect(where.formatValue(), 'to be', 'DUMMY');
    });

    it('supports Where instances as expressopns', () => {
      where.setValue([
        new Where(User)
          .setValue([{ name: 'foo' }])
          .setOptions({ qualifier: 'foo' })
      ]);
      expect(where.formatValue(), 'to be', '"foo"."name" = ?');
    });
  });

  describe('Where.prototype.formatText', () => {
    it('returns a `WHERE` clause with formatted fields and values', () => {
      where.setValue([{ id: 1 }]);
      expect(where.formatText(), 'to be', 'WHERE "user"."id" = ?');
    });
  });
});

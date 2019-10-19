const expect = require('unexpected').clone();
const createUser = require('./lib/createUser');
const Dummy = require('./lib/Dummy');
const Between = require('../../lib/Sql/Between');

describe('Sql/Between', () => {
  let User;

  before(() => {
    User = createUser();
  });

  let between;

  beforeEach(() => {
    between = new Between(User);
  });

  describe('Between.prototype.formatValue', () => {
    it('returns a `BETWEEN` clause with a formatted field and value', () => {
      between.setValue({ field: 'id', value1: 1, value2: 2 });
      expect(between.formatValue(), 'to be', '"user"."id" BETWEEN ? AND ?');
    });

    it('supports field expressions', () => {
      between.setValue({ field: new Dummy(User), value1: 1, value2: 2 });
      expect(between.formatValue(), 'to be', 'DUMMY BETWEEN ? AND ?');
    });

    it('supports value expressions', () => {
      between.setValue({
        field: 'id',
        value1: new Dummy(User),
        value2: new Dummy(User)
      });
      expect(
        between.formatValue(),
        'to be',
        '"user"."id" BETWEEN DUMMY AND DUMMY'
      );
    });
  });
});

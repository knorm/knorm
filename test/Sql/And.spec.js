const expect = require('unexpected').clone();
const createUser = require('./lib/createUser');
const Dummy = require('./lib/Dummy');
const And = require('../../lib/Sql/And');

describe('Sql/And', () => {
  let User;

  before(() => {
    User = createUser();
  });

  let and;

  beforeEach(() => {
    and = new And(User);
  });

  describe('And.prototype.formatValue', () => {
    it('returns a formatted `AND` clause', () => {
      and.setValue([true, false]);
      expect(and.formatValue(), 'to be', '? AND ?');
    });

    it('supports array values as expressions', () => {
      and.setValue([false, new Dummy(User), true]);
      expect(and.formatValue(), 'to be', '? AND DUMMY AND ?');
    });

    it('supports an array with a single item', () => {
      and.setValue([1]);
      expect(and.formatValue(), 'to be', '?');
    });
  });
});

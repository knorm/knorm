const expect = require('unexpected').clone();
const createUser = require('./lib/createUser');
const Dummy = require('./lib/Dummy');
const Or = require('../../lib/Sql/Or');

describe('Sql/Or', () => {
  let User;

  before(() => {
    User = createUser();
  });

  let or;

  beforeEach(() => {
    or = new Or(User);
  });

  describe('Or.prototype.formatValue', () => {
    it('returns a formatted `OR` clause', () => {
      or.setValue([true, false]);
      expect(or.formatValue(), 'to be', '? OR ?');
    });

    it('supports array values as expressions', () => {
      or.setValue([false, new Dummy(User), true]);
      expect(or.formatValue(), 'to be', '? OR DUMMY OR ?');
    });

    it('supports an array with a single item', () => {
      or.setValue([1]);
      expect(or.formatValue(), 'to be', '?');
    });
  });

  describe('Or.prototype.formatText', () => {
    it('returns a formatted `OR` clause wrapped in parenthesis', () => {
      or.setValue([true, false]);
      expect(or.formatText(), 'to be', '(? OR ?)');
    });
  });
});

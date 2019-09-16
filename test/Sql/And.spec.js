const expect = require('unexpected').clone();
const createUser = require('./lib/createUser');
const Dummy = require('./lib/Dummy');
const And = require('../../lib/Sql/And');

describe('Sql/And', () => {
  let User;

  before(() => {
    User = createUser();
  });

  describe('And.prototype.getText', () => {
    it('returns a formatted `AND` clause', () => {
      const and = new And(User, [true, false]);
      expect(and.getText(), 'to be', '? AND ?');
    });

    it('supports array values as expressions', () => {
      const and = new And(User, [false, new Dummy()]);
      expect(and.getText(), 'to be', '? AND DUMMY');
    });

    it('supports an array with a single item', () => {
      const and = new And(User, [1]);
      expect(and.getText(), 'to be', '?');
    });
  });
});

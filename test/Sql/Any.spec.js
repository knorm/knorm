const expect = require('unexpected').clone();
const createUser = require('./lib/createUser');
const Dummy = require('./lib/Dummy');
const Any = require('../../lib/Sql/Any');

describe('Sql/Any', () => {
  let User;

  before(() => {
    User = createUser();
  });

  describe('Any.prototype.getText', () => {
    it('returns an `ANY` clause with a formatted value', () => {
      const any = new Any(User, new Dummy());
      expect(any.getText(), 'to be', 'ANY DUMMY');
    });
  });
});

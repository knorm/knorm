const expect = require('unexpected').clone();
const createUser = require('./lib/createUser');
const SkipLocked = require('../../lib/Sql/SkipLocked');

describe('Sql/SkipLocked', () => {
  let User;

  before(() => {
    User = createUser();
  });

  describe('SkipLocked.prototype.getText', () => {
    it('returns a `SKIP LOCKED` clause', () => {
      const skipLocked = new SkipLocked(User, true);
      expect(skipLocked.getText(), 'to be', 'SKIP LOCKED');
    });
  });
});

const expect = require('unexpected').clone();
const createUser = require('./lib/createUser');
const SkipLocked = require('../../lib/Sql/SkipLocked');

describe('Sql/SkipLocked', () => {
  let User;

  before(() => {
    User = createUser();
  });

  let skipLocked;

  beforeEach(() => {
    skipLocked = new SkipLocked(User);
  });

  describe('SkipLocked.prototype.formatValue', () => {
    it('returns an empty string', () => {
      skipLocked.setValue(true);
      expect(skipLocked.formatValue(), 'to be', '');
    });
  });

  describe('SkipLocked.prototype.getText', () => {
    it('returns a `SKIP LOCKED` clause', () => {
      skipLocked.setValue(true);
      expect(skipLocked.getText(), 'to be', 'SKIP LOCKED');
    });
  });
});

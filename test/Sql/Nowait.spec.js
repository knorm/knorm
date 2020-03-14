const expect = require('unexpected').clone();
const createUser = require('./lib/createUser');
const Nowait = require('../../lib/Sql/Nowait');

describe('Sql/Nowait', () => {
  let User;

  before(() => {
    User = createUser();
  });

  let nowait;

  beforeEach(() => {
    nowait = new Nowait(User);
  });

  describe('Nowait.prototype.formatValue', () => {
    it('returns an empty string', () => {
      nowait.setValue(true);
      expect(nowait.formatValue(), 'to be', '');
    });
  });

  describe('Nowait.prototype.getText', () => {
    it('returns a `NOWAIT` clause', () => {
      nowait.setValue(true);
      expect(nowait.getText(), 'to be', 'NOWAIT');
    });
  });
});

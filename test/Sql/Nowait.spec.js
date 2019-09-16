const expect = require('unexpected').clone();
const createUser = require('./lib/createUser');
const Nowait = require('../../lib/Sql/Nowait');

describe('Sql/Nowait', () => {
  let User;

  before(() => {
    User = createUser();
  });

  describe('Nowait.prototype.getText', () => {
    it('returns a `NOWAIT` clause', () => {
      const nowait = new Nowait(User, true);
      expect(nowait.getText(), 'to be', 'NOWAIT');
    });
  });
});

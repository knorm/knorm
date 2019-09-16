const expect = require('unexpected').clone();
const createUser = require('./lib/createUser');
const Default = require('../../lib/Sql/Default');

describe('Sql/Default', () => {
  let User;

  before(() => {
    User = createUser();
  });

  describe('Default.prototype.getText', () => {
    it('returns a `DEFAULT` clause', () => {
      const _default = new Default(User, true);
      expect(_default.getText(), 'to be', 'DEFAULT');
    });
  });
});

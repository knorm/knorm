const expect = require('unexpected').clone();
const createUser = require('./lib/createUser');
const DefaultValues = require('../../lib/Sql/DefaultValues');

describe('Sql/DefaultValues', () => {
  let User;

  before(() => {
    User = createUser();
  });

  describe('DefaultValues.prototype.getText', () => {
    it('returns a `DEFAULT VALUES` clause', () => {
      const defaultValues = new DefaultValues(User, true);
      expect(defaultValues.getText(), 'to be', 'DEFAULT VALUES');
    });
  });
});

const expect = require('unexpected').clone();
const createUser = require('./lib/createUser');
const DefaultValues = require('../../lib/Sql/DefaultValues');

describe('Sql/DefaultValues', () => {
  let User;

  before(() => {
    User = createUser();
  });

  let defaultValues;

  beforeEach(() => {
    defaultValues = new DefaultValues(User);
  });

  describe('DefaultValues.prototype.formatValue', () => {
    it('returns an empty string', () => {
      defaultValues.setValue(true);
      expect(defaultValues.formatValue(), 'to be', '');
    });
  });

  describe('DefaultValues.prototype.getText', () => {
    it('returns a `DEFAULT VALUES` clause', () => {
      defaultValues.setValue(true);
      expect(defaultValues.getText(), 'to be', 'DEFAULT VALUES');
    });
  });
});

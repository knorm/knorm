const expect = require('unexpected').clone();
const createUser = require('./lib/createUser');
const Default = require('../../lib/Sql/Default');

describe('Sql/Default', () => {
  let User;

  before(() => {
    User = createUser();
  });

  let _default;

  beforeEach(() => {
    _default = new Default(User);
  });

  describe('Default.prototype.formatValue', () => {
    it('returns an empty string', () => {
      _default.setValue(true);
      expect(_default.formatValue(), 'to be', '');
    });
  });

  describe('Default.prototype.formatText', () => {
    it('returns a `DEFAULT` clause', () => {
      _default.setValue(true);
      expect(_default.formatText(), 'to be', 'DEFAULT');
    });
  });
});

const expect = require('unexpected').clone();
const createUser = require('./lib/createUser');
const Dummy = require('./lib/Dummy');
const Desc = require('../../lib/Sql/Desc');

describe('Sql/Desc', () => {
  let User;

  before(() => {
    User = createUser();
  });

  let desc;

  beforeEach(() => {
    desc = new Desc(User);
  });

  describe('Desc.prototype.formatValue', () => {
    it('returns the formatted value', () => {
      desc.setValue(new Dummy(User));
      expect(desc.formatValue(), 'to be', 'DUMMY');
    });
  });

  describe('Desc.prototype.formatText', () => {
    it('returns an `DESC` clause with a formatted value', () => {
      desc.setValue(new Dummy(User));
      expect(desc.formatText(), 'to be', 'DESC DUMMY');
    });
  });
});

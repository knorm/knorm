const expect = require('unexpected').clone();
const createUser = require('./lib/createUser');
const Dummy = require('./lib/Dummy');
const Asc = require('../../lib/Sql/Asc');

describe('Sql/Asc', () => {
  let User;

  before(() => {
    User = createUser();
  });

  let asc;

  beforeEach(() => {
    asc = new Asc(User);
  });

  describe('Asc.prototype.formatValue', () => {
    it('returns the formatted value', () => {
      asc.setValue(new Dummy(User));
      expect(asc.formatValue(), 'to be', 'DUMMY');
    });
  });

  describe('Asc.prototype.formatText', () => {
    it('returns an `ASC` clause with a formatted value', () => {
      asc.setValue(new Dummy(User));
      expect(asc.formatText(), 'to be', 'ASC DUMMY');
    });
  });
});

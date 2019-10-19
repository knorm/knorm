const expect = require('unexpected').clone();
const createUser = require('./lib/createUser');
const Dummy = require('./lib/Dummy');
const Any = require('../../lib/Sql/Any');

describe('Sql/Any', () => {
  let User;

  before(() => {
    User = createUser();
  });

  let any;

  beforeEach(() => {
    any = new Any(User);
  });

  describe('Any.prototype.formatValue', () => {
    it('returns the formatted value', () => {
      any.setValue(new Dummy(User));
      expect(any.formatValue(), 'to be', 'DUMMY');
    });
  });

  describe('Any.prototype.formatText', () => {
    it('returns an `ANY` clause with a formatted value', () => {
      any.setValue(new Dummy(User));
      expect(any.formatText(), 'to be', 'ANY DUMMY');
    });
  });
});

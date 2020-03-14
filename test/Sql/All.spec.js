const expect = require('unexpected').clone();
const createUser = require('./lib/createUser');
const Dummy = require('./lib/Dummy');
const All = require('../../lib/Sql/All');

describe('Sql/All', () => {
  let User;

  before(() => {
    User = createUser();
  });

  let all;

  beforeEach(() => {
    all = new All(User);
  });

  describe('All.prototype.formatValue', () => {
    describe('with the value as `true`', () => {
      it('returns an empty string', () => {
        all.setValue(true);
        expect(all.formatValue(), 'to be', '');
      });
    });

    describe('with other values', () => {
      it('returns the formatted value', () => {
        all.setValue(new Dummy(User));
        expect(all.formatValue(), 'to be', 'DUMMY');
      });
    });
  });

  describe('All.prototype.getText', () => {
    it('returns an `ALL` clause with a formatted value', () => {
      all.setValue(new Dummy(User));
      expect(all.getText(), 'to be', 'ALL DUMMY');
    });
  });
});

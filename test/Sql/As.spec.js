const expect = require('unexpected').clone();
const createUser = require('./lib/createUser');
const Dummy = require('./lib/Dummy');
const As = require('../../lib/Sql/As');

describe('Sql/As', () => {
  let User;

  before(() => {
    User = createUser();
  });

  let as;

  beforeEach(() => {
    as = new As(User);
  });

  describe('As.prototype.formatValue', () => {
    it('returns an `AS` clause with a formatted value and alias', () => {
      as.setValue({ value: 'foo', alias: 'bar' });
      expect(as.formatValue(), 'to be', '"foo" AS "bar"');
    });

    it('supports values as expressions', () => {
      as.setValue({ value: new Dummy(User), alias: 'foo' });
      expect(as.formatValue(), 'to be', 'DUMMY AS "foo"');
    });

    describe('with columns', () => {
      it('returns an `AS` clause with formatted identifiers', () => {
        as.setValue({ value: 'foo', alias: 'bar', columns: ['a', 'b'] });
        expect(as.formatValue(), 'to be', '"foo" AS "bar" ("a", "b")');
      });
    });
  });
});

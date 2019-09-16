const expect = require('unexpected').clone();
const createUser = require('./lib/createUser');
const Dummy = require('./lib/Dummy');
const As = require('../../lib/Sql/As');

describe('Sql/As', () => {
  let User;

  before(() => {
    User = createUser();
  });

  describe('As.prototype.getText', () => {
    it('returns an `AS` clause with a formatted value and alias', () => {
      const as = new As(User, { value: 'foo', alias: 'bar' });
      expect(as.getText(), 'to be', '"foo" AS "bar"');
    });

    it('supports values as expressions', () => {
      const as = new As(User, { value: new Dummy(), alias: 'foo' });
      expect(as.getText(), 'to be', 'DUMMY AS "foo"');
    });

    describe('with columns', () => {
      it('returns an `AS` clause with formatted identifiers', () => {
        const as = new As(User, {
          value: 'foo',
          alias: 'bar',
          columns: ['a', 'b']
        });
        expect(as.getText(), 'to be', '"foo" AS "bar" ("a", "b")');
      });
    });
  });
});

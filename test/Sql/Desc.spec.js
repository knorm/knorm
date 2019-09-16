const expect = require('unexpected').clone();
const createUser = require('./lib/createUser');
const Dummy = require('./lib/Dummy');
const Desc = require('../../lib/Sql/Desc');

describe('Sql/Desc', () => {
  let User;

  before(() => {
    User = createUser();
  });

  describe('Desc.prototype.getText', () => {
    describe('with `true` as the value', () => {
      it('returns a `DESC` clause', () => {
        const desc = new Desc(User, true);
        expect(desc.getText(), 'to be', 'DESC');
      });
    });

    describe('with other values', () => {
      it('returns a `DESC` clause with the formatted value', () => {
        const desc = new Desc(User, new Dummy());
        expect(desc.getText(), 'to be', 'DESC DUMMY');
      });
    });
  });
});

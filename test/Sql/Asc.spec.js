const expect = require('unexpected').clone();
const createUser = require('./lib/createUser');
const Dummy = require('./lib/Dummy');
const Asc = require('../../lib/Sql/Asc');

describe('Sql/Asc', () => {
  let User;

  before(() => {
    User = createUser();
  });

  describe('Asc.prototype.getText', () => {
    describe('with `true` as the value ', () => {
      it('returns an `ASC` clause', () => {
        const asc = new Asc(User, true);
        expect(asc.getText(), 'to be', 'ASC');
      });
    });

    describe('with other values', () => {
      it('returns an `ASC` clause with the formatted value', () => {
        const asc = new Asc(User, new Dummy());
        expect(asc.getText(), 'to be', 'ASC DUMMY');
      });
    });
  });
});

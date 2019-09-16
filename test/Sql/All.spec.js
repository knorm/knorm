const expect = require('unexpected').clone();
const createUser = require('./lib/createUser');
const Dummy = require('./lib/Dummy');
const All = require('../../lib/Sql/All');

describe('Sql/All', () => {
  let User;

  before(() => {
    User = createUser();
  });

  describe('All.prototype.getText', () => {
    describe('with the value as `true`', () => {
      it('returns an `ALL` clause', () => {
        const all = new All(User, true);
        expect(all.getText(), 'to be', 'ALL');
      });
    });

    describe('with other values', () => {
      it('returns an `ALL` clause with the formatted value', () => {
        const all = new All(User, new Dummy());
        expect(all.getText(), 'to be', 'ALL DUMMY');
      });
    });
  });
});

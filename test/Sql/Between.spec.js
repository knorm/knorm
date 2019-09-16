const expect = require('unexpected').clone();
const createUser = require('./lib/createUser');
const Dummy = require('./lib/Dummy');
const Between = require('../../lib/Sql/Between');

describe('Sql/Between', () => {
  let User;

  before(() => {
    User = createUser();
  });

  describe('Between.prototype.getText', () => {
    it('returns a `BETWEEN` clause with a formatted field and value', () => {
      const between = new Between(User, { field: 'id', value: [1, 2] });
      expect(between.getText(), 'to be', '"user"."id" BETWEEN ? AND ?');
    });

    it('supports field expressions', () => {
      const between = new Between(User, { field: new Dummy(), value: [1, 2] });
      expect(between.getText(), 'to be', 'DUMMY BETWEEN ? AND ?');
    });

    it('supports value expressions', () => {
      const value = [new Dummy(), new Dummy()];
      const between = new Between(User, { field: 'id', value });
      expect(between.getText(), 'to be', '"user"."id" BETWEEN DUMMY AND DUMMY');
    });
  });
});

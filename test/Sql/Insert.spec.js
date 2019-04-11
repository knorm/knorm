const Knorm = require('../../lib/Knorm');
const expect = require('unexpected').clone();

describe.only('Insert', () => {
  let Model;
  let Query;
  let User;
  let Sql;
  let Raw;
  let Insert;

  before(() => {
    const orm = new Knorm({});

    Model = orm.Model;
    Query = orm.Query;
    Sql = orm.Sql;
    Raw = Sql.Raw;
    Insert = Sql.Insert;

    User = class extends Model {};
    User.table = 'user';
    User.fields = {
      id: 'integer',
      name: 'string',
      description: 'text',
      confirmed: 'boolean'
    };
  });

  let insert;

  beforeEach(() => {
    insert = new Insert(User);
  });

  describe('Insert.prototype.formatInsert', () => {
    describe('with no options set', () => {
      it('returns a basic `INSERT INTO` statement', () => {
        expect(insert.formatInsert(), 'to equal', { sql: 'INSERT INTO user' });
      });
    });
  });
});

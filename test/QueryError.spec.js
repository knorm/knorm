const expect = require('unexpected').clone();
const QueryError = require('../lib/QueryError');
const KnormError = require('../lib/KnormError');
const Knorm = require('../lib/Knorm');

const { Query, Model } = new Knorm();
class User extends Model {}
User.table = 'user';
User.fields = { id: { type: 'integer', primary: true } };

describe('QueryError', () => {
  it('extends KnormError', () => {
    expect(QueryError.prototype, 'to be a', KnormError);
  });

  describe('when passed a database error', () => {
    it('extracts the database error message from knex QueryBuilder errors', () => {
      const error = new Error(
        'insert into "user" ("foo") values ($1) - column "foo" of relation "user" does not exist'
      );
      expect(new QueryError({ error, query: new Query(User) }), 'to satisfy', {
        message:
          'User: insert into "user" ("foo") values ($1) - column "foo" of relation "user" does not exist'
      });
    });

    it('stores the passed error as `originalError`', () => {
      const error = new Error('connect ECONNREFUSED 127.0.0.1:5616');
      expect(new QueryError({ error, query: new Query(User) }), 'to satisfy', {
        originalError: error
      });
    });
  });
});

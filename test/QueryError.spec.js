const expect = require('unexpected').clone();
const QueryError = require('../lib/QueryError');
const KnormError = require('../lib/KnormError');
const AbstractQuery = require('../lib/Query');
const AbstractModel = require('../lib/Model');
const AbstractField = require('../lib/Field');
const knex = require('./lib/knex');

class Query extends AbstractQuery {}
Query.knex = knex;

class User extends AbstractModel {}
User.Query = Query;
User.table = 'user';
User.fields = {
  id: {
    type: AbstractField.types.integer,
    required: true
  }
};

describe('QueryError', () => {
  it('extends KnormError', () => {
    expect(QueryError.prototype, 'to be a', KnormError);
  });

  describe('when passed a knex error', () => {
    const knexError = new Error(
      'insert into "user" ("foo") values ($1) - column "foo" of relation "user" does not exist'
    );

    it('extracts the database error message from knex errors', () => {
      expect(
        new QueryError({ error: knexError, query: new Query(User) }),
        'to satisfy',
        {
          message: 'User: column "foo" of relation "user" does not exist'
        }
      );
    });

    it('stores the passed error as `originalError`', () => {
      expect(
        new QueryError({ error: knexError, query: new Query(User) }),
        'to satisfy',
        {
          originalError: knexError
        }
      );
    });
  });
  describe('when not passed a knex error', () => {
    it('formats a message from the constructor name', () => {
      class SomethingWrongError extends QueryError {}
      expect(
        new SomethingWrongError({ query: new Query(User) }),
        'to satisfy',
        {
          message: 'User: something wrong'
        }
      );
    });
  });
});

const expect = require('unexpected').clone();
const QueryError = require('../lib/QueryError');
const KnormError = require('../lib/KnormError');
const AbstractQuery = require('../lib/Query');
const AbstractModel = require('../lib/Model');
const knex = require('./lib/knex');

class Query extends AbstractQuery {}
Query.knex = knex;

class User extends AbstractModel {}
User.Query = Query;
User.table = 'user';
User.fields = {
  id: {
    type: 'integer',
    required: true,
    primary: true
  }
};

describe('QueryError', () => {
  it('extends KnormError', () => {
    expect(QueryError.prototype, 'to be a', KnormError);
  });

  describe('when passed a knex error', () => {
    it('extracts the database error message from knex QueryBuilder errors', () => {
      const queryBuilderError = new Error(
        'insert into "user" ("foo") values ($1) - column "foo" of relation "user" does not exist'
      );
      expect(
        new QueryError({ error: queryBuilderError, query: new Query(User) }),
        'to satisfy',
        {
          message: 'User: column "foo" of relation "user" does not exist'
        }
      );
    });

    it('does not erroneously truncate other knex errors', () => {
      const knexError = new Error('connect ECONNREFUSED 127.0.0.1:5616');
      expect(
        new QueryError({ error: knexError, query: new Query(User) }),
        'to satisfy',
        {
          message: 'User: connect ECONNREFUSED 127.0.0.1:5616'
        }
      );
    });

    it('stores the passed error as `originalError`', () => {
      const knexError = new Error('connect ECONNREFUSED 127.0.0.1:5616');
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

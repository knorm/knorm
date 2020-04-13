import unexpected from 'unexpected';
import { Knorm } from '../src/Knorm';
import { KnormError } from '../src/KnormError';
import { QueryError } from '../src/QueryError';

const expect = unexpected.clone();

describe('QueryError', () => {
  let Query;
  let Model;
  let User;

  before(() => {
    ({ Query, Model } = new Knorm());
    User = class extends Model {};
    User.table = 'user';
    User.fields = { id: { type: 'integer', primary: true } };
  });

  it('extends KnormError', () => {
    expect(QueryError.prototype, 'to be a', KnormError);
  });

  describe('when passed only an Error instance', () => {
    it('stores the passed error as `originalError`', () => {
      const error = new Error('connect ECONNREFUSED 127.0.0.1:5616');
      expect(new QueryError(error), 'to satisfy', {
        originalError: error,
      });
    });

    it("constructs its error message from the error's message", () => {
      expect(
        new QueryError(new Error('connect ECONNREFUSED 127.0.0.1:5616')),
        'to satisfy',
        { message: 'connect ECONNREFUSED 127.0.0.1:5616' }
      );
    });
  });

  describe('when passed an Error and Query instance', () => {
    it('stores the passed error as `originalError`', () => {
      const error = new Error('connect ECONNREFUSED 127.0.0.1:5616');
      expect(new QueryError({ error, query: new Query(User) }), 'to satisfy', {
        originalError: error,
      });
    });

    it("constructs its error message with the Query's model-name and the error's message", () => {
      const error = new Error(
        'insert into "user" ("foo") values ($1) - column "foo" of relation "user" does not exist'
      );
      expect(new QueryError({ error, query: new Query(User) }), 'to satisfy', {
        message:
          'User: insert into "user" ("foo") values ($1) - column "foo" of relation "user" does not exist',
      });
    });
  });
});

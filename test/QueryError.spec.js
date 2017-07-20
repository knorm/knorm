const expect = require('unexpected').clone();
const QueryError = require('../lib/QueryError');
const KnormError = require('../lib/KnormError');
const AbstractQuery = require('../lib/Query');
const AbstractModel = require('../lib/Model');
const AbstractField = require('../lib/Field');
const knex = require('./lib/knex')();

class Query extends AbstractQuery {}
Query.knex = knex;

class User extends AbstractModel {}
User.Query = Query;
User.table = 'user';
User.fields = {
    id: {
        type: AbstractField.types.integer,
        required: true,
    },
};

describe('QueryError', function () {
    it('extends KnormError', () => {
        expect(QueryError.prototype, 'to be a', KnormError);
    });

    it('prepends error messages with the model name', function () {
        expect(new QueryError('foo bar', new Query(User)), 'to satisfy', {
            message: 'User: foo bar',
        });
    });
});

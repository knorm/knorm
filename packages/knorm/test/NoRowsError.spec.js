const expect = require('unexpected').clone();
const NoRowsError = require('../src/NoRowsError');
const KnormError = require('../src/KnormError');
const Knorm = require('../src/Knorm');

const { Query, Model } = new Knorm();
class User extends Model {}
User.table = 'user';
User.fields = { id: { type: 'integer', primary: true } };

describe('NoRowsError', () => {
  it('extends KnormError', () => {
    expect(NoRowsError.prototype, 'to be a', KnormError);
  });

  it('formats the error message from the constructor name', () => {
    class SomethingWrongError extends NoRowsError {}

    expect(new SomethingWrongError({ query: new Query(User) }), 'to satisfy', {
      message: 'User: something wrong',
    });
  });
});

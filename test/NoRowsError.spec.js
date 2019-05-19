const expect = require('unexpected').clone();
const NoRowsError = require('../lib/NoRowsError');
const KnormError = require('../lib/KnormError');
const Knorm = require('../lib/Knorm');

describe('NoRowsError', () => {
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
    expect(NoRowsError.prototype, 'to be a', KnormError);
  });

  it('formats the error message from the constructor name', () => {
    class SomethingWrongError extends NoRowsError {}

    expect(new SomethingWrongError({ query: new Query(User) }), 'to satisfy', {
      message: 'User: something wrong'
    });
  });
});

import unexpected from 'unexpected';
import { Knorm } from '../src/Knorm';
import { KnormError } from '../src/KnormError';
import { NoRowsError } from '../src/NoRowsError';

const expect = unexpected.clone();

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
      message: 'User: something wrong',
    });
  });
});

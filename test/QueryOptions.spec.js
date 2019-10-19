const Knorm = require('../lib/Knorm');
const util = require('util');
const expect = require('unexpected').clone();

describe('QueryOptions', () => {
  let User;
  let QueryOptions;

  before(() => {
    const { Model } = new Knorm();

    ({ QueryOptions } = Model);

    User = class extends Model {};
  });

  let queryOptions;

  beforeEach(() => {
    queryOptions = new QueryOptions(User);
  });

  describe('QueryOptions.prototpye[util.inspect.custom]', () => {
    it('inspects instances with no options', () => {
      expect(
        queryOptions[util.inspect.custom](2, {}),
        'to be',
        'QueryOptions(User) {}'
      );
    });

    it('inspects instances with options set', () => {
      queryOptions.setOptions({ fields: ['id', 'name'] });
      expect(
        queryOptions[util.inspect.custom](2, {}),
        'to be',
        "QueryOptions(User) { fields: [ 'id', 'name' ] }"
      );
    });

    it('supports `depth < 0`', () => {
      queryOptions.setOptions({ fields: ['id', 'name'] });
      expect(
        queryOptions[util.inspect.custom](-1, {}),
        'to be',
        'QueryOptions(User) {}'
      );
    });

    it('supports `colors`', () => {
      expect(
        queryOptions[util.inspect.custom](2, {
          colors: true,
          stylize: value => `${value}+color`
        }),
        'to start with',
        'QueryOptions(User)+color'
      );
    });
  });
});

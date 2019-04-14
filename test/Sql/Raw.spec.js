const Knorm = require('../../lib/Knorm');
const expect = require('unexpected').clone();

describe.only('Raw', () => {
  let User;
  let Raw;

  before(() => {
    const orm = new Knorm({});

    Raw = orm.Sql.Raw;

    User = class extends orm.Model {};
    User.table = 'user';
    User.fields = { id: 'integer', name: 'string' };
  });

  describe('Raw.prototype.formatRaw', () => {
    it('handles Raw instances with only string SQL', () => {
      const raw = new Raw(User, 'SELECT 1');
      expect(raw.formatRaw(), 'to equal', { sql: 'SELECT 1' });
    });

    it('handles Raw instances with values', () => {
      const raw = new Raw(User, { sql: 'SELECT ?', values: [1] });
      expect(raw.formatRaw(), 'to equal', { sql: 'SELECT ?', values: [1] });
    });
  });
});

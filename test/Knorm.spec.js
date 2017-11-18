const expect = require('unexpected').clone();
const Knorm = require('../lib/Knorm');
const Query = require('../lib/Query');
const QueryError = require('../lib/QueryError');
const knex = require('./lib/knex');

describe('Knorm', () => {
  it('exposes abstract classes as statics', () => {
    expect(Knorm.Query, 'to be', Query);
    expect(Knorm.QueryError, 'to be', QueryError);
  });

  it('creates new classes when instantiated', () => {
    const orm = new Knorm({ knex });
    expect(orm.Query, 'not to be', Query);
  });

  it('creates new classes per instance', () => {
    const firstOrm = new Knorm({ knex });
    const secondOrm = new Knorm({ knex });
    expect(firstOrm.Query, 'not to be', secondOrm.Query);
  });

  describe('with the `fieldToColumn` option provided', () => {
    it('configures it as the field-to-column-name mapping function', () => {
      const { Model } = new Knorm({
        knex,
        fieldToColumn(field) {
          return field.toLowerCase();
        }
      });
      Model.fields = { firstName: { type: 'string' } };
      expect(Model.fields.firstName.column, 'to be', 'firstname');
    });

    it('calls it with `this` set to the field instance', () => {
      let wasCalled;
      const { Model } = new Knorm({
        knex,
        fieldToColumn() {
          wasCalled = true;
          expect(this.constructor.name, 'to be', 'Field');
        }
      });
      Model.fields = { firstName: { type: 'string' } };
      expect(wasCalled, 'to be true');
    });
  });
});
const Knorm = require('../lib/Knorm');
const expect = require('unexpected').clone();

describe.only('Field', function() {
  let Model;
  let Field;

  before(function() {
    ({ Model, Field } = new Knorm());
  });

  describe('constructor', function() {
    let User;

    before(function() {
      User = class extends Model {};
    });

    it("sets the field's column", function() {
      const field = new Field(User, { name: 'id', column: '_id' });
      expect(field.column, 'to be', '_id');
    });
  });
});

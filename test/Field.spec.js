const Knorm = require('../lib/Knorm');
const expect = require('unexpected').clone();

describe('Field', function() {
  let Model;
  let Query;
  let Field;

  before(function() {
    const orm = new Knorm();
    Model = orm.Model;
    Query = orm.Query;
    Field = orm.Field;
  });

  describe('constructor', function() {
    let User;

    before(function() {
      User = class extends Model {};
    });

    it('throws an error if the field type is not provided', function() {
      expect(
        () =>
          new Field(User, {
            name: 'bar',
            model: User
          }),
        'to throw',
        new Error('Field `Foo.bar` has no type configured')
      );
    });

    it('throws an error if the field type is not supported', function() {
      expect(
        () =>
          new Field(User, {
            name: 'bar',
            model: User,
            type: 'bar'
          }),
        'to throw',
        new Error('Field `Foo.bar` has an invalid type `bar`')
      );
    });

    it("sets the field's column", function() {
      const field = new Field(User, {
        name: 'bar',
        model: User,
        type: 'string',
        column: 'the column name'
      });
      expect(field.column, 'to be', 'the column name');
    });
  });
});

const Knorm = require('../lib/Knorm');
const sinon = require('sinon');
const expect = require('unexpected')
  .clone()
  .use(require('unexpected-sinon'))
  .use(require('./lib/unexpected-workaround'));

describe('Field', function() {
  let Model;
  let Query;
  let Field;
  let sql;

  before(function() {
    const orm = new Knorm();
    Model = orm.Model;
    Query = orm.Query;
    Field = orm.Field;
    sql = Query.prototype.sql;
  });

  describe('constructor', function() {
    let Foo;

    before(function() {
      Foo = class extends Model {};
    });

    it('throws an error if the field type is not provided', function() {
      expect(
        () =>
          new Field({
            name: 'bar',
            model: Foo
          }),
        'to throw',
        new Error('Field `Foo.bar` has no type configured')
      );
    });

    it('throws an error if the field type is not supported', function() {
      expect(
        () =>
          new Field({
            name: 'bar',
            model: Foo,
            type: 'bar'
          }),
        'to throw',
        new Error('Field `Foo.bar` has an invalid type `bar`')
      );
    });

    describe('with a column name configured', function() {
      it("sets the field's column name from configured value", function() {
        const field = new Field({
          name: 'bar',
          model: Foo,
          type: 'string',
          column: 'the column name'
        });
        expect(field.column, 'to be', 'the column name');
      });

      it('does not call getColumnName', function() {
        const spy = sinon.spy(Field.prototype, 'getColumnName');
        // eslint-disable-next-line no-unused-vars
        const field = new Field({
          name: 'bar',
          model: Foo,
          type: 'string',
          column: 'bar'
        });
        expect(spy, 'was not called');
        spy.restore();
      });
    });

    describe('without a column name configured', function() {
      it("calls getColumnName to set the field's column name", function() {
        const stub = sinon
          .stub(Field.prototype, 'getColumnName')
          .returns('the column name');
        const field = new Field({
          name: 'bar',
          model: Foo,
          type: 'string'
        });
        expect(stub, 'to have calls satisfying', () => {
          stub('bar');
        });
        expect(field.column, 'to be', 'the column name');
        stub.restore();
      });
    });

    describe('with `cast` options', function() {
      it('throws if `cast.forSave` is not a function', function() {
        expect(
          () =>
            new Field({
              name: 'bar',
              model: Foo,
              type: 'string',
              cast: {
                forSave: 'foo'
              }
            }),
          'to throw',
          new Error(
            '`cast.forSave` option for field `Foo.bar` should be a function'
          )
        );
      });

      it('throws if `cast.forFetch` is not a function', function() {
        expect(
          () =>
            new Field({
              name: 'bar',
              model: Foo,
              type: 'string',
              cast: {
                forFetch: 'foo'
              }
            }),
          'to throw',
          new Error(
            '`cast.forFetch` option for field `Foo.bar` should be a function'
          )
        );
      });
    });
  });

  describe('Field.prototype.getColumnName', function() {
    it('returns the field name passed as is', function() {
      class Foo extends Model {}
      const field = new Field({
        name: 'firstName',
        model: Foo,
        type: 'string'
      });
      expect(field.getColumnName('firstName'), 'to be', 'firstName');
    });
  });

  describe('Field.prototype.cast', function() {
    let User;

    before(function() {
      User = class extends Model {};
    });

    describe('with no cast functions defined', function() {
      it('returns undefined', function() {
        const field = new Field({
          name: 'firstName',
          model: User,
          type: 'string'
        });
        expect(
          field.cast('bar value', 'a model instance', { forSave: true }),
          'to be undefined'
        );
      });
    });

    describe('with a `forSave` cast function and the `forSave` option set to `true`', function() {
      it('calls the function with the value and the model instance', function() {
        const forSave = sinon.spy();
        const field = new Field({
          name: 'firstName',
          model: User,
          type: 'string',
          cast: { forSave }
        });
        field.cast('bar value', 'a model instance', { forSave: true });
        expect(forSave, 'to have calls satisfying', () =>
          forSave('bar value', 'a model instance')
        );
      });

      it('calls the function with raw sql values', function() {
        const forSave = sinon.spy();
        const field = new Field({
          name: 'firstName',
          model: User,
          type: 'string',
          cast: { forSave }
        });
        field.cast(sql('bar value'), 'a model instance', { forSave: true });
        expect(forSave, 'to have calls satisfying', () =>
          forSave(sql('bar value'), 'a model instance')
        );
      });
    });

    describe('with a `forFetch` cast function and the `forFetch` option set to `true`', function() {
      it('calls the function with the value and the model instance', function() {
        const forFetch = sinon.spy();
        const field = new Field({
          name: 'firstName',
          model: User,
          type: 'string',
          cast: { forFetch }
        });
        field.cast('bar value', 'a model instance', { forFetch: true });
        expect(forFetch, 'to have calls satisfying', () =>
          forFetch('bar value', 'a model instance')
        );
      });
    });

    describe('with both `forFetch` and `forSave` cast functions', function() {
      it('calls only the `forFetch` cast function if the `forFetch` option is enabled', function() {
        const forSave = sinon.spy();
        const forFetch = sinon.spy();
        const field = new Field({
          name: 'firstName',
          model: User,
          type: 'string',
          cast: { forSave, forFetch }
        });
        field.cast('bar value', 'a model instance', { forFetch: true });
        expect(forFetch, 'was called');
        expect(forSave, 'was not called');
      });

      it('calls only the `forSave` cast function if the `forSave` option is enabled', function() {
        const forSave = sinon.spy();
        const forFetch = sinon.spy();
        const field = new Field({
          name: 'firstName',
          model: User,
          type: 'string',
          cast: { forSave, forFetch }
        });
        field.cast('bar value', 'a model instance', { forSave: true });
        expect(forSave, 'was called');
        expect(forFetch, 'was not called');
      });
    });
  });
});

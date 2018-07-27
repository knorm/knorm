const knorm = require('@knorm/knorm');
const KnormToJSON = require('../lib/KnormToJSON');
const knormToJSON = require('../');
const expect = require('unexpected').clone();

const { KnormToJSONError } = KnormToJSON;

describe('KnormToJSON', () => {
  describe('init', () => {
    it('throws if not passed a `Knorm` instance', () => {
      expect(
        () => new KnormToJSON().init(),
        'to throw',
        new KnormToJSONError('no Knorm instance provided')
      );
    });

    it('throws if passed an invalid `Knorm` instance', () => {
      expect(
        () => new KnormToJSON().init({}),
        'to throw',
        new KnormToJSONError('invalid Knorm instance provided')
      );
    });
  });

  describe('updateModel', () => {
    describe('with fields to exclude', () => {
      it('supports a single field', () => {
        const { Model } = knorm().use(knormToJSON({ exclude: 'id' }));
        class Foo extends Model {}
        Foo.fields = { id: 'integer', name: 'string', email: 'email' };
        const foo = new Foo({
          id: 1,
          name: 'Foo Foo',
          email: 'foo@foo.com'
        });
        expect(foo.toJSON(), 'to exhaustively satisfy', {
          name: 'Foo Foo',
          email: 'foo@foo.com'
        });
      });

      it('supports an array of fields', () => {
        const { Model } = knorm().use(knormToJSON({ exclude: ['id', 'name'] }));
        class Foo extends Model {}
        Foo.fields = { id: 'integer', name: 'string', email: 'email' };
        const foo = new Foo({
          id: 1,
          name: 'Foo Foo',
          email: 'foo@foo.com'
        });
        expect(foo.toJSON(), 'to exhaustively satisfy', {
          email: 'foo@foo.com'
        });
      });

      it('supports a property that is not a field-name', () => {
        const { Model } = knorm().use(knormToJSON({ exclude: ['foo'] }));
        class Foo extends Model {}
        Foo.fields = { id: 'integer', name: 'string', email: 'email' };
        const foo = new Foo({
          id: 1,
          name: 'Foo Foo',
          email: 'foo@foo.com',
          foo: 'foo'
        });
        expect(foo.toJSON(), 'to exhaustively satisfy', {
          id: 1,
          name: 'Foo Foo',
          email: 'foo@foo.com'
        });
      });

      it('includes all other properties on the model (including non-fields)', () => {
        const { Model } = knorm().use(knormToJSON({ exclude: ['id'] }));

        class Foo extends Model {}
        Foo.fields = { id: 'integer', name: 'string', email: 'email' };

        const foo = new Foo({
          id: 1,
          name: 'Foo Foo',
          email: 'foo@foo.com',
          extra: 'bar'
        });

        expect(foo.toJSON(), 'to exhaustively satisfy', {
          name: 'Foo Foo',
          email: 'foo@foo.com',
          extra: 'bar'
        });
      });

      describe('when a model is stringified', () => {
        it('works when a model is JSON.stringified', () => {
          const { Model } = knorm().use(knormToJSON({ exclude: ['email'] }));
          class Foo extends Model {}
          Foo.fields = { id: 'integer', name: 'string', email: 'email' };
          const foo = new Foo({
            id: 1,
            name: 'Foo Foo',
            email: 'foo@foo.com',
            extra: 'bar'
          });
          expect(
            JSON.stringify(foo),
            'to exhaustively satisfy',
            '{"id":1,"name":"Foo Foo","extra":"bar"}'
          );
        });
      });
    });
  });
});

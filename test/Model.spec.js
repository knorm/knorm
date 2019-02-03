const Knorm = require('../lib/Knorm');
const Virtual = require('../lib/Virtual');
const postgresPlugin = require('./lib/postgresPlugin');
const knex = require('./lib/knex');
const sinon = require('sinon');
const expect = require('unexpected')
  .clone()
  .use(require('unexpected-sinon'))
  .use(require('unexpected-knex'))
  .use(require('./lib/unexpected-workaround'));

describe('Model', () => {
  let Model;
  let Query;
  let Field;

  before(() => {
    ({ Model, Query, Field } = new Knorm());
  });

  describe('constructor', () => {
    describe('when the model has virtuals', () => {
      it("adds virtual's getters on the instance", () => {
        class Foo extends Model {}

        Foo.virtuals = {
          foo: {
            get() {
              return 'foo';
            }
          }
        };

        const foo = new Foo();

        expect(foo.foo, 'to be', 'foo');
      });

      it('adds the getters with the correct scope', () => {
        class Foo extends Model {}

        Foo.virtuals = {
          foo: {
            get() {
              return this.theValue;
            }
          }
        };

        const foo = new Foo();
        foo.theValue = 'bar';

        expect(foo.foo, 'to be', 'bar');
      });

      it("adds virtual's setters on the instance with the correct scope", () => {
        class Foo extends Model {}

        Foo.virtuals = {
          foo: {
            set(value) {
              this.theValue = value;
            }
          }
        };

        const foo = new Foo();
        foo.foo = 'bar';

        expect(foo.theValue, 'to be', 'bar');
      });
    });

    describe('with data provided', () => {
      it('calls Model.prototype.setData to populate the instance with the data', () => {
        class Foo extends Model {}

        Foo.fields = {
          id: {
            type: 'integer'
          }
        };

        const spy = sinon.spy(Foo.prototype, 'setData');
        // eslint-disable-next-line no-unused-vars
        const field = new Foo({ id: 1 });

        expect(spy, 'to have calls satisfying', () => {
          spy({
            id: 1
          });
        });

        spy.restore();
      });
    });
  });

  describe('Model.prototype.getField', () => {
    it('returns the field requested', () => {
      class Foo extends Model {}

      Foo.fields = {
        foo: {
          type: 'string'
        }
      };

      const foo = new Foo();
      expect(foo.getField('foo'), 'to equal', Foo.fields.foo);
    });
  });

  describe('Model.prototype.getFields', () => {
    it("returns all the model's fields if called with no arguments", () => {
      class Foo extends Model {}

      Foo.fields = {
        foo: {
          type: 'string'
        }
      };

      const foo = new Foo();
      expect(foo.getFields(), 'to equal', [Foo.fields.foo]);
    });

    it('returns an array of `Field` instances', () => {
      class Foo extends Model {}

      Foo.fields = {
        foo: {
          type: 'string'
        }
      };

      const foo = new Foo();
      expect(foo.getFields(['foo']), 'to satisfy', [
        expect.it('to be a', Field)
      ]);
    });

    it('returns the correct fields', () => {
      class Foo extends Model {}

      Foo.fields = {
        foo: {
          type: 'string'
        },
        bar: {
          type: 'string'
        }
      };

      const foo = new Foo();
      expect(foo.getFields(['bar', 'foo']), 'to satisfy', [
        Foo.fields.bar,
        Foo.fields.foo
      ]);
    });

    it('returns the same fields if passed an array of field instances', () => {
      class Foo extends Model {}

      Foo.fields = {
        foo: {
          type: 'string'
        },
        bar: {
          type: 'string'
        }
      };

      const foo = new Foo();
      expect(foo.getFields([Foo.fields.bar, Foo.fields.foo]), 'to satisfy', [
        Foo.fields.bar,
        Foo.fields.foo
      ]);
    });
  });

  describe('Model.prototype.setData', () => {
    it('populates the instance with the data with the passed object', () => {
      class Foo extends Model {}

      Foo.fields = {
        foo: {
          type: 'string'
        },
        bar: {
          type: 'integer'
        }
      };

      const foo = new Foo();

      expect(foo.foo, 'to be undefined');
      expect(foo.bar, 'to be undefined');
      foo.setData({
        foo: 'foo',
        bar: 1
      });
      expect(foo.foo, 'to equal', 'foo');
      expect(foo.bar, 'to equal', 1);
    });

    it('populates virtuals if provided in the object', () => {
      class Foo extends Model {}

      Foo.virtuals = {
        bar: {
          get() {
            return this.setVirtualBarValue;
          },
          set(value) {
            this.setVirtualBarValue = value;
          }
        }
      };

      const foo = new Foo();

      expect(foo.bar, 'to be undefined');
      foo.setData({
        bar: 1
      });
      expect(foo.bar, 'to equal', 1);
    });

    it('throws if a virtual provided in the object has no setter', () => {
      class Foo extends Model {}

      Foo.virtuals = {
        bar: {
          get() {}
        }
      };

      const foo = new Foo();

      expect(foo.bar, 'to be undefined');
      expect(
        () => foo.setData({ bar: 1 }),
        'to throw',
        new TypeError(
          'Cannot set property bar of #<Foo> which has only a getter'
        )
      );
    });

    it("calls the virtual's setter with this set to the model instance", () => {
      class Foo extends Model {}

      const spy = sinon.spy();
      Foo.virtuals = {
        bar: {
          set: spy
        }
      };

      const foo = new Foo();

      foo.setData({ bar: 1 });
      expect(spy, 'was called once').and('was called on', foo);
    });

    it('returns the model instance to allow chaining', () => {
      class Foo extends Model {}

      Foo.fields = {
        foo: {
          required: true,
          type: 'string'
        }
      };

      const foo = new Foo();

      expect(foo.setData({ foo: 'foo' }), 'to satisfy', foo);
    });

    it('filters out `undefined` values from the data', () => {
      class Foo extends Model {}

      Foo.virtuals = {
        foo: {
          set(value) {
            if (value === undefined) {
              throw new Error('wat');
            }
          }
        }
      };

      const foo = new Foo();

      expect(() => foo.setData({ foo: undefined }), 'not to throw');
    });
  });

  describe('Model.prototype.setDefaults', () => {
    it('populates all configured fields with the configured default value', () => {
      class Foo extends Model {}

      Foo.fields = {
        foo: {
          type: 'string',
          default: 'foo'
        },
        bar: {
          type: 'string',
          default: 'bar'
        }
      };

      const foo = new Foo();

      expect(foo.foo, 'to be undefined');
      expect(foo.bar, 'to be undefined');
      foo.setDefaults();
      expect(foo.foo, 'to equal', 'foo');
      expect(foo.bar, 'to equal', 'bar');
    });

    it('accepts a list of fields to populate with the configured default value', () => {
      class Foo extends Model {}

      Foo.fields = {
        foo: {
          type: 'string',
          default: 'foo'
        },
        bar: {
          type: 'string',
          default: 'bar'
        }
      };

      const foo = new Foo();

      expect(foo.foo, 'to be undefined');
      expect(foo.bar, 'to be undefined');
      foo.setDefaults({ fields: ['bar'] });
      expect(foo.foo, 'to be undefined');
      expect(foo.bar, 'to equal', 'bar');
    });

    it("doesn't overwrite values that have already been set", () => {
      class Foo extends Model {}

      Foo.fields = {
        foo: {
          type: 'string',
          default: 'foo'
        }
      };

      const foo = new Foo();

      foo.foo = 'dont change me';
      expect(foo.foo, 'to be', 'dont change me');
      foo.setDefaults();
      expect(foo.foo, 'to be', 'dont change me');
    });

    describe("when a field's default value is a function", () => {
      it('calls the function and populates the field with the return value', () => {
        class Foo extends Model {}

        Foo.fields = {
          foo: {
            type: 'string',
            default() {
              return 'foo';
            }
          }
        };

        const foo = new Foo();

        expect(foo.foo, 'to be undefined');
        foo.setDefaults();
        expect(foo.foo, 'to be', 'foo');
      });

      it('calls the function with the model instance as a parameter', () => {
        class Foo extends Model {}

        Foo.fields = {
          foo: {
            type: 'string',
            required: true
          },
          bar: {
            type: 'string',
            required: true
          },
          computed: {
            type: 'string',
            default(model) {
              return model.foo + model.bar;
            }
          }
        };

        const foo = new Foo();

        foo.foo = 'foo';
        foo.bar = 'bar';
        expect(foo.computed, 'to be undefined');
        foo.setDefaults();
        expect(foo.computed, 'to be', 'foobar');
      });
    });

    it('returns the model instance to allow chaining', () => {
      class Foo extends Model {}

      Foo.fields = {
        foo: {
          type: 'string',
          default: true
        }
      };

      const foo = new Foo();

      expect(foo.setDefaults(), 'to satisfy', foo);
    });
  });

  describe('Model.prototype.getFieldData', () => {
    let Foo;

    before(() => {
      Foo = class extends Model {};
      Foo.fields = { foo: 'string', bar: 'string' };
    });

    it('returns an object mapping fields to their values', () => {
      const foo = new Foo();

      foo.foo = 'foo';
      foo.bar = null;

      expect(foo.getFieldData(), 'to equal', {
        foo: 'foo',
        bar: null
      });
    });

    it('does not include fields whose value has not been set', () => {
      const foo = new Foo();

      foo.foo = 'foo';

      expect(foo.getFieldData(), 'to equal', {
        foo: 'foo',
        bar: undefined
      });
    });

    it('does not include properties set on the model that are not fields', () => {
      const foo = new Foo();

      foo.foo = 'foo';
      foo.quux = 'quux';

      expect(foo.getFieldData(), 'to equal', {
        foo: 'foo',
        quux: undefined
      });
    });

    describe('with a `fields` option', () => {
      it('only returns data for the requested fields', () => {
        const foo = new Foo();

        foo.foo = 'foo';
        foo.bar = 'bar';

        expect(foo.getFieldData({ fields: ['bar'] }), 'to equal', {
          bar: 'bar'
        });
      });

      it('does not include a field without a value even if it has been requested', () => {
        const foo = new Foo();

        foo.foo = 'foo';

        expect(foo.getFieldData({ fields: ['bar'] }), 'to equal', {});
      });
    });
  });

  describe('Model.prototype.getVirtualData', () => {
    it('resolves with an object with virtuals and their data', async () => {
      class Foo extends Model {}

      Foo.virtuals = {
        bar() {
          return 'bar';
        }
      };

      const foo = new Foo();

      await expect(
        foo.getVirtualData(),
        'to be fulfilled with value exhaustively satisfying',
        { bar: 'bar' }
      );
    });

    it('resolves with data from async virtuals (that return a Promise)', async () => {
      class Foo extends Model {}

      Foo.virtuals = {
        bar() {
          return Promise.resolve('bar');
        }
      };

      const foo = new Foo();

      await expect(
        foo.getVirtualData(),
        'to be fulfilled with value exhaustively satisfying',
        { bar: 'bar' }
      );
    });

    it('skips virtuals that have no getters', async () => {
      class Foo extends Model {}

      Foo.virtuals = {
        quux: {
          set() {}
        }
      };

      const foo = new Foo();

      await expect(
        foo.getVirtualData(),
        'to be fulfilled with value exhaustively satisfying',
        { quux: undefined }
      );
    });

    it("calls the virtuals' getters with this set to the model instance", async () => {
      class Foo extends Model {}

      const spy = sinon.spy();

      Foo.virtuals = { bar: { get: spy } };

      const foo = new Foo();

      await foo.getVirtualData();
      await expect(spy, 'was called once').and('was called on', foo);
    });
  });

  describe('with a `virtuals` option', () => {
    it('only includes the requested virtuals', async () => {
      class Foo extends Model {}

      Foo.virtuals = {
        bar: {
          get() {
            return 'bar';
          }
        },
        quux: {
          get() {
            return 'quux';
          }
        }
      };

      const foo = new Foo();

      await expect(
        foo.getVirtualData({ virtuals: ['bar'] }),
        'to be fulfilled with value exhaustively satisfying',
        { bar: 'bar' }
      );
    });

    it('rejects with an error if a requested virtual has no getter', async () => {
      class Foo extends Model {}

      Foo.virtuals = {
        bar: {
          set() {}
        }
      };

      const foo = new Foo();

      await expect(
        foo.getVirtualData({ virtuals: ['bar'] }),
        'to be rejected with',
        new Error("Virtual 'Foo.bar' has no getter")
      );
    });
  });

  describe('Model.prototype.getVirtualDataSync', () => {
    let Foo;

    before(() => {
      Foo = class extends Model {};
      Foo.virtuals = {
        foo() {
          return 'foo';
        },
        async bar() {
          return 'bar';
        }
      };
    });

    it('returns virtual data without async virtuals', () => {
      const foo = new Foo();
      expect(foo.getVirtualDataSync(), 'to equal', { foo: 'foo' });
    });

    describe('with a `virtuals` option', () => {
      it('does not include async virtuals even if requested', async () => {
        const foo = new Foo();

        expect(foo.getVirtualDataSync({ virtuals: ['bar'] }), 'to equal', {});
      });
    });
  });

  describe('Model.prototype.getData', () => {
    let Foo;

    before(() => {
      Foo = class extends Model {};
      Foo.fields = { foo: 'string', bar: 'string' };
      Foo.virtuals = {
        baz() {
          return 'baz';
        },
        async quux() {
          return 'quux';
        }
      };
    });

    it('resolves with an object with field and virtual field data', async () => {
      const foo = new Foo();

      foo.foo = 'foo';
      foo.bar = 'bar';

      await expect(
        foo.getData(),
        'to be fulfilled with value exhaustively satisfying',
        { foo: 'foo', bar: 'bar', baz: 'baz', quux: 'quux' }
      );
    });

    describe('with a `fields` option', () => {
      it('only includes the requested fields', async () => {
        const foo = new Foo();

        foo.foo = 'foo';
        foo.bar = 'bar';

        await expect(
          foo.getData({ fields: ['bar'] }),
          'to be fulfilled with value exhaustively satisfying',
          { bar: 'bar', baz: 'baz', quux: 'quux' }
        );
      });
    });

    describe('with a `virtuals` option', () => {
      it('only includes the requested virtuals', async () => {
        const foo = new Foo();

        foo.foo = 'foo';
        foo.bar = 'bar';

        await expect(
          foo.getData({ virtuals: ['baz'] }),
          'to be fulfilled with value exhaustively satisfying',
          { foo: 'foo', bar: 'bar', baz: 'baz' }
        );
      });
    });
  });

  describe('Model.prototype.getDataSync', () => {
    let Foo;

    before(() => {
      Foo = class extends Model {};
      Foo.fields = { foo: 'string', bar: 'string' };
      Foo.virtuals = {
        baz() {
          return 'baz';
        },
        async quux() {
          return 'quux';
        }
      };
    });

    it('returns an object with field and only sync virtual field data', () => {
      const foo = new Foo();

      foo.foo = 'foo';
      foo.bar = 'bar';

      expect(foo.getDataSync(), 'to equal', {
        foo: 'foo',
        bar: 'bar',
        baz: 'baz'
      });
    });

    describe('with a `fields` option', () => {
      it('only includes the requested fields', () => {
        const foo = new Foo();

        foo.foo = 'foo';
        foo.bar = 'bar';

        expect(foo.getDataSync({ fields: ['bar'] }), 'to equal', {
          bar: 'bar',
          baz: 'baz'
        });
      });
    });

    describe('with a `virtuals` option', () => {
      it('only includes the requested sync virtuals', () => {
        const foo = new Foo();

        foo.foo = 'foo';
        foo.bar = 'bar';

        expect(foo.getDataSync({ virtuals: ['baz'] }), 'to equal', {
          foo: 'foo',
          bar: 'bar',
          baz: 'baz'
        });
      });
    });
  });

  describe('Model.prototype.validate', () => {
    it('validates all the fields by default', async () => {
      class Foo extends Model {}

      Foo.fields = {
        foo: {
          required: true,
          type: 'string'
        },
        bar: {
          required: true,
          type: 'string'
        }
      };

      const fooValidationSpy = sinon.spy(Foo.fields.foo, 'validate');
      const barValidationSpy = sinon.spy(Foo.fields.bar, 'validate');

      const foo = new Foo();

      await expect(foo.validate(), 'to be rejected with', {
        name: 'ValidationError',
        type: 'RequiredError'
      });

      await expect(fooValidationSpy, 'was called once');
      await expect(barValidationSpy, 'was called once');

      fooValidationSpy.restore();
      barValidationSpy.restore();
    });

    describe("with a 'fields' option", () => {
      it('validates only the fields passed', async () => {
        class Foo extends Model {}

        Foo.fields = {
          foo: {
            required: true,
            type: 'string'
          },
          bar: {
            required: true,
            type: 'string'
          }
        };

        const fooValidationSpy = sinon.spy(Foo.fields.foo, 'validate');
        const barValidationSpy = sinon.spy(Foo.fields.bar, 'validate');

        const foo = new Foo();

        await expect(foo.validate({ fields: ['bar'] }), 'to be rejected with', {
          name: 'ValidationError',
          type: 'RequiredError'
        });

        await expect(fooValidationSpy, 'was not called');
        await expect(barValidationSpy, 'was called once');

        fooValidationSpy.restore();
        barValidationSpy.restore();
      });

      it('accepts a list of field objects', async () => {
        class Foo extends Model {}

        Foo.fields = {
          foo: {
            required: true,
            type: 'string'
          },
          bar: {
            required: true,
            type: 'string'
          }
        };

        const fooValidationSpy = sinon.spy(Foo.fields.foo, 'validate');
        const barValidationSpy = sinon.spy(Foo.fields.bar, 'validate');

        const foo = new Foo();

        await expect(
          foo.validate({ fields: [Foo.fields.bar] }),
          'to be rejected with',
          {
            name: 'ValidationError',
            type: 'RequiredError'
          }
        );

        await expect(fooValidationSpy, 'was not called');
        await expect(barValidationSpy, 'was called once');

        fooValidationSpy.restore();
        barValidationSpy.restore();
      });
    });

    it('calls the validator with the set value and the model instance', async () => {
      class Foo extends Model {}

      Foo.fields = {
        bar: {
          type: 'string'
        }
      };

      const barValidationSpy = sinon.spy(Foo.fields.bar, 'validate');

      const foo = new Foo();
      foo.bar = 'bar';

      await foo.validate({ fields: ['bar'] });
      await expect(barValidationSpy, 'to have calls satisfying', () => {
        barValidationSpy('bar', foo);
      });

      barValidationSpy.restore();
    });

    it('rejects with the error from Field.prototype.validate', async () => {
      class Foo extends Model {}

      Foo.fields = {
        bar: {
          type: 'string'
        }
      };

      const barValidationStub = sinon.stub(Foo.fields.bar, 'validate');
      barValidationStub.returns(Promise.reject(new Error('foo happens')));

      const foo = new Foo();

      await expect(
        foo.validate({ fields: ['bar'] }),
        'to be rejected with',
        new Error('foo happens')
      );

      barValidationStub.restore();
    });

    it('resolves with the model instance to allow chaining', async () => {
      class Foo extends Model {}

      Foo.fields = {
        bar: {
          default: true,
          type: 'string'
        }
      };

      const foo = new Foo();

      await expect(
        foo.validate({ fields: ['bar'] }),
        'to be fulfilled with',
        foo
      );
    });
  });

  describe('Model.prototype.cast', () => {
    it('casts all the fields that have cast functions and a value set', async () => {
      class Foo extends Model {}

      const fooSaveCast = sinon.spy();

      Foo.fields = {
        foo: {
          required: true,
          type: 'string',
          cast: {
            forSave: fooSaveCast
          }
        },
        bar: {
          required: true,
          type: 'string'
        }
      };

      const foo = new Foo();
      foo.foo = 'foo';
      foo.bar = 'bar';
      foo.cast({ forSave: true });

      await expect(fooSaveCast, 'was called once');
    });

    describe("with a 'fields' option", () => {
      it('casts only the fields passed', async () => {
        class Foo extends Model {}

        const fooSaveCast = sinon.spy();
        const barSaveCast = sinon.spy();

        Foo.fields = {
          foo: {
            required: true,
            type: 'string',
            cast: {
              forSave: fooSaveCast
            }
          },
          bar: {
            required: true,
            type: 'string',
            cast: {
              forSave: barSaveCast
            }
          }
        };

        const foo = new Foo();
        foo.foo = 'foo';
        foo.bar = 'bar';
        foo.cast({ fields: ['bar'], forSave: true });

        await expect(fooSaveCast, 'was not called');
        await expect(barSaveCast, 'was called once');
      });

      it('accepts a list of field objects', async () => {
        class Foo extends Model {}

        const fooSaveCast = sinon.spy();
        const barSaveCast = sinon.spy();

        Foo.fields = {
          foo: {
            required: true,
            type: 'string',
            cast: {
              forSave: fooSaveCast
            }
          },
          bar: {
            required: true,
            type: 'string',
            cast: {
              forSave: barSaveCast
            }
          }
        };

        const foo = new Foo();
        foo.foo = 'foo';
        foo.bar = 'bar';
        foo.cast({ fields: [Foo.fields.foo, Foo.fields.bar], forSave: true });

        await expect(fooSaveCast, 'was called once');
        await expect(barSaveCast, 'was called once');
      });
    });

    it('calls Field.prototype.cast with the set value, the model instance and options passed', () => {
      class Foo extends Model {}

      Foo.fields = {
        bar: {
          required: true,
          type: 'string',
          cast: {
            forSave() {}
          }
        }
      };

      const barCastSpy = sinon.spy(Foo.fields.bar, 'cast');

      const foo = new Foo();
      foo.bar = 'bar';
      foo.cast({ fields: ['bar'], forSave: true });

      expect(barCastSpy, 'to have calls satisfying', () => {
        barCastSpy('bar', foo, { forSave: true, forFetch: undefined });
      });

      barCastSpy.restore();
    });

    it('does not call Field.prototype.cast if the field has no value set', () => {
      class Foo extends Model {}

      Foo.fields = {
        bar: {
          required: true,
          type: 'string',
          cast: {
            forSave() {}
          }
        }
      };

      const barCastSpy = sinon.spy(Foo.fields.bar, 'cast');
      const foo = new Foo();

      foo.cast({ fields: ['bar'], forSave: true });
      expect(barCastSpy, 'was not called');

      barCastSpy.restore();
    });

    it("calls Field.prototype.cast if the field's value is `null`", () => {
      class Foo extends Model {}

      Foo.fields = {
        bar: {
          required: true,
          type: 'string',
          cast: {
            forSave() {}
          }
        }
      };

      const barCastSpy = sinon.spy(Foo.fields.bar, 'cast');
      const foo = new Foo();
      foo.bar = null;
      foo.cast({ fields: ['bar'], forSave: true });
      expect(barCastSpy, 'was called once');

      barCastSpy.restore();
    });

    it('updates the set value with the value from the cast function', () => {
      class Foo extends Model {}

      Foo.fields = {
        bar: {
          required: true,
          type: 'string',
          cast: {
            forSave() {
              return 'new value';
            }
          }
        }
      };

      const foo = new Foo();
      foo.bar = 'bar';
      foo.cast({ fields: ['bar'], forSave: true });

      expect(foo.bar, 'to be', 'new value');
    });

    it('does not update the set value if the cast function returns `undefined`', () => {
      class Foo extends Model {}

      Foo.fields = {
        bar: {
          required: true,
          type: 'string',
          cast: {
            forSave() {}
          }
        }
      };

      const foo = new Foo();
      foo.bar = 'bar';
      foo.cast({ fields: ['bar'], forSave: true });

      expect(foo.bar, 'to be', 'bar');
    });

    it('updates the set value if the cast function returns `null`', () => {
      class Foo extends Model {}

      Foo.fields = {
        bar: {
          required: true,
          type: 'string',
          cast: {
            forSave() {
              return null;
            }
          }
        }
      };

      const foo = new Foo();
      foo.bar = 'bar';
      foo.cast({ fields: ['bar'], forSave: true });

      expect(foo.bar, 'to be', null);
    });

    it('returns the model instance to allow chaining', () => {
      class Foo extends Model {}

      Foo.fields = {
        bar: {
          default: true,
          type: 'string',
          cast: {
            forSave() {}
          }
        }
      };

      const foo = new Foo();

      expect(foo.cast({ fields: ['bar'] }, { forSave: true }), 'to be', foo);
    });
  });

  describe('Model.prototype.getQuery', () => {
    const { Model, Query } = new Knorm();

    class Foo extends Model {}

    Foo.table = 'foo';
    Foo.fields = {
      id: {
        type: 'integer',
        primary: true
      },
      name: {
        type: 'string'
      }
    };

    it('passes any options passed to Query.prototype.setOptions', () => {
      const setOptions = sinon
        .stub(Query.prototype, 'setOptions')
        .returnsThis();
      new Foo({ id: 1 }).getQuery({ returning: 'name' });
      expect(setOptions, 'to have calls satisfying', () =>
        setOptions({ returning: 'name' })
      );
      setOptions.restore();
    });

    it('sets `first` to `true`', () => {
      const first = sinon.stub(Query.prototype, 'first').returnsThis();
      new Foo({ id: 1 }).getQuery();
      expect(first, 'to have calls satisfying', () => first(true));
      first.restore();
    });

    it('sets `require` to `true` by default', () => {
      const require = sinon.stub(Query.prototype, 'require').returnsThis();
      new Foo({ id: 1 }).getQuery();
      expect(require, 'to have calls satisfying', () => require(true));
      require.restore();
    });

    it('allows overriding the `require` option to `false`', () => {
      const require = sinon.stub(Query.prototype, 'require').returnsThis();
      new Foo({ id: 1 }).getQuery({ require: false });
      expect(require, 'to have calls satisfying', () => require(false));
      require.restore();
    });

    it('passes the primary field set on the model to Query.prototype.where', () => {
      const where = sinon.stub(Query.prototype, 'where').returnsThis();
      new Foo({ id: 1 }).getQuery();
      expect(where, 'to have calls satisfying', () => where({ id: 1 }));
      where.restore();
    });

    it('throws if the primary field is not set', () => {
      expect(
        () => new Foo({}).getQuery(),
        'to throw',
        new Error('Foo: primary field (`id`) is not set')
      );
    });

    it('appends the `where` clause if a `where` option is passed', () => {
      const where = sinon.stub(Query.prototype, 'where').returnsThis();
      new Foo({ id: 1 }).getQuery({ where: { name: 'foo' } });
      expect(where, 'to have calls satisfying', () => {
        where({ name: 'foo' });
        where({ id: 1 });
      });
      where.restore();
    });

    describe('with unique fields configured', () => {
      class Foo extends Model {}

      Foo.table = 'foo';
      Foo.fields = {
        id: {
          type: 'integer',
          primary: true
        },
        name: {
          type: 'string',
          unique: true
        },
        number: {
          type: 'integer',
          unique: true
        }
      };

      let whereStub;

      before(() => {
        whereStub = sinon.stub(Query.prototype, 'where').returnsThis();
      });

      beforeEach(() => {
        whereStub.resetHistory();
      });

      after(() => {
        whereStub.restore();
      });

      it('uses the unique fields in a where clause if the primary field is not set', () => {
        new Foo({ name: 'foo' }).getQuery();
        expect(whereStub, 'to have calls satisfying', () =>
          whereStub({ name: 'foo' })
        );
      });

      it('uses the primary field if both unique and primary fields are set', () => {
        new Foo({ id: 1, name: 'foo' }).getQuery();
        expect(whereStub, 'to have calls satisfying', () =>
          whereStub({ id: 1 })
        );
      });

      it('uses only one of the primary fields if more than one are set', () => {
        new Foo({ name: 'foo', number: 1 }).getQuery();
        expect(whereStub, 'to have calls satisfying', () =>
          whereStub({ name: 'foo' })
        );
      });

      it('throws if neither the primary field nor unique fields are set', () => {
        expect(
          () => new Foo({}).getQuery(),
          'to throw',
          new Error('Foo: primary field (`id`) is not set')
        );
      });
    });

    describe('for inserts', () => {
      it('does not throw if the primary field is not set', () => {
        expect(
          () => new Foo({}).getQuery({}, { forInsert: true }),
          'not to throw'
        );
      });

      it('does not construct a `where` clause', () => {
        const where = sinon.stub(Query.prototype, 'where').returnsThis();
        new Foo({ id: 1 }).getQuery({}, { forInsert: true });
        expect(where, 'was not called');
        where.restore();
      });
    });
  });

  describe('Model.config', () => {
    describe('as a setter', () => {
      it("adds the model to the Knorm instances' models", () => {
        const knorm = new Knorm();
        class Foo extends knorm.Model {}

        expect(knorm.models.Foo, 'to be undefined');

        Foo.config = {};

        expect(knorm.models.Foo, 'to be', Foo);
      });
    });

    describe('when a model is subclassed', () => {
      it("adds the subclassed model to the Knorm instances' models", () => {
        const knorm = new Knorm();
        class Foo extends knorm.Model {}

        Foo.config = {};

        expect(knorm.models.Foo, 'to be', Foo);

        class Bar extends Foo {}

        Bar.config = {};

        expect(knorm.models.Foo, 'to be', Foo);
        expect(knorm.models.Bar, 'to be', Bar);
      });
    });
  });

  describe('Model.schema', () => {
    describe('as a setter', () => {
      it("sets the model's schema", () => {
        class Foo extends Model {}
        Foo.schema = 'foo';
        expect(Foo.config.schema, 'to be', 'foo');
      });
    });

    describe('when a model is subclassed', () => {
      it("inherits the parent's schema", () => {
        class Foo extends Model {}
        Foo.schema = 'foo';

        class Bar extends Foo {}

        expect(Foo.schema, 'to be', 'foo');
        expect(Bar.schema, 'to be', 'foo');
      });

      it("inherits the parent's schema when other configs are set", function() {
        class Foo extends Model {}
        Foo.schema = 'foo';

        class Bar extends Foo {}
        Bar.table = 'bar';

        expect(Foo.schema, 'to be', 'foo');
        expect(Bar.schema, 'to be', 'foo');
      });

      it("allows overwriting the parent's schema", () => {
        class Foo extends Model {}
        Foo.schema = 'foo';

        class Bar extends Foo {}

        Bar.schema = 'bar';

        expect(Foo.schema, 'to be', 'foo');
        expect(Bar.schema, 'to be', 'bar');
      });
    });
  });

  describe('Model.table', () => {
    describe('as a setter', () => {
      it("sets the model's table", () => {
        class Foo extends Model {}
        Foo.table = 'foo';
        expect(Foo.config.table, 'to be', 'foo');
      });
    });

    describe('when a model is subclassed', () => {
      it("inherits the parent's table", () => {
        class Foo extends Model {}
        Foo.table = 'foo';

        class Bar extends Foo {}

        expect(Foo.table, 'to be', 'foo');
        expect(Bar.table, 'to be', 'foo');
      });

      it("inherits the parent's table when other configs are set", function() {
        class Foo extends Model {}
        Foo.table = 'foo';

        class Bar extends Foo {}
        Bar.fields = { bar: 'string' };

        expect(Foo.table, 'to be', 'foo');
        expect(Bar.table, 'to be', 'foo');
      });

      it("allows overwriting the parent's table", () => {
        class Foo extends Model {}
        class Bar extends Foo {}

        Foo.table = 'foo';
        Bar.table = 'bar';

        expect(Foo.table, 'to be', 'foo');
        expect(Bar.table, 'to be', 'bar');
      });
    });
  });

  describe('Model.fields', () => {
    describe('as a getter', () => {
      it('returns added fields', () => {
        class User extends Model {}
        User.fields = {
          firstName: {
            type: 'string'
          }
        };

        expect(User.fields, 'to exhaustively satisfy', {
          firstName: expect.it(
            'to be field',
            new Field({
              name: 'firstName',
              model: User,
              type: 'string'
            })
          )
        });
      });
    });

    describe('as a setter', () => {
      it("adds the passed fields to the model's fields", () => {
        class User extends Model {}
        User.fields = {
          firstName: {
            type: 'string'
          }
        };

        expect(User.fields, 'to exhaustively satisfy', {
          firstName: expect.it(
            'to be field',
            new Field({
              name: 'firstName',
              model: User,
              type: 'string'
            })
          )
        });
      });

      it("allows adding fields via the `fieldName: 'type'` shorthand", () => {
        class User extends Model {}
        User.fields = { firstName: 'string' };

        expect(User.fields, 'to exhaustively satisfy', {
          firstName: expect.it(
            'to be field',
            new Field({
              name: 'firstName',
              model: User,
              type: 'string'
            })
          )
        });
      });

      it('throws if the field-name is already assigned to an instance property', () => {
        class Foo extends Model {
          bar() {}
        }

        expect(
          () =>
            (Foo.fields = {
              bar: {
                type: 'string'
              }
            }),
          'to throw',
          new Error(
            'Foo: cannot add field `bar` (`Foo.prototype.bar` is already assigned)'
          )
        );
      });

      it('throws if the field-name is already added as a virtual', () => {
        class Foo extends Model {}

        Foo.virtuals = {
          bar: {
            get() {}
          }
        };

        expect(
          () =>
            (Foo.fields = {
              bar: {
                type: 'string'
              }
            }),
          'to throw',
          new Error('Foo: cannot add field `bar` (`bar` is a virtual)')
        );
      });

      describe('when a model is subclassed', () => {
        it('allows overwriting fields defined in the parent', () => {
          class User extends Model {}
          User.fields = {
            id: {
              type: 'string'
            }
          };

          expect(User.fields, 'to exhaustively satisfy', {
            id: expect.it(
              'to be field',
              new Field({
                name: 'id',
                model: User,
                type: 'string'
              })
            )
          });

          class OtherUser extends User {}
          OtherUser.fields = {
            id: {
              type: 'text'
            }
          };

          expect(OtherUser.fields, 'to exhaustively satisfy', {
            id: expect.it(
              'to be field',
              new Field({
                name: 'id',
                model: OtherUser,
                type: 'text'
              })
            )
          });
        });

        it('does not duplicate fieldNames when a field is overwritten', () => {
          class User extends Model {}
          User.fields = {
            id: {
              type: 'string'
            }
          };

          expect(User.config.fieldNames, 'to equal', ['id']);

          class OtherUser extends User {}
          OtherUser.fields = {
            id: {
              type: 'text'
            }
          };

          expect(User.config.fieldNames, 'to equal', ['id']);
          expect(OtherUser.config.fieldNames, 'to equal', ['id']);
        });

        it("updates the child's fields' model class", () => {
          class User extends Model {}
          User.fields = {
            firstName: {
              type: 'string'
            }
          };

          expect(User.fields, 'to satisfy', {
            firstName: expect.it(
              'to be field',
              new Field({
                name: 'firstName',
                model: User,
                type: 'string'
              })
            )
          });

          class Student extends User {}
          Student.fields = {
            studentId: {
              type: 'integer'
            }
          };

          expect(Student.fields, 'to satisfy', {
            firstName: expect.it(
              'to be field',
              new Field({
                name: 'firstName',
                model: Student,
                type: 'string'
              })
            )
          });
        });

        it("doesn't interfere with the parent's fields", () => {
          class User extends Model {}

          User.fields = {
            id: {
              type: 'integer',
              required: true
            }
          };

          expect(User.fields, 'to exhaustively satisfy', {
            id: expect.it(
              'to be field',
              new Field({
                name: 'id',
                model: User,
                required: true,
                type: 'integer'
              })
            )
          });

          class OtherUser extends User {}
          OtherUser.fields = {
            firstName: {
              type: 'string'
            }
          };

          expect(User.fields, 'to exhaustively satisfy', {
            id: expect.it(
              'to be field',
              new Field({
                name: 'id',
                model: User,
                required: true,
                type: 'integer'
              })
            )
          });
          expect(OtherUser.fields, 'to exhaustively satisfy', {
            id: expect.it(
              'to be field',
              new Field({
                name: 'id',
                model: OtherUser,
                required: true,
                type: 'integer'
              })
            ),
            firstName: expect.it(
              'to be field',
              new Field({
                name: 'firstName',
                model: OtherUser,
                type: 'string'
              })
            )
          });
        });
      });

      describe('with `methods` configured on a field', () => {
        it('adds `ByField` methods', () => {
          class User extends Model {}

          User.fields = {
            id: {
              type: 'string',
              methods: true
            }
          };

          expect(User.fetchById, 'to be a function');
          expect(User.updateById, 'to be a function');
          expect(User.deleteById, 'to be a function');
        });

        it('adds the correct names for camelCased field names', () => {
          class User extends Model {}

          User.fields = {
            someFieldName: {
              type: 'string',
              unique: true,
              methods: true
            }
          };

          expect(User.fetchBySomeFieldName, 'to be a function');
          expect(User.updateBySomeFieldName, 'to be a function');
          expect(User.deleteBySomeFieldName, 'to be a function');
        });

        it('inherits `ByField` methods', () => {
          class User extends Model {}
          class OtherUser extends User {}

          User.fields = {
            id: {
              type: 'string',
              primary: true,
              methods: true
            }
          };

          expect(OtherUser.fetchById, 'to be a function');
          expect(OtherUser.updateById, 'to be a function');
          expect(OtherUser.deleteById, 'to be a function');
        });
      });
    });

    describe('with a getter function', () => {
      let User;

      before(() => {
        User = class extends Model {
          static get fields() {
            this.config = { fields: { firstName: { type: 'string' } } };
            return this.config.fields;
          }
        };
      });

      it('returns fields added via the `Model.config` setter', () => {
        expect(User.fields, 'to exhaustively satisfy', {
          firstName: expect.it(
            'to be field',
            new Field({
              name: 'firstName',
              model: User,
              type: 'string'
            })
          )
        });
      });

      it('supports field inheritance', () => {
        class Student extends User {
          static get fields() {
            this.config = { fields: { studentId: { type: 'integer' } } };
            return this.config.fields;
          }
        }

        expect(User.fields, 'to exhaustively satisfy', {
          firstName: expect.it(
            'to be field',
            new Field({
              name: 'firstName',
              model: User,
              type: 'string'
            })
          )
        });

        expect(Student.fields, 'to exhaustively satisfy', {
          firstName: expect.it(
            'to be field',
            new Field({
              name: 'firstName',
              model: Student,
              type: 'string'
            })
          ),
          studentId: expect.it(
            'to be field',
            new Field({
              name: 'studentId',
              model: Student,
              type: 'integer'
            })
          )
        });
      });
    });
  });

  describe('Model.virtuals', () => {
    describe('as a setter', () => {
      it("adds the virtuals to the model's virtuals", () => {
        class User extends Model {}

        User.virtuals = {
          firstName: {
            get() {},
            set() {}
          }
        };

        expect(User.virtuals, 'to exhaustively satisfy', {
          firstName: new Virtual({
            name: 'firstName',
            model: User,
            descriptor: {
              get() {},
              set() {}
            }
          })
        });
      });

      it('throws if the virtual-name is already assigned to an instance property', () => {
        class Foo extends Model {
          bar() {}
        }

        expect(
          () =>
            (Foo.virtuals = {
              bar: {
                get() {}
              }
            }),
          'to throw',
          new Error(
            'Foo: cannot add virtual `bar` (`Foo.prototype.bar` is already assigned)'
          )
        );
      });

      it('throws if the virtual-name is already added as a field', () => {
        class Foo extends Model {}

        Foo.fields = {
          bar: {
            type: 'string'
          }
        };

        expect(
          () =>
            (Foo.virtuals = {
              bar: {
                get() {}
              }
            }),
          'to throw',
          new Error('Foo: cannot add virtual `bar` (`bar` is a field)')
        );
      });

      describe('when a model is subclassed', () => {
        it('allows overwriting the virtuals defined in the parent', () => {
          class User extends Model {}
          User.virtuals = {
            firstName: {
              get() {
                return 'foo';
              }
            }
          };

          expect(User.virtuals, 'to exhaustively satisfy', {
            firstName: new Virtual({
              name: 'firstName',
              model: User,
              descriptor: {
                get() {
                  return 'foo';
                }
              }
            })
          });

          class OtherUser extends User {}
          OtherUser.virtuals = {
            firstName: {
              get() {
                return 'bar';
              }
            }
          };

          expect(OtherUser.virtuals, 'to satisfy', {
            firstName: new Virtual({
              name: 'firstName',
              model: OtherUser,
              descriptor: {
                get() {
                  return 'bar';
                }
              }
            })
          });
        });

        it("updates the child's virtuals' model class", () => {
          class User extends Model {}
          User.virtuals = {
            firstName: {
              get() {
                return 'foo';
              }
            }
          };

          expect(User.virtuals, 'to satisfy', {
            firstName: new Virtual({
              name: 'firstName',
              model: User,
              descriptor: {
                get() {
                  return 'foo';
                }
              }
            })
          });

          class Student extends User {}
          Student.virtuals = {
            lastName: {
              get() {
                return 'bar';
              }
            }
          };

          expect(Student.virtuals, 'to satisfy', {
            firstName: new Virtual({
              name: 'firstName',
              model: Student,
              descriptor: {
                get() {
                  return 'foo';
                }
              }
            })
          });
        });

        it("doesn't interfere with the parent's virtuals", () => {
          class User extends Model {}

          User.virtuals = {
            firstName: {
              get() {
                return 'foo';
              }
            }
          };

          expect(User.virtuals, 'to exhaustively satisfy', {
            firstName: new Virtual({
              name: 'firstName',
              model: User,
              descriptor: {
                get() {
                  return 'foo';
                }
              }
            })
          });

          class OtherUser extends User {}
          OtherUser.virtuals = {
            lastName: {
              get() {
                return 'bar';
              }
            }
          };

          expect(User.virtuals, 'to exhaustively satisfy', {
            firstName: new Virtual({
              name: 'firstName',
              model: User,
              descriptor: {
                get() {
                  return 'foo';
                }
              }
            })
          });
          expect(OtherUser.virtuals, 'to exhaustively satisfy', {
            firstName: new Virtual({
              name: 'firstName',
              model: OtherUser,
              descriptor: {
                get() {
                  return 'foo';
                }
              }
            }),
            lastName: new Virtual({
              name: 'lastName',
              model: OtherUser,
              descriptor: {
                get() {
                  return 'bar';
                }
              }
            })
          });
        });
      });
    });

    describe('as a getter', () => {
      it('returns the virtuals added to the model', () => {
        class User extends Model {}

        User.virtuals = {
          firstName: {
            get() {
              return 'foo';
            }
          }
        };

        expect(User.virtuals, 'to exhaustively satisfy', {
          firstName: new Virtual({
            name: 'firstName',
            model: User,
            descriptor: {
              get() {
                return 'foo';
              }
            }
          })
        });
      });
    });
  });

  describe('Model.options', () => {
    describe('as a getter', () => {
      it('returns added options', () => {
        class User extends Model {}
        User.options = {
          query: { where: { id: 1 } },
          plugins: { toJSON: { exclude: 'id' } }
        };

        expect(User.options, 'to exhaustively satisfy', {
          query: { where: { id: 1 } },
          plugins: { toJSON: { exclude: 'id' } }
        });
      });
    });

    describe('as a setter', () => {
      it("adds the passed options to the model's options", () => {
        class User extends Model {}
        User.options = {
          query: { where: { id: 1 } },
          plugins: { toJSON: { exclude: 'id' } }
        };

        expect(User.options, 'to exhaustively satisfy', {
          query: { where: { id: 1 } },
          plugins: { toJSON: { exclude: 'id' } }
        });
      });

      describe('when a model is subclassed', () => {
        it("merges the child's options into the parent's options", () => {
          class User extends Model {}
          User.options = {
            query: { where: { id: 1 } },
            plugins: { toJSON: { exclude: 'id' } }
          };

          expect(User.options, 'to exhaustively satisfy', {
            query: { where: { id: 1 } },
            plugins: { toJSON: { exclude: 'id' } }
          });

          class OtherUser extends User {}
          OtherUser.options = {
            query: { fields: ['id'] },
            plugins: { timestamps: { createdAt: true } }
          };

          expect(OtherUser.options, 'to exhaustively satisfy', {
            query: { where: { id: 1 }, fields: ['id'] },
            plugins: {
              toJSON: { exclude: 'id' },
              timestamps: { createdAt: true }
            }
          });
        });

        it('allows overwriting options defined in the parent', () => {
          class User extends Model {}
          User.options = {
            query: { where: { id: 1 } },
            plugins: { toJSON: { exclude: ['id'] } }
          };

          expect(User.options, 'to exhaustively satisfy', {
            query: { where: { id: 1 } },
            plugins: { toJSON: { exclude: ['id'] } }
          });

          class OtherUser extends User {}
          OtherUser.options = {
            query: { where: { id: 2 } },
            plugins: { toJSON: { exclude: ['name'] } }
          };

          expect(OtherUser.options, 'to exhaustively satisfy', {
            query: { where: { id: 2 } },
            plugins: { toJSON: { exclude: ['name'] } }
          });
        });

        it("doesn't interfere with the parent's options", () => {
          class User extends Model {}
          User.options = {
            query: { where: { id: 1 } },
            plugins: { toJSON: { exclude: ['id'] } }
          };

          expect(User.options, 'to exhaustively satisfy', {
            query: { where: { id: 1 } },
            plugins: { toJSON: { exclude: ['id'] } }
          });

          class OtherUser extends User {}
          OtherUser.options = {
            query: { where: { id: 2 } },
            plugins: { toJSON: { exclude: 'name' } }
          };

          expect(User.options, 'to exhaustively satisfy', {
            query: { where: { id: 1 } },
            plugins: { toJSON: { exclude: ['id'] } }
          });

          expect(OtherUser.options, 'to exhaustively satisfy', {
            query: { where: { id: 2 } },
            plugins: { toJSON: { exclude: 'name' } }
          });
        });
      });
    });
  });

  describe('Model.config.primary', () => {
    describe('as a getter', () => {
      it('throws an error of the model has no primary field', () => {
        class Foo extends Model {}

        Foo.fields = { foo: 'string' };

        expect(
          () => Foo.config.primary,
          'to throw',
          new Error('`Foo` has no primary field')
        );
      });

      it("returns the field-name of the model's primary field", () => {
        class Foo extends Model {}

        Foo.fields = { id: { type: 'integer', primary: true } };

        expect(Foo.config.primary, 'to equal', 'id');
      });

      describe('when a model is subclassed', () => {
        it("inherits the parent's primary field", () => {
          class Foo extends Model {}
          class Bar extends Foo {}

          Foo.fields = { id: { type: 'integer', primary: true } };

          expect(Foo.config.primary, 'to equal', 'id');
          expect(Bar.config.primary, 'to equal', 'id');
        });

        it("allows overwriting the parent's primary field", () => {
          class Foo extends Model {}
          class Bar extends Foo {}

          Foo.fields = { id: { type: 'integer', primary: true } };
          Bar.fields = { uuid: { type: 'uuid', primary: true } };

          expect(Foo.config.primary, 'to equal', 'id');
          expect(Bar.config.primary, 'to equal', 'uuid');
        });

        it("allows unsetting the parent's primary field", () => {
          class Foo extends Model {}
          class Bar extends Foo {}

          Foo.fields = { id: { type: 'integer', primary: true } };
          Bar.fields = { id: { type: 'uuid', primary: false } };

          expect(Foo.config.primary, 'to equal', 'id');
          expect(
            () => Bar.config.primary,
            'to throw',
            new Error('`Bar` has no primary field')
          );
        });
      });
    });
  });

  describe('Model.config.notUpdated', () => {
    describe('as a getter', () => {
      it('returns field-names that should not be updated', () => {
        class Foo extends Model {}

        Foo.fields = { id: { type: 'integer', updated: false } };

        expect(Foo.config.notUpdated, 'to equal', ['id']);
      });

      describe('when a model is subclassed', () => {
        it("inherits the parent's notUpdated fields", () => {
          class Foo extends Model {}
          class Bar extends Foo {}

          Foo.fields = { id: { type: 'integer', updated: false } };

          expect(Foo.config.notUpdated, 'to equal', ['id']);
          expect(Bar.config.notUpdated, 'to equal', ['id']);
        });

        it("allows overwriting the parent's notUpdated fields", () => {
          class Foo extends Model {}
          class Bar extends Foo {}

          Foo.fields = { id: { type: 'integer', updated: false } };
          Bar.fields = { id: { type: 'integer', updated: true } };

          expect(Foo.config.notUpdated, 'to equal', ['id']);
          expect(Bar.config.notUpdated, 'to equal', []);
        });
      });
    });
  });

  describe('Model.config.unique', () => {
    describe('as a getter', () => {
      it('returns field-names of unique fields', () => {
        class Foo extends Model {}

        Foo.fields = { id: { type: 'integer', unique: true } };

        expect(Foo.config.unique, 'to equal', ['id']);
      });

      describe('when a model is subclassed', () => {
        it("inherits the parent's unique fields", () => {
          class Foo extends Model {}
          class Bar extends Foo {}

          Foo.fields = { id: { type: 'integer', unique: true } };

          expect(Foo.config.unique, 'to equal', ['id']);
          expect(Bar.config.unique, 'to equal', ['id']);
        });

        it("allows overwriting the parent's unique fields", () => {
          class Foo extends Model {}
          class Bar extends Foo {}

          Foo.fields = { id: { type: 'integer', unique: true } };
          Bar.fields = { id: { type: 'integer', unique: false } };

          expect(Foo.config.unique, 'to equal', ['id']);
          expect(Bar.config.unique, 'to equal', []);
        });
      });
    });
  });

  describe('Model.removeField', () => {
    it('removes a field', () => {
      class Foo extends Model {}

      Foo.fields = { id: 'integer' };
      expect(Foo.config.fields, 'to have key', 'id');

      Foo.removeField(Foo.fields.id);
      expect(Foo.config.fields, 'to equal', {});
    });

    it("removes a field's field-column mappings", () => {
      class Foo extends Model {}

      Foo.fields = { id: 'integer' };
      expect(Foo.config.fieldsToColumns, 'to have key', 'id');

      Foo.removeField(Foo.fields.id);
      expect(Foo.config.fieldsToColumns, 'to equal', {});
    });

    it("removes the field from the model's field names", () => {
      class Foo extends Model {}

      Foo.fields = { id: { type: 'integer' } };
      expect(Foo.config.fieldNames, 'to contain', 'id');

      Foo.removeField(Foo.fields.id);
      expect(Foo.config.fieldNames, 'to equal', []);
    });

    it("removes the field from the model's not-updated fields", () => {
      class Foo extends Model {}

      Foo.fields = { id: { type: 'integer', updated: false } };
      expect(Foo.config.notUpdated, 'to contain', 'id');

      Foo.removeField(Foo.fields.id);
      expect(Foo.config.notUpdated, 'to equal', []);
    });

    it("removes the field from the model's unique fields", () => {
      class Foo extends Model {}

      Foo.fields = { id: { type: 'integer', unique: true } };
      expect(Foo.config.unique, 'to contain', 'id');

      Foo.removeField(Foo.fields.id);
      expect(Foo.config.unique, 'to equal', []);
    });

    it("removes the field from the model's primary field", () => {
      class Foo extends Model {}

      Foo.fields = { id: { type: 'integer', primary: true } };
      expect(Foo.config.primary, 'to be', 'id');

      Foo.removeField(Foo.fields.id);
      expect(() => Foo.config.primary, 'to throw');
    });

    it('removes *ByField methods from the model', () => {
      class Foo extends Model {}

      Foo.fields = { id: { type: 'integer', primary: true, methods: true } };
      expect(Foo.updateById, 'to be a function');

      Foo.removeField(Foo.fields.id);
      expect(Foo.updateById, 'to be undefined');
    });
  });

  describe('Model.query', () => {
    let User;

    before(() => {
      User = class extends Model {};
      User.table = 'foo';
      User.fields = { id: { type: 'integer', primary: true } };
      User.options = { query: { fields: ['id'], where: { id: 1 } } };
    });

    describe('as a getter', () => {
      it('returns a Query instance', () => {
        expect(User.query, 'to be a', Query);
      });

      it('configures the Query instance with the model', () => {
        const spy = sinon.spy(User, 'Query');
        // eslint-disable-next-line no-unused-expressions
        User.query;
        expect(User.Query, 'to have calls satisfying', () => {
          // eslint-disable-next-line no-new
          new User.Query(expect.it('to be model class', User));
        });
        spy.restore();
      });

      it('sets configured default query options on the instance', () => {
        expect(User.query, 'to satisfy', {
          options: { fields: { id: 'id' }, where: [[{ id: 1 }]] }
        });
      });
    });
  });

  describe('Model.where', () => {
    let User;

    before(() => {
      User = class extends Model {};
    });

    it('returns a `Query.Where` instance', () => {
      expect(User.where, 'to be a', Query.Where);
    });
  });

  describe('for db operations', () => {
    const { Model, Query } = new Knorm().use(postgresPlugin);

    class User extends Model {}

    User.table = 'user';
    User.fields = {
      id: {
        type: 'integer',
        required: true,
        primary: true,
        methods: true
      },
      name: {
        type: 'string',
        required: true
      }
    };

    before(async () => knex.schema.dropTableIfExists(User.table));

    before(async () =>
      knex.schema.createTable(User.table, table => {
        table.increments();
        table.string('name').notNullable();
      })
    );

    after(async () => knex.schema.dropTable(User.table));

    afterEach(async () => knex(User.table).truncate());

    describe('Model.prototype.save', () => {
      it('inserts a model if its primary field is not set', async () => {
        const user = new User({ name: 'John Doe' });
        await expect(
          user.save(),
          'to be fulfilled with value satisfying',
          new User({ id: 1, name: 'John Doe' })
        );
        await expect(
          knex,
          'with table',
          User.table,
          'to have rows satisfying',
          [{ id: 1, name: 'John Doe' }]
        );
      });

      it('updates a model if its primary field is set', async () => {
        const user = await new User({ name: 'John Doe' }).insert();
        user.name = 'Jane Doe';
        await expect(
          user.save(),
          'to be fulfilled with value satisfying',
          new User({ id: 1, name: 'Jane Doe' })
        );
        await expect(
          knex,
          'with table',
          User.table,
          'to have rows satisfying',
          [{ id: 1, name: 'Jane Doe' }]
        );
      });

      it('passes options along', async () => {
        const insert = sinon
          .stub(Query.prototype, 'query')
          .returns(Promise.resolve([]));
        const user = new User({ name: 'John Doe' });
        await expect(
          user.save({ require: false }),
          'to be fulfilled with value satisfying',
          null
        );
        insert.restore();
      });
    });

    describe('Model.prototype.insert', () => {
      it('inserts a model', async () => {
        const user = new User({ name: 'John Doe' });
        await expect(
          user.insert(),
          'to be fulfilled with value exhaustively satisfying',
          new User({ id: 1, name: 'John Doe' })
        );
        await expect(
          knex,
          'with table',
          User.table,
          'to have rows satisfying',
          [{ id: 1, name: 'John Doe' }]
        );
      });

      it('passes options along', async () => {
        const insert = sinon
          .stub(Query.prototype, 'query')
          .returns(Promise.resolve([]));
        const user = new User({ name: 'John Doe' });
        await expect(
          user.insert({ require: false }),
          'to be fulfilled with value satisfying',
          null
        );
        insert.restore();
      });

      it('resolves with the same instance that was passed', async () => {
        const user = await new User({ name: 'John Doe' });
        user.name = 'Jane Doe';
        user.leaveMeIntact = 'okay';
        await expect(
          user.insert(),
          'to be fulfilled with value satisfying',
          expect.it('to be', user).and('to satisfy', { leaveMeIntact: 'okay' })
        );
      });

      it('casts fields with `forFetch` cast functions', async () => {
        class OtherUser extends User {}
        OtherUser.fields = {
          name: {
            type: 'string',
            cast: {
              forFetch() {
                return 'cast name';
              }
            }
          }
        };
        await expect(
          new OtherUser({ name: 'John Doe' }).insert(),
          'to be fulfilled with value satisfying',
          new OtherUser({ name: 'cast name' })
        );
      });
    });

    describe('Model.prototype.update', () => {
      it('updates a model', async () => {
        const user = await new User({ name: 'John Doe' }).insert();
        user.name = 'Jane Doe';
        await expect(
          user.update(),
          'to be fulfilled with value exhaustively satisfying',
          new User({ id: 1, name: 'Jane Doe' })
        );
        await expect(
          knex,
          'with table',
          User.table,
          'to have rows satisfying',
          [{ id: 1, name: 'Jane Doe' }]
        );
      });

      it('passes options along', async () => {
        const user = await new User({ name: 'John Doe' }).insert();
        user.name = 'Jane Doe';
        await expect(
          user.update({ require: false, where: { name: 'foo' } }),
          'to be fulfilled with value exhaustively satisfying',
          null
        );
      });

      it('resolves with the same instance that was passed', async () => {
        const user = await new User({ name: 'John Doe' }).insert();
        user.name = 'Jane Doe';
        user.leaveMeIntact = 'okay';
        await expect(
          user.update(),
          'to be fulfilled with value satisfying',
          expect.it('to be', user).and('to satisfy', { leaveMeIntact: 'okay' })
        );
      });

      it('casts fields with `forFetch` cast functions', async () => {
        class OtherUser extends User {}
        OtherUser.fields = {
          name: {
            type: 'string',
            cast: {
              forFetch() {
                return 'cast name';
              }
            }
          }
        };
        const user = await new OtherUser({ name: 'John Doe' }).insert();
        user.name = 'Jane Doe';
        await expect(
          user.update(),
          'to be fulfilled with value satisfying',
          new OtherUser({ name: 'cast name' })
        );
      });
    });

    describe('Model.prototype.fetch', () => {
      it('fetches a model', async () => {
        await new User({ id: 1, name: 'John Doe' }).insert();
        const user = new User({ id: 1 });
        await expect(
          user.fetch(),
          'to be fulfilled with value exhaustively satisfying',
          new User({ id: 1, name: 'John Doe' })
        );
      });

      it('passes options along', async () => {
        const user = await new User({ name: 'John Doe' }).insert();
        user.name = 'Jane Doe';
        await expect(
          user.fetch({ require: false, where: { name: 'foo' } }),
          'to be fulfilled with value exhaustively satisfying',
          null
        );
      });

      it('casts fields with `forFetch` cast functions', async () => {
        class OtherUser extends User {}
        OtherUser.fields = {
          name: {
            type: 'string',
            cast: {
              forFetch() {
                return 'cast name';
              }
            }
          }
        };
        const user = await new OtherUser({ name: 'John Doe' }).insert();
        await expect(
          user.fetch(),
          'to be fulfilled with value satisfying',
          new OtherUser({ name: 'cast name' })
        );
      });
    });

    describe('Model.prototype.delete', () => {
      it('deletes a model', async () => {
        await new User({ id: 1, name: 'John Doe' }).insert();
        const user = new User({ id: 1 });
        await expect(
          user.delete(),
          'to be fulfilled with value exhaustively satisfying',
          new User({ id: 1, name: 'John Doe' })
        );
        await expect(knex, 'with table', User.table, 'to be empty');
      });

      it('passes options along', async () => {
        const user = await new User({ name: 'John Doe' }).insert();
        await expect(
          user.delete({ require: false, where: { name: 'foo' } }),
          'to be fulfilled with value exhaustively satisfying',
          null
        );
      });

      it('casts fields with `forFetch` cast functions', async () => {
        class OtherUser extends User {}
        OtherUser.fields = {
          name: {
            type: 'string',
            cast: {
              forFetch() {
                return 'cast name';
              }
            }
          }
        };
        const user = await new OtherUser({ name: 'John Doe' }).insert();
        await expect(
          user.delete(),
          'to be fulfilled with value satisfying',
          new OtherUser({ name: 'cast name' })
        );
      });
    });

    describe('Model.save', () => {
      it('inserts models', async () => {
        await expect(
          User.save({ name: 'John Doe' }),
          'to be fulfilled with value exhaustively satisfying',
          [new User({ id: 1, name: 'John Doe' })]
        );
        await expect(
          knex,
          'with table',
          User.table,
          'to have rows satisfying',
          [{ id: 1, name: 'John Doe' }]
        );
      });

      it('updates models', async () => {
        await User.insert({ name: 'John Doe' });
        await expect(
          User.save({ id: 1, name: 'Jane Doe' }),
          'to be fulfilled with value exhaustively satisfying',
          [new User({ id: 1, name: 'Jane Doe' })]
        );
        await expect(
          knex,
          'with table',
          User.table,
          'to have rows satisfying',
          [{ id: 1, name: 'Jane Doe' }]
        );
      });

      it('passes options along', async () => {
        await User.save({ name: 'John Doe' });
        await expect(
          User.save({ id: 1, name: 'Jane Doe' }, { returning: 'id' }),
          'to be fulfilled with value exhaustively satisfying',
          [new User({ id: 1 })]
        );
      });
    });

    describe('Model.insert', () => {
      it('inserts models', async () => {
        await expect(
          User.insert({ id: 1, name: 'John Doe' }),
          'to be fulfilled with value exhaustively satisfying',
          [new User({ id: 1, name: 'John Doe' })]
        );
        await expect(
          knex,
          'with table',
          User.table,
          'to have rows satisfying',
          [{ id: 1, name: 'John Doe' }]
        );
      });

      it('passes options along', async () => {
        await expect(
          User.insert({ name: 'John Doe' }, { returning: 'id' }),
          'to be fulfilled with value exhaustively satisfying',
          [new User({ id: 1 })]
        );
      });
    });

    describe('Model.update', () => {
      it('updates models', async () => {
        await new User({ name: 'John Doe' }).insert();
        await expect(
          User.update({ name: 'Jane Doe' }),
          'to be fulfilled with value satisfying',
          [new User({ id: 1, name: 'Jane Doe' })]
        );
        await expect(
          knex,
          'with table',
          User.table,
          'to have rows satisfying',
          [{ id: 1, name: 'Jane Doe' }]
        );
      });

      it('passes options along', async () => {
        await new User({ name: 'John Doe' }).insert();
        await expect(
          User.update({ id: 1, name: 'Jane Doe' }, { returning: 'id' }),
          'to be fulfilled with value exhaustively satisfying',
          [new User({ id: 1 })]
        );
      });
    });

    describe('Model.fetch', () => {
      it('fetches models', async () => {
        await User.save({ name: 'John Doe' });
        await expect(
          User.fetch(),
          'to be fulfilled with value exhaustively satisfying',
          [new User({ id: 1, name: 'John Doe' })]
        );
      });

      it('passes options along', async () => {
        await User.save({ name: 'John Doe' });
        await expect(
          User.fetch({ returning: 'id' }),
          'to be fulfilled with value exhaustively satisfying',
          [new User({ id: 1 })]
        );
      });
    });

    describe('Model.delete', () => {
      it('deletes models', async () => {
        await User.save({ name: 'John Doe' });
        await expect(
          User.delete(),
          'to be fulfilled with value exhaustively satisfying',
          [new User({ id: 1, name: 'John Doe' })]
        );
      });

      it('passes options along', async () => {
        await User.save({ name: 'John Doe' });
        await expect(
          User.delete({ returning: 'id' }),
          'to be fulfilled with value exhaustively satisfying',
          [new User({ id: 1 })]
        );
      });
    });

    describe('with `methods` configured', () => {
      beforeEach(async () => new User({ id: 1, name: 'John Doe' }).insert());

      describe('Model.fetchByField', () => {
        it('fetches a model using the field', async () => {
          await expect(
            User.fetchById(1),
            'to be fulfilled with value satisfying',
            new User({ id: 1, name: 'John Doe' })
          );
        });

        it('passes options along', async () => {
          await expect(
            User.fetchById(1, { where: { name: 'foo' } }),
            'to be rejected with error satisfying',
            { name: 'NoRowsFetchedError' }
          );
        });
      });

      describe('Model.deleteByField', () => {
        it('deletes a model using its primary field value', async () => {
          await expect(
            User.deleteById(1),
            'to be fulfilled with value satisfying',
            new User({ id: 1, name: 'John Doe' })
          );
          await expect(knex, 'with table', User.table, 'to be empty');
        });

        it('passes options along', async () => {
          await expect(
            User.deleteById(1, { where: { name: 'foo' } }),
            'to be rejected with error satisfying',
            { name: 'NoRowsDeletedError' }
          );
        });
      });

      describe('Model.updateByField', () => {
        it('updates a model using its primary field value', async () => {
          await expect(
            User.updateById(1, { name: 'Jane Doe' }),
            'to be fulfilled with value satisfying',
            new User({ id: 1, name: 'Jane Doe' })
          );
          await expect(
            knex,
            'with table',
            User.table,
            'to have rows satisfying',
            [{ id: 1, name: 'Jane Doe' }]
          );
        });

        it('passes options along', async () => {
          await expect(
            User.updateById(
              1,
              { name: 'Jane Doe' },
              { where: { name: 'foo' } }
            ),
            'to be rejected with error satisfying',
            { name: 'NoRowsUpdatedError' }
          );
        });
      });
    });
  });
});

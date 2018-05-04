const Knorm = require('../lib/Knorm');
const Model = require('../lib/Model');
const Field = require('../lib/Field');
const Virtual = require('../lib/Virtual');
const Query = require('../lib/Query');
const postgresPlugin = require('./lib/postgresPlugin');
const knex = require('./lib/knex');
const sinon = require('sinon');
const expect = require('unexpected')
  .clone()
  .use(require('unexpected-sinon'))
  .use(require('unexpected-knex'))
  .use(require('./lib/unexpected-workaround'));

describe('Model', function() {
  describe('constructor', function() {
    describe('when the model has virtuals', function() {
      it("adds virtual's getters on the instance", function() {
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

      it('adds the getters with the correct scope', function() {
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

      it("adds virtual's setters on the instance with the correct scope", function() {
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

    describe('with data provided', function() {
      it('calls Model.prototype.setData to populate the instance with the data', function() {
        class Foo extends Model {}

        Foo.fields = {
          id: {
            type: 'integer'
          }
        };

        const spy = sinon.spy(Foo.prototype, 'setData');
        new Foo({ id: 1 });

        expect(spy, 'to have calls satisfying', () => {
          spy({
            id: 1
          });
        });

        spy.restore();
      });
    });
  });

  describe('Model.prototype.getFields', function() {
    it("returns all the model's fields if called with no arguments", function() {
      class Foo extends Model {}

      Foo.fields = {
        foo: {
          type: 'string'
        }
      };

      const foo = new Foo();
      expect(foo.getFields(), 'to equal', [Foo.fields.foo]);
    });

    it('returns an array of `Field` instances', function() {
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

    it('returns the correct fields', function() {
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

    it('returns the same fields if passed an array of field instances', function() {
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

  describe('Model.prototype.setData', function() {
    it('populates the instance with the data with the passed object', function() {
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

    it('populates virtuals if provided in the object', function() {
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

    it('throws if a virtual provided in the object has no setter', function() {
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

    it("calls the virtual's getter with this set to the model instance", function() {
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

    it('returns the model instance to allow chaining', function() {
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
  });

  describe('Model.prototype.setDefaults', function() {
    it('populates all configured fields with the configured default value', function() {
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

    it('accepts a list of fields to populate with the configured default value', function() {
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

    it("doesn't overwrite values that have already been set", function() {
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

    describe("when a field's default value is a function", function() {
      it('calls the function and populates the field with the return value', function() {
        class Foo extends Model {}

        Foo.fields = {
          foo: {
            type: 'string',
            default: function() {
              return 'foo';
            }
          }
        };

        const foo = new Foo();

        expect(foo.foo, 'to be undefined');
        foo.setDefaults();
        expect(foo.foo, 'to be', 'foo');
      });

      it("calls the function with the instance's scope", function() {
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
            default: function() {
              return this.foo + this.bar;
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

    it('returns the model instance to allow chaining', function() {
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

  describe('Model.prototype.getFieldData', function() {
    class Foo extends Model {}

    Foo.fields = { foo: 'string', bar: 'string' };

    it('returns an object mapping fields to their values', function() {
      const foo = new Foo();

      foo.foo = 'foo';
      foo.bar = null;

      expect(foo.getFieldData(), 'to equal', {
        foo: 'foo',
        bar: null
      });
    });

    it('does not include fields whose value has not been set', function() {
      const foo = new Foo();

      foo.foo = 'foo';

      expect(foo.getFieldData(), 'to equal', {
        foo: 'foo',
        bar: undefined
      });
    });

    it('does not include properties set on the model that are not fields', function() {
      const foo = new Foo();

      foo.foo = 'foo';
      foo.quux = 'quux';

      expect(foo.getFieldData(), 'to equal', {
        foo: 'foo',
        quux: undefined
      });
    });

    describe('with a `fields` option', function() {
      it('only returns data for the requested fields', function() {
        const foo = new Foo();

        foo.foo = 'foo';
        foo.bar = 'bar';

        expect(foo.getFieldData({ fields: ['bar'] }), 'to equal', {
          bar: 'bar'
        });
      });

      it('does not include a field without a value even if it has been requested', function() {
        const foo = new Foo();

        foo.foo = 'foo';

        expect(foo.getFieldData({ fields: ['bar'] }), 'to equal', {});
      });
    });
  });

  describe('Model.prototype.getVirtualData', function() {
    it('resolves with an object with virtuals and their data', async function() {
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

    it('resolves with data from async virtuals (that return a Promise)', async function() {
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

    it('skips virtuals that have no getters', async function() {
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

    it("calls the virtuals' getters with this set to the model instance", async function() {
      class Foo extends Model {}

      const spy = sinon.spy();

      Foo.virtuals = { bar: { get: spy } };

      const foo = new Foo();

      await foo.getVirtualData();
      await expect(spy, 'was called once').and('was called on', foo);
    });
  });

  describe('with a `virtuals` option', function() {
    it('only includes the requested virtuals', async function() {
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

    it('rejects with an error if a requested virtual has no getter', async function() {
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

  describe('Model.prototype.getVirtualDataSync', function() {
    class Foo extends Model {}

    Foo.virtuals = {
      foo() {
        return 'foo';
      },
      async bar() {
        return 'bar';
      }
    };

    it('returns virtual data without async virtuals', function() {
      const foo = new Foo();
      expect(foo.getVirtualDataSync(), 'to equal', { foo: 'foo' });
    });

    describe('with a `virtuals` option', function() {
      it('does not include async virtuals even if requested', async function() {
        const foo = new Foo();

        expect(foo.getVirtualDataSync({ virtuals: ['bar'] }), 'to equal', {});
      });
    });
  });

  describe('Model.prototype.getData', function() {
    class Foo extends Model {}

    Foo.fields = { foo: 'string', bar: 'string' };
    Foo.virtuals = {
      baz() {
        return 'baz';
      },
      async quux() {
        return 'quux';
      }
    };

    it('resolves with an object with field and virtual field data', async function() {
      const foo = new Foo();

      foo.foo = 'foo';
      foo.bar = 'bar';

      await expect(
        foo.getData(),
        'to be fulfilled with value exhaustively satisfying',
        { foo: 'foo', bar: 'bar', baz: 'baz', quux: 'quux' }
      );
    });

    describe('with a `fields` option', function() {
      it('only includes the requested fields', async function() {
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

    describe('with a `virtuals` option', function() {
      it('only includes the requested virtuals', async function() {
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

  describe('Model.prototype.getDataSync', function() {
    class Foo extends Model {}

    Foo.fields = { foo: 'string', bar: 'string' };
    Foo.virtuals = {
      baz() {
        return 'baz';
      },
      async quux() {
        return 'quux';
      }
    };

    it('returns an object with field and only sync virtual field data', function() {
      const foo = new Foo();

      foo.foo = 'foo';
      foo.bar = 'bar';

      expect(foo.getDataSync(), 'to equal', {
        foo: 'foo',
        bar: 'bar',
        baz: 'baz'
      });
    });

    describe('with a `fields` option', function() {
      it('only includes the requested fields', function() {
        const foo = new Foo();

        foo.foo = 'foo';
        foo.bar = 'bar';

        expect(foo.getDataSync({ fields: ['bar'] }), 'to equal', {
          bar: 'bar',
          baz: 'baz'
        });
      });
    });

    describe('with a `virtuals` option', function() {
      it('only includes the requested sync virtuals', function() {
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

  describe('Model.prototype.validate', function() {
    it('validates all the fields by default', async function() {
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

    describe("with a 'fields' option", function() {
      it('validates only the fields passed', async function() {
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

      it('accepts a list of field objects', async function() {
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

    it('calls the validator with the set value and the model instance', async function() {
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

    it('rejects with the error from Field.prototype.validate', async function() {
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

    it('resolves with the model instance to allow chaining', async function() {
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

  describe('Model.prototype.cast', function() {
    it('casts all the fields that have cast functions and a value set', async function() {
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

    describe("with a 'fields' option", function() {
      it('casts only the fields passed', async function() {
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

      it('accepts a list of field objects', async function() {
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

    it('calls Field.prototype.cast with the set value, the model instance and options passed', function() {
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

    it('does not call Field.prototype.cast if the field has no value set', function() {
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

    it("calls Field.prototype.cast if the field's value is `null`", function() {
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

    it('updates the set value with the value from the cast function', function() {
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

    it('does not update the set value if the cast function returns `undefined`', function() {
      class Foo extends Model {}

      Foo.fields = {
        bar: {
          required: true,
          type: 'string',
          cast: {
            forSave() {
              return;
            }
          }
        }
      };

      const foo = new Foo();
      foo.bar = 'bar';
      foo.cast({ fields: ['bar'], forSave: true });

      expect(foo.bar, 'to be', 'bar');
    });

    it('updates the set value if the cast function returns `null`', function() {
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

    it('returns the model instance to allow chaining', function() {
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

  describe('Model.prototype.getQuery', function() {
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

    it('passes any options passed to Query.prototype.setOptions', function() {
      const setOptions = sinon
        .stub(Query.prototype, 'setOptions')
        .returnsThis();
      new Foo({ id: 1 }).getQuery({ returning: 'name' });
      expect(setOptions, 'to have calls satisfying', () =>
        setOptions({ returning: 'name' })
      );
      setOptions.restore();
    });

    it('sets `first` to `true`', function() {
      const first = sinon.stub(Query.prototype, 'first').returnsThis();
      new Foo({ id: 1 }).getQuery();
      expect(first, 'to have calls satisfying', () => first(true));
      first.restore();
    });

    it('sets `require` to `true` by default', function() {
      const require = sinon.stub(Query.prototype, 'require').returnsThis();
      new Foo({ id: 1 }).getQuery();
      expect(require, 'to have calls satisfying', () => require(true));
      require.restore();
    });

    it('allows overriding the `require` option to `false`', function() {
      const require = sinon.stub(Query.prototype, 'require').returnsThis();
      new Foo({ id: 1 }).getQuery({ require: false });
      expect(require, 'to have calls satisfying', () => require(false));
      require.restore();
    });

    it('sets `forge` to `false`', function() {
      const forge = sinon.stub(Query.prototype, 'forge').returnsThis();
      new Foo({ id: 1 }).getQuery();
      expect(forge, 'to have calls satisfying', () => forge(false));
      forge.restore();
    });

    it('passes the primary field set on the model to Query.prototype.where', function() {
      const where = sinon.stub(Query.prototype, 'where').returnsThis();
      new Foo({ id: 1 }).getQuery();
      expect(where, 'to have calls satisfying', () => where({ id: 1 }));
      where.restore();
    });

    it('throws if the primary field is not set', function() {
      expect(
        () => new Foo({}).getQuery(),
        'to throw',
        new Error('Foo: primary field (`id`) is not set')
      );
    });

    it('appends the `where` clause if a `where` option is passed', function() {
      const where = sinon.stub(Query.prototype, 'where').returnsThis();
      new Foo({ id: 1 }).getQuery({ where: { name: 'foo' } });
      expect(where, 'to have calls satisfying', () => {
        where({ name: 'foo' });
        where({ id: 1 });
      });
      where.restore();
    });

    describe('with unique fields configured', function() {
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

      before(function() {
        whereStub = sinon.stub(Query.prototype, 'where').returnsThis();
      });

      beforeEach(function() {
        whereStub.reset();
      });

      after(function() {
        whereStub.restore();
      });

      it('uses the unique fields in a where clause if the primary field is not set', function() {
        new Foo({ name: 'foo' }).getQuery();
        expect(whereStub, 'to have calls satisfying', () =>
          whereStub({ name: 'foo' })
        );
      });

      it('uses the primary field if both unique and primary fields are set', function() {
        new Foo({ id: 1, name: 'foo' }).getQuery();
        expect(whereStub, 'to have calls satisfying', () =>
          whereStub({ id: 1 })
        );
      });

      it('uses only one of the primary fields if more than one are set', function() {
        new Foo({ name: 'foo', number: 1 }).getQuery();
        expect(whereStub, 'to have calls satisfying', () =>
          whereStub({ name: 'foo' })
        );
      });

      it('throws if neither the primary field nor unique fields are set', function() {
        expect(
          () => new Foo({}).getQuery(),
          'to throw',
          new Error('Foo: primary field (`id`) is not set')
        );
      });
    });

    describe('for inserts', function() {
      it('does not throw if the primary field is not set', function() {
        expect(
          () => new Foo({}).getQuery({}, { forInsert: true }),
          'not to throw'
        );
      });

      it('does not construct a `where` clause', function() {
        const where = sinon.stub(Query.prototype, 'where').returnsThis();
        new Foo({ id: 1 }).getQuery({}, { forInsert: true });
        expect(where, 'was not called');
        where.restore();
      });
    });
  });

  describe('Model.fields', function() {
    describe('as a getter', function() {
      it('returns no fields by default', function() {
        class User extends Model {}
        expect(User.fields, 'to be empty');
      });

      it('returns added fields', function() {
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

    describe('as a setter', function() {
      it("adds the passed fields to the model's fields", function() {
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

      it("allows adding fields via the `fieldName: 'type'` shorthand", function() {
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

      it('throws if the field-name is already assigned to an instance property', function() {
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

      it('throws if the field-name is already added as a virtual', function() {
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

      describe('when a model is subclassed', function() {
        it('allows overwriting fields defined in the parent', function() {
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

        it("updates the child's fields' model class", function() {
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

        it("doesn't interfere with the parent's fields", function() {
          class User extends Model {}

          expect(Model.fields, 'to be empty');
          expect(User.fields, 'to be empty');

          User.fields = {
            id: {
              type: 'integer',
              required: true
            }
          };

          expect(Model.fields, 'to be empty');
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

          expect(Model.fields, 'to be empty');
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

      describe('with `methods` configured on a field', function() {
        it('adds `ByField` methods if `primary` is configured', function() {
          class User extends Model {}

          User.fields = {
            id: {
              type: 'string',
              primary: true,
              methods: true
            }
          };

          expect(User.fetchById, 'to be a function');
          expect(User.updateById, 'to be a function');
          expect(User.deleteById, 'to be a function');
        });

        it('adds `ByField` methods if `unique` is configured', function() {
          class User extends Model {}

          User.fields = {
            id: {
              type: 'string',
              unique: true,
              methods: true
            }
          };

          expect(User.fetchById, 'to be a function');
          expect(User.updateById, 'to be a function');
          expect(User.deleteById, 'to be a function');
        });

        it('does not add `ByField` methods if `unique` nor `primary` are configured', function() {
          class User extends Model {}

          User.fields = {
            id: {
              type: 'string',
              methods: true
            }
          };

          expect(User.fetchById, 'to be undefined');
          expect(User.updateById, 'to be undefined');
          expect(User.deleteById, 'to be undefined');
        });

        it('adds the correct names for camelCased field names', function() {
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

        it('inherits `ByField` methods', function() {
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

    describe('with a getter function', function() {
      class User extends Model {
        static get fields() {
          this.config.fields = { firstName: { type: 'string' } };
          return this.config.fields;
        }
      }

      it('returns fields added via the `Model.config.fields` setter', function() {
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

      it('supports field inheritance', function() {
        class Student extends User {
          static get fields() {
            this.config.fields = { studentId: { type: 'integer' } };
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

  describe('Model.virtuals', function() {
    describe('as a setter', function() {
      it("adds the virtuals to the model's virtuals", function() {
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

      it('throws if the virtual-name is already assigned to an instance property', function() {
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

      it('throws if the virtual-name is already added as a field', function() {
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

      describe('when a model is subclassed', function() {
        it('allows overwriting the virtuals defined in the parent', function() {
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

        it("updates the child's virtuals' model class", function() {
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

        it("doesn't interfere with the parent's virtuals", function() {
          class User extends Model {}

          expect(Model.virtuals, 'to be empty');
          expect(User.virtuals, 'to be empty');

          User.virtuals = {
            firstName: {
              get() {
                return 'foo';
              }
            }
          };

          expect(Model.virtuals, 'to be empty');
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

          expect(Model.virtuals, 'to be empty');
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

    describe('as a getter', function() {
      it('returns the virtuals added to the model', function() {
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

  describe('Model.primary', function() {
    describe('as a getter', function() {
      it('throws an error of the model has no primary field', function() {
        class Foo extends Model {}

        expect(
          () => Foo.primary,
          'to throw',
          new Error('`Foo` has no primary field')
        );
      });

      it("returns the field-name of the model's primary field", function() {
        class Foo extends Model {}

        Foo.fields = { id: { type: 'integer', primary: true } };

        expect(Foo.primary, 'to equal', 'id');
      });

      describe('when a model is subclassed', function() {
        it("inherits the parent's primary field", function() {
          class Foo extends Model {}
          class Bar extends Foo {}

          Foo.fields = { id: { type: 'integer', primary: true } };

          expect(Foo.primary, 'to equal', 'id');
          expect(Bar.primary, 'to equal', 'id');
        });

        it("allows overwriting the parent's primary field", function() {
          class Foo extends Model {}
          class Bar extends Foo {}

          Foo.fields = { id: { type: 'integer', primary: true } };
          Bar.fields = { uuid: { type: 'uuid', primary: true } };

          expect(Foo.primary, 'to equal', 'id');
          expect(Bar.primary, 'to equal', 'uuid');
        });

        it("allows unsetting the parent's primary field", function() {
          class Foo extends Model {}
          class Bar extends Foo {}

          Foo.fields = { id: { type: 'integer', primary: true } };
          Bar.fields = { id: { type: 'uuid', primary: false } };

          expect(Foo.primary, 'to equal', 'id');
          expect(
            () => Bar.primary,
            'to throw',
            new Error('`Bar` has no primary field')
          );
        });
      });
    });
  });

  describe('Model.notUpdated', function() {
    describe('as a getter', function() {
      it('returns field-names that should not be updated', function() {
        class Foo extends Model {}

        Foo.fields = { id: { type: 'integer', updated: false } };

        expect(Foo.notUpdated, 'to equal', ['id']);
      });

      describe('when a model is subclassed', function() {
        it("inherits the parent's notUpdated fields", function() {
          class Foo extends Model {}
          class Bar extends Foo {}

          Foo.fields = { id: { type: 'integer', updated: false } };

          expect(Foo.notUpdated, 'to equal', ['id']);
          expect(Bar.notUpdated, 'to equal', ['id']);
        });

        it("allows overwriting the parent's notUpdated fields", function() {
          class Foo extends Model {}
          class Bar extends Foo {}

          Foo.fields = { id: { type: 'integer', updated: false } };
          Bar.fields = { id: { type: 'integer', updated: true } };

          expect(Foo.notUpdated, 'to equal', ['id']);
          expect(Bar.notUpdated, 'to equal', []);
        });
      });
    });
  });

  describe('Model.unique', function() {
    describe('as a getter', function() {
      it('returns field-names of unique fields', function() {
        class Foo extends Model {}

        Foo.fields = { id: { type: 'integer', unique: true } };

        expect(Foo.unique, 'to equal', ['id']);
      });

      describe('when a model is subclassed', function() {
        it("inherits the parent's unique fields", function() {
          class Foo extends Model {}
          class Bar extends Foo {}

          Foo.fields = { id: { type: 'integer', unique: true } };

          expect(Foo.unique, 'to equal', ['id']);
          expect(Bar.unique, 'to equal', ['id']);
        });

        it("allows overwriting the parent's unique fields", function() {
          class Foo extends Model {}
          class Bar extends Foo {}

          Foo.fields = { id: { type: 'integer', unique: true } };
          Bar.fields = { id: { type: 'integer', unique: false } };

          expect(Foo.unique, 'to equal', ['id']);
          expect(Bar.unique, 'to equal', []);
        });
      });
    });
  });

  describe('Model.query', function() {
    class User extends Model {}

    before(function() {
      User.Query = sinon.stub().named('Query');
    });

    beforeEach(function() {
      User.Query.reset();
      User.Query.returns(sinon.createStubInstance(Query));
    });

    describe('as a getter', function() {
      it('returns a Query instance', function() {
        expect(User.query, 'to be a', Query);
      });

      it('configures the Query instance with the model', function() {
        User.query;
        expect(User.Query, 'to have calls satisfying', () => {
          new User.Query(expect.it('to be model class', User));
        });
      });

      it("returns a new Query every time it's accessed", function() {
        User.query;
        User.query;

        expect(User.Query, 'to have calls satisfying', () => {
          new User.Query(expect.it('not to be undefined'));
          new User.Query(expect.it('not to be undefined'));
        });
      });
    });

    describe('as a setter', function() {
      it('throws an error', function() {
        expect(
          () => (User.query = 'foo'),
          'to throw',
          new Error('User.query cannot be overwriten')
        );
      });
    });
  });

  describe('db methods', function() {
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

    before(async function() {
      await knex.schema.createTable(User.table, table => {
        table.increments();
        table.string('name').notNullable();
      });
    });

    after(async function() {
      await knex.schema.dropTable(User.table);
    });

    afterEach(async function() {
      await knex(User.table).truncate();
    });

    describe('Model.prototype.save', function() {
      it('inserts a model if its primary field is not set', async function() {
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

      it('updates a model if its primary field is set', async function() {
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

      it('passes options along', async function() {
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

    describe('Model.prototype.insert', function() {
      it('inserts a model', async function() {
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

      it('passes options along', async function() {
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

      it('resolves with the same instance that was passed', async function() {
        const user = await new User({ name: 'John Doe' });
        user.name = 'Jane Doe';
        user.leaveMeIntact = 'okay';
        await expect(
          user.insert(),
          'to be fulfilled with value satisfying',
          inserted => {
            expect(user === inserted, 'to be true');
            expect(user.leaveMeIntact, 'to be', 'okay');
          }
        );
      });
    });

    describe('Model.prototype.update', function() {
      it('updates a model', async function() {
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

      it('passes options along', async function() {
        const user = await new User({ name: 'John Doe' }).insert();
        user.name = 'Jane Doe';
        await expect(
          user.update({ require: false, where: { name: 'foo' } }),
          'to be fulfilled with value exhaustively satisfying',
          null
        );
      });

      it('resolves with the same instance that was passed', async function() {
        const user = await new User({ name: 'John Doe' }).insert();
        user.name = 'Jane Doe';
        user.leaveMeIntact = 'okay';
        await expect(
          user.update(),
          'to be fulfilled with value satisfying',
          updated => {
            expect(user === updated, 'to be true');
            expect(user.leaveMeIntact, 'to be', 'okay');
          }
        );
      });
    });

    describe('Model.prototype.fetch', function() {
      it('fetches a model', async function() {
        await new User({ id: 1, name: 'John Doe' }).insert();
        const user = new User({ id: 1 });
        await expect(
          user.fetch(),
          'to be fulfilled with value exhaustively satisfying',
          new User({ id: 1, name: 'John Doe' })
        );
      });

      it('passes options along', async function() {
        const user = await new User({ name: 'John Doe' }).insert();
        user.name = 'Jane Doe';
        await expect(
          user.fetch({ require: false, where: { name: 'foo' } }),
          'to be fulfilled with value exhaustively satisfying',
          null
        );
      });
    });

    describe('Model.prototype.delete', function() {
      it('deletes a model', async function() {
        await new User({ id: 1, name: 'John Doe' }).insert();
        const user = new User({ id: 1 });
        await expect(
          user.delete(),
          'to be fulfilled with value exhaustively satisfying',
          new User({ id: 1, name: 'John Doe' })
        );
        await expect(knex, 'with table', User.table, 'to be empty');
      });

      it('passes options along', async function() {
        const user = await new User({ name: 'John Doe' }).insert();
        user.name = 'Jane Doe';
        await expect(
          user.delete({ require: false, where: { name: 'foo' } }),
          'to be fulfilled with value exhaustively satisfying',
          null
        );
      });
    });

    describe('Model.save', function() {
      it('inserts models', async function() {
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

      it('updates models', async function() {
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

      it('passes options along', async function() {
        await User.save({ name: 'John Doe' });
        await expect(
          User.save({ id: 1, name: 'Jane Doe' }, { forge: false }),
          'to be fulfilled with value exhaustively satisfying',
          [{ id: 1, name: 'Jane Doe' }]
        );
      });
    });

    describe('Model.insert', function() {
      it('inserts models', async function() {
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

      it('passes options along', async function() {
        await expect(
          User.insert({ name: 'John Doe' }, { forge: false }),
          'to be fulfilled with value exhaustively satisfying',
          [{ id: 1, name: 'John Doe' }]
        );
      });
    });

    describe('Model.update', function() {
      it('updates models', async function() {
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

      it('passes options along', async function() {
        await new User({ name: 'John Doe' }).insert();
        await expect(
          User.update({ id: 1, name: 'Jane Doe' }, { forge: false }),
          'to be fulfilled with value exhaustively satisfying',
          [{ id: 1, name: 'Jane Doe' }]
        );
      });
    });

    describe('Model.fetch', function() {
      it('fetches models', async function() {
        await User.save({ name: 'John Doe' });
        await expect(
          User.fetch(),
          'to be fulfilled with value exhaustively satisfying',
          [new User({ id: 1, name: 'John Doe' })]
        );
      });

      it('passes options along', async function() {
        await User.save({ name: 'John Doe' });
        await expect(
          User.fetch({ forge: false }),
          'to be fulfilled with value exhaustively satisfying',
          [{ id: 1, name: 'John Doe' }]
        );
      });
    });

    describe('Model.delete', function() {
      it('deletes models', async function() {
        await User.save({ name: 'John Doe' });
        await expect(
          User.delete(),
          'to be fulfilled with value exhaustively satisfying',
          [new User({ id: 1, name: 'John Doe' })]
        );
      });

      it('passes options along', async function() {
        await User.save({ name: 'John Doe' });
        await expect(
          User.delete({ forge: false }),
          'to be fulfilled with value exhaustively satisfying',
          [{ id: 1, name: 'John Doe' }]
        );
      });
    });

    describe('with `methods` configured for `unique` or `primary` fields', function() {
      describe('Model.fetchByField', function() {
        it('fetches a model using the field', async function() {
          await new User({ id: 1, name: 'John Doe' }).insert();
          await expect(
            User.fetchById(1),
            'to be fulfilled with value satisfying',
            new User({ id: 1, name: 'John Doe' })
          );
        });

        it('passes options along', async function() {
          await new User({ id: 1, name: 'John Doe' }).insert();
          await expect(
            User.fetchById(1, { where: { name: 'foo' } }),
            'to be rejected with error satisfying',
            { name: 'NoRowsFetchedError' }
          );
        });
      });

      describe('Model.deleteByField', function() {
        it('deletes a model using its primary field value', async function() {
          await new User({ id: 1, name: 'John Doe' }).insert();
          await expect(
            User.deleteById(1),
            'to be fulfilled with value satisfying',
            new User({ id: 1, name: 'John Doe' })
          );
          await expect(knex, 'with table', User.table, 'to be empty');
        });

        it('passes options along', async function() {
          await new User({ id: 1, name: 'John Doe' }).insert();
          await expect(
            User.deleteById(1, { where: { name: 'foo' } }),
            'to be rejected with error satisfying',
            { name: 'NoRowsDeletedError' }
          );
        });
      });

      describe('Model.updateByField', function() {
        it('updates a model using its primary field value', async function() {
          await new User({ id: 1, name: 'John Doe' }).insert();
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

        it('passes options along', async function() {
          await new User({ id: 1, name: 'John Doe' }).insert();
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

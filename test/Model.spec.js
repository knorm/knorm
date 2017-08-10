const QueryBuilder = require('knex/lib/query/builder');
const Model = require('../lib/Model');
const Field = require('../lib/Field');
const Virtual = require('../lib/Virtual');
const Query = require('../lib/Query');
const sinon = require('sinon');
const knex = require('./lib/knex')();
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

      it('throws if the virtuals name is already assigned to an instance property', function() {
        class Foo extends Model {
          bar() {}
        }

        Foo.virtuals = {
          bar: {
            get() {}
          }
        };

        expect(
          () => new Foo(),
          'to throw',
          new Error(
            "Cannot add Getter/Setter for virtual 'Foo.bar' (Foo.prototype.bar is already assigned)"
          )
        );
      });
    });

    describe('with data provided', function() {
      it('calls Model.prototype.setData to populate the instance with the data', function() {
        class Foo extends Model {}

        Foo.fields = {
          id: {
            type: Field.types.integer
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

  describe('Model.prototype.setData', function() {
    it('populates the instance with the data with the passed object', function() {
      class Foo extends Model {}

      Foo.fields = {
        foo: {
          type: Field.types.string
        },
        bar: {
          type: Field.types.integer
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

    it('throws if the passed object contains unknown fields', function() {
      class Foo extends Model {}

      Foo.fields = {
        foo: {
          type: Field.types.string
        },
        bar: {
          type: Field.types.integer
        }
      };

      const foo = new Foo();

      expect(
        () => foo.setData({ quux: 'quux' }),
        'to throw',
        new Error("Unknown field or virtual 'Foo.quux'")
      );
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
        new Error("Virtual 'Foo.bar' has no setter")
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
          type: Field.types.string
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
          type: Field.types.string,
          default: 'foo'
        },
        bar: {
          type: Field.types.string,
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
          type: Field.types.string,
          default: 'foo'
        },
        bar: {
          type: Field.types.string,
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

    it('throws if the list of fields contains unknown fields', function() {
      class Foo extends Model {}

      Foo.fields = {
        foo: {
          type: Field.types.string
        },
        bar: {
          type: Field.types.integer
        }
      };

      const foo = new Foo();

      expect(
        () => foo.setDefaults({ fields: ['quux'] }),
        'to throw',
        new Error("Unknown field 'Foo.quux'")
      );
    });

    it("doesn't overwrite values that have already been set", function() {
      class Foo extends Model {}

      Foo.fields = {
        foo: {
          type: Field.types.string,
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
            type: Field.types.string,
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
            type: Field.types.string,
            required: true
          },
          bar: {
            type: Field.types.string,
            required: true
          },
          computed: {
            type: Field.types.string,
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
          type: Field.types.string,
          default: true
        }
      };

      const foo = new Foo();

      expect(foo.setDefaults(), 'to satisfy', foo);
    });
  });

  describe('Model.prototype.getData', function() {
    it('resolves with an object of fields that have values', async function() {
      class Foo extends Model {}

      Foo.fields = {
        foo: {
          type: Field.types.string
        },
        bar: {
          type: Field.types.string
        }
      };

      const foo = new Foo();

      foo.foo = 'foo';
      foo.bar = null;

      await expect(foo.getData(), 'to be fulfilled with', {
        foo: 'foo',
        bar: null
      });
    });

    it('does not include fields whose value has not been set', async function() {
      class Foo extends Model {}

      Foo.fields = {
        foo: {
          type: Field.types.string
        },
        bar: {
          type: Field.types.string
        }
      };

      const foo = new Foo();

      foo.foo = 'foo';
      await expect(foo.getData(), 'to be fulfilled with', {
        foo: 'foo',
        bar: undefined
      });
    });

    it('does not include properties set on the model that are not fields', async function() {
      class Foo extends Model {}

      Foo.fields = {
        foo: {
          type: Field.types.string
        }
      };

      const foo = new Foo();

      foo.foo = 'foo';
      foo.quux = 'quux';
      await expect(foo.getData(), 'to be fulfilled with', {
        foo: 'foo',
        quux: undefined
      });
    });

    describe("with a 'fields' option", function() {
      it('only returns data for the requested fields', async function() {
        class Foo extends Model {}

        Foo.fields = {
          foo: {
            type: Field.types.string
          },
          bar: {
            type: Field.types.string
          }
        };

        const foo = new Foo();

        foo.foo = 'foo';
        foo.bar = 'bar';

        await expect(foo.getData({ fields: ['bar'] }), 'to be fulfilled with', {
          foo: undefined,
          bar: 'bar'
        });
      });

      it('does not include a field without a value even if it has been requested', async function() {
        class Foo extends Model {}

        Foo.fields = {
          foo: {
            type: Field.types.string
          },
          bar: {
            type: Field.types.string
          }
        };

        const foo = new Foo();

        foo.foo = 'foo';
        await expect(
          foo.getData({ fields: ['bar'] }),
          'to be fulfilled with',
          {}
        );
      });

      it('rejects if the list of fields contains unknown fields', async function() {
        class Foo extends Model {}

        Foo.fields = {
          foo: {
            type: Field.types.string
          },
          bar: {
            type: Field.types.integer
          }
        };

        const foo = new Foo();

        return expect(
          foo.getData({ fields: ['quux'] }),
          'to be rejected with',
          new Error("Unknown field 'Foo.quux'")
        );
      });
    });

    describe("with the 'virtuals' option set to true", function() {
      it('includes virtuals in the data', async function() {
        class Foo extends Model {}

        Foo.fields = {
          foo: {
            type: Field.types.string
          }
        };

        Foo.virtuals = {
          bar() {
            return 'bar';
          }
        };

        const foo = new Foo();

        foo.foo = 'foo';
        await expect(foo.getData({ virtuals: true }), 'to be fulfilled with', {
          foo: 'foo',
          bar: 'bar'
        });
      });

      it('includes data from virtuals that return a promise', async function() {
        class Foo extends Model {}

        Foo.virtuals = {
          bar() {
            return Promise.resolve('bar');
          }
        };

        const foo = new Foo();

        await expect(foo.getData({ virtuals: true }), 'to be fulfilled with', {
          bar: 'bar'
        });
      });

      it('skips virtuals that have no getters', async function() {
        class Foo extends Model {}

        Foo.virtuals = {
          quux: {
            set() {}
          }
        };

        const foo = new Foo();

        await expect(foo.getData({ virtuals: true }), 'to be fulfilled with', {
          quux: undefined
        });
      });

      it("calls the virtuals' getters with this set to the model instance", async function() {
        class Foo extends Model {}

        const spy = sinon.spy();
        Foo.virtuals = {
          bar: {
            get: spy
          }
        };

        const foo = new Foo();

        await foo.getData({ virtuals: true });
        await expect(spy, 'was called once').and('was called on', foo);
      });
    });

    describe("with the 'virtuals' set to an array", function() {
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
          foo.getData({ virtuals: ['bar'] }),
          'to be fulfilled with',
          {
            bar: 'bar',
            quux: undefined
          }
        );
      });

      it("calls the virtuals' getters with this set to the model instance", async function() {
        class Foo extends Model {}

        const spy = sinon.spy();
        Foo.virtuals = {
          bar: {
            get: spy
          }
        };

        const foo = new Foo();

        await foo.getData({ virtuals: ['bar'] });
        await expect(spy, 'was called once').and('was called on', foo);
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
          foo.getData({ virtuals: ['bar'] }),
          'to be rejected with',
          new Error("Virtual 'Foo.bar' has no getter")
        );
      });
    });
  });

  describe('Model.prototype.validate', function() {
    it('validates all the fields by default', async function() {
      class Foo extends Model {}

      Foo.fields = {
        foo: {
          required: true,
          type: Field.types.string
        },
        bar: {
          required: true,
          type: Field.types.string
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
            type: Field.types.string
          },
          bar: {
            required: true,
            type: Field.types.string
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
            type: Field.types.string
          },
          bar: {
            required: true,
            type: Field.types.string
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

      it('rejects if the list of fields contains unknown fields', function() {
        class Foo extends Model {}

        Foo.fields = {
          foo: {
            type: Field.types.string
          },
          bar: {
            type: Field.types.integer
          }
        };

        const foo = new Foo();

        expect(
          foo.validate({ fields: ['quux'] }),
          'to be rejected with',
          new Error("Unknown field 'Foo.quux'")
        );
      });
    });

    it('calls the validator with the set value and the model instance', async function() {
      class Foo extends Model {}

      Foo.fields = {
        bar: {
          type: Field.types.string
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
          type: Field.types.string
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
          type: Field.types.string
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
          type: Field.types.string,
          cast: {
            save: fooSaveCast
          }
        },
        bar: {
          required: true,
          type: Field.types.string
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
            type: Field.types.string,
            cast: {
              save: fooSaveCast
            }
          },
          bar: {
            required: true,
            type: Field.types.string,
            cast: {
              save: barSaveCast
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
            type: Field.types.string,
            cast: {
              save: fooSaveCast
            }
          },
          bar: {
            required: true,
            type: Field.types.string,
            cast: {
              save: barSaveCast
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

      it('rejects if the list of fields contains unknown fields', function() {
        class Foo extends Model {}

        Foo.fields = {
          foo: {
            required: true,
            type: Field.types.string,
            cast: {
              save() {}
            }
          },
          bar: {
            required: true,
            type: Field.types.string,
            cast: {
              save() {}
            }
          }
        };

        const foo = new Foo();

        expect(
          foo.cast({ fields: ['quux'] }),
          'to be rejected with',
          new Error("Unknown field 'Foo.quux'")
        );
      });
    });

    it('calls Field.prototype.cast with the set value, the model instance and options passed', function() {
      class Foo extends Model {}

      Foo.fields = {
        bar: {
          required: true,
          type: Field.types.string,
          cast: {
            save() {}
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
          type: Field.types.string,
          cast: {
            save() {}
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
          type: Field.types.string,
          cast: {
            save() {}
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
          type: Field.types.string,
          cast: {
            save() {
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
          type: Field.types.string,
          cast: {
            save() {
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
          type: Field.types.string,
          cast: {
            save() {
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

    it('resolves with the model instance to allow chaining', function() {
      class Foo extends Model {}

      Foo.fields = {
        bar: {
          default: true,
          type: Field.types.string,
          cast: {
            save() {}
          }
        }
      };

      const foo = new Foo();

      expect(
        foo.cast({ fields: ['bar'] }, { forSave: true }),
        'to be fulfilled with',
        foo
      );
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
            type: Field.types.string
          }
        };

        expect(User.fields, 'to exhaustively satisfy', {
          firstName: expect.it(
            'to be field',
            new Field({
              name: 'firstName',
              model: User,
              type: Field.types.string
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
            type: Field.types.string
          }
        };

        expect(User.fields, 'to exhaustively satisfy', {
          firstName: expect.it(
            'to be field',
            new Field({
              name: 'firstName',
              model: User,
              type: Field.types.string
            })
          )
        });
      });

      describe('when a model is subclassed', function() {
        it('allows overwriting fields defined in the parent', function() {
          class User extends Model {}
          User.fields = {
            id: {
              type: Field.types.string
            }
          };

          expect(User.fields, 'to exhaustively satisfy', {
            id: expect.it(
              'to be field',
              new Field({
                name: 'id',
                model: User,
                type: Field.types.string
              })
            )
          });

          class OtherUser extends User {}
          OtherUser.fields = {
            id: {
              type: Field.types.text
            }
          };

          expect(OtherUser.fields, 'to exhaustively satisfy', {
            id: expect.it(
              'to be field',
              new Field({
                name: 'id',
                model: OtherUser,
                type: Field.types.text
              })
            )
          });
        });

        it("updates the child's fields' model class", function() {
          class User extends Model {}
          User.fields = {
            firstName: {
              type: Field.types.string
            }
          };

          expect(User.fields, 'to satisfy', {
            firstName: expect.it(
              'to be field',
              new Field({
                name: 'firstName',
                model: User,
                type: Field.types.string
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
                type: Field.types.string
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
              type: Field.types.integer,
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
                type: Field.types.integer
              })
            )
          });

          class OtherUser extends User {}
          OtherUser.fields = {
            firstName: {
              type: Field.types.string
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
                type: Field.types.integer
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
                type: Field.types.integer
              })
            ),
            firstName: expect.it(
              'to be field',
              new Field({
                name: 'firstName',
                model: OtherUser,
                type: Field.types.string
              })
            )
          });
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

  describe('Model.fieldNames', function() {
    it('returns the `id` field mapping by default', function() {
      class User extends Model {}

      expect(User.fieldNames, 'to exhaustively satisfy', {
        id: 'id'
      });
    });

    describe('as a setter', function() {
      it("adds the field name mappings to the model's field name mappings", function() {
        class User extends Model {}
        User.fieldNames = { createdAt: 'created' };

        expect(User.fieldNames, 'to exhaustively satisfy', {
          id: 'id',
          createdAt: 'created'
        });
      });

      describe('when a model is subclassed', function() {
        it('allows overwriting the field names defined in the parent', function() {
          class User extends Model {}
          User.fieldNames = { createdAt: 'created' };

          expect(User.fieldNames, 'to exhaustively satisfy', {
            id: 'id',
            createdAt: 'created'
          });

          class OtherUser extends User {}
          OtherUser.fieldNames = { createdAt: 'timeCreated' };

          expect(OtherUser.fieldNames, 'to satisfy', {
            id: 'id',
            createdAt: 'timeCreated'
          });
        });

        it("doesn't interfere with the parent's field name mappings", function() {
          class User extends Model {}

          expect(Model.fieldNames, 'to exhaustively satisfy', { id: 'id' });
          expect(User.fieldNames, 'to exhaustively satisfy', { id: 'id' });

          User.fieldNames = { createdAt: 'created' };

          expect(Model.fieldNames, 'to exhaustively satisfy', { id: 'id' });
          expect(User.fieldNames, 'to exhaustively satisfy', {
            id: 'id',
            createdAt: 'created'
          });

          class OtherUser extends User {}
          OtherUser.fieldNames = { updatedAt: 'timeUpdated' };

          expect(Model.fieldNames, 'to exhaustively satisfy', { id: 'id' });
          expect(User.fieldNames, 'to exhaustively satisfy', {
            id: 'id',
            createdAt: 'created'
          });
          expect(OtherUser.fieldNames, 'to satisfy', {
            id: 'id',
            createdAt: 'created',
            updatedAt: 'timeUpdated'
          });
        });
      });
    });
  });

  describe('Model.references', function() {
    it("is a getter that returns the model's references", function() {
      class Foo extends Model {}
      expect(Foo.references, 'to equal', {});
    });
  });

  describe('Model.referenced', function() {
    it("is a getter that returns the model's back-references", function() {
      class Foo extends Model {}
      expect(Foo.referenced, 'to equal', {});
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
    class UserQuery extends Query {}
    UserQuery.knex = knex;

    class User extends Model {}
    User.Query = UserQuery;
    User.table = 'user';
    User.fields = {
      id: {
        type: Field.types.integer,
        required: true
      },
      name: {
        type: Field.types.string,
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
      it('inserts a row to the database via Query.prototype.save', async function() {
        const spy = sinon.spy(UserQuery.prototype, 'save');
        const user = new User({ name: 'John Doe' });
        await expect(user.save(), 'to be fulfilled');
        await expect(spy, 'to have calls satisfying', () => {
          spy(user);
        });
        await expect(
          knex,
          'with table',
          User.table,
          'to have rows satisfying',
          [
            {
              id: 1,
              name: 'John Doe'
            }
          ]
        );
        spy.restore();
      });

      it('updates a row to the database via Query.prototype.save', async function() {
        const user = await User.save({ name: 'John Doe' });
        user.name = 'Jane Doe';
        const spy = sinon.spy(UserQuery.prototype, 'save');
        await expect(user.save(), 'to be fulfilled');
        await expect(spy, 'to have calls satisfying', () => {
          spy(user);
        });
        await expect(
          knex,
          'with table',
          User.table,
          'to have rows satisfying',
          [
            {
              id: 1,
              name: 'Jane Doe'
            }
          ]
        );
        spy.restore();
      });

      it('passes any options passed options Query.prototype.setOptions', async function() {
        const stub = sinon
          .stub(UserQuery.prototype, 'setOptions')
          .returnsThis();
        const user = new User({ name: 'John Doe' });
        await expect(user.save({ foo: 'bar' }), 'to be fulfilled');
        await expect(stub, 'to have calls satisfying', () => {
          stub({ foo: 'bar' });
        });
        stub.restore();
      });

      it("sets 'require' to true by default", async function() {
        const stub = sinon
          .stub(QueryBuilder.prototype, 'insert')
          .returns(Promise.resolve([]));
        const user = new User({ name: 'John Doe' });
        const spy = sinon.spy(UserQuery.prototype, 'require');
        await expect(user.save(), 'to be rejected with error satisfying', {
          name: 'NoRowsInsertedError'
        });
        await expect(spy, 'to have calls satisfying', () => {
          spy(true);
        });
        stub.restore();
        spy.restore();
      });

      it("allows overriding the 'require' option to false", async function() {
        const stub = sinon
          .stub(QueryBuilder.prototype, 'insert')
          .returns(Promise.resolve([]));
        const user = new User({ name: 'John Doe' });
        await expect(
          user.save({ require: false }),
          'to be fulfilled with value satisfying',
          null
        );
        stub.restore();
      });
    });

    describe('Model.prototype.insert', function() {
      it('inserts a row to the database via Query.prototype.insert', async function() {
        const spy = sinon.spy(UserQuery.prototype, 'insert');
        const user = new User({ name: 'John Doe' });
        await expect(user.insert(), 'to be fulfilled');
        await expect(spy, 'to have calls satisfying', () => {
          spy(user);
        });
        await expect(
          knex,
          'with table',
          User.table,
          'to have rows satisfying',
          [{ id: 1, name: 'John Doe' }]
        );
        spy.restore();
      });

      it('passes any options passed to Query.prototype.setOptions', async function() {
        const stub = sinon
          .stub(UserQuery.prototype, 'setOptions')
          .returnsThis();
        const user = new User({ name: 'John Doe' });
        await expect(user.insert({ foo: 'bar' }), 'to be fulfilled');
        await expect(stub, 'to have calls satisfying', () => {
          stub({ foo: 'bar' });
        });
        stub.restore();
      });

      it("sets 'require' to true by default", async function() {
        const stub = sinon
          .stub(QueryBuilder.prototype, 'insert')
          .returns(Promise.resolve([]));
        const user = new User({ name: 'John Doe' });
        const spy = sinon.spy(UserQuery.prototype, 'require');
        await expect(user.insert(), 'to be rejected with error satisfying', {
          name: 'NoRowsInsertedError'
        });
        await expect(spy, 'to have calls satisfying', () => {
          spy(true);
        });
        stub.restore();
        spy.restore();
      });

      it("allows overriding the 'require' option to false", async function() {
        const stub = sinon
          .stub(QueryBuilder.prototype, 'insert')
          .returns(Promise.resolve([]));
        const user = new User({ name: 'John Doe' });
        await expect(
          user.insert({ require: false }),
          'to be fulfilled with value satisfying',
          null
        );
        stub.restore();
      });
    });

    describe('Model.prototype.update', function() {
      it('updates a row to the database via Query.prototype.update', async function() {
        const spy = sinon.spy(UserQuery.prototype, 'update');
        const user = await User.insert({ name: 'John Doe' });
        user.name = 'Jane Doe';
        await expect(user.update(), 'to be fulfilled');
        await expect(spy, 'to have calls satisfying', () => {
          spy(user);
        });
        await expect(
          knex,
          'with table',
          User.table,
          'to have rows satisfying',
          [{ id: 1, name: 'Jane Doe' }]
        );
        spy.restore();
      });

      it('passes any options passed to Query.prototype.setOptions', async function() {
        const user = await User.insert({ name: 'John Doe' });
        user.name = 'Jane Doe';
        const stub = sinon
          .stub(UserQuery.prototype, 'setOptions')
          .returnsThis();
        await expect(user.update({ foo: 'bar' }), 'to be fulfilled');
        await expect(stub, 'to have calls satisfying', () => {
          stub({ foo: 'bar' });
        });
        stub.restore();
      });

      it("sets 'require' to true by default", async function() {
        const user = await User.insert({ name: 'John Doe' });
        user.name = 'Jane Doe';
        const stub = sinon
          .stub(QueryBuilder.prototype, 'update')
          .returns(Promise.resolve([]));
        const spy = sinon.spy(UserQuery.prototype, 'require');
        await expect(user.update(), 'to be rejected with error satisfying', {
          name: 'NoRowsUpdatedError'
        });
        await expect(spy, 'to have calls satisfying', () => {
          spy(true);
        });
        stub.restore();
        spy.restore();
      });

      it("allows overriding the 'require' option to false", async function() {
        const user = await User.insert({ name: 'John Doe' });
        user.name = 'Jane Doe';
        const stub = sinon
          .stub(QueryBuilder.prototype, 'update')
          .returns(Promise.resolve([]));
        await expect(
          user.update({ require: false }),
          'to be fulfilled with value satisfying',
          null
        );
        stub.restore();
      });

      describe('if more than one row is updated', function() {
        it('resolves with instances of all the updated rows', async function() {
          await User.insert({ id: 1, name: 'John Doe' });
          await User.insert({ id: 2, name: 'Jane Doe' });
          await expect(
            new User({ name: 'Mr & Mrs Smith' }).update(),
            'to be fulfilled with value satisfying',
            instances =>
              expect(
                instances,
                'when sorted by',
                (a, b) => a.id - b.id,
                'to satisfy',
                [
                  new User({ id: 1, name: 'Mr & Mrs Smith' }),
                  new User({ id: 2, name: 'Mr & Mrs Smith' })
                ]
              )
          );
        });
      });
    });

    describe('Model.prototype.fetch', function() {
      it('fetches a model from the database via Query.prototype.fetch', async function() {
        await User.insert({ id: 1, name: 'John Doe' });
        const user = new User({ id: 1 });
        const spy = sinon.spy(UserQuery.prototype, 'fetch');
        await expect(
          user.fetch(),
          'to be fulfilled with value satisfying',
          new User({ id: 1, name: 'John Doe' })
        );
        await expect(spy, 'to have calls satisfying', () => {
          spy();
        });
        spy.restore();
      });

      it('passes any options passed to Query.prototype.setOptions', async function() {
        await User.insert({ id: 1, name: 'John Doe' });
        const user = new User({ id: 1 });
        const spy = sinon.spy(UserQuery.prototype, 'setOptions');
        await expect(
          user.fetch({ fields: 'name' }),
          'to be fulfilled with value satisfying',
          new User({ name: 'John Doe' })
        );
        await expect(spy, 'to have calls satisfying', () => {
          spy({ fields: 'name' });
        });
        spy.restore();
      });

      it('passes the `id` set on the model to Query.prototype.where', async function() {
        await User.insert({ id: 1, name: 'John Doe' });
        const user = new User({ id: 1, name: 'John Doe' });
        const spy = sinon.spy(UserQuery.prototype, 'where');
        await expect(
          user.fetch(),
          'to be fulfilled with value satisfying',
          new User({ id: 1, name: 'John Doe' })
        );
        await expect(spy, 'to have calls satisfying', () => {
          spy({ id: 1 });
        });
        spy.restore();
      });

      it("does not pass the `id` to Query.prototype.where if it's unset", async function() {
        await User.insert({ id: 1, name: 'John Doe' });
        const spy = sinon.spy(UserQuery.prototype, 'where');
        await expect(
          new User().fetch(),
          'to be fulfilled with value satisfying',
          new User({ id: 1, name: 'John Doe' })
        );
        await expect(spy, 'was not called');
        spy.restore();
      });

      it("allows overriding the 'where' option if a 'where' option is passed", async function() {
        await User.insert({ id: 1, name: 'John Doe' });
        const user = new User({ id: 1, name: 'John Doe' });
        const spy = sinon.spy(UserQuery.prototype, 'where');
        await expect(
          user.fetch({ where: { id: 1, name: 'John Doe' } }),
          'to be fulfilled with value satisfying',
          new User({ id: 1, name: 'John Doe' })
        );
        await expect(spy, 'to have calls satisfying', () => {
          spy({ id: 1, name: 'John Doe' });
        });
        spy.restore();
      });

      describe('if no rows are matched', function() {
        it('rejects with a NoRowsFetchedError', async function() {
          await User.insert({ id: 1, name: 'John Doe' });
          const user = new User({ id: 2 });
          await expect(user.fetch(), 'to be rejected with error satisfying', {
            name: 'NoRowsFetchedError'
          });
        });

        describe("if the 'require' option is set to false", function() {
          it('does not reject with a NoRowsFetchedError', async function() {
            await User.insert({ id: 1, name: 'John Doe' });
            const user = new User({ id: 2 });
            await expect(
              user.fetch({ require: false }),
              'to be fulfilled with value satisfying',
              null
            );
          });
        });
      });

      it('prevents extra forging by Query.prototype.fetch', async function() {
        await User.insert({ id: 1, name: 'John Doe' });
        const user = new User({ id: 1, name: 'John Doe' });
        const spy = sinon.spy(UserQuery.prototype, 'forge');
        await expect(user.fetch(), 'to be fulfilled');
        await expect(spy, 'to have calls satisfying', () => {
          spy(false);
        });
        spy.restore();
      });
    });

    describe('Model.prototype.delete', function() {
      it('deletes a model from the database via Query.prototype.delete', async function() {
        await User.insert({ id: 1, name: 'John Doe' });
        const user = new User({ id: 1 });
        const spy = sinon.spy(UserQuery.prototype, 'delete');
        await expect(
          user.delete(),
          'to be fulfilled with value satisfying',
          new User({ id: 1, name: 'John Doe' })
        );
        await expect(spy, 'to have calls satisfying', () => {
          spy();
        });
        await expect(knex, 'with table', User.table, 'to be empty');
        spy.restore();
      });

      it('passes any options passed to Query.prototype.setOptions', async function() {
        await User.insert({ id: 1, name: 'John Doe' });
        const user = new User({ id: 1 });
        const spy = sinon.spy(UserQuery.prototype, 'setOptions');
        await expect(
          user.delete({ fields: 'name' }),
          'to be fulfilled with value satisfying',
          new User({ name: 'John Doe' })
        );
        await expect(spy, 'to have calls satisfying', () => {
          spy({ fields: 'name' });
        });
        spy.restore();
      });

      it('passes the `id` set on the model to Query.prototype.where', async function() {
        await User.insert({ id: 1, name: 'John Doe' });
        const user = new User({ id: 1, name: 'John Doe' });
        const spy = sinon.spy(UserQuery.prototype, 'where');
        await expect(
          user.delete(),
          'to be fulfilled with value satisfying',
          new User({ id: 1, name: 'John Doe' })
        );
        await expect(spy, 'to have calls satisfying', () => {
          spy({ id: 1 });
        });
        spy.restore();
      });

      it("does not pass the `id` to Query.prototype.where if it's unset", async function() {
        await User.insert({ id: 1, name: 'John Doe' });
        const spy = sinon.spy(UserQuery.prototype, 'where');
        await expect(
          new User().delete(),
          'to be fulfilled with value satisfying',
          new User({ id: 1, name: 'John Doe' })
        );
        await expect(spy, 'was not called');
        spy.restore();
      });

      it("allows overriding the 'where' option if a 'where' option is passed", async function() {
        await User.insert({ id: 1, name: 'John Doe' });
        const user = new User({ id: 1, name: 'John Doe' });
        const spy = sinon.spy(UserQuery.prototype, 'where');
        await expect(
          user.delete({ where: { id: 1 } }),
          'to be fulfilled with value satisfying',
          new User({ id: 1, name: 'John Doe' })
        );
        await expect(spy, 'to have calls satisfying', () => {
          spy({ id: 1 });
        });
        spy.restore();
      });

      describe('if no rows are deleted', function() {
        it('rejects with a NoRowsDeletedError', async function() {
          await User.insert({ id: 1, name: 'John Doe' });
          const user = new User({ id: 2 });
          await expect(user.delete(), 'to be rejected with error satisfying', {
            name: 'NoRowsDeletedError'
          });
        });

        describe("if the 'require' option is set to false", function() {
          it('does not reject with a NoRowsDeletedError', async function() {
            await User.insert({ id: 1, name: 'John Doe' });
            const user = new User({ id: 2 });
            await expect(
              user.delete({ require: false }),
              'to be fulfilled with value satisfying',
              null
            );
          });
        });
      });

      describe('if more than one row is deleted', function() {
        it('resolves with instances of all the deleted rows', async function() {
          await User.insert({ id: 1, name: 'John Doe' });
          await User.insert({ id: 2, name: 'Jane Doe' });
          await expect(
            new User().delete(),
            'to be fulfilled with value satisfying',
            instances =>
              expect(
                instances,
                'when sorted by',
                (a, b) => a.id - b.id,
                'to satisfy',
                [
                  new User({ id: 1, name: 'John Doe' }),
                  new User({ id: 2, name: 'Jane Doe' })
                ]
              )
          );
        });
      });

      it('prevents extra forging by Query.prototype.delete', async function() {
        await User.insert({ id: 1, name: 'John Doe' });
        const user = new User({ id: 1, name: 'John Doe' });
        const spy = sinon.spy(UserQuery.prototype, 'forge');
        await expect(user.delete(), 'to be fulfilled');
        await expect(spy, 'to have calls satisfying', () => {
          spy(false);
        });
        spy.restore();
      });
    });

    describe('Model.save', function() {
      it('inserts a row to the database via Query.prototype.save', async function() {
        const spy = sinon.spy(UserQuery.prototype, 'save');
        const data = { name: 'John Doe' };
        await expect(User.save(data), 'to be fulfilled');
        await expect(spy, 'to have calls satisfying', () => {
          spy(data);
        });
        await expect(
          knex,
          'with table',
          User.table,
          'to have rows satisfying',
          [{ id: 1, name: 'John Doe' }]
        );
        spy.restore();
      });

      it('updates a row to the database via Query.prototype.save', async function() {
        const user = await User.save({ name: 'John Doe' });
        const spy = sinon.spy(UserQuery.prototype, 'save');
        user.name = 'Jane Doe';
        await expect(User.save(user), 'to be fulfilled');
        await expect(spy, 'to have calls satisfying', () => {
          spy(user);
        });
        await expect(
          knex,
          'with table',
          User.table,
          'to have rows satisfying',
          [{ id: 1, name: 'Jane Doe' }]
        );
        spy.restore();
      });

      it('passes any options passed to Query.prototype.setOptions', async function() {
        const spy = sinon.spy(UserQuery.prototype, 'setOptions');
        const data = { name: 'John Doe' };
        const options = { require: true };
        await expect(User.save(data, options), 'to be fulfilled');
        await expect(spy, 'to have calls satisfying', () => {
          spy(options);
        });
        spy.restore();
      });
    });

    describe('Model.insert', function() {
      it('inserts a row to the database via Query.prototype.insert', async function() {
        const spy = sinon.spy(UserQuery.prototype, 'insert');
        const data = { id: 1, name: 'John Doe' };
        await expect(User.insert(data), 'to be fulfilled');
        await expect(spy, 'to have calls satisfying', () => {
          spy(data);
        });
        await expect(
          knex,
          'with table',
          User.table,
          'to have rows satisfying',
          [{ id: 1, name: 'John Doe' }]
        );
        spy.restore();
      });

      it('passes any options passed to Query.prototype.setOptions', async function() {
        const spy = sinon.spy(UserQuery.prototype, 'setOptions');
        const data = { name: 'John Doe' };
        const options = { require: true };
        await expect(User.insert(data, options), 'to be fulfilled');
        await expect(spy, 'to have calls satisfying', () => {
          spy(options);
        });
        spy.restore();
      });
    });

    describe('Model.update', function() {
      it('updates a row to the database via Query.prototype.update', async function() {
        const user = await User.insert({ name: 'John Doe' });
        const spy = sinon.spy(UserQuery.prototype, 'update');
        user.name = 'Jane Doe';
        await expect(User.update(user), 'to be fulfilled');
        await expect(spy, 'to have calls satisfying', () => {
          spy(user);
        });
        await expect(
          knex,
          'with table',
          User.table,
          'to have rows satisfying',
          [{ id: 1, name: 'Jane Doe' }]
        );
        spy.restore();
      });

      it('passes any options passed to Query.prototype.setOptions', async function() {
        const user = await User.insert({ name: 'John Doe' });
        const spy = sinon.spy(UserQuery.prototype, 'setOptions');
        user.name = 'Jane Doe';
        const options = { require: true };
        await expect(User.update(user, options), 'to be fulfilled');
        await expect(spy, 'to have calls satisfying', () => {
          spy(options);
        });
        spy.restore();
      });
    });

    describe('Model.fetch', function() {
      it('fetches data from the database via Query.prototype.fetch', async function() {
        await User.save({ name: 'John Doe' });
        const spy = sinon.spy(UserQuery.prototype, 'fetch');
        await expect(User.fetch(), 'to be fulfilled with value satisfying', [
          new User({ id: 1, name: 'John Doe' })
        ]);
        await expect(spy, 'to have calls satisfying', () => {
          spy();
        });
        spy.restore();
      });

      it('passes any options passed to Query.prototype.setOptions', async function() {
        await User.save({ name: 'John Doe' });
        const spy = sinon.spy(UserQuery.prototype, 'setOptions');
        const options = { forge: false };
        await expect(
          User.fetch(options),
          'to be fulfilled with value satisfying',
          [{ id: 1, name: 'John Doe' }]
        );
        await expect(spy, 'to have calls satisfying', () => {
          spy(options);
        });
        spy.restore();
      });
    });

    describe('Model.delete', function() {
      it('deletes data from the database via Query.prototype.delete', async function() {
        await User.save({ name: 'John Doe' });
        const spy = sinon.spy(UserQuery.prototype, 'delete');
        await expect(User.delete(), 'to be fulfilled with value satisfying', [
          new User({ id: 1, name: 'John Doe' })
        ]);
        await expect(spy, 'to have calls satisfying', () => {
          spy();
        });
        spy.restore();
      });

      it('passes any options passed to Query.prototype.setOptions', async function() {
        await User.save({ name: 'John Doe' });
        const spy = sinon.spy(UserQuery.prototype, 'setOptions');
        const options = { forge: false };
        await expect(
          User.delete(options),
          'to be fulfilled with value satisfying',
          [{ id: 1, name: 'John Doe' }]
        );
        await expect(spy, 'to have calls satisfying', () => {
          spy(options);
        });
        spy.restore();
      });
    });

    describe('Model.fetchById', function() {
      it('fetches data from the database via Model.prototype.fetch', async function() {
        await User.insert({ id: 1, name: 'John Doe' });
        const spy = sinon.spy(User.prototype, 'fetch');
        await expect(
          User.fetchById(1),
          'to be fulfilled with value satisfying',
          new User({ id: 1, name: 'John Doe' })
        );
        await expect(spy, 'to have calls satisfying', () => {
          spy(undefined);
        });
        spy.restore();
      });

      it('passes any options passed to Model.prototype.fetch', async function() {
        await User.insert({ id: 1, name: 'John Doe' });
        const spy = sinon.spy(UserQuery.prototype, 'setOptions');
        await expect(
          User.fetchById(1, { forge: false }),
          'to be fulfilled with value satisfying',
          { id: 1, name: 'John Doe' }
        );
        await expect(spy, 'to have calls satisfying', () => {
          spy({ forge: false });
        });
        spy.restore();
      });
    });

    describe('Model.deleteById', function() {
      it('deletes data from the database via Model.prototype.delete', async function() {
        await User.insert({ id: 1, name: 'John Doe' });
        const spy = sinon.spy(User.prototype, 'delete');
        await expect(
          User.deleteById(1),
          'to be fulfilled with value satisfying',
          new User({ id: 1, name: 'John Doe' })
        );
        await expect(spy, 'to have calls satisfying', () => {
          spy(undefined);
        });
        spy.restore();
      });

      it('passes any options passed to Model.prototype.delete', async function() {
        await User.insert({ id: 1, name: 'John Doe' });
        const spy = sinon.spy(UserQuery.prototype, 'setOptions');
        await expect(
          User.deleteById(1, { forge: false }),
          'to be fulfilled with value satisfying',
          { id: 1, name: 'John Doe' }
        );
        await expect(spy, 'to have calls satisfying', () => {
          spy({ forge: false });
        });
        spy.restore();
      });
    });

    describe('Model.updateById', function() {
      it('updates data in the database via Model.prototype.update', async function() {
        await User.insert({ id: 1, name: 'John Doe' });
        const spy = sinon.spy(User.prototype, 'update');
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
        await expect(spy, 'to have calls satisfying', () => {
          spy(undefined);
        });
        spy.restore();
      });

      it('passes any options passed to Model.prototype.update', async function() {
        await User.insert({ id: 1, name: 'John Doe' });
        const spy = sinon.spy(UserQuery.prototype, 'setOptions');
        await expect(
          User.updateById(1, { name: 'Jane Doe' }, { forge: false }),
          'to be fulfilled with value satisfying',
          { id: 1, name: 'Jane Doe' }
        );
        await expect(spy, 'to have calls satisfying', () => {
          spy({ forge: false });
        });
        spy.restore();
      });
    });
  });

  describe('with a custom `id` field-name', function() {
    class EmailAsIdQuery extends Query {}
    EmailAsIdQuery.knex = knex;

    class EmailAsId extends Model {}
    EmailAsId.Query = EmailAsIdQuery;
    EmailAsId.table = 'user';
    EmailAsId.fields = {
      email: {
        type: Field.types.string,
        required: true
      },
      name: {
        type: Field.types.string,
        required: true
      }
    };
    EmailAsId.fieldNames.id = 'email';

    before(async function() {
      await knex.schema.createTable(EmailAsId.table, table => {
        table.string('email').primary();
        table.string('name').notNullable();
      });
    });

    after(async function() {
      await knex.schema.dropTable(EmailAsId.table);
    });

    afterEach(async function() {
      await knex(EmailAsId.table).truncate();
    });

    describe('Model.prototype.fetch', function() {
      it('passes the configured `id` field to Query.prototype.where', async function() {
        await EmailAsId.insert({ email: 'foo', name: 'John Doe' });
        const instance = new EmailAsId({ email: 'foo' });
        const spy = sinon.spy(EmailAsIdQuery.prototype, 'where');
        await expect(
          instance.fetch(),
          'to be fulfilled with value satisfying',
          new EmailAsId({ email: 'foo', name: 'John Doe' })
        );
        await expect(spy, 'to have calls satisfying', () => {
          spy({ email: 'foo' });
        });
        spy.restore();
      });
    });

    describe('Model.fetchById', function() {
      it('uses the configured id field to fetch the data', async function() {
        await EmailAsId.insert({ email: 'foo', name: 'John Doe' });
        await expect(
          EmailAsId.fetchById('foo'),
          'to be fulfilled with value satisfying',
          new EmailAsId({ email: 'foo', name: 'John Doe' })
        );
      });

      it('rejects with an error if the id field is not configured', async function() {
        EmailAsId.fieldNames.id = 'foo';
        await expect(
          EmailAsId.fetchById('foo'),
          'to be rejected with',
          new Error("EmailAsId has no id field ('foo') configured")
        );
        EmailAsId.fieldNames.id = 'email';
      });
    });

    describe('Model.updateById', function() {
      it('uses the configured id field to fetch the data', async function() {
        await EmailAsId.insert({ email: 'foo', name: 'John Doe' });
        await expect(
          EmailAsId.updateById('foo', { name: 'Jane Doe' }),
          'to be fulfilled with value satisfying',
          new EmailAsId({ email: 'foo', name: 'Jane Doe' })
        );
        await expect(
          knex,
          'with table',
          EmailAsId.table,
          'to have rows satisfying',
          [{ email: 'foo', name: 'Jane Doe' }]
        );
      });

      it('rejects with an error if the id field is not configured', async function() {
        EmailAsId.fieldNames.id = 'foo';
        await expect(
          EmailAsId.updateById('foo', { name: 'Jane Doe' }),
          'to be rejected with',
          new Error("EmailAsId has no id field ('foo') configured")
        );
        EmailAsId.fieldNames.id = 'email';
      });
    });
  });
});

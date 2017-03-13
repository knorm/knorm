const Model = require('../Model');
const Field = require('../Field');
const Virtual = require('../Virtual');

const sinon = require('sinon');
const expect = require('unexpected')
    .clone()
    .use(require('unexpected-sinon'))
    .use(require('./lib/unexpected-unexpected-bug'));

describe('Model', function () {
    describe('constructor', function () {
        describe('when the model has virtuals', function () {
            it("adds virtual's getters on the instance", function () {
                class Foo extends Model {}

                Foo.virtuals = {
                    foo: {
                        get() {
                            return 'foo';
                        },
                    },
                };

                const foo = new Foo();

                expect(foo.foo, 'to be', 'foo');
            });

            it('adds the getters with the correct scope', function () {
                class Foo extends Model {}

                Foo.virtuals = {
                    foo: {
                        get() {
                            return this.theValue;
                        },
                    },
                };

                const foo = new Foo();
                foo.theValue = 'bar';

                expect(foo.foo, 'to be', 'bar');
            });

            it("adds virtual's setters on the instance with the correct scope", function () {
                class Foo extends Model {}

                Foo.virtuals = {
                    foo: {
                        set(value) {
                            this.theValue = value;
                        },
                    },
                };

                const foo = new Foo();
                foo.foo = 'bar';

                expect(foo.theValue, 'to be', 'bar');
            });

            it('throws if the virtuals name is already assigned to an instance property', function () {
                class Foo extends Model {
                    bar() {}
                }

                Foo.virtuals = {
                    bar: {
                        get() {},
                    },
                };

                expect(() => new Foo(), 'to throw', new Error(
                    "Cannot add Getter/Setter for virtual 'Foo.bar' (Foo.prototype.bar is already assigned)"
                ));
            });
        });

        describe('with data provided', function () {
            it('calls Model.prototype.setData to populate the instance with the data', function () {
                class Foo extends Model {}

                Foo.fields = {
                    id: {
                        type: Field.types.integer,
                    },
                };

                const spy = sinon.spy(Foo.prototype, 'setData');
                new Foo({ id: 1 });

                expect(spy, 'to have calls satisfying', () => {
                    spy({
                        id: 1,
                    });
                });

                spy.restore();
            });
        });
    });

    describe('Model.prototype.setData', function () {
        it('populates the instance with the data with the passed object', function () {
            class Foo extends Model {}

            Foo.fields = {
                foo: {
                    type: Field.types.string,
                },
                bar: {
                    type: Field.types.integer,
                },
            };

            const foo = new Foo();

            expect(foo.foo, 'to be undefined');
            expect(foo.bar, 'to be undefined');
            foo.setData({
                foo: 'foo',
                bar: 1,
            });
            expect(foo.foo, 'to equal', 'foo');
            expect(foo.bar, 'to equal', 1);
        });

        it('throws if the passed object contains unknown fields', function () {
            class Foo extends Model {}

            Foo.fields = {
                foo: {
                    type: Field.types.string,
                },
                bar: {
                    type: Field.types.integer,
                },
            };

            const foo = new Foo();

            expect(
                () => foo.setData({ quux: 'quux' }),
                'to throw',
                new Error("Unknown field or virtual 'Foo.quux'")
            );
        });

        it('populates virtuals if provided in the object', function () {
            class Foo extends Model {}

            Foo.virtuals = {
                bar: {
                    get() {
                        return this.setVirtualBarValue;
                    },
                    set(value) {
                        this.setVirtualBarValue = value;
                    },
                },
            };

            const foo = new Foo();

            expect(foo.bar, 'to be undefined');
            foo.setData({
                bar: 1,
            });
            expect(foo.bar, 'to equal', 1);
        });

        it('throws if a virtual provided in the object has no setter', function () {
            class Foo extends Model {}

            Foo.virtuals = {
                bar: {
                    get() {},
                },
            };

            const foo = new Foo();

            expect(foo.bar, 'to be undefined');
            expect(
                () => foo.setData({ bar: 1 }),
                'to throw',
                new Error("Virtual 'Foo.bar' has no setter")
            );
        });

        it("calls the virtual's getter with this set to the model instance", function () {
            class Foo extends Model {}

            const spy = sinon.spy();
            Foo.virtuals = {
                bar: {
                    set: spy,
                },
            };

            const foo = new Foo();

            foo.setData({ bar: 1 });
            expect(spy, 'was called once').and('was called on', foo);
        });

        it('returns the model instance to allow chaining', function () {
            class Foo extends Model {}

            Foo.fields = {
                foo: {
                    required: true,
                    type: Field.types.string,
                },
            };

            const foo = new Foo();

            expect(foo.setData({ foo: 'foo' }), 'to satisfy', foo);
        });
    });

    describe('Model.prototype.setDefaults', function () {
        it('populates all configured fields with the configured default value', function () {
            class Foo extends Model {}

            Foo.fields = {
                foo: {
                    type: Field.types.string,
                    default: 'foo',
                },
                bar: {
                    type: Field.types.string,
                    default: 'bar',
                },
            };

            const foo = new Foo();

            expect(foo.foo, 'to be undefined');
            expect(foo.bar, 'to be undefined');
            foo.setDefaults();
            expect(foo.foo, 'to equal', 'foo');
            expect(foo.bar, 'to equal', 'bar');
        });

        it('accepts a list of fields to populate with the configured default value', function () {
            class Foo extends Model {}

            Foo.fields = {
                foo: {
                    type: Field.types.string,
                    default: 'foo',
                },
                bar: {
                    type: Field.types.string,
                    default: 'bar',
                },
            };

            const foo = new Foo();

            expect(foo.foo, 'to be undefined');
            expect(foo.bar, 'to be undefined');
            foo.setDefaults({ fields: [ 'bar' ] });
            expect(foo.foo, 'to be undefined');
            expect(foo.bar, 'to equal', 'bar');
        });

        it('throws if the list of fields contains unknown fields', function () {
            class Foo extends Model {}

            Foo.fields = {
                foo: {
                    type: Field.types.string,
                },
                bar: {
                    type: Field.types.integer,
                },
            };

            const foo = new Foo();

            expect(
                () => foo.setDefaults({ fields: [ 'quux' ] }),
                'to throw',
                new Error("Unknown field 'Foo.quux'")
            );
        });

        it("doesn't overwrite values that have already been set", function () {
            class Foo extends Model {}

            Foo.fields = {
                foo: {
                    type: Field.types.string,
                    default: 'foo',
                },
            };

            const foo = new Foo();

            foo.foo = 'dont change me';
            expect(foo.foo, 'to be', 'dont change me');
            foo.setDefaults();
            expect(foo.foo, 'to be', 'dont change me');
        });

        describe("when a field's default value is a function", function () {
            it('calls the function and populates the field with the return value', function () {
                class Foo extends Model {}

                Foo.fields = {
                    foo: {
                        type: Field.types.string,
                        default: function () {
                            return 'foo';
                        },
                    },
                };

                const foo = new Foo();

                expect(foo.foo, 'to be undefined');
                foo.setDefaults();
                expect(foo.foo, 'to be', 'foo');
            });

            it("calls the function with the instance's scope", function () {
                class Foo extends Model {}

                Foo.fields = {
                    foo: {
                        type: Field.types.string,
                        required: true,
                    },
                    bar: {
                        type: Field.types.string,
                        required: true,
                    },
                    computed: {
                        type: Field.types.string,
                        default: function () {
                            return this.foo + this.bar;
                        },
                    },
                };

                const foo = new Foo();

                foo.foo = 'foo';
                foo.bar = 'bar';
                expect(foo.computed, 'to be undefined');
                foo.setDefaults();
                expect(foo.computed, 'to be', 'foobar');
            });
        });

        it('returns the model instance to allow chaining', function () {
            class Foo extends Model {}

            Foo.fields = {
                foo: {
                    type: Field.types.string,
                    default: true,
                },
            };

            const foo = new Foo();

            expect(foo.setDefaults(), 'to satisfy', foo);
        });
    });

    describe('Model.prototype.getData', function () {
        it('resolves with an object of fields that have values', async function () {
            class Foo extends Model {}

            Foo.fields = {
                foo: {
                    type: Field.types.string,
                },
                bar: {
                    type: Field.types.string,
                },
            };

            const foo = new Foo();

            foo.foo = 'foo';
            foo.bar = null;

            await expect(foo.getData(), 'to be fulfilled with', {
                foo: 'foo',
                bar: null,
            });
        });

        it('does not include fields whose value has not been set', async function () {
            class Foo extends Model {}

            Foo.fields = {
                foo: {
                    type: Field.types.string,
                },
                bar: {
                    type: Field.types.string,
                },
            };

            const foo = new Foo();

            foo.foo = 'foo';
            await expect(foo.getData(), 'to be fulfilled with', {
                foo: 'foo',
                bar: undefined,
            });
        });

        it('does not include properties set on the model that are not fields', async function () {
            class Foo extends Model {}

            Foo.fields = {
                foo: {
                    type: Field.types.string,
                },
            };

            const foo = new Foo();

            foo.foo = 'foo';
            foo.quux = 'quux';
            await expect(foo.getData(), 'to be fulfilled with', {
                foo: 'foo',
                quux: undefined,
            });
        });

        describe("with a 'fields' option", function () {
            it('only returns data for the requested fields', async function () {
                class Foo extends Model {}

                Foo.fields = {
                    foo: {
                        type: Field.types.string,
                    },
                    bar: {
                        type: Field.types.string,
                    },
                };

                const foo = new Foo();

                foo.foo = 'foo';
                foo.bar = 'bar';

                await expect(foo.getData({ fields: [ 'bar' ] }), 'to be fulfilled with', {
                    foo: undefined,
                    bar: 'bar',
                });
            });

            it('does not include a field without a value even if it has been requested', async function () {
                class Foo extends Model {}

                Foo.fields = {
                    foo: {
                        type: Field.types.string,
                    },
                    bar: {
                        type: Field.types.string,
                    },
                };

                const foo = new Foo();

                foo.foo = 'foo';
                await expect(foo.getData({ fields: [ 'bar' ] }), 'to be fulfilled with', {});
            });

            it('rejects if the list of fields contains unknown fields', async function () {
                class Foo extends Model {}

                Foo.fields = {
                    foo: {
                        type: Field.types.string,
                    },
                    bar: {
                        type: Field.types.integer,
                    },
                };

                const foo = new Foo();

                return expect(
                    foo.getData({ fields: [ 'quux' ] }),
                    'to be rejected with',
                    new Error("Unknown field 'Foo.quux'")
                );
            });
        });

        describe("with the 'virtuals' option set to true", function () {
            it('includes virtuals in the data', async function () {
                class Foo extends Model {}

                Foo.fields = {
                    foo: {
                        type: Field.types.string,
                    },
                };

                Foo.virtuals = {
                    bar() {
                        return 'bar';
                    },
                };

                const foo = new Foo();

                foo.foo = 'foo';
                await expect(foo.getData({ virtuals: true }), 'to be fulfilled with', {
                    foo: 'foo',
                    bar: 'bar',
                });
            });

            it('includes data from virtuals that return a promise', async function () {
                class Foo extends Model {}

                Foo.virtuals = {
                    bar() {
                        return Promise.resolve('bar');
                    },
                };

                const foo = new Foo();

                await expect(foo.getData({ virtuals: true }), 'to be fulfilled with', {
                    bar: 'bar',
                });
            });

            it('skips virtuals that have no getters', async function () {
                class Foo extends Model {}

                Foo.virtuals = {
                    quux: {
                        set() {},
                    },
                };

                const foo = new Foo();

                await expect(foo.getData({ virtuals: true }), 'to be fulfilled with', {
                    quux: undefined,
                });
            });

            it("calls the virtuals' getters with this set to the model instance", async function () {
                class Foo extends Model {}

                const spy = sinon.spy();
                Foo.virtuals = {
                    bar: {
                        get: spy,
                    },
                };

                const foo = new Foo();

                await foo.getData({ virtuals: true });
                await expect(spy, 'was called once').and('was called on', foo);
            });
        });

        describe("with the 'virtuals' set to an array", function () {
            it('only includes the requested virtuals', async function () {
                class Foo extends Model {}

                Foo.virtuals = {
                    bar: {
                        get() {
                            return 'bar';
                        },
                    },
                    quux: {
                        get() {
                            return 'quux';
                        },
                    },
                };

                const foo = new Foo();

                await expect(foo.getData({ virtuals: [ 'bar' ] }), 'to be fulfilled with', {
                    bar: 'bar',
                    quux: undefined,
                });
            });

            it("calls the virtuals' getters with this set to the model instance", async function () {
                class Foo extends Model {}

                const spy = sinon.spy();
                Foo.virtuals = {
                    bar: {
                        get: spy,
                    },
                };

                const foo = new Foo();

                await foo.getData({ virtuals: [ 'bar' ] });
                await expect(spy, 'was called once').and('was called on', foo);
            });

            it('rejects with an error if a requested virtual has no getter', async function () {
                class Foo extends Model {}

                Foo.virtuals = {
                    bar: {
                        set() {},
                    },
                };

                const foo = new Foo();

                await expect(
                    foo.getData({ virtuals: [ 'bar' ] }),
                    'to be rejected with',
                    new Error("Virtual 'Foo.bar' has no getter")
                );
            });
        });
    });

    describe('Model.prototype.validate', function () {
        it('validates all the fields by default', async function () {
            class Foo extends Model {}

            Foo.fields = {
                foo: {
                    required: true,
                    type: Field.types.string,
                },
                bar: {
                    required: true,
                    type: Field.types.string,
                },
            };

            const fooValidationSpy = sinon.spy(Foo.fields.foo, 'validate');
            const barValidationSpy = sinon.spy(Foo.fields.bar, 'validate');

            const foo = new Foo();

            await expect(foo.validate(), 'to be rejected with', {
                BadRequest: true,
                MissingRequiredFooFooError: true,
            });

            await expect(fooValidationSpy, 'was called once');
            await expect(barValidationSpy, 'was called once');

            fooValidationSpy.restore();
            barValidationSpy.restore();
        });

        describe("with a 'fields' option", function () {
            it('validates only the fields passed', async function () {
                class Foo extends Model {}

                Foo.fields = {
                    foo: {
                        required: true,
                        type: Field.types.string,
                    },
                    bar: {
                        required: true,
                        type: Field.types.string,
                    },
                };

                const fooValidationSpy = sinon.spy(Foo.fields.foo, 'validate');
                const barValidationSpy = sinon.spy(Foo.fields.bar, 'validate');

                const foo = new Foo();

                await expect(
                    foo.validate({ fields: [ 'bar' ] }),
                    'to be rejected with', {
                        BadRequest: true,
                        MissingRequiredFooBarError: true,
                    }
                );

                await expect(fooValidationSpy, 'was not called');
                await expect(barValidationSpy, 'was called once');

                fooValidationSpy.restore();
                barValidationSpy.restore();
            });

            it('accepts a list of field objects', async function () {
                class Foo extends Model {}

                Foo.fields = {
                    foo: {
                        required: true,
                        type: Field.types.string,
                    },
                    bar: {
                        required: true,
                        type: Field.types.string,
                    },
                };

                const fooValidationSpy = sinon.spy(Foo.fields.foo, 'validate');
                const barValidationSpy = sinon.spy(Foo.fields.bar, 'validate');

                const foo = new Foo();

                await expect(
                    foo.validate({ fields: [ Foo.fields.bar ] }),
                    'to be rejected with',
                    {
                        BadRequest: true,
                        MissingRequiredFooBarError: true,
                    }
                );

                await expect(fooValidationSpy, 'was not called');
                await expect(barValidationSpy, 'was called once');

                fooValidationSpy.restore();
                barValidationSpy.restore();
            });

            it('rejects if the list of fields contains unknown fields', function () {
                class Foo extends Model {}

                Foo.fields = {
                    foo: {
                        type: Field.types.string,
                    },
                    bar: {
                        type: Field.types.integer,
                    },
                };

                const foo = new Foo();

                expect(
                    foo.validate({ fields: [ 'quux' ] }),
                    'to be rejected with',
                    new Error("Unknown field 'Foo.quux'")
                );
            });
        });

        it('calls the validator with the set value and the model instance', async function () {
            class Foo extends Model {}

            Foo.fields = {
                bar: {
                    type: Field.types.string,
                },
            };

            const barValidationSpy = sinon.spy(Foo.fields.bar, 'validate');

            const foo = new Foo();
            foo.bar = 'bar';

            await foo.validate({ fields: [ 'bar' ] });
            await expect(barValidationSpy, 'to have calls satisfying', () => {
                barValidationSpy('bar', foo);
            });

            barValidationSpy.restore();
        });

        it('rejects with the error from Field.prototype.validate', async function () {
            class Foo extends Model {}

            Foo.fields = {
                bar: {
                    type: Field.types.string,
                },
            };

            const barValidationStub = sinon.stub(Foo.fields.bar, 'validate');
            barValidationStub.returns(Promise.reject(new Error('foo happens')));

            const foo = new Foo();

            await expect(
                foo.validate({ fields: [ 'bar' ] }),
                'to be rejected with',
                new Error('foo happens')
            );

            barValidationStub.restore();
        });

        it('resolves with the model instance to allow chaining', async function () {
            class Foo extends Model {}

            Foo.fields = {
                bar: {
                    default: true,
                    type: Field.types.string,
                },
            };

            const foo = new Foo();

            await expect(
                foo.validate({ fields: [ 'bar' ] }),
                'to be fulfilled with',
                foo
            );
        });
    });

    describe('Model.fields', function () {
        describe('as a getter', function () {
            it('returns no fields by default', function () {
                class User extends Model {}
                expect(User.fields, 'to be empty');
            });

            it('returns added fields', function () {
                class User extends Model {}
                User.fields = {
                    firstName: {
                        type: Field.types.string,
                    },
                };

                expect(User.fields, 'to exhaustively satisfy', {
                    firstName: expect.it('to be field', new Field({
                        name: 'firstName',
                        model: User,
                        type: Field.types.string,
                    })),
                });
            });
        });

        describe('as a setter', function () {
            it("adds the passed fields to the model's fields", function () {
                class User extends Model {}
                User.fields = {
                    firstName: {
                        type: Field.types.string,
                    },
                };

                expect(User.fields, 'to exhaustively satisfy', {
                    firstName: expect.it('to be field', new Field({
                        name: 'firstName',
                        model: User,
                        type: Field.types.string,
                    })),
                });
            });

            describe('when a model is subclassed', function () {
                it('allows overwriting fields defined in the parent', function () {
                    class User extends Model {}
                    User.fields = {
                        id: {
                            type: Field.types.string,
                        },
                    };

                    expect(User.fields, 'to exhaustively satisfy', {
                        id: expect.it('to be field', new Field({
                            name: 'id',
                            model: User,
                            type: Field.types.string,
                        })),
                    });

                    class OtherUser extends User {}
                    OtherUser.fields = {
                        id: {
                            type: Field.types.text,
                        },
                    };

                    expect(OtherUser.fields, 'to exhaustively satisfy', {
                        id: expect.it('to be field', new Field({
                            name: 'id',
                            model: OtherUser,
                            type: Field.types.text,
                        })),
                    });
                });

                it("updates the child's fields' model class", function () {
                    class User extends Model {}
                    User.fields = {
                        firstName: {
                            type: Field.types.string,
                        },
                    };

                    expect(User.fields, 'to satisfy', {
                        firstName: expect.it('to be field', new Field({
                            name: 'firstName',
                            model: User,
                            type: Field.types.string,
                        })),
                    });

                    class Student extends User {}

                    Student.fields = {
                        studentId: {
                            type: 'integer',
                        },
                    };

                    expect(Student.fields, 'to satisfy', {
                        firstName: expect.it('to be field', new Field({
                            name: 'firstName',
                            model: Student,
                            type: Field.types.string,
                        })),
                    });
                });

                it("doesn't interfere with the parent's fields", function () {
                    class User extends Model {}

                    expect(Model.fields, 'to be empty');
                    expect(User.fields, 'to be empty');

                    User.fields = {
                        id: {
                            type: Field.types.integer,
                            required: true,
                        },
                    };

                    expect(Model.fields, 'to be empty');
                    expect(User.fields, 'to exhaustively satisfy', {
                        id: expect.it('to be field', new Field({
                            name: 'id',
                            model: User,
                            required: true,
                            type: Field.types.integer,
                        })),
                    });

                    class OtherUser extends User {}
                    OtherUser.fields = {
                        firstName: {
                            type: Field.types.string,
                        },
                    };

                    expect(Model.fields, 'to be empty');
                    expect(User.fields, 'to exhaustively satisfy', {
                        id: expect.it('to be field', new Field({
                            name: 'id',
                            model: User,
                            required: true,
                            type: Field.types.integer,
                        })),
                    });
                    expect(OtherUser.fields, 'to exhaustively satisfy', {
                        id: expect.it('to be field', new Field({
                            name: 'id',
                            model: OtherUser,
                            required: true,
                            type: Field.types.integer,
                        })),
                        firstName: expect.it('to be field', new Field({
                            name: 'firstName',
                            model: OtherUser,
                            type: Field.types.string,
                        })),
                    });
                });
            });
        });
    });

    describe('Model.virtuals', function () {
        describe('as a setter', function () {
            it("adds the virtuals to the model's virtuals", function () {
                class User extends Model {}

                User.virtuals = {
                    firstName: {
                        get() {},
                        set() {},
                    },
                };

                expect(User.virtuals, 'to exhaustively satisfy', {
                    firstName: expect.it('to be virtual', new Virtual({
                        name: 'firstName',
                        model: User,
                        descriptor: {
                            get() {},
                            set() {},
                        },
                    })),
                });
            });

            it('allows overwriting the virtuals', function () {
                class User extends Model {}

                User.virtuals = {
                    firstName: {
                        get() { return 'foo'; },
                    },
                };

                expect(User.virtuals, 'to exhaustively satisfy', {
                    firstName: expect.it('to be virtual', new Virtual({
                        name: 'firstName',
                        model: User,
                        descriptor: {
                            get() { return 'foo'; },
                        },
                    })),
                });

                class OtherUser extends User {}

                OtherUser.virtuals = {
                    firstName: {
                        get() { return 'bar'; },
                    },
                };

                expect(User.virtuals, 'to satisfy', {
                    firstName: expect.it('to be virtual', new Virtual({
                        name: 'firstName',
                        model: OtherUser,
                        descriptor: {
                            get() { return 'bar'; },
                        },
                    })),
                });
            });
        });

        describe('as a getter', function () {
            it('returns the virtuals added to the model', function () {
                class User extends Model {}

                User.virtuals = {
                    firstName: {
                        get() { return 'foo'; },
                    },
                };

                expect(User.virtuals, 'to exhaustively satisfy', {
                    firstName: expect.it('to be virtual', new Virtual({
                        name: 'firstName',
                        model: User,
                        descriptor: {
                            get() { return 'foo'; },
                        },
                    })),
                });
            });
        });
    });

    describe('Model.references', function () {
        it("is a getter that returns the model's references", function () {
            class Foo extends Model {}
            expect(Foo.references, 'to equal', {});
        });
    });

    describe('Model.referenced', function () {
        it("is a getter that returns the model's back-references", function () {
            class Foo extends Model {}
            expect(Foo.referenced, 'to equal', {});
        });
    });
});

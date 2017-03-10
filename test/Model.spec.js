const Model = require('../../../lib/newModels/Model');
const Field = require('../../../lib/newModels/Field');

const sinon = require('sinon');
const expect = require('unexpected')
    .clone()
    .use(require('unexpected-sinon'))
    .addAssertion('<function> to be model <function>', function (expect, subject, value) {
        // TODO: workaround for https://github.com/unexpectedjs/unexpected/issues/378
        return expect(subject, 'to equal', value);
    });

describe('lib/newModels/Model', function () {
    describe('constructor', function () {
        describe('when the model has virtuals', function () {
            it("adds virtual's getters on the instance", function () {
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

            it('adds the getters with the correct scope', function () {
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

            it("adds virtual's setters on the instance with the correct scope", function () {
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

            it('throws if the virtuals name is already assigned to an instance property', function () {
                class Foo extends Model {}

                Foo.virtuals = {
                    getData: {
                        get() {
                            return this.theValue;
                        }
                    }
                };

                expect(() => new Foo(), 'to throw', new Error(
                    "virtual name 'Foo.getData' is a reserved instance property name"
                ));
            });
        });

        describe('with data provided', function () {
            it('calls Model.prototype.setData to populate the instance with the data', function () {
                class Foo extends Model {}

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

    describe('Model.prototype.getName', function () {
        it('returns the constructor name of the model', function () {
            class Foo extends Model {}
            const foo = new Foo();
            expect(foo.getName(), 'to be', 'Foo');
        });
    });

    describe('Model.prototype.setData', function () {
        it('populates the instance with the data with the passed object', function () {
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

        it('throws if the passed object contains unknown fields', function () {
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
                "cannot populate unknown field 'quux'"
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

        it('throws if a virtual provided in the object has no setter', function () {
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
                "virtual 'Foo.bar' has no setter"
            );
        });

        it("calls the virtual's getter with this set to the model instance", function () {
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

        it('populates the id, createdAt and updatedAt fields if passed', function () {
            class Foo extends Model {}

            const foo = new Foo();

            expect(foo.id, 'to be undefined');
            expect(foo.createdAt, 'to be undefined');
            expect(foo.updatedAt, 'to be undefined');

            const createdAt = new Date();
            const updatedAt = new Date();

            foo.setData({
                id: 1,
                createdAt,
                updatedAt
            });

            expect(foo.id, 'to be', 1);
            expect(foo.createdAt, 'to equal', createdAt);
            expect(foo.updatedAt, 'to equal', updatedAt);
        });

        it('returns the model instance to allow chaining', function () {
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

    describe('Model.prototype.setDefaults', function () {
        it('populates all configured fields with the configured default value', function () {
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

        it('accepts a list of fields to populate with the configured default value', function () {
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
            foo.setDefaults({ fields: [ 'bar' ] });
            expect(foo.foo, 'to be undefined');
            expect(foo.bar, 'to equal', 'bar');
        });

        it('throws if the list of fields contains unknown fields', function () {
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
                () => foo.setDefaults({ fields: [ 'quux' ] }),
                'to throw',
                "cannot set default value for unknown field 'quux'"
            );
        });

        it("doesn't overwrite values that have already been set", function () {
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

        describe("when a field's default value is a function", function () {
            it('calls the function and populates the field with the return value', function () {
                class Foo extends Model {}

                Foo.fields = {
                    foo: {
                        type: Field.types.string,
                        default: function () {
                            return 'foo';
                        }
                    }
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
                        required: true
                    },
                    bar: {
                        type: Field.types.string,
                        required: true
                    },
                    computed: {
                        type: Field.types.string,
                        default: function () {
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

        it('returns the model instance to allow chaining', function () {
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

    describe('Model.prototype.getData', function () {
        it('resolves with an object of fields that have values', async function () {
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

        it('does not include fields whose value has not been set', async function () {
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

        it('does not include properties set on the model that are not fields', async function () {
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

        describe("with a 'fields' option", function () {
            it('only returns data for the requested fields', async function () {
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

                await expect(foo.getData({ fields: [ 'bar' ] }), 'to be fulfilled with', {
                    foo: undefined,
                    bar: 'bar'
                });
            });

            it('does not include a field without a value even if it has been requested', async function () {
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
                await expect(foo.getData({ fields: [ 'bar' ] }), 'to be fulfilled with', {});
            });

            it('rejects if the list of fields contains unknown fields', function () {
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
                    foo.getData({ fields: [ 'quux' ] }),
                    'to be rejected with',
                    "cannot get data for unknown field 'quux'"
                );
            });
        });

        describe("with the 'virtuals' option set to true", function () {
            it('includes virtuals in the data', async function () {
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

            it('includes data from virtuals that return a promise', async function () {
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

            it('skips virtuals that have no getters', async function () {
                class Foo extends Model {}

                Foo.virtuals = {
                    quux: {
                        set(value) {}
                    }
                };

                const foo = new Foo();

                await expect(foo.getData({ virtuals: true }), 'to be fulfilled with', {
                    quux: undefined
                });
            });

            it("calls the virtuals' getters with this set to the model instance", async function () {
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

        describe("with the 'virtuals' set to an array", function () {
            it('only includes the requested virtuals', async function () {
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

                await expect(foo.getData({ virtuals: [ 'bar' ] }), 'to be fulfilled with', {
                    bar: 'bar',
                    quux: undefined
                });
            });

            it("calls the virtuals' getters with this set to the model instance", async function () {
                class Foo extends Model {}

                const spy = sinon.spy();
                Foo.virtuals = {
                    bar: {
                        get: spy
                    }
                };

                const foo = new Foo();

                await foo.getData({ virtuals: [ 'bar' ] });
                await expect(spy, 'was called once').and('was called on', foo);
            });

            it('rejects with an error if a requested virtual has no getter', async function () {
                class Foo extends Model {}

                Foo.virtuals = {
                    bar: {
                        set(value) {}
                    }
                };

                const foo = new Foo();

                await expect(
                    foo.getData({ virtuals: [ 'bar' ] }),
                    'to be rejected with',
                    new Error("virtual 'Foo.bar' has no getter")
                );
            });
        });
    });

    describe('Model.prototype.getFields', function () {
        it("returns an array of the model's fields", function () {
            class Foo extends Model {}

            Foo.fields = {
                foo: {
                    type: Field.types.string
                }
            };

            const foo = new Foo();

            expect(foo.getFields(), 'to equal', [ 'id', 'createdAt', 'updatedAt', 'foo' ]);
        });
    });

    describe('Model.prototype.getVirtuals', function () {
        it("returns an array of the model's virtuals", function () {
            class Foo extends Model {}

            Foo.virtuals = {
                foo: {
                    get: () => {}
                }
            };

            const foo = new Foo();

            expect(foo.getVirtuals(), 'to equal', [ 'foo' ]);
        });
    });

    describe('Model.prototype.getSetFields', function () {
        it('returns an array of fields whose values have been set', function () {
            class Foo extends Model {}

            Foo.fields = {
                foo: {
                    type: Field.types.string
                }
            };

            const foo = new Foo();

            foo.foo = 'foo';
            expect(foo.getSetFields(), 'to equal', [ 'foo' ]);
        });

        it('includes fields whose values have been set to null', function () {
            class Foo extends Model {}

            Foo.fields = {
                foo: {
                    type: Field.types.string
                }
            };

            const foo = new Foo();

            foo.foo = null;

            expect(foo.getSetFields(), 'to equal', [ 'foo' ]);
        });

        it('includes fields whose value has been set from defaults', function () {
            class Foo extends Model {}

            Foo.fields = {
                foo: {
                    type: Field.types.string
                },
                bar: {
                    type: Field.types.string,
                    default: 'bar'
                }
            };

            const foo = new Foo();

            foo.foo = 'foo';
            expect(foo.getSetFields(), 'to equal', [ 'foo' ]);
            foo.setDefaults();
            expect(foo.getSetFields(), 'to equal', [ 'createdAt', 'updatedAt', 'foo', 'bar' ]);
        });
    });

    describe('Model.prototype.validate', function () {
        it('validates all the fields by default', async function () {
            class Foo extends Model {}

            Foo.fields = {
                bar: {
                    required: true,
                    type: Field.types.string
                }
            };

            const idValidationSpy = sinon.spy(Foo.fields.id, 'validate');
            const createdAtValidationSpy = sinon.spy(Foo.fields.createdAt, 'validate');
            const updatedAtValidationSpy = sinon.spy(Foo.fields.updatedAt, 'validate');
            const barValidationSpy = sinon.spy(Foo.fields.bar, 'validate');

            const foo = new Foo();

            await expect(foo.validate(), 'to be rejected with', {
                BadRequest: true,
                MissingRequiredFooIdError: true
            });

            await expect(idValidationSpy, 'was called once');
            await expect(createdAtValidationSpy, 'was called once');
            await expect(updatedAtValidationSpy, 'was called once');
            await expect(barValidationSpy, 'was called once');

            idValidationSpy.restore();
            createdAtValidationSpy.restore();
            updatedAtValidationSpy.restore();
            barValidationSpy.restore();
        });

        it('accepts a list of fields to validate', async function () {
            class Foo extends Model {}

            Foo.fields = {
                bar: {
                    required: true,
                    type: Field.types.string
                }
            };

            const idValidationSpy = sinon.spy(Foo.fields.id, 'validate');
            const createdAtValidationSpy = sinon.spy(Foo.fields.createdAt, 'validate');
            const updatedAtValidationSpy = sinon.spy(Foo.fields.updatedAt, 'validate');
            const barValidationSpy = sinon.spy(Foo.fields.bar, 'validate');

            const foo = new Foo();

            await expect(foo.validate({ fields: [ 'bar' ] }), 'to be rejected with', {
                BadRequest: true,
                MissingRequiredFooBarError: true
            });

            await expect(idValidationSpy, 'was not called');
            await expect(createdAtValidationSpy, 'was not called');
            await expect(updatedAtValidationSpy, 'was not called');
            await expect(barValidationSpy, 'was called once');

            idValidationSpy.restore();
            createdAtValidationSpy.restore();
            updatedAtValidationSpy.restore();
            barValidationSpy.restore();
        });

        it('rejects if the list of fields contains unknown fields', function () {
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
                foo.validate({ fields: [ 'quux' ] }),
                'to be rejected with',
                "cannot validate unknown field 'quux'"
            );
        });

        it('calls the validator with the set value and the model instance', async function () {
            class Foo extends Model {}

            Foo.fields = {
                bar: {
                    type: Field.types.string
                }
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
                    type: Field.types.string
                }
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
                    type: Field.types.string
                }
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
            it('returns id, createdAt and updatedAt fields by default', function () {
                class User extends Model {}

                expect(User.fields, 'to exhaustively satisfy', {
                    id: new Field({
                        name: 'id',
                        model: expect.it('to be model', User),
                        required: true,
                        type: Field.types.integer
                    }),
                    createdAt: new Field({
                        name: 'createdAt',
                        model: expect.it('to be model', User),
                        required: true,
                        type: Field.types.dateTime,
                        default: () => new Date()
                    }),
                    updatedAt: new Field({
                        name: 'updatedAt',
                        model: expect.it('to be model', User),
                        required: true,
                        type: Field.types.dateTime,
                        default: () => new Date()
                    })
                });
            });

            it('returns newly included fields', function () {
                class User extends Model {}

                User.fields = {
                    firstName: {
                        type: Field.types.string
                    }
                };

                expect(User.fields, 'to satisfy', {
                    firstName: new Field({
                        name: 'firstName',
                        model: expect.it('to be model', User),
                        type: Field.types.string
                    })
                });
            });
        });

        describe('as a setter', function () {
            it("adds the passed fields to the model's fields", function () {
                class User extends Model {}

                User.fields = {
                    firstName: {
                        type: Field.types.string
                    }
                };

                expect(User.fields, 'to exhaustively satisfy', {
                    id: expect.it('to be a', Field),
                    createdAt: expect.it('to be a', Field),
                    updatedAt: expect.it('to be a', Field),
                    firstName: new Field({
                        name: 'firstName',
                        model: expect.it('to be model', User),
                        type: Field.types.string
                    })
                });
            });

            it('allows overwriting the default fields', function () {
                class User extends Model {}

                User.fields = {
                    id: {
                        type: Field.types.string
                    }
                };

                expect(User.fields, 'to satisfy', {
                    id: new Field({
                        name: 'id',
                        model: expect.it('to be model', User),
                        type: Field.types.string
                    })
                });

                class OtherUser extends User {}

                OtherUser.fields = {
                    id: {
                        type: Field.types.text
                    }
                };

                expect(OtherUser.fields, 'to satisfy', {
                    id: new Field({
                        name: 'id',
                        model: expect.it('to be model', OtherUser),
                        type: Field.types.text
                    })
                });
            });

            describe('when a model is subclassed', function () {
                it("updates the child's fields' model class", function () {
                    class User extends Model {}

                    User.fields = {
                        firstName: {
                            type: Field.types.string
                        }
                    };

                    expect(User.fields, 'to satisfy', {
                        id: new Field({
                            name: 'id',
                            required: true,
                            model: expect.it('to be model', User),
                            type: Field.types.integer
                        })
                    });

                    class Student extends User {}

                    Student.fields = {
                        studentId: {
                            type: 'integer'
                        }
                    };

                    expect(Student.fields, 'to satisfy', {
                        id: new Field({
                            name: 'id',
                            required: true,
                            model: expect.it('to be model', Student),
                            type: Field.types.integer
                        })
                    });
                });

                it("doesn't interfere with the parent's fields", function () {
                    expect(Model.fields, 'to exhaustively satisfy', {
                        id: new Field({
                            name: 'id',
                            model: expect.it('to be model', Model),
                            required: true,
                            type: Field.types.integer
                        }),
                        createdAt: new Field({
                            name: 'createdAt',
                            model: expect.it('to be model', Model),
                            required: true,
                            type: Field.types.dateTime,
                            default: () => new Date()
                        }),
                        updatedAt: new Field({
                            name: 'updatedAt',
                            model: expect.it('to be model', Model),
                            required: true,
                            type: Field.types.dateTime,
                            default: () => new Date()
                        })
                    });

                    class User extends Model {}

                    expect(Model.fields, 'to exhaustively satisfy', {
                        id: new Field({
                            name: 'id',
                            model: expect.it('to be model', Model),
                            required: true,
                            type: Field.types.integer
                        }),
                        createdAt: new Field({
                            name: 'createdAt',
                            model: expect.it('to be model', Model),
                            required: true,
                            type: Field.types.dateTime,
                            default: () => new Date()
                        }),
                        updatedAt: new Field({
                            name: 'updatedAt',
                            model: expect.it('to be model', Model),
                            required: true,
                            type: Field.types.dateTime,
                            default: () => new Date()
                        })
                    });

                    expect(User.fields, 'to exhaustively satisfy', {
                        id: new Field({
                            name: 'id',
                            model: expect.it('to be model', User),
                            required: true,
                            type: Field.types.integer
                        }),
                        createdAt: new Field({
                            name: 'createdAt',
                            model: expect.it('to be model', User),
                            required: true,
                            type: Field.types.dateTime,
                            default: () => new Date()
                        }),
                        updatedAt: new Field({
                            name: 'updatedAt',
                            model: expect.it('to be model', User),
                            required: true,
                            type: Field.types.dateTime,
                            default: () => new Date()
                        })
                    });

                    User.fields = {
                        firstName: {
                            type: Field.types.string
                        }
                    };

                    expect(Model.fields, 'to exhaustively satisfy', {
                        id: new Field({
                            name: 'id',
                            model: expect.it('to be model', Model),
                            required: true,
                            type: Field.types.integer
                        }),
                        createdAt: new Field({
                            name: 'createdAt',
                            model: expect.it('to be model', Model),
                            required: true,
                            type: Field.types.dateTime,
                            default: () => new Date()
                        }),
                        updatedAt: new Field({
                            name: 'updatedAt',
                            model: expect.it('to be model', Model),
                            required: true,
                            type: Field.types.dateTime,
                            default: () => new Date()
                        })
                    });

                    expect(User.fields, 'to exhaustively satisfy', {
                        id: new Field({
                            name: 'id',
                            model: expect.it('to be model', User),
                            required: true,
                            type: Field.types.integer
                        }),
                        createdAt: new Field({
                            name: 'createdAt',
                            model: expect.it('to be model', User),
                            required: true,
                            type: Field.types.dateTime,
                            default: () => new Date()
                        }),
                        updatedAt: new Field({
                            name: 'updatedAt',
                            model: expect.it('to be model', User),
                            required: true,
                            type: Field.types.dateTime,
                            default: () => new Date()
                        }),
                        firstName: new Field({
                            name: 'firstName',
                            model: expect.it('to be model', User),
                            type: Field.types.string
                        })
                    });
                });
            });
        });
    });

    describe('Model.virtuals', function () {
        describe('as a setter', function () {
            it('throws if the virtual has no getter or setter', function () {
                class User extends Model {}

                expect(
                    () => {
                        User.virtuals = {
                            firstName: {}
                        };
                    },
                    'to throw',
                    "virtual 'User.firstName' has no setter or getter"
                );
            });

            it("throws if the virtual's getter is not a function", function () {
                class User extends Model {}

                expect(
                    () => {
                        User.virtuals = {
                            firstName: {
                                get: 'foo'
                            }
                        };
                    },
                    'to throw',
                    "getter for 'User.firstName' virtual is not a function"
                );
            });

            it("throws if the virtual's setter is not a function", function () {
                class User extends Model {}

                expect(
                    () => {
                        User.virtuals = {
                            firstName: {
                                set: 'foo'
                            }
                        };
                    },
                    'to throw',
                    "setter for 'User.firstName' virtual is not a function"
                );
            });

            it("adds the passed virtuals to the model's virtuals", function () {
                class User extends Model {}

                User.virtuals = {
                    firstName: {
                        get() { return 'foo'; }
                    }
                };

                expect(User.virtuals, 'to exhaustively satisfy', {
                    firstName: {
                        get: expect.it('when called', 'to be', 'foo')
                    }
                });
            });

            it('allows overwriting the virtuals', function () {
                class User extends Model {}

                User.virtuals = {
                    firstName: {
                        get() { return 'foo'; }
                    }
                };

                expect(User.virtuals, 'to satisfy', {
                    firstName: {
                        get: expect.it('when called', 'to be', 'foo')
                    }
                });

                class OtherUser extends User {}

                OtherUser.virtuals = {
                    firstName: {
                        get() { return 'bar'; }
                    }
                };

                expect(User.virtuals, 'to exhaustively satisfy', {
                    firstName: {
                        get: expect.it('when called', 'to be', 'bar')
                    }
                });
            });

            describe('with a virtual given as a function', function () {
                it("assumes the function to be the virtual's getter", function () {
                    class User extends Model {}

                    User.virtuals = {
                        firstName() { return 'foo'; }
                    };

                    expect(User.virtuals, 'to exhaustively satisfy', {
                        firstName: {
                            get: expect.it('when called', 'to be', 'foo')
                        }
                    });
                });
            });
        });

        describe('as a getter', function () {
            it('returns the virtuals added to the model', function () {
                class User extends Model {}

                User.virtuals = {
                    firstName: {
                        get() { return 'foo'; }
                    }
                };

                expect(User.virtuals, 'to exhaustively satisfy', {
                    firstName: {
                        get: expect.it('when called', 'to be', 'foo')
                    }
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

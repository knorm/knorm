const Virtual = require('../lib/Virtual');
const Model = require('../lib/Model');
const expect = require('unexpected').clone();

describe('Virtual', function () {
    describe('constructor', function () {
        it("throws an error if the virtual's name is not provided", function () {
            expect(
                () => new Virtual(),
                'to throw',
                new Error('Virtual requires a name')
            );
        });

        it('throws an error if the model is not provided', function () {
            expect(() => new Virtual({ name: 'foo' }), 'to throw', new Error(
                "Virtual 'foo' requires a subclass of Model"
            ));
        });

        it('throws an error if the model is not a sublass of Model', function () {
            expect(
                () => new Virtual({ name: 'foo', model: {} }),
                'to throw',
                new Error("Virtual 'foo' requires a subclass of Model")
            );
        });

        it('throws an error if the virtual has no getter or setter', function () {
            class Foo extends Model {}
            expect(
                () => new Virtual({
                    name: 'bar',
                    model: Foo,
                    descriptor: {},
                }),
                'to throw',
                new Error("Virtual 'Foo.bar' has no setter or getter")
            );
        });

        it("throws an error if the virtual's getter is not a function", function () {
            class Foo extends Model {}
            expect(
                () => new Virtual({
                    name: 'bar',
                    model: Foo,
                    descriptor: { get: 'foo' },
                }),
                'to throw',
                new Error("Getter for virtual 'Foo.bar' is not a function")
            );
        });

        it("throws an error if the virtual's setter is not a function", function () {
            class Foo extends Model {}
            expect(
                () => new Virtual({
                    name: 'bar',
                    model: Foo,
                    descriptor: { set: 'foo' },
                }),
                'to throw',
                new Error("Setter for virtual 'Foo.bar' is not a function")
            );
        });

        describe('with a descriptor given as a function', function () {
            it("assumes the function to be the virtual's getter", function () {
                class Foo extends Model {}

                const virtual = new Virtual({
                    name: 'bar',
                    model: Foo,
                    descriptor: () => 'foo',
                });

                expect(virtual, 'to satisfy', {
                    get: expect.it('when called', 'to be', 'foo'),
                });
            });
        });
    });

    describe('Virtual.prototype.hasGetter', function () {
        class Foo extends Model {}

        it('returns true if the virtual was configured with a getter', function () {
            const virtual = new Virtual({
                name: 'bar',
                model: Foo,
                descriptor: { get: () => 'foo' },
            });

            expect(virtual.hasGetter(), 'to be true');
        });

        it('returns false if the virtual was not configured with a getter', function () {
            const virtual = new Virtual({
                name: 'bar',
                model: Foo,
                descriptor: { set: () => {} },
            });

            expect(virtual.hasGetter(), 'to be false');
        });
    });

    describe('Virtual.prototype.hasSetter', function () {
        class Foo extends Model {}

        it('returns true if the virtual was configured with a setter', function () {
            const virtual = new Virtual({
                name: 'bar',
                model: Foo,
                descriptor: { set: () => {} },
            });

            expect(virtual.hasSetter(), 'to be true');
        });

        it('returns false if the virtual was not configured with a setter', function () {
            const virtual = new Virtual({
                name: 'bar',
                model: Foo,
                descriptor: { get: () => {} },
            });

            expect(virtual.hasSetter(), 'to be false');
        });
    });
});

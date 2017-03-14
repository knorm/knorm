// TODO: this is a workaround for https://github.com/unexpectedjs/unexpected/issues/378
const Model = require('../../Model');
const Field = require('../../Field');
const Virtual = require('../../Virtual');

module.exports = {
    name: 'unexpected-workaround',
    installInto: expect => {
        expect.addType({
            name: 'ModelClass',
            base: 'function',
            identify: value => value && value.prototype instanceof Model,
        });

        expect.addAssertion(
            '<ModelClass> to be model class <ModelClass>',
            (expect, subject, value) => {
                return expect(subject, 'to equal', value);
            }
        );

        expect.addType({
            name: 'Field',
            base: 'object',
            identify: value => value instanceof Field,
            equal: (a, b, equal) => {
                a = Object.assign({}, a);
                b = Object.assign({}, b);

                Object.keys(a.errors).forEach(name => {
                    a.errors[name] = a.errors[name].toString();
                });
                Object.keys(b.errors).forEach(name => {
                    b.errors[name] = b.errors[name].toString();
                });

                return equal(a, b);
            },
        });

        expect.addAssertion(
            '<Field> to be field <Field>',
            (expect, subject, value) => {
                return expect(subject, 'to equal', value);
            }
        );

        expect.addType({
            name: 'Virtual',
            base: 'object',
            identify: value => value instanceof Virtual,
            equal: (a, b, equal) => {
                a = Object.assign({}, a);
                b = Object.assign({}, b);

                const stringifyGetterAndSetter = object => {
                    if (object.get) { object.get = object.get.toString(); }
                    if (object.set) { object.set = object.set.toString(); }
                };

                stringifyGetterAndSetter(a);
                stringifyGetterAndSetter(b);

                return equal(a, b);
            },
        });

        expect.addAssertion(
            '<Virtual> to be virtual <Virtual>',
            (expect, subject, value) => {
                return expect(subject, 'to equal', value);
            }
        );
    },
};

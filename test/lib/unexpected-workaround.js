// TODO: this is a workaround for https://github.com/unexpectedjs/unexpected/issues/378
const Model = require('../../lib/Model');
const Field = require('../../lib/Field');
const Virtual = require('../../lib/Virtual');

module.exports = {
  name: 'unexpected-workaround',
  installInto: expect => {
    expect.addType({
      name: 'ModelClass',
      base: 'function',
      identify: value => value && value.prototype instanceof Model
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
        return equal(a, b);
      }
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
          if (object.get) {
            object.get = object.get.toString().replace(/\s/g, '');
          }
          if (object.set) {
            object.set = object.set.toString().replace(/\s/g, '');
          }
        };

        stringifyGetterAndSetter(a);
        stringifyGetterAndSetter(b);

        return equal(a, b);
      }
    });

    expect.addAssertion(
      '<Virtual> to [exhaustively] satisfy <Virtual>',
      (expect, subject, value) => {
        return expect(subject, 'to equal', value);
      }
    );
  }
};

// TODO: this is a workaround for https://github.com/unexpectedjs/unexpected/issues/378
const Model = require('../../lib/Model');
const Field = require('../../lib/Field');

module.exports = {
  name: 'unexpected-workaround',
  installInto: expect => {
    expect.addType({
      name: 'ModelClass',
      base: 'function',
      identify: value =>
        value && typeof value === 'function' && value.prototype instanceof Model
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

    // TODO: these have nothing to do with workarounds, just for inspecting stuff
    // expect.addType({
    //   name: 'Model',
    //   base: 'function',
    //   identify: value => value instanceof Model,
    //   inspect: (model, depth, output, inspect) => {
    //     return output
    //       .jsKeyword('new')
    //       .jsFunctionName('Model')
    //       .text('(')
    //       .append(inspect(model.getData(), depth))
    //       .text(')');
    //   }
    // });

    // expect.addType({
    //   name: 'Query',
    //   base: 'function',
    //   identify: value => value instanceof Query,
    //   inspect: (query, depth, output, inspect) => {
    //     const { options, builder, builderOptions } = query;
    //     return output
    //       .jsKeyword('new')
    //       .jsFunctionName('Query')
    //       .text('(')
    //       .append(inspect({ options, builder, builderOptions }, depth))
    //       .text(')');
    //   }
    // });
  }
};

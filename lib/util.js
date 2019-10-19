const { inspect } = require('util');

const asArray = value => (Array.isArray(value) ? value : [value]);

const inspectInstance = (instance, getData, depth, options) => {
  let name = instance.constructor.name;

  if (instance.Model) {
    name = `${name}(${instance.Model.name})`;
  }

  if (options.colors) {
    name = options.stylize(name, 'special');
  }

  if (depth < 0) {
    return `${name} {}`;
  }

  const data = inspect(getData(), {
    ...options,
    depth: options.depth === null ? null : options.depth - 1
  });

  return `${name} ${data}`;
};

module.exports = { asArray, inspectInstance };

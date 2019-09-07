const { snakeCase } = require('lodash');

const fieldToColumn = knorm => {
  knorm.updateModel(
    class ModelForTests extends knorm.Model {
      static createField(config) {
        const column = snakeCase(config.name);
        return super.createField({ ...config, column });
      }
    }
  );
};

module.exports = fieldToColumn;

const knorm = require('../knorm');

class Model extends knorm.Model {}

Model.fields = {
  id: {
    type: 'integer',
    primary: true, // use `id` as a primary field
    updated: false, // do not update the `id` field when performing update operations
    methods: true // add `fetchById`, `updatedById` and `deleteById` static methods
  }
};

module.exports = Model;

const Knorm = require('../../../lib/Knorm');

const createUser = () => {
  const knorm = new Knorm();

  class User extends knorm.Model {}

  User.table = 'user';
  User.fields = { id: { column: 'id' }, name: { column: 'name' } };

  return User;
};

module.exports = createUser;

const Model = require('./Model');

class User extends Model {}

User.table = 'user';
User.fields = {
  email: {
    type: 'email', // ensure `email` is a valid email address before insert and update operations
    required: true // ensure `email` is set before insert
  },
  name: {
    type: 'string',
    required: true // ensure `name` is set before insert operations
  }
};

module.exports = User;

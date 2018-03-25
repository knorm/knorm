const Model = require('./Model');
const User = require('./User');

class Message extends Model {}

Message.fields = {
  sender: {
    type: 'integer',
    references: User.fields.id
  },
  receiver: {
    type: 'integer',
    references: User.fields.id
  },
  text: {
    type: 'text',
    required: true // ensure `text` is set before insert operations
  },
  read: {
    type: 'boolean',
    default: false // before insert operations, default `read` to `false` if not set
  }
};

module.exports = Message;

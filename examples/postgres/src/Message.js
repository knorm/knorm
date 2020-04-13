import { Model } from './Model';
import { User } from './User';

class Message extends Model {
  static table = 'message';

  static fields = {
    sender: {
      type: 'integer',
      references: User.fields.id,
    },
    receiver: {
      type: 'integer',
      references: User.fields.id,
    },
    text: {
      type: 'text',
      required: true, // ensure `text` is set before insert operations
    },
    read: {
      type: 'boolean',
      default: false, // before insert operations, default `read` to `false` if not set
    },
  };
}

export { Message };

import { Model } from './Model';
import { Message } from './Message';

class User extends Model {
  static table = 'user';

  static fields = {
    email: {
      type: 'email', // ensure `email` is a valid email address before insert and update operations
      required: true, // ensure `email` is set before insert
    },
    name: {
      type: 'string',
      required: true, // ensure `name` is set before insert operations
    },
  };

  sendMessage({ to, text }) {
    if (to instanceof User) {
      to = to.id;
    }

    const message = new Message({
      text,
      sender: this.id,
      receiver: to,
    });

    return message.insert();
  }
}

export { User };

/* eslint-disable no-console */
import { Message } from './src/Message';
import { User } from './src/User';
import { inspect } from 'util';

const runExample = async () => {
  const [foo, bar] = await User.insert([
    { name: 'Foo', email: 'foo@example.com' },
    { name: 'Bar', email: 'bar@example.com' },
  ]);

  await foo.sendMessage({ to: bar, text: 'Hi Bar!' });
  await bar.sendMessage({ to: foo, text: 'Oh hey Foo!' });
  await foo.sendMessage({ to: bar, text: "How's it going?" });
  await bar.sendMessage({ to: foo, text: 'Pretty well, how about you?' });
  await foo.sendMessage({ to: bar, text: 'Same here!' });

  console.log();
  console.log('users:');
  console.log(await User.fetch());

  console.log();
  console.log('messages:');
  console.log(await Message.fetch());

  console.log();
  console.log('users with received messages:');
  console.log(
    inspect(
      await User.fetch({
        leftJoin: Message.query.on('receiver').as('receivedMessages'),
      }),
      { depth: null }
    )
  );

  console.log();
  console.log('users with sent messages:');
  console.log(
    inspect(
      await User.fetch({
        leftJoin: Message.query.on('sender').as('sentMessages'),
      }),
      { depth: null }
    )
  );

  await Message.delete();
  await User.delete();
};

runExample().catch(console.log).then(process.exit);

/* eslint-disable no-console */
const User = require('./lib/User');
const Message = require('./lib/Message');
const { inspect } = require('util');

const runExample = async () => {
  const [foo, bar] = await User.insert([
    { name: 'Foo', email: 'foo@example.com' },
    { name: 'Bar', email: 'bar@example.com' }
  ]);

  await foo.sendMessage({ to: bar, text: 'Hi Bar!' });
  await bar.sendMessage({ to: foo, text: 'Oh hey Foo!' });
  await foo.sendMessage({ to: bar, text: "How's it going?" });
  await bar.sendMessage({ to: foo, text: 'Pretty well, how about you?' });
  await foo.sendMessage({ to: bar, text: 'Same here!' });

  console.log('\nusers:\n', await User.fetch());
  console.log('\nmessages:\n', await Message.fetch());
  console.log(
    '\nusers with received messages:\n',
    inspect(
      await User.fetch({
        leftJoin: Message.query.on('receiver').as('receivedMessages')
      }),
      { depth: null }
    )
  );
  console.log(
    '\nusers with sent messages:\n',
    inspect(
      await User.fetch({
        leftJoin: Message.query.on('sender').as('sentMessages')
      }),
      { depth: null }
    )
  );

  await Message.delete();
  await User.delete();
};

runExample()
  .catch(console.log)
  .then(process.exit);

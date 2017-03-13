class User {}
class Transaction {}

module.exports = async () => {
    return new Transaction(async transaction => {
        const users = await User.query
            // .all()
            // .first()
            .where({ id: 1 })
            .require()
            // .with(Image, {
            //     require: true,
            //     where: { public: true }
            // })
            .with([
                Image.query
                    .as('publicImage')
                    .on(Image.fields.userId)
                    .where({ public: true })
                    .require(),
                Image.query
                    .as('privateImage')
                    .on(Image.fields.userId)
                    .where({ public: false })
            ])
            .transaction(transaction, { forUpdate: true })
            .fetch();

        // const userQuery = new Query(User);
        // const imageQuery = new Query(Image);
        //
        // const users = await userQuery
        //     .all()
        //     .first()
        //     .require()
        //     .where({ id: 1 })
        //     .with(
        //         imageQuery
        //             .require()
        //             .where({ public: true })
        //     )
        //     .transaction(transaction, { forUpdate: true })
        //     .fetch();

        // const users = await User.fetch({
        //     all: true,
        //     require: true,
        //     first: true,
        //     with: {
        //         Image: {
        //             require: true,
        //             where: { public: true }
        //         }
        //     },
        //     transaction: {
        //         transaction,
        //         forUpdate: true
        //     }
        // });

        users.forEach(user => {
            user.accesses += 1;
        });

        return User.query
            .require()
            .transaction(transaction)
            .save(users);

        // return User.save(users, { transaction, require: true })
    });
};

module.exports = {
    name: 'unexpected-error',
    installInto: expect => {
        expect.addAssertion(
            '<function> to be an error named <string>',
            (expect, TheError, name) => {
                expect(TheError.name, 'to be', name);
                expect(new TheError().name, 'to be', name);
            }
        );

        expect.addAssertion(
            '<Error> to be an error instance of <string>',
            (expect, error, name) => {
                expect(error.name, 'to be', name);
                expect(error.constructor.name, 'to be', name);
            }
        );

        expect.addAssertion(
            '<function> to be an error that extends <Error>',
            (expect, TheError, TheParent) => {
                return expect(TheError.prototype, 'to be an', TheParent);
            }
        );
    },
};

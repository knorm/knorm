// TODO: this is a workaround for https://github.com/unexpectedjs/unexpected/issues/378
module.exports = {
    name: 'unexpected-unexpected-bug',
    installInto: expect => {
        expect.addAssertion(
            '<function> to be model <function>',
            (expect, subject, value) => {
                return expect(subject, 'to equal', value);
            }
        );

        expect.addAssertion(
            '<object> to be field <object>',
            (expect, subject, value) => {
                subject.errors = undefined;
                value.errors = undefined;
                return expect(subject, 'to equal', value);
            }
        );

        expect.addAssertion(
            '<object> to be virtual <object>',
            (expect, subject, value) => {
                if (subject.get) { subject.get = subject.get.toString(); }
                if (subject.set) { subject.set = subject.set.toString(); }
                if (value.get) { value.get = value.get.toString(); }
                if (value.set) { value.set = value.set.toString(); }
                return expect(subject, 'to equal', value);
            }
        );
    },
};

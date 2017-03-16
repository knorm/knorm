#!/usr/bin/env node

const { exec } = require('shelljs');

const findContainer = (name) => new Promise(function (resolve, reject) {
    exec(
        `docker ps -a --filter name=${name} --format "{{.ID}} {{.Status}}"`,
        { silent: true },
        (code, stdout, stderr) => {
            if (code !== 0) {
                return reject(new Error(`Could not find container: ${stderr}`));
            }

            const output = stdout.trim();
            if (!output) {
                return resolve();
            }

            const idAndStatus = output.split(' ');
            resolve({
                id: idAndStatus[0],
                status: idAndStatus[1],
            });
        }
    );
});

const stopContainer = (container) => new Promise(function (resolve, reject) {
    const { id, status } = container;

    if (status.startsWith('Exited')) {
        return resolve(container);
    }

    exec(
        `docker stop ${id}`,
        { silent: true },
        (code, stdout, stderr) => {
            if (code !== 0) {
                return reject(
                    new Error(`Could not stop container ${id}: ${stderr}`)
                );
            }

            container.status = 'Exited';
            return resolve(container);
        }
    );
});

const removeContainer = (container) => new Promise(function (resolve, reject) {
    const { id, status } = container;

    if (status === 'Removed') {
        return resolve(container);
    }

    exec(
        `docker rm -f ${id}`,
        { silent: true },
        (code, stdout, stderr) => {
            if (code !== 0) {
                return reject(
                    new Error(`Could not remove container ${id}: ${stderr}`)
                );
            }

            container.status = 'Removed';
            return resolve(container);
        }
    );
});

const startContainer = (container) => new Promise(function (resolve, reject) {
    const { id, status } = container;

    if (status.startsWith('Up')) {
        return resolve(container);
    }

    exec(
        `docker start ${id}`,
        { silent: true },
        (code, stdout, stderr) => {
            if (code !== 0) {
                return reject(
                    new Error(`Could not start container ${id}: ${stderr}`)
                );
            }

            container.status = 'Up';
            resolve(container);
        }
    );
});

const createContainer = (name, port) => new Promise(function (resolve, reject) {
    let env = [];

    const user = process.env.POSTGRES_USER;
    if (user) {
        env.push(`POSTGRES_USER=${user}`);
    }

    const db = process.env.POSTGRES_DB;
    if (db) {
        env.push(`POSTGRES_DB=${db}`);
    }

    const password = process.env.POSTGRES_PASSWORD;
    if (password) {
        env.push(`POSTGRES_PASSWORD=${password}`);
    }

    if (env.length) {
        env = `-e ${env.join(' -e ')}`;
    } else {
        env = '';
    }

    name = `--name ${name}`;
    port = `-p ${port}:5432`;

    exec(
        `docker run -d ${name} ${port} ${env} postgres`,
        { silent: true },
        (code, stdout, stderr) => {
            if (code !== 0) {
                return reject(
                    new Error(`Could not create container ${name}: ${stderr}`)
                );
            }

            resolve({
                id: stdout.trim(),
                status: 'Up',
            });
        }
    );
});

require('yargs')
    .usage('$0 <cmd> [args]')
    .command(
        'start',
        `Start the postgres container. The env variables POSTGRES_DB,
        POSTGRES_USER and POSTGRES_PASSWORD can be configured as normal
        environment variables.`,
        /* eslint-disable indent */
        // because of this bug https://github.com/eslint/eslint/issues/3493
        {
            name: {
                alias: 'n',
                default: 'knex-orm-postgres',
                describe: 'The name of the postgres container',
            },
            port: {
                alias: 'p',
                default: 5432,
                describe: 'The port number to bind to on your machine',
            },
        },
        /* eslint-enable indent */
        argv => {
            const port = argv.port;
            const name = argv.name;

            findContainer(name)
                .then(container => {
                    if (!container) {
                        // eslint-disable-next-line no-console
                        console.log('Creating new container');
                        return createContainer(name, port);
                    }
                    if (container.status.startsWith('Up')) {
                        return container;
                    }
                    // eslint-disable-next-line no-console
                    console.log('Starting container', container);
                    return startContainer(container);
                })
                .then(container => {
                    // eslint-disable-next-line no-console
                    console.log('Container running', container);
                    process.exit(0);
                })
                .catch(error => {
                    // eslint-disable-next-line no-console
                    console.log(error);
                    process.exit(1);
                });
        }
    )
    .command(
        'stop',
        'Stop the postgres container',
        /* eslint-disable indent */
        // because of this bug https://github.com/eslint/eslint/issues/3493
        {
            name: {
                alias: 'n',
                default: 'knex-orm-postgres',
                describe: 'The name of the postgres container',
            },
        },
        /* eslint-enable indent */
        (argv) => {
            const name = argv.name;

            findContainer(name)
                .then(container => {
                    if (!container) {
                        // eslint-disable-next-line no-console
                        console.log('No container found');
                    }
                    if (container.status.startsWith('Exited')) {
                        return container;
                    }
                    // eslint-disable-next-line no-console
                    console.log('Stopping container', container);
                    return stopContainer(container);
                })
                .then(container => {
                    // eslint-disable-next-line no-console
                    console.log('Container stopped', container);
                    process.exit(0);
                })
                .catch(error => {
                    // eslint-disable-next-line no-console
                    console.log(error);
                    process.exit(1);
                });
        }
    )
    .command(
        'remove',
        'Remove the postgres container',
        /* eslint-disable indent */
        // because of this bug https://github.com/eslint/eslint/issues/3493
        {
            name: {
                alias: 'n',
                default: 'knex-orm-postgres',
                describe: 'The name of the postgres container',
            },
        },
        /* eslint-enable indent */
        (argv) => {
            const name = argv.name;

            findContainer(name)
                .then(container => {
                    if (!container) {
                        // eslint-disable-next-line no-console
                        console.log('No container found');
                    }
                    if (container.status.startsWith('Removed')) {
                        return container;
                    }
                    // eslint-disable-next-line no-console
                    console.log('Removing container', container);
                    return removeContainer(container);
                })
                .then(container => {
                    // eslint-disable-next-line no-console
                    console.log('Container removed', container);
                    process.exit(0);
                })
                .catch(error => {
                    // eslint-disable-next-line no-console
                    console.log(error);
                    process.exit(1);
                });
        }
    )
    .demandCommand()
    .help()
    .argv;

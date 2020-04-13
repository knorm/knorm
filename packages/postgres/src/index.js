import { KnormPostgres } from './KnormPostgres';

const knormPostgres = (config) => new KnormPostgres(config);

export { knormPostgres, KnormPostgres };

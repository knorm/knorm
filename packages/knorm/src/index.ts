import { Knorm, Config } from './Knorm';

const knorm = (config: Config): Knorm => new Knorm(config);

export { knorm, Knorm };

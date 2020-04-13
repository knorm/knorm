import { knorm } from '@knorm/knorm';
import { knormTimestamps } from '@knorm/timestamps';
import { knormPostgres } from '@knorm/postgres';
import { knormRelations } from '@knorm/relations';
import { connection } from '../knexfile';

const orm = knorm()
  .use(knormPostgres({ connection }))
  .use(knormRelations())
  .use(knormTimestamps());

export { orm };

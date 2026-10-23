import * as migration_20261007_144449_initial from './20261007_144449_initial';
import * as migration_20261011_170000_site_legal_note from './20261011_170000_site_legal_note';
import * as migration_20261016_160000_neutral_home_copy from './20261016_160000_neutral_home_copy';
import * as migration_20261016_171048_rename_plan_barrio from './20261016_171048_rename_plan_barrio';
import * as migration_20261023_161732_brand_sites from './20261023_161732_brand_sites';

export const migrations = [
  {
    up: migration_20261007_144449_initial.up,
    down: migration_20261007_144449_initial.down,
    name: '20261007_144449_initial',
  },
  {
    up: migration_20261011_170000_site_legal_note.up,
    down: migration_20261011_170000_site_legal_note.down,
    name: '20261011_170000_site_legal_note',
  },
  {
    up: migration_20261016_160000_neutral_home_copy.up,
    down: migration_20261016_160000_neutral_home_copy.down,
    name: '20261016_160000_neutral_home_copy',
  },
  {
    up: migration_20261016_171048_rename_plan_barrio.up,
    down: migration_20261016_171048_rename_plan_barrio.down,
    name: '20261016_171048_rename_plan_barrio',
  },
  {
    up: migration_20261023_161732_brand_sites.up,
    down: migration_20261023_161732_brand_sites.down,
    name: '20261023_161732_brand_sites'
  },
];

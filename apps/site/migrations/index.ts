import * as migration_20261007_144449_initial from './20261007_144449_initial';
import * as migration_20261011_170000_site_legal_note from './20261011_170000_site_legal_note';
import * as migration_20261016_160000_neutral_home_copy from './20261016_160000_neutral_home_copy';

export const migrations = [
  {
    up: migration_20261007_144449_initial.up,
    down: migration_20261007_144449_initial.down,
    name: '20261007_144449_initial'
  },
  {
    up: migration_20261011_170000_site_legal_note.up,
    down: migration_20261011_170000_site_legal_note.down,
    name: '20261011_170000_site_legal_note'
  },
  {
    up: migration_20261016_160000_neutral_home_copy.up,
    down: migration_20261016_160000_neutral_home_copy.down,
    name: '20261016_160000_neutral_home_copy'
  },
];

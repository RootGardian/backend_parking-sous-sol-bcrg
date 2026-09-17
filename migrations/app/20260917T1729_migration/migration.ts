#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/09caa40e1b6aa5974174ad47da9db14d7fedc8172b6918c3b13b3ddb2447a24e/contract';
import startContract from '../../snapshots/09caa40e1b6aa5974174ad47da9db14d7fedc8172b6918c3b13b3ddb2447a24e/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/77464d1786258851748131096cf8e52c38e6460c22d5a9678b2ecba7f8bc90f4/contract';
import endContract from '../../snapshots/77464d1786258851748131096cf8e52c38e6460c22d5a9678b2ecba7f8bc90f4/contract.json' with { type: 'json' };
import { Migration, MigrationCLI } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addUnique({
        schema: 'public',
        table: 'vehicule',
        constraint: 'vehicule_numero_plaque_key',
        columns: ['numero_plaque'],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);

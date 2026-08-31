#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/1f4e55949bfd90508eab2b5d059890cef067ca5c4628e156e3ae836a05dddec7/contract';
import startContract from '../../snapshots/1f4e55949bfd90508eab2b5d059890cef067ca5c4628e156e3ae836a05dddec7/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/d4b765a1e48967f3e67627d2964a7efe5369db15fc1e99ce762aa75a44770067/contract';
import endContract from '../../snapshots/d4b765a1e48967f3e67627d2964a7efe5369db15fc1e99ce762aa75a44770067/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations(): any[] {
    return [
      this.addColumn({
        schema: 'public',
        table: 'mouvement',
        column: col('id_personnel', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'vehicule',
        column: col('couleur', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'vehicule',
        column: col('marque', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'vehicule',
        column: col('nom_proprietaire_externe', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'vehicule',
        column: col('type', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'vehicule',
        constraint: 'vehicule_type_check_a56d25b9',
        expression: "\"type\" IN ('personnel', 'visiteur')",
      }),
      this.createIndex({
        schema: 'public',
        table: 'mouvement',
        index: 'mouvement_id_personnel_idx_a5410273',
        columns: ['id_personnel'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'mouvement',
        foreignKey: {
          name: 'mouvement_id_personnel_fkey',
          columns: ['id_personnel'],
          references: { schema: 'public', table: 'personnel', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);

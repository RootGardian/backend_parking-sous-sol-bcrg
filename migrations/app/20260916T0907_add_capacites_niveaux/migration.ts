#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/09caa40e1b6aa5974174ad47da9db14d7fedc8172b6918c3b13b3ddb2447a24e/contract';
import endContract from '../../snapshots/09caa40e1b6aa5974174ad47da9db14d7fedc8172b6918c3b13b3ddb2447a24e/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/d4b765a1e48967f3e67627d2964a7efe5369db15fc1e99ce762aa75a44770067/contract';
import startContract from '../../snapshots/d4b765a1e48967f3e67627d2964a7efe5369db15fc1e99ce762aa75a44770067/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, lit, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.dropCheckConstraint({
        schema: 'public',
        table: 'personnel',
        constraint: 'personnel_fonction_check_b79d7c5e',
      }),
      this.dropCheckConstraint({
        schema: 'public',
        table: 'personnel',
        constraint: 'personnel_fonction_elem_not_null_0cf07a9d',
      }),
      this.dropColumn({ schema: 'public', table: 'personnel', column: 'fonction' }),
      this.dropCheckConstraint({
        schema: 'public',
        table: 'utilisateur',
        constraint: 'utilisateur_role_check_1f369a6a',
      }),
      this.createTable({
        schema: 'public',
        table: 'fonction',
        columns: [
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('nom', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'parking',
        columns: [
          col('adresse', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('capacite_maximale', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('capacites_niveaux', 'json', { codecRef: { codecId: 'pg/json@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('nom', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('nombre_niveaux', 'int4', { default: lit(0), codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'placeParking',
        columns: [
          col('est_occupee', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('est_visiteur', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('id_fonction', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('id_parking', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('niveau', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('numero', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addColumn({
        schema: 'public',
        table: 'agent',
        column: col('id_parking', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'mouvement',
        column: col('id_parking', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'mouvement',
        column: col('id_place_parking', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'personnel',
        column: col('id_fonction', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'utilisateur',
        column: col('doit_changer_mdp', 'bool', {
          notNull: true,
          default: lit(true),
          codecRef: { codecId: 'pg/bool@1' },
        }),
      }),
      this.addUnique({
        schema: 'public',
        table: 'fonction',
        constraint: 'fonction_nom_key',
        columns: ['nom'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'parking',
        constraint: 'parking_nom_key',
        columns: ['nom'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'placeParking',
        constraint: 'placeParking_numero_key',
        columns: ['numero'],
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'utilisateur',
        constraint: 'utilisateur_role_check_a08fc5ae',
        expression:
          "\"role\"::text[] <@ ARRAY['agent', 'admin', 'supervision', 'personnel']::text[]",
      }),
      this.createIndex({
        schema: 'public',
        table: 'agent',
        index: 'agent_id_parking_idx_ce2e1439',
        columns: ['id_parking'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'mouvement',
        index: 'mouvement_heure_arrivee_heure_depart_idx_e11d7a01',
        columns: ['heure_arrivee', 'heure_depart'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'mouvement',
        index: 'mouvement_heure_arrivee_idx_dfafe33c',
        columns: ['heure_arrivee'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'mouvement',
        index: 'mouvement_heure_depart_idx_88090300',
        columns: ['heure_depart'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'mouvement',
        index: 'mouvement_id_parking_idx_ce2e1439',
        columns: ['id_parking'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'mouvement',
        index: 'mouvement_id_place_parking_idx_816093ee',
        columns: ['id_place_parking'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'mouvement',
        index: 'mouvement_statut_idx_9bf78e02',
        columns: ['statut'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'personnel',
        index: 'personnel_id_fonction_idx_5a743782',
        columns: ['id_fonction'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'placeParking',
        index: 'placeParking_id_fonction_idx_5a743782',
        columns: ['id_fonction'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'placeParking',
        index: 'placeParking_id_parking_idx_ce2e1439',
        columns: ['id_parking'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'agent',
        foreignKey: {
          name: 'agent_id_parking_fkey',
          columns: ['id_parking'],
          references: { schema: 'public', table: 'parking', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'mouvement',
        foreignKey: {
          name: 'mouvement_id_parking_fkey',
          columns: ['id_parking'],
          references: { schema: 'public', table: 'parking', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'personnel',
        foreignKey: {
          name: 'personnel_id_fonction_fkey',
          columns: ['id_fonction'],
          references: { schema: 'public', table: 'fonction', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'placeParking',
        foreignKey: {
          name: 'placeParking_id_parking_fkey',
          columns: ['id_parking'],
          references: { schema: 'public', table: 'parking', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'placeParking',
        foreignKey: {
          name: 'placeParking_id_fonction_fkey',
          columns: ['id_fonction'],
          references: { schema: 'public', table: 'fonction', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'mouvement',
        foreignKey: {
          name: 'mouvement_id_place_parking_fkey',
          columns: ['id_place_parking'],
          references: { schema: 'public', table: 'placeParking', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);

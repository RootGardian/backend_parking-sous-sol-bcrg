#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/1f4e55949bfd90508eab2b5d059890cef067ca5c4628e156e3ae836a05dddec7/contract';
import endContract from '../../snapshots/1f4e55949bfd90508eab2b5d059890cef067ca5c4628e156e3ae836a05dddec7/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  checkExpression,
  col,
  primaryKey,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<never, End> {
  override readonly endContractJson = endContract;

  override get operations(): any[] {
    return [
      this.createSchema({ schema: 'public' }),
      this.createTable({
        schema: 'public',
        table: 'agent',
        columns: [
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('id_utilisateur', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'auditLog',
        columns: [
          col('action', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('cible', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('date_action', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('details', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('id_utilisateur', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'mouvement',
        columns: [
          col('heure_arrivee', 'timestamptz', {
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('heure_depart', 'timestamptz', {
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('id_agent', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('id_personnel_visite', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('id_vehicule', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('observation', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('statut', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('type_entree', 'text', { codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'mouvement_statut_check_5286ff7e',
            "\"statut\" IN ('sur_site', 'hors_site')",
          ),
          checkExpression(
            'mouvement_type_entree_check_e8b11c1d',
            "\"type_entree\" IN ('personnel', 'visiteur')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'personnel',
        columns: [
          col('fonction', 'text[]', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1', many: true },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('id_utilisateur', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('qr_code', 'text', { codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'personnel_fonction_check_b79d7c5e',
            "\"fonction\"::text[] <@ ARRAY['Gouverneur', '1er Vice-Gouverneur', '2e Vice-Gouverneur', 'Auditeur Général', 'Conseillers', 'Assistant Gouv.', 'Cellule COM', 'C. Déontologie', 'C. Audit Inform.', 'C. Conformité', 'DAI', 'DSR', 'DGSIF', 'DSB', 'DSA', 'DSIFI', 'DGES', 'DER', 'DSBP', 'DDA', 'DRI', 'DGCC', 'D. Crédit', 'DOC', 'D. M. Préc.', 'DCSMC', 'DGASJ', 'DAJ/D', 'DRH', 'DPRC', 'DL', 'DMI', 'DGE', 'D. émission', 'D. Caisse Centrale', 'DGR Paiement', 'D. Réseau', 'DGCP', 'DSPP', 'D. C. Interne', 'DGFI', 'D. Comptabilité', 'D. Budget/Planif', 'DSI']::text[]",
          ),
          checkExpression(
            'personnel_fonction_elem_not_null_0cf07a9d',
            'array_position("fonction", NULL) IS NULL',
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'utilisateur',
        columns: [
          col('est_actif', 'bool', { codecRef: { codecId: 'pg/bool@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('matricule', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('mot_de_passe', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('nom', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('prenom', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('role', 'text[]', { notNull: true, codecRef: { codecId: 'pg/text@1', many: true } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'utilisateur_role_check_1f369a6a',
            "\"role\"::text[] <@ ARRAY['agent', 'admin', 'superviseur']::text[]",
          ),
          checkExpression(
            'utilisateur_role_elem_not_null_11b195b8',
            'array_position("role", NULL) IS NULL',
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'vehicule',
        columns: [
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('id_personnel', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('numero_plaque', 'text', { codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'agent',
        constraint: 'agent_id_utilisateur_key',
        columns: ['id_utilisateur'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'personnel',
        constraint: 'personnel_id_utilisateur_key',
        columns: ['id_utilisateur'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'utilisateur',
        constraint: 'utilisateur_matricule_key',
        columns: ['matricule'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'auditLog',
        index: 'auditLog_id_utilisateur_idx_31c97451',
        columns: ['id_utilisateur'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'mouvement',
        index: 'mouvement_id_agent_idx_a3cd4e63',
        columns: ['id_agent'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'mouvement',
        index: 'mouvement_id_personnel_visite_idx_c52a9bb4',
        columns: ['id_personnel_visite'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'mouvement',
        index: 'mouvement_id_vehicule_idx_0338d4ea',
        columns: ['id_vehicule'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'vehicule',
        index: 'vehicule_id_personnel_idx_a5410273',
        columns: ['id_personnel'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'agent',
        foreignKey: {
          name: 'agent_id_utilisateur_fkey',
          columns: ['id_utilisateur'],
          references: { schema: 'public', table: 'utilisateur', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'auditLog',
        foreignKey: {
          name: 'auditLog_id_utilisateur_fkey',
          columns: ['id_utilisateur'],
          references: { schema: 'public', table: 'utilisateur', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'mouvement',
        foreignKey: {
          name: 'mouvement_id_vehicule_fkey',
          columns: ['id_vehicule'],
          references: { schema: 'public', table: 'vehicule', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'mouvement',
        foreignKey: {
          name: 'mouvement_id_agent_fkey',
          columns: ['id_agent'],
          references: { schema: 'public', table: 'agent', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'mouvement',
        foreignKey: {
          name: 'mouvement_id_personnel_visite_fkey',
          columns: ['id_personnel_visite'],
          references: { schema: 'public', table: 'personnel', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'personnel',
        foreignKey: {
          name: 'personnel_id_utilisateur_fkey',
          columns: ['id_utilisateur'],
          references: { schema: 'public', table: 'utilisateur', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'vehicule',
        foreignKey: {
          name: 'vehicule_id_personnel_fkey',
          columns: ['id_personnel'],
          references: { schema: 'public', table: 'personnel', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);

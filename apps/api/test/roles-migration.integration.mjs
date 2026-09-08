// Ejecutar únicamente contra PostgreSQL local de pruebas:
// COMERCIA_TEST_DATABASE_URL=... node apps/api/test/roles-migration.integration.mjs
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import pg from 'pg';

const connectionString = process.env.COMERCIA_TEST_DATABASE_URL;
if (
  !connectionString ||
  !['127.0.0.1', 'localhost'].includes(new URL(connectionString).hostname)
) {
  throw new Error(
    'COMERCIA_TEST_DATABASE_URL debe apuntar a PostgreSQL local de pruebas',
  );
}
const client = new pg.Client({ connectionString });
const migration = await readFile(
  new URL(
    '../prisma/migrations/20260908120000_roles_por_empresa/migration.sql',
    import.meta.url,
  ),
  'utf8',
);
await client.connect();
try {
  for (const escenario of [
    'compartidos',
    'vacio',
    'sin_empresa',
    'permiso_invalido',
  ]) {
    const schema = `roles_test_${escenario}_${Date.now()}`;
    await client.query(`CREATE SCHEMA ${schema}; SET search_path TO ${schema}`);
    try {
      await client.query(`
        CREATE TABLE empresas (id SERIAL PRIMARY KEY, nombre TEXT NOT NULL);
        CREATE TABLE roles (id SERIAL PRIMARY KEY, descripcion TEXT NOT NULL, roles_id INT,
          CONSTRAINT roles_roles_id_fkey FOREIGN KEY (roles_id) REFERENCES roles(id));
        CREATE UNIQUE INDEX roles_descripcion_key ON roles(descripcion);
        CREATE TABLE usuarios (id SERIAL PRIMARY KEY, empresa_id INT NOT NULL REFERENCES empresas(id), rol_id INT,
          CONSTRAINT usuarios_rol_id_fkey FOREIGN KEY (rol_id) REFERENCES roles(id));
        CREATE TABLE empresa_modulos (id SERIAL PRIMARY KEY, empresa_id INT REFERENCES empresas(id), rol_ids INT[] NOT NULL DEFAULT '{}');
        CREATE TABLE empresa_paginas (id SERIAL PRIMARY KEY, empresa_id INT REFERENCES empresas(id), rol_ids INT[] NOT NULL DEFAULT '{}');
      `);
      if (escenario !== 'vacio') {
        // IDs importados manualmente: prueba también la sincronización de secuencias.
        await client.query(
          "INSERT INTO roles VALUES (10, 'Gerente', NULL), (20, 'Supervisor', 10), (30, 'Sin usuarios', NULL)",
        );
      }
      if (escenario === 'compartidos' || escenario === 'permiso_invalido') {
        await client.query(`
          INSERT INTO empresas VALUES (7, 'Empresa A'), (42, 'Empresa B');
          INSERT INTO usuarios(empresa_id, rol_id) VALUES (7, 10), (7, 20), (42, 10), (42, 20), (42, NULL);
          INSERT INTO empresa_modulos(empresa_id, rol_ids) VALUES (7, '{10,20}'), (42, '{20,10}'), (42, '{}');
          INSERT INTO empresa_paginas(empresa_id, rol_ids) VALUES (7, '{20}'), (42, '{10}');
        `);
      }
      if (escenario === 'permiso_invalido') {
        await client.query(
          "UPDATE empresa_modulos SET rol_ids = '{999}' WHERE id = 1",
        );
      }
      if (escenario === 'sin_empresa' || escenario === 'permiso_invalido') {
        await assert.rejects(client.query(migration));
        await client.query('ROLLBACK');
        assert.equal(
          (await client.query('SELECT COUNT(*)::int AS n FROM roles')).rows[0]
            .n,
          3,
        );
      } else {
        await client.query(migration);
        if (escenario === 'compartidos') {
          const roles = (await client.query('SELECT * FROM roles ORDER BY id'))
            .rows;
          assert.equal(roles.length, 6);
          assert.equal(roles.find((r) => r.id === 10).empresa_id, 7);
          const gerenteB = roles.find(
            (r) => r.empresa_id === 42 && r.descripcion === 'Gerente',
          );
          const supervisorB = roles.find(
            (r) => r.empresa_id === 42 && r.descripcion === 'Supervisor',
          );
          assert.equal(supervisorB.roles_id, gerenteB.id);
          assert.equal(
            (
              await client.query(
                'SELECT COUNT(*)::int AS n FROM usuarios u JOIN roles r ON r.id = u.rol_id WHERE r.empresa_id <> u.empresa_id',
              )
            ).rows[0].n,
            0,
          );
          assert.deepEqual(
            (
              await client.query(
                'SELECT rol_ids FROM empresa_modulos WHERE id = 2',
              )
            ).rows[0].rol_ids,
            [supervisorB.id, gerenteB.id],
          );
          assert.deepEqual(
            (
              await client.query(
                'SELECT rol_ids FROM empresa_modulos WHERE id = 3',
              )
            ).rows[0].rol_ids,
            [],
          );
          assert.deepEqual(
            (
              await client.query(
                'SELECT rol_ids FROM empresa_paginas WHERE id = 2',
              )
            ).rows[0].rol_ids,
            [gerenteB.id],
          );
          await assert.rejects(
            client.query(
              "INSERT INTO roles(descripcion, empresa_id) VALUES ('Gerente', 42)",
            ),
            { code: '23505' },
          );
          await assert.rejects(
            client.query(
              'UPDATE usuarios SET rol_id = 10 WHERE empresa_id = 42',
            ),
            { code: '23503' },
          );
          await assert.rejects(
            client.query(
              'UPDATE roles SET roles_id = 10 WHERE empresa_id = 42',
            ),
            { code: '23503' },
          );
          const nuevo = (
            await client.query(
              "INSERT INTO roles(descripcion, empresa_id) VALUES ('Nuevo', 42) RETURNING id",
            )
          ).rows[0];
          assert.ok(nuevo.id > Math.max(...roles.map((r) => r.id)));
        } else {
          assert.equal(
            (await client.query('SELECT COUNT(*)::int AS n FROM roles')).rows[0]
              .n,
            0,
          );
        }
      }
      console.log(`OK: migración ${escenario}`);
    } finally {
      await client.query(
        `ROLLBACK; SET search_path TO public; DROP SCHEMA ${schema} CASCADE`,
      );
    }
  }
} finally {
  await client.end();
}

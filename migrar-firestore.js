/**
 * Script de migración Firestore
 * De: padel-depredadores-app → A: padelhub-d839d
 *
 * Requisitos:
 *   npm install firebase-admin
 *
 * Uso:
 *   1. Descarga las dos service account keys desde Firebase Console de cada proyecto
 *      (Configuración del proyecto → Cuentas de servicio → Generar nueva clave privada)
 *   2. Guárdalas como:
 *      - origen-key.json  (padel-depredadores-app)
 *      - destino-key.json (padelhub-d839d)
 *   3. Pon ambos archivos en la misma carpeta que este script
 *   4. node migrar-firestore.js
 */

const admin = require('firebase-admin');

const origenKey  = require('./origen-key.json');
const destinoKey = require('./destino-key.json');

// Inicializar ambas apps
const appOrigen = admin.initializeApp({
  credential: admin.credential.cert(origenKey)
}, 'origen');

const appDestino = admin.initializeApp({
  credential: admin.credential.cert(destinoKey)
}, 'destino');

const dbOrigen  = admin.firestore(appOrigen);
const dbDestino = admin.firestore(appDestino);

// Colecciones a migrar (se omite _authlog porque son logs de debug)
const COLECCIONES = ['users', 'clubes', 'comentarios', 'config', 'notificaciones'];

async function migrarColeccion(nombre) {
  console.log(`\n→ Migrando colección: ${nombre}`);
  const snap = await dbOrigen.collection(nombre).get();

  if (snap.empty) {
    console.log(`  (vacía, se omite)`);
    return;
  }

  let count = 0;
  const batch = dbDestino.batch();

  snap.forEach(doc => {
    const ref = dbDestino.collection(nombre).doc(doc.id);
    batch.set(ref, doc.data());
    count++;
  });

  await batch.commit();
  console.log(`  ✓ ${count} documento(s) copiado(s)`);
}

async function main() {
  console.log('=== Migración Firestore ===');
  console.log('Origen:  padel-depredadores-app');
  console.log('Destino: padelhub-d839d');

  for (const col of COLECCIONES) {
    await migrarColeccion(col);
  }

  console.log('\n✅ Migración completa.');
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});

// scripts/hash-password.js
// Genera el hash scrypt de una contraseña para poblar la variable USERS.
//
// Uso:
//   node scripts/hash-password.js "laContraseñaDelAsesor"
//
// Copia el hash resultante al campo "hash" del asesor dentro del JSON de
// USERS. Nunca guardes la contraseña en texto plano en ningún lado.

import { hashPassword } from '../api/_lib/auth.js';

const password = process.argv[2];

if (!password) {
  console.error('Uso: node scripts/hash-password.js "contraseña"');
  process.exit(1);
}

console.log(hashPassword(password));

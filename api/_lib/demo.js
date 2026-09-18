// api/_lib/demo.js
// Respuestas SIMULADAS del certificador para el modo demo. Imitan la forma de
// las respuestas reales lo suficiente para que el frontend recorra todo el
// flujo, pero NUNCA tocan la API real ni enrolan clientes de verdad.

function tokenFalso(prefijo) {
  return 'DEMO-' + Buffer.from(String(prefijo)).toString('hex').slice(0, 24).toUpperCase();
}

export function demoRegistroEmisor({ nit, alias }) {
  return {
    resultado: true,
    mensaje: 'Emisor registrado correctamente (DEMO).',
    emisor: { nit, prefijo: alias, alias },
  };
}

export function demoDatosEmisor({ prefijo }) {
  return {
    resultado: true,
    emisor: {
      prefijo,
      llave: 'DEMO-LLAVE-' + tokenFalso(prefijo).slice(5, 17),
      estado: 'Activo',
      firma: {
        resultado: true,
        descripcion: {
          token_firma: tokenFalso(prefijo),
          fecha_vencimiento: '2027-12-31',
        },
      },
    },
  };
}

export function demoFirma({ alias }) {
  return {
    resultado: true,
    mensaje: 'Certificado de firma registrado (DEMO).',
    token_firma: tokenFalso(alias),
    fecha_vencimiento: '2027-12-31',
  };
}

export function demoEstablecimientos({ nit }) {
  return {
    resultado: true,
    establecimientos: [
      { codigo: '1', nombre: 'Establecimiento Matriz (DEMO)', direccion: 'Ciudad de Guatemala', nit },
    ],
  };
}

export function demoFrases() {
  return {
    resultado: true,
    frases: [
      { tipo_frase: '1', codigo_escenario: '1', texto: 'Sujeto a pagos trimestrales ISR (DEMO)' },
      { tipo_frase: '4', codigo_escenario: '9', texto: 'Sujeto a retención definitiva ISR (DEMO)' },
    ],
  };
}

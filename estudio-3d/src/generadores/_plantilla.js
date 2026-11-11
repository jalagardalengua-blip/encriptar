// PLANTILLA para crear un generador nuevo.
// 1. Copia este archivo con otro nombre (p. ej. caballero.js) y cambia id, nombre, parámetros...
// 2. Añádelo a la lista de src/generadores/index.js.
// 3. Aparece en la app y en la terminal: node herramientas/generar.mjs <id> --preset ...
//
// Reglas para que el GLB funcione bien en cualquier motor:
// - Unidades en metros, Y hacia arriba, el modelo mira hacia +Z, los pies en y = 0.
// - Lado «_L» = izquierda del personaje = +X. m.simetrico() te da ('L', +1) y ('R', -1).
// - Las animaciones son «en el sitio» (sin desplazar la raíz): el juego mueve al personaje.
// - Con esqueleto: usa Modelo + m.hueso() + m.parte(). Sin esqueleto: malla() y pivote() con nombre.
import { Modelo } from '../core/modelo.js';
import * as F from '../core/formas.js';
import { clip, onda, tramo } from '../core/animacion.js';

export default {
  id: 'plantilla',
  nombre: 'Muñeco de ejemplo',
  icono: '🧸',
  categoria: 'Ejemplos',
  descripcion: 'Ejemplo mínimo de generador con esqueleto y una animación.',
  presets: { normal: {}, grande: { altura: 1.6 } },
  parametros: [
    { id: 'altura', nombre: 'Altura (m)', tipo: 'rango', min: 0.3, max: 3, paso: 0.01, def: 1 },
    { id: 'conGorro', nombre: 'Gorro', tipo: 'si', def: true },
    { id: 'color', nombre: 'Cuerpo', tipo: 'color', def: '#d98c3a' },
  ],

  construir(p, azar) {
    const h = p.altura;
    const m = new Modelo('Muneco', {
      cuerpo: { color: p.color, rugosidad: 0.8 },
      ojo: { color: '#111111', rugosidad: 0.2 },
    });
    m.hueso('Body', 'Root', [0, h * 0.3, 0]);
    m.hueso('Head', 'Body', [0, h * 0.62, 0]);
    m.simetrico((S, x) => m.hueso(`Arm_${S}`, 'Body', [x * h * 0.2, h * 0.5, 0]));

    m.parte(F.esfera(h * 0.25, { p: [0, h * 0.35, 0] }), 'cuerpo', 'Body');
    m.parte(F.esfera(h * 0.17, { p: [0, h * 0.75, 0] }), 'cuerpo', 'Head');
    m.simetrico((S, x) => {
      m.parte(F.esfera(h * 0.025, { p: [x * h * 0.06, h * 0.78, h * 0.16] }), 'ojo', 'Head');
      m.parte(F.tubo([x * h * 0.2, h * 0.5, 0], [x * h * 0.32, h * 0.3, 0], h * 0.05), 'cuerpo', `Arm_${S}`);
    });
    if (p.conGorro) m.parte(F.cono(h * 0.12, h * 0.2, { p: [0, h * 0.95, 0] }), 'ojo', 'Head');

    const objeto = m.construir({ facetado: p.facetado });
    const animaciones = [
      clip('Saludar', 1.2, objeto, (f, P) => {
        P.rot('Arm_L', 0, 0, 1.8 * tramo(f, 0, 0.2, 0.8, 1) + 0.3 * onda(f, 3));
        P.rot('Head', 0, 0.2 * onda(f));
      }),
    ];
    return { objeto, animaciones };
  },
};

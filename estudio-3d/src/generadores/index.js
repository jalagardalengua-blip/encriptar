// Catálogo de generadores. Para añadir uno nuevo: copia _plantilla.js, cámbiale el id
// y añádelo a esta lista. Aparecerá en la app y en la terminal automáticamente.
import humanoide from './humanoide.js';
import cuadrupedo from './cuadrupedo.js';
import ave from './ave.js';
import tractor from './tractor.js';
import granja from './granja.js';
import relieve from './relieve.js';
import esqueleto from './esqueleto.js';

export const generadores = [relieve, esqueleto, humanoide, cuadrupedo, ave, tractor, granja];
export const porId = (id) => generadores.find((g) => g.id === id);

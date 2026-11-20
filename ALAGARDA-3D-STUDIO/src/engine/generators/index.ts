import { GeneratorRegistry } from '../procedural/registry';
import { primitivasGenerator } from './primitivas';
import { toroGenerator } from './toro';

/** Registro global con todos los generadores disponibles. El primero es el que abre la aplicación. */
export function createDefaultRegistry(): GeneratorRegistry {
  const r = new GeneratorRegistry();
  r.register(toroGenerator);
  r.register(primitivasGenerator);
  return r;
}

export const registry = createDefaultRegistry();
export { primitivasGenerator, toroGenerator };

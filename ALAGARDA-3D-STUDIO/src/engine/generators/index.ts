import { GeneratorRegistry } from '../procedural/registry';
import { primitivasGenerator } from './primitivas';

/** Registro global con todos los generadores disponibles en esta fase. */
export function createDefaultRegistry(): GeneratorRegistry {
  const r = new GeneratorRegistry();
  r.register(primitivasGenerator);
  return r;
}

export const registry = createDefaultRegistry();
export { primitivasGenerator };

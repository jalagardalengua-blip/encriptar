/**
 * Especificaciones de dominio para los generadores de las próximas fases.
 *
 * Son tipos (no implementación): fijan el contrato de datos que cada generador
 * expondrá como parámetros. Los valores y nombres proceden de la auditoría de
 * TORERO (src/assets.js: CAPAS, HORNS, TRAJES, PLZ) y GANADERIA-27
 * (js/juego.js: PELO, HORNS, morf(); js/mundo3d.js: bprof, makeHorse2).
 * Ver docs/AUDITORIA-REUTILIZACION.md.
 */

/** Capas (pelajes) del toro. Unión de CAPAS (TORERO) y PELO (GANADERIA-27). */
export type CapaToro =
  | 'negro' | 'castaño' | 'colorado' | 'cárdeno' | 'berrendo' | 'jabonero'
  | 'ensabanado' | 'salinero' | 'sardo' | 'chorreado' | 'entrepelado' | 'burraco';

/** Encornaduras. Unión de HORNS de ambos proyectos. */
export type Encornadura =
  | 'veleto' | 'cornidelantero' | 'corniabierto' | 'brocho' | 'playero' | 'cornivuelto'
  | 'cornipaso' | 'cornigacho' | 'lira' | 'cabestro';

export type TipoBovino = 'toro' | 'vaca' | 'becerro' | 'cabestro';

/** Morfología normalizada (1 = estándar). Derivada de `morf()` y `bprof()` de GANADERIA-27. */
export interface MorfologiaToro {
  longitud: number;      // len
  alzada: number;        // alt
  morrillo: number;      // morr
  patas: number;         // leg
  perimetro: number;     // girth
  papada: number;
  /** Largo del asta relativo. */
  largoAsta: number;     // hl
  /** Grosor en la cepa (m). */
  grosorAsta: number;    // ht
  colorAsta: string;     // hc
}

/** Particularidades del pelaje (GANADERIA-27: lucero, bragado, calcetero, rabicano). */
export interface ParticularidadesToro {
  lucero: boolean;
  bragado: boolean;
  calcetero: boolean;
  rabicano: boolean;
}

export interface ToroSpec {
  tipo: TipoBovino;
  capa: CapaToro;
  encornadura: Encornadura;
  morfologia: MorfologiaToro;
  particularidades: ParticularidadesToro;
  /** Pitones oscuros (TORERO: darkHorn). */
  pitonesOscuros: boolean;
  /** Colores de la divisa (cintas) en sRGB. */
  divisa?: readonly [string, string];
  escala: number;
  seed: number;
}

export type TipoPersona = 'matador' | 'banderillero' | 'picador' | 'mozo' | 'monosabio' | 'publico';

/** Trajes de luces de TORERO (TRAJES). */
export type TrajeLuces =
  | 'Azul y oro' | 'Grana y oro' | 'Verde botella y oro' | 'Tabaco y oro'
  | 'Blanco y plata' | 'Purísima y oro' | 'Negro y azabache';

export interface ToreroSpec {
  tipo: TipoPersona;
  traje: TrajeLuces;
  /** Color de piel sRGB. */
  piel: string;
  estatura: number;
  complexion: number;
  /** Accesorios que se generarán como piezas separadas. */
  accesorios: readonly ('montera' | 'capote' | 'muleta' | 'estoque' | 'banderillas' | 'pica')[];
  seed: number;
}

export interface CaballoSpec {
  capa: string;
  oscuro: string;
  /** Mula de arrastre en lugar de caballo (GANADERIA-27: o.mule). */
  mula: boolean;
  montura: boolean;
  /** Peto de picador (GANADERIA-27: o.peto). */
  peto: boolean;
  alzada: number;
  seed: number;
}

/** Dimensiones de plaza. Valores base de TORERO: PLZ = { R: 30, barH: 1.6, cal: 31.9 }. */
export interface PlazaSpec {
  radioRuedo: number;
  alturaBarrera: number;
  anchoCallejon: number;
  filasTendido: number;
  filasGrada: number;
  columnasGrada: number;
  burladeros: number;
  estilo: 'neomudejar' | 'encalada' | 'piedra' | 'portatil';
  seed: number;
}

export type TipoEscenario = 'plaza' | 'dehesa' | 'calle-encierro' | 'plaza-pueblo' | 'placita-tienta';

export interface EscenarioSpec {
  tipo: TipoEscenario;
  extension: number;
  densidadVegetacion: number;
  horaDelDia: number;
  seed: number;
}

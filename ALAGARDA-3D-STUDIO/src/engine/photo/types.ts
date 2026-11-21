/** Imagen RGBA en memoria (8 bits por canal, sRGB), independiente del DOM. */
export interface RGBAImage {
  width: number;
  height: number;
  data: Uint8ClampedArray | Uint8Array;
}

/** Máscara binaria (1 = sujeto) con las dimensiones de su imagen. */
export interface Mask {
  width: number;
  height: number;
  data: Uint8Array;
}

/**
 * Cámara ortográfica de la foto respecto al modelo: `yaw` gira el modelo sobre su eje vertical
 * (0 = perfil izquierdo, cabeza hacia la izquierda de la imagen), `pitch` eleva la cámara y
 * `mirror` invierte la imagen (cabeza hacia la derecha).
 */
export interface PhotoView {
  yaw: number;
  pitch: number;
  mirror: boolean;
}

/** Foto ya recortada y ajustada, lista para proyectarse como textura. */
export interface PhotoInput {
  image: RGBAImage;
  mask: Mask;
  view: PhotoView;
}

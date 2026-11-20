import * as THREE from 'three';

export type RGB = readonly [number, number, number];
/** Función de color por vértice (valores lineales 0..1). */
export type VertexColorFn = (x: number, y: number, z: number) => RGB;

/**
 * Acumulador de buffers. Equivale a la clase `Geo` de TORERO (src/engine.js),
 * pero produce una `THREE.BufferGeometry` estándar exportable a glTF.
 */
export class GeometryBuilder {
  readonly positions: number[] = [];
  readonly normals: number[] = [];
  readonly uvs: number[] = [];
  readonly colors: number[] = [];
  readonly indices: number[] = [];

  get vertexCount(): number {
    return this.positions.length / 3;
  }

  addVertex(
    x: number, y: number, z: number,
    nx: number, ny: number, nz: number,
    u: number, v: number,
    color?: VertexColorFn,
  ): number {
    const index = this.vertexCount;
    this.positions.push(x, y, z);
    this.normals.push(nx, ny, nz);
    this.uvs.push(u, v);
    if (color) {
      const c = color(x, y, z);
      this.colors.push(c[0], c[1], c[2]);
    }
    return index;
  }

  addTriangle(a: number, b: number, c: number): void {
    this.indices.push(a, b, c);
  }

  build(): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.positions, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.normals, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uvs, 2));
    if (this.colors.length === this.positions.length) {
      g.setAttribute('color', new THREE.Float32BufferAttribute(this.colors, 3));
    }
    g.setIndex(this.indices);
    g.computeBoundingBox();
    g.computeBoundingSphere();
    return g;
  }
}

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export interface ViewerInfo {
  meshes: number;
  vertices: number;
  triangles: number;
  size: [number, number, number];
}

/**
 * Visor Three.js independiente de React. Renderiza bajo demanda (sólo cuando la
 * cámara o la escena cambian) para ahorrar batería en móvil.
 */
export class Viewer {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(40, 1, 0.01, 500);
  readonly controls: OrbitControls;
  private readonly grid: THREE.GridHelper;
  private readonly ground: THREE.Mesh;
  private readonly sun: THREE.DirectionalLight;
  private readonly modelSlot = new THREE.Group();
  private readonly resizeObserver: ResizeObserver;
  private frame = 0;
  private wireframe = false;
  private disposed = false;

  constructor(private readonly container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.touchAction = 'none';
    container.appendChild(this.renderer.domElement);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    this.scene.background = new THREE.Color('#15181d');
    this.scene.environmentIntensity = 0.7;

    this.scene.add(new THREE.HemisphereLight('#dfe8ff', '#3a2e22', 0.35));
    this.sun = new THREE.DirectionalLight('#fff4e0', 2.2);
    this.sun.position.set(4, 7, 5);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.bias = -0.0005;
    this.scene.add(this.sun, this.sun.target);

    this.ground = new THREE.Mesh(new THREE.CircleGeometry(30, 64), new THREE.ShadowMaterial({ opacity: 0.35 }));
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.receiveShadow = true;
    this.scene.add(this.ground);

    this.grid = new THREE.GridHelper(20, 40, '#5a5f68', '#2c3038');
    (this.grid.material as THREE.Material).transparent = true;
    (this.grid.material as THREE.Material).opacity = 0.6;
    this.scene.add(this.grid);

    this.scene.add(this.modelSlot);

    this.camera.position.set(3, 2, 4);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.target.set(0, 0.5, 0);
    this.controls.addEventListener('change', () => this.requestRender());

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize();
  }

  /** Sustituye el modelo mostrado. El visor no libera el anterior: lo hace quien lo creó. */
  setModel(object: THREE.Object3D | null, frame = true): void {
    this.modelSlot.clear();
    if (object) {
      this.modelSlot.add(object);
      this.applyWireframe();
      if (frame) this.frameModel();
    }
    this.requestRender();
  }

  getModel(): THREE.Object3D | null {
    return this.modelSlot.children[0] ?? null;
  }

  setWireframe(on: boolean): void {
    this.wireframe = on;
    this.applyWireframe();
    this.requestRender();
  }

  setGridVisible(on: boolean): void {
    this.grid.visible = on;
    this.requestRender();
  }

  /** Encuadra el modelo actual y ajusta sombras y suelo a su tamaño. */
  frameModel(): void {
    const box = new THREE.Box3().setFromObject(this.modelSlot);
    if (box.isEmpty()) return;
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const radius = Math.max(size.length() / 2, 0.05);
    const fov = THREE.MathUtils.degToRad(this.camera.fov);
    const dist = radius / Math.sin(fov / 2) * 1.1;
    const dir = new THREE.Vector3(0.6, 0.45, 0.8).normalize();
    this.controls.target.copy(center);
    this.camera.position.copy(center).addScaledVector(dir, dist);
    this.camera.near = Math.max(dist / 200, 0.001);
    this.camera.far = dist * 50;
    this.camera.updateProjectionMatrix();
    this.ground.position.y = box.min.y;
    this.grid.position.y = box.min.y + 1e-4;
    const s = this.sun.shadow.camera;
    s.left = s.bottom = -radius * 1.5;
    s.right = s.top = radius * 1.5;
    s.near = 0.01;
    s.far = radius * 20;
    s.updateProjectionMatrix();
    this.sun.target.position.copy(center);
    this.sun.position.copy(center).add(new THREE.Vector3(1, 2, 1.3).multiplyScalar(radius * 2.5));
    this.controls.update();
    this.requestRender();
  }

  getInfo(): ViewerInfo {
    const info: ViewerInfo = { meshes: 0, vertices: 0, triangles: 0, size: [0, 0, 0] };
    this.modelSlot.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        const g = o.geometry as THREE.BufferGeometry;
        info.meshes++;
        info.vertices += g.getAttribute('position').count;
        info.triangles += (g.getIndex()?.count ?? g.getAttribute('position').count) / 3;
      }
    });
    const box = new THREE.Box3().setFromObject(this.modelSlot);
    if (!box.isEmpty()) info.size = box.getSize(new THREE.Vector3()).toArray() as [number, number, number];
    return info;
  }

  requestRender(): void {
    if (this.frame || this.disposed) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = 0;
      // el amortiguamiento de OrbitControls necesita fotogramas extra hasta detenerse
      if (this.controls.update()) this.requestRender();
      this.renderer.render(this.scene, this.camera);
    });
  }

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    this.resizeObserver.disconnect();
    this.controls.dispose();
    this.scene.environment?.dispose();
    this.ground.geometry.dispose();
    (this.ground.material as THREE.Material).dispose();
    this.grid.geometry.dispose();
    (this.grid.material as THREE.Material).dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }

  private applyWireframe(): void {
    this.modelSlot.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of mats) if ('wireframe' in m) (m as THREE.MeshStandardMaterial).wireframe = this.wireframe;
      }
    });
  }

  private resize(): void {
    const w = Math.max(1, this.container.clientWidth);
    const h = Math.max(1, this.container.clientHeight);
    this.renderer.setSize(w, h, false);
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.requestRender();
  }
}

/** Comprueba si el navegador puede crear un contexto WebGL2. */
export function isWebGL2Available(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!c.getContext('webgl2');
  } catch {
    return false;
  }
}

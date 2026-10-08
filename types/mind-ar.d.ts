declare module 'mind-ar/dist/mindar-image-three.prod.js' {
  import type { Camera, Group, Scene, WebGLRenderer } from 'three';

  export interface MindARAnchor {
    group: Group;
    targetIndex: number;
    onTargetFound: (() => void) | null;
    onTargetLost: (() => void) | null;
    onTargetUpdate: (() => void) | null;
  }

  export class MindARThree {
    constructor(options: {
      container: HTMLElement;
      imageTargetSrc: string;
      maxTrack?: number;
      uiLoading?: string;
      uiScanning?: string;
      uiError?: string;
      filterMinCF?: number;
      filterBeta?: number;
      warmupTolerance?: number;
      missTolerance?: number;
      environmentDeviceId?: string;
    });
    scene: Scene;
    cssScene: Scene;
    camera: Camera;
    renderer: WebGLRenderer;
    cssRenderer: { domElement: HTMLElement; render(scene: Scene, camera: Camera): void; setSize(width: number, height: number): void };
    controller?: { dispose(): void; stopProcessVideo(): void };
    video?: HTMLVideoElement;
    anchors: MindARAnchor[];
    start(): Promise<void>;
    stop(): void;
    resize(): void;
    addAnchor(targetIndex: number): MindARAnchor;
    addCSSAnchor(targetIndex: number): MindARAnchor;
  }
}

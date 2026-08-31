import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRMLoaderPlugin } from '@pixiv/three-vrm';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { 
  frameVRMCamera, 
  inspectVRMExpressions, 
  applyRestingIdlePose, 
  disposeThreeScene 
} from '@/utils/vrmUtils';
import { EmotionController } from './EmotionController';
import { IdleController } from './IdleController';
import { LipSyncController } from './LipSyncController';
import { Loader2, AlertCircle, RefreshCw, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';

export default function VRMCharacter({
  modelUrl = '/AvatarModels/Girl/4790635951276610274.vrm',
  emotion = 'neutral',
  isSpeaking = false,
  viewMode = 'portrait', // 'portrait' | 'full'
  onViewModeChange,
  onExpressionsLoaded,
  className = ''
}) {
  const containerRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);
  const [error, setError] = useState(null);

  // References for Three.js instance
  const stateRef = useRef({
    scene: null,
    camera: null,
    renderer: null,
    controls: null,
    vrm: null,
    emotionController: null,
    idleController: null,
    lipSyncController: null,
    clock: new THREE.Clock(),
    animationFrameId: null,
    currentView: 'portrait',
    isSpeaking: false
  });

  // Keep stateRef.isSpeaking in sync with the prop on every render
  stateRef.current.isSpeaking = isSpeaking;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let isMounted = true;
    setLoading(true);
    setError(null);
    setLoadProgress(0);

    // 1. Create Scene
    const scene = new THREE.Scene();
    stateRef.current.scene = scene;

    // 2. Setup Camera
    const rect = container.getBoundingClientRect();
    const width = rect.width || window.innerWidth / 2;
    const height = rect.height || window.innerHeight;
    const camera = new THREE.PerspectiveCamera(34, width / height, 0.1, 50.0);
    camera.position.set(0, 1.42, 1.25);
    stateRef.current.camera = camera;

    // 3. Setup Lights (Studio 4-point illumination)
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.35);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xfffaed, 1.6);
    keyLight.position.set(0.6, 2.2, 1.8);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xdbeafe, 1.1);
    fillLight.position.set(-1.2, 1.5, 1.4);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xfef08a, 0.9);
    rimLight.position.set(0.0, 2.5, -1.5);
    scene.add(rimLight);

    // 4. Setup Renderer
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.top = '0';
    renderer.domElement.style.left = '0';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.outline = 'none';
    renderer.domElement.style.cursor = 'grab';

    container.appendChild(renderer.domElement);
    stateRef.current.renderer = renderer;

    // 5. Setup OrbitControls (Interactive Rotation, Pan & Zoom)
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.enablePan = true;
    controls.enableZoom = true;
    controls.minDistance = 0.50;
    controls.maxDistance = 3.5;
    controls.minPolarAngle = Math.PI * 0.15;
    controls.maxPolarAngle = Math.PI * 0.65;
    controls.target.set(0, 1.36, 0);
    controls.update();
    stateRef.current.controls = controls;

    controls.addEventListener('start', () => {
      renderer.domElement.style.cursor = 'grabbing';
    });
    controls.addEventListener('end', () => {
      renderer.domElement.style.cursor = 'grab';
    });

    // 6. Load VRM using GLTFLoader + VRMLoaderPlugin
    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));

    loader.load(
      modelUrl,
      (gltf) => {
        if (!isMounted) return;
        const vrm = gltf.userData.vrm;
        if (!vrm) {
          setError('Invalid VRM file format.');
          setLoading(false);
          return;
        }

        stateRef.current.vrm = vrm;

        // Model faces forward at user (+Z) with 180 deg Y rotation
        vrm.scene.rotation.set(0, Math.PI, 0);
        vrm.scene.position.set(0, 0, 0);

        // Disable LookAt auto-update so it doesn't overwrite head & neck animations
        if (vrm.lookAt) {
          vrm.lookAt.autoUpdate = false;
        }

        scene.add(vrm.scene);

        // Apply resting idle pose
        applyRestingIdlePose(vrm);

        // Frame camera based on viewMode
        frameVRMCamera(camera, controls, viewMode, vrm);
        stateRef.current.currentView = viewMode;

        // Setup Controllers
        const emotionCtrl = new EmotionController(vrm);
        emotionCtrl.setEmotion(emotion);
        stateRef.current.emotionController = emotionCtrl;

        const idleCtrl = new IdleController(vrm);
        stateRef.current.idleController = idleCtrl;

        const lipSyncCtrl = new LipSyncController(vrm);
        stateRef.current.lipSyncController = lipSyncCtrl;

        // Inspect supported expressions
        const expressions = inspectVRMExpressions(vrm);
        onExpressionsLoaded?.(expressions);

        setLoading(false);
      },
      (progress) => {
        if (progress.total > 0) {
          const pct = Math.round((progress.loaded / progress.total) * 100);
          setLoadProgress(pct);
        }
      },
      (err) => {
        console.error('Failed to load VRM model:', err);
        if (isMounted) {
          setError('Companion model could not be loaded.');
          setLoading(false);
        }
      }
    );

    // 7. Animation Render Loop
    stateRef.current.clock.start();
    const animate = () => {
      stateRef.current.animationFrameId = requestAnimationFrame(animate);

      const delta = stateRef.current.clock.getDelta();
      const clampedDelta = Math.min(delta, 0.1);

      const { vrm, emotionController, idleController, lipSyncController, controls } = stateRef.current;
      const speaking = stateRef.current.isSpeaking;

      controls?.update();

      if (vrm) {
        idleController?.update(clampedDelta, speaking);
        emotionController?.update(clampedDelta);
        lipSyncController?.update(clampedDelta);
        vrm.update(clampedDelta);
      }

      renderer.render(scene, camera);
    };

    animate();

    // 8. Double Tap / Double Click to Toggle Zoom View
    let lastTap = 0;
    const handleDoubleTap = (e) => {
      const currentTime = new Date().getTime();
      const tapLength = currentTime - lastTap;
      if (tapLength < 300 && tapLength > 0) {
        e.preventDefault();
        toggleZoom();
      }
      lastTap = currentTime;
    };

    const domElement = renderer.domElement;
    domElement.addEventListener('dblclick', toggleZoom);
    domElement.addEventListener('touchend', handleDoubleTap);

    // 9. Resize Observer
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: w, height: h } = entry.contentRect;
        if (w > 0 && h > 0 && renderer && camera) {
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h, false);
        }
      }
    });
    resizeObserver.observe(container);

    // 10. Cleanup
    return () => {
      isMounted = false;
      resizeObserver.disconnect();
      domElement.removeEventListener('dblclick', toggleZoom);
      domElement.removeEventListener('touchend', handleDoubleTap);
      if (stateRef.current.animationFrameId) {
        cancelAnimationFrame(stateRef.current.animationFrameId);
      }
      controls?.dispose();
      disposeThreeScene(scene, renderer);
      if (domElement && container.contains(domElement)) {
        container.removeChild(domElement);
      }
    };
  }, [modelUrl]);

  // Toggle Zoom helper (portrait <-> full)
  const toggleZoom = () => {
    const { camera, controls, vrm, currentView } = stateRef.current;
    if (!camera || !controls) return;

    const nextView = currentView === 'portrait' ? 'full' : 'portrait';
    stateRef.current.currentView = nextView;
    frameVRMCamera(camera, controls, nextView, vrm);
    onViewModeChange?.(nextView);
  };

  // Reset Camera View helper
  const resetCamera = () => {
    const { camera, controls, vrm } = stateRef.current;
    if (!camera || !controls) return;
    stateRef.current.currentView = 'portrait';
    frameVRMCamera(camera, controls, 'portrait', vrm);
    onViewModeChange?.('portrait');
  };

  // Update Emotion when prop changes
  useEffect(() => {
    stateRef.current.emotionController?.setEmotion(emotion);
  }, [emotion]);

  // Update Speaking status for LipSync & Gestures
  useEffect(() => {
    if (isSpeaking) {
      stateRef.current.lipSyncController?.startSpeaking();
    } else {
      stateRef.current.lipSyncController?.stopSpeaking();
    }
  }, [isSpeaking]);

  // Update Camera View Mode when prop changes from outside
  useEffect(() => {
    const { camera, controls, vrm } = stateRef.current;
    if (!camera || !controls) return;
    stateRef.current.currentView = viewMode;
    frameVRMCamera(camera, controls, viewMode, vrm);
  }, [viewMode]);

  // Mouse / Touch Parallax for eye lookAt when not actively dragging
  const handlePointerMove = (e) => {
    const { vrm } = stateRef.current;
    if (!vrm) return;

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);

    if (vrm.lookAt && vrm.lookAt.target) {
      vrm.lookAt.target.position.set(-x * 0.25, 1.42 + y * 0.15, 1.2);
    }
  };

  const isZoomed = viewMode === 'portrait';

  return (
    <div 
      ref={containerRef} 
      onPointerMove={handlePointerMove}
      className={`relative w-full h-full min-h-[450px] flex items-center justify-center overflow-hidden select-none bg-black ${className}`}
    >
      {/* Floating Controls with thin white line */}
      {!loading && !error && (
        <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5 bg-black/80 backdrop-blur-md p-1.5 rounded-2xl border border-white/20 shadow-xl">
          <button
            onClick={toggleZoom}
            title={isZoomed ? "Zoom out to Full Body" : "Zoom in to Face"}
            className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white border border-white/15 hover:border-white/40 transition flex items-center gap-1.5 text-xs font-medium"
          >
            {isZoomed ? <ZoomOut className="w-3.5 h-3.5" /> : <ZoomIn className="w-3.5 h-3.5" />}
            <span>{isZoomed ? "Full View" : "Zoom In"}</span>
          </button>
          <button
            onClick={resetCamera}
            title="Reset front camera view"
            className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white border border-white/15 hover:border-white/40 transition flex items-center gap-1 text-xs font-medium"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Floating Interaction Hint with thin white line */}
      {!loading && !error && (
        <div className="absolute bottom-4 right-4 z-10 pointer-events-none hidden sm:flex items-center gap-1.5 text-[11px] text-zinc-400 bg-black/80 backdrop-blur-sm px-3 py-1 rounded-full border border-white/15">
          <span>Drag to rotate</span>
          <span>·</span>
          <span>Double-tap to zoom</span>
        </div>
      )}

      {loading && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm text-white">
          <Loader2 className="w-9 h-9 animate-spin text-white mb-3" />
          <p className="text-sm font-medium tracking-wide">Bringing companion to life…</p>
          {loadProgress > 0 && (
            <p className="text-xs text-zinc-400 mt-1">{loadProgress}%</p>
          )}
        </div>
      )}

      {error && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/90 p-6 text-center text-white border border-white/20 m-4 rounded-3xl">
          <AlertCircle className="w-10 h-10 text-rose-400 mb-3" />
          <h3 className="text-base font-semibold text-rose-200">{error}</h3>
          <p className="text-xs text-zinc-400 mt-1 max-w-xs">
            Make sure the VRM model is accessible in the assets directory.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-zinc-900 border border-white/20 px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-800 hover:border-white/40 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
        </div>
      )}
    </div>
  );
}

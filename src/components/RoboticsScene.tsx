import { useEffect, useRef } from 'react';
import * as THREE from 'three';

/**
 * A subtle, technical 3D visual: a wireframe robotic "core" (icosahedron) wrapped
 * in an orbiting network of nodes and connecting traces. Brand-coloured, slow,
 * mouse-reactive parallax. Respects prefers-reduced-motion.
 */
export function RoboticsScene({ className = '' }: { className?: string }) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    camera.position.set(0, 0, 6.4);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';

    // Palette
    const C = { indigo: 0x360568, tekhelet: 0x5b2a86, glaucous: 0x7785ac, teal: 0x9ac6c5, celadon: 0xa5e6ba };

    const root = new THREE.Group();
    scene.add(root);

    // --- Central core: icosahedron wireframe + inner solid ---
    const coreGeo = new THREE.IcosahedronGeometry(1.5, 1);
    const core = new THREE.LineSegments(
      new THREE.WireframeGeometry(coreGeo),
      new THREE.LineBasicMaterial({ color: C.teal, transparent: true, opacity: 0.55 }),
    );
    root.add(core);

    const innerCore = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.85, 0),
      new THREE.MeshBasicMaterial({ color: C.tekhelet, transparent: true, opacity: 0.32 }),
    );
    root.add(innerCore);

    const pulse = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 24, 24),
      new THREE.MeshBasicMaterial({ color: C.celadon }),
    );
    root.add(pulse);

    // --- Orbiting node network ---
    const NODES = 22;
    const nodePositions: THREE.Vector3[] = [];
    const nodeGroup = new THREE.Group();
    const nodeMat = new THREE.MeshBasicMaterial({ color: C.celadon });
    const nodeGeo = new THREE.SphereGeometry(0.055, 12, 12);
    for (let i = 0; i < NODES; i++) {
      const r = 2.5 + Math.random() * 1.6;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const p = new THREE.Vector3(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta) * 0.7,
        r * Math.cos(phi),
      );
      nodePositions.push(p);
      const m = new THREE.Mesh(nodeGeo, nodeMat);
      m.position.copy(p);
      nodeGroup.add(m);
    }
    root.add(nodeGroup);

    // --- Connecting traces between nearby nodes ---
    const linePts: number[] = [];
    for (let i = 0; i < NODES; i++) {
      for (let j = i + 1; j < NODES; j++) {
        if (nodePositions[i].distanceTo(nodePositions[j]) < 2.1) {
          linePts.push(...nodePositions[i].toArray(), ...nodePositions[j].toArray());
        }
      }
    }
    const traces = new THREE.LineSegments(
      new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(linePts, 3)),
      new THREE.LineBasicMaterial({ color: C.glaucous, transparent: true, opacity: 0.28 }),
    );
    root.add(traces);

    // --- Ambient dust points ---
    const dustCount = 140;
    const dustArr = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount; i++) {
      dustArr[i * 3] = (Math.random() - 0.5) * 14;
      dustArr[i * 3 + 1] = (Math.random() - 0.5) * 10;
      dustArr[i * 3 + 2] = (Math.random() - 0.5) * 8;
    }
    const dust = new THREE.Points(
      new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(dustArr, 3)),
      new THREE.PointsMaterial({ color: C.teal, size: 0.03, transparent: true, opacity: 0.5 }),
    );
    scene.add(dust);

    // Resize handling
    const resize = () => {
      const w = mount.clientWidth || 1;
      const h = mount.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(mount);

    // Mouse parallax
    const target = { x: 0, y: 0 };
    const onMove = (e: MouseEvent) => {
      const rect = mount.getBoundingClientRect();
      target.x = ((e.clientX - rect.left) / rect.width - 0.5) * 0.6;
      target.y = ((e.clientY - rect.top) / rect.height - 0.5) * 0.6;
    };
    window.addEventListener('mousemove', onMove);

    let raf = 0;
    const timer = new THREE.Timer();
    timer.connect(document);
    const animate = (timestamp: number) => {
      timer.update(timestamp);
      const t = timer.getElapsed();
      if (!reduce) {
        root.rotation.y = t * 0.12;
        root.rotation.x = Math.sin(t * 0.2) * 0.12;
        nodeGroup.rotation.y = -t * 0.18;
        core.rotation.x = t * 0.08;
        innerCore.rotation.y = -t * 0.25;
        dust.rotation.y = t * 0.02;
        const s = 1 + Math.sin(t * 2) * 0.12;
        pulse.scale.setScalar(s);
        (pulse.material as THREE.MeshBasicMaterial).opacity = 0.7 + Math.sin(t * 2) * 0.3;
      }
      camera.position.x += (target.x * 1.2 - camera.position.x) * 0.05;
      camera.position.y += (-target.y * 1.2 - camera.position.y) * 0.05;
      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
      raf = requestAnimationFrame(animate);
    };
    animate(performance.now());

    return () => {
      cancelAnimationFrame(raf);
      timer.dispose();
      ro.disconnect();
      window.removeEventListener('mousemove', onMove);
      renderer.dispose();
      scene.traverse((o) => {
        const any = o as unknown as { geometry?: THREE.BufferGeometry; material?: THREE.Material };
        any.geometry?.dispose?.();
        any.material?.dispose?.();
      });
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} className={className} aria-hidden />;
}

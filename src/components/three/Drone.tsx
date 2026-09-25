import { useEffect, useRef } from 'react';
import * as THREE from 'three';

/** A quadcopter drone that hovers with a gentle bob while its four rotors spin. */
export function Drone({ className = '' }: { className?: string }) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const C = { indigo: 0x360568, tekhelet: 0x5b2a86, glaucous: 0x7785ac, teal: 0x9ac6c5, celadon: 0xa5e6ba };

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 1.6, 6);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);
    Object.assign(renderer.domElement.style, { width: '100%', height: '100%', display: 'block' });

    scene.add(new THREE.AmbientLight(0xffffff, 0.75));
    const key = new THREE.DirectionalLight(0xffffff, 1);
    key.position.set(3, 6, 4);
    scene.add(key);
    const rim = new THREE.PointLight(C.celadon, 1.5, 20);
    rim.position.set(-3, 1, 2);
    scene.add(rim);

    const metal = (color: number, e = 0) => new THREE.MeshStandardMaterial({ color, metalness: 0.6, roughness: 0.3, emissive: e, emissiveIntensity: e ? 0.5 : 0 });

    const drone = new THREE.Group();
    scene.add(drone);

    // Body
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.32, 1.1), metal(C.indigo));
    drone.add(body);
    const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.42, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), metal(C.tekhelet));
    canopy.position.y = 0.15;
    drone.add(canopy);
    // Camera gimbal (celadon eye)
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 16), metal(C.celadon, C.celadon));
    eye.position.set(0, -0.18, 0.45);
    drone.add(eye);

    const rotors: THREE.Group[] = [];
    const arms = [
      [1, 1], [-1, 1], [1, -1], [-1, -1],
    ];
    for (const [sx, sz] of arms) {
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1, 12), metal(C.glaucous));
      arm.rotation.z = Math.PI / 2;
      arm.rotation.y = Math.atan2(sz, sx);
      arm.position.set(sx * 0.55, 0, sz * 0.55);
      drone.add(arm);

      const motor = new THREE.Group();
      motor.position.set(sx * 1.0, 0.08, sz * 1.0);
      drone.add(motor);
      motor.add(new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.16, 16), metal(C.tekhelet)));

      const prop = new THREE.Group();
      prop.position.y = 0.12;
      for (let b = 0; b < 2; b++) {
        const blade = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.02, 0.12), new THREE.MeshStandardMaterial({ color: C.teal, transparent: true, opacity: 0.55 }));
        blade.rotation.y = b * Math.PI / 2;
        prop.add(blade);
      }
      motor.add(prop);
      rotors.push(prop);
    }

    // landing skids
    for (const s of [-1, 1]) {
      const skid = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 1.2), metal(C.glaucous));
      skid.position.set(s * 0.4, -0.35, 0);
      drone.add(skid);
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.3, 0.06), metal(C.glaucous));
      leg.position.set(s * 0.4, -0.2, 0);
      drone.add(leg);
    }

    const resize = () => {
      const w = mount.clientWidth || 1, h = mount.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(mount);

    const orbit = { x: 0, y: 0 };
    const onMove = (e: MouseEvent) => {
      const r = mount.getBoundingClientRect();
      orbit.x = ((e.clientX - r.left) / r.width - 0.5);
      orbit.y = ((e.clientY - r.top) / r.height - 0.5);
    };
    window.addEventListener('mousemove', onMove);

    let raf = 0;
    const timer = new THREE.Timer();
    timer.connect(document);
    const animate = (timestamp: number) => {
      timer.update(timestamp);
      const t = reduce ? 0 : timer.getElapsed();
      drone.position.y = Math.sin(t * 1.5) * 0.18;
      drone.rotation.z = Math.sin(t * 0.8) * 0.08;
      drone.rotation.x = Math.cos(t * 0.6) * 0.06;
      drone.rotation.y = orbit.x * 0.8 + Math.sin(t * 0.3) * 0.15;
      for (let i = 0; i < rotors.length; i++) rotors[i].rotation.y += (i % 2 ? 0.9 : -0.9);
      camera.position.y += (1.6 - orbit.y * 1.5 - camera.position.y) * 0.05;
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
        const a = o as unknown as { geometry?: THREE.BufferGeometry; material?: THREE.Material };
        a.geometry?.dispose?.();
        a.material?.dispose?.();
      });
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} className={className} aria-hidden />;
}

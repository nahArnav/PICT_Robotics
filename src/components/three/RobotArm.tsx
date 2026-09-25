import { useEffect, useRef } from 'react';
import * as THREE from 'three';

/**
 * Interactive articulated robot arm running a real pick-and-place cycle.
 *
 * - Driven by 2-link inverse kinematics (yaw + shoulder + elbow), solved via the
 *   law of cosines against a *tool-length* end effector, so the gripper reaches
 *   the payload's centre and the claw fingers surround the cube instead of
 *   intersecting it (fixes the "arm and object merging" look).
 * - Interactive: move the cursor over the scene to steer WHERE the arm drops the
 *   part — a glowing pad tracks the pointer on the floor and the arm carries the
 *   cube there, sets it down, and returns for the next one.
 */
export function RobotArm({ className = '' }: { className?: string }) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const C = { indigo: 0x360568, tekhelet: 0x5b2a86, glaucous: 0x7785ac, teal: 0x9ac6c5, celadon: 0xa5e6ba };
    const L1 = 1.7, L2 = 1.4, TOOL = 0.6;   // upper arm, forearm, wrist→grip distance
    const L2E = L2 + TOOL;                    // effective forearm for IK (grip anchor)
    const SHY = 1.05;                         // shoulder pivot height
    const CUBE = 0.34, HALF = CUBE / 2;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(5.6, 3.6, 6.4);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);
    Object.assign(renderer.domElement.style, { width: '100%', height: '100%', display: 'block', cursor: 'crosshair' });

    scene.add(new THREE.AmbientLight(0xffffff, 0.62));
    const key = new THREE.DirectionalLight(0xffffff, 1.1);
    key.position.set(5, 9, 5);
    scene.add(key);
    const rim = new THREE.PointLight(C.celadon, 1.2, 30);
    rim.position.set(-4, 3, -2);
    scene.add(rim);
    const fill = new THREE.PointLight(C.glaucous, 0.5, 30);
    fill.position.set(4, 1.5, 4);
    scene.add(fill);

    const mat = (color: number, rough = 0.42, metal = 0.55) => new THREE.MeshStandardMaterial({ color, metalness: metal, roughness: rough });

    // Grid floor
    const grid = new THREE.GridHelper(16, 16, C.glaucous, C.glaucous);
    const gm = grid.material as THREE.Material;
    gm.opacity = 0.15; gm.transparent = true;
    scene.add(grid);

    // Capsule link oriented along +X
    const link = (len: number, radius: number, color: number) => {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(radius, len, 6, 16), mat(color));
      body.rotation.z = Math.PI / 2;
      body.position.x = len / 2;
      g.add(body);
      return g;
    };

    // --- Kinematic chain: base → column(yaw) → shoulder(pitch) → elbow(pitch) → wrist ---
    const base = new THREE.Group();
    scene.add(base);
    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.18, 0.35, 40), mat(C.indigo, 0.5));
    plinth.position.y = 0.175;
    base.add(plinth);
    for (let i = 0; i < 8; i++) {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.08, 6), mat(C.glaucous));
      b.position.set(Math.cos((i / 8) * Math.PI * 2) * 0.82, 0.36, Math.sin((i / 8) * Math.PI * 2) * 0.82);
      base.add(b);
    }

    const column = new THREE.Group();
    column.position.y = 0.35;
    base.add(column);
    const columnMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.62, SHY - 0.35, 32), mat(C.tekhelet));
    columnMesh.position.y = (SHY - 0.35) / 2;
    column.add(columnMesh);

    const shoulder = new THREE.Group();
    shoulder.position.y = SHY - 0.35;
    column.add(shoulder);
    shoulder.add(new THREE.Mesh(new THREE.SphereGeometry(0.4, 28, 28), mat(C.tekhelet)));
    shoulder.add(new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.06, 10, 28), mat(C.celadon, 0.4, 0.4)));
    const upper = link(L1, 0.19, C.glaucous);
    shoulder.add(upper);

    const elbow = new THREE.Group();
    elbow.position.x = L1;
    upper.add(elbow);
    elbow.add(new THREE.Mesh(new THREE.SphereGeometry(0.27, 24, 24), mat(C.teal)));
    const fore = link(L2, 0.14, C.teal);
    elbow.add(fore);

    const wrist = new THREE.Group();
    wrist.position.x = L2;
    fore.add(wrist);
    wrist.add(new THREE.Mesh(new THREE.SphereGeometry(0.17, 20, 20), mat(C.tekhelet)));
    const palm = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.34, 0.36), mat(C.indigo, 0.5));
    palm.position.x = TOOL - 0.28;
    wrist.add(palm);
    // grip anchor = point the IK drives to the payload centre
    const gripAnchor = new THREE.Object3D();
    gripAnchor.position.x = TOOL;
    wrist.add(gripAnchor);
    // two claw fingers straddling the anchor
    const clawMat = mat(C.celadon, 0.4, 0.4);
    const clawA = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.09, 0.12), clawMat);
    const clawB = clawA.clone();
    clawA.position.set(TOOL - 0.02, 0.2, 0);
    clawB.position.set(TOOL - 0.02, -0.2, 0);
    wrist.add(clawA, clawB);

    // Pick pedestal + payload cube
    const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.46, 0.4, 24), mat(C.indigo, 0.55));
    const PICK = new THREE.Vector3(1.75, 0.4 + HALF, 1.35);
    pedestal.position.set(PICK.x, 0.2, PICK.z);
    scene.add(pedestal);

    const cube = new THREE.Mesh(new THREE.BoxGeometry(CUBE, CUBE, CUBE), mat(C.celadon, 0.35, 0.3));
    (cube.material as THREE.MeshStandardMaterial).emissive = new THREE.Color(C.celadon);
    (cube.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.22;
    cube.position.copy(PICK);
    scene.add(cube);
    const cubeEdges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(CUBE, CUBE, CUBE)), new THREE.LineBasicMaterial({ color: C.indigo, transparent: true, opacity: 0.4 }));
    cube.add(cubeEdges);

    // Drop pad follows the cursor on the floor
    const pad = new THREE.Group();
    const padRing = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.02, 8, 40), new THREE.MeshBasicMaterial({ color: C.teal, transparent: true, opacity: 0.85 }));
    padRing.rotation.x = Math.PI / 2;
    const padDisc = new THREE.Mesh(new THREE.CircleGeometry(0.4, 40), new THREE.MeshBasicMaterial({ color: C.teal, transparent: true, opacity: 0.1 }));
    padDisc.rotation.x = -Math.PI / 2;
    pad.add(padRing, padDisc);
    const PLACE = new THREE.Vector3(-1.75, HALF, -1.2);
    pad.position.set(PLACE.x, 0.02, PLACE.z);
    scene.add(pad);

    const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
    const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

    // Pointer → floor raycast for the drop location
    const ndc = new THREE.Vector2(-0.35, 0.2);
    const raycaster = new THREE.Raycaster();
    const floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const hit = new THREE.Vector3();
    const orbit = { x: 0, y: 0 };
    const onMove = (e: MouseEvent) => {
      const r = mount.getBoundingClientRect();
      const mx = (e.clientX - r.left) / r.width;
      const my = (e.clientY - r.top) / r.height;
      ndc.set(mx * 2 - 1, -(my * 2 - 1));
      orbit.x = mx - 0.5;
      orbit.y = my - 0.5;
    };
    mount.addEventListener('mousemove', onMove);

    const updatePlaceFromPointer = () => {
      raycaster.setFromCamera(ndc, camera);
      if (!raycaster.ray.intersectPlane(floor, hit)) return;
      let x = hit.x, z = hit.z;
      const d = Math.hypot(x, z);
      const rMin = 1.15, rMax = L1 + L2E - 0.4; // stay inside the reachable ring
      const rr = clamp(d, rMin, rMax);
      if (d > 1e-3) { x = (x / d) * rr; z = (z / d) * rr; }
      // don't overlap the pick pedestal
      if (Math.hypot(x - PICK.x, z - PICK.z) < 0.9) { x -= 0.9; }
      PLACE.set(x, HALF, z);
    };

    // IK solver: writes solved yaw/q1/q2 for a world target point
    const solve = (p: THREE.Vector3) => {
      const yaw = Math.atan2(-p.z, p.x);
      const dh = Math.hypot(p.x, p.z);
      const dy = p.y - SHY;
      const reach = clamp(Math.hypot(dh, dy), Math.abs(L1 - L2E) + 0.05, L1 + L2E - 0.02);
      // rescale to the clamped reach so angles stay valid
      const ang = Math.atan2(dy, dh);
      const rdh = Math.cos(ang) * reach, rdy = Math.sin(ang) * reach;
      const cos2 = clamp((rdh * rdh + rdy * rdy - L1 * L1 - L2E * L2E) / (2 * L1 * L2E), -1, 1);
      const q2 = Math.acos(cos2);
      const q1 = Math.atan2(rdy, rdh) - Math.atan2(L2E * Math.sin(q2), L1 + L2E * Math.cos(q2));
      return { yaw, q1, q2 };
    };

    const resize = () => {
      const w = mount.clientWidth || 1, h = mount.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(mount);

    // --- Pick-and-place state machine ---
    type Phase = 'approach' | 'grasp' | 'lift' | 'carry' | 'place' | 'retreat' | 'reset';
    let phase: Phase = 'approach';
    let dwell = 0;
    let held = false;
    const HOVER = 1.1;
    const gp = new THREE.Vector3();
    const sub = new THREE.Vector3();
    let cur = { yaw: 0, q1: 0, q2: 0 };
    let grip = 0.2; // half-gap of the claw

    const subTarget = (): THREE.Vector3 => {
      switch (phase) {
        case 'approach': return sub.copy(PICK).setY(PICK.y + HOVER);
        case 'grasp': return sub.copy(PICK);
        case 'lift': return sub.copy(PICK).setY(PICK.y + HOVER);
        case 'carry': return sub.copy(PLACE).setY(PLACE.y + HOVER);
        case 'place': return sub.copy(PLACE);
        case 'retreat': return sub.copy(PLACE).setY(PLACE.y + HOVER);
        case 'reset': return sub.copy(PICK).setY(PICK.y + HOVER);
      }
    };

    let raf = 0;
    const timer = new THREE.Timer();
    timer.connect(document);

    const frame = (timestamp: number) => {
      timer.update(timestamp);
      const dt = Math.min(timer.getDelta(), 0.05);
      updatePlaceFromPointer();

      const tgt = subTarget();
      const goal = solve(tgt);
      const k = reduce ? 1 : 0.1;
      cur.yaw = lerp(cur.yaw, goal.yaw, k);
      cur.q1 = lerp(cur.q1, goal.q1, k * 1.3);
      cur.q2 = lerp(cur.q2, goal.q2, k * 1.3);
      column.rotation.y = cur.yaw;
      shoulder.rotation.z = cur.q1;
      elbow.rotation.z = cur.q2;

      // claw open/close by phase
      const wantClosed = held || phase === 'grasp';
      grip = lerp(grip, wantClosed ? HALF + 0.02 : 0.28, 0.14);
      clawA.position.y = grip;
      clawB.position.y = -grip;

      // resolve world grip point, carry the cube
      scene.updateMatrixWorld(true);
      gripAnchor.getWorldPosition(gp);
      if (held) { cube.position.copy(gp); cube.rotation.y = cur.yaw; }

      const reached = gp.distanceTo(tgt) < 0.14;
      dwell += dt;

      switch (phase) {
        case 'approach': if (reached) { phase = 'grasp'; dwell = 0; } break;
        case 'grasp': if (grip < HALF + 0.06 && dwell > 0.35) { held = true; phase = 'lift'; dwell = 0; } break;
        case 'lift': if (reached) { phase = 'carry'; dwell = 0; } break;
        case 'carry': if (reached) { phase = 'place'; dwell = 0; } break;
        case 'place':
          if (reached && dwell > 0.25) { held = false; cube.position.copy(PLACE); phase = 'retreat'; dwell = 0; }
          break;
        case 'retreat': if (reached && dwell > 0.3) { phase = 'reset'; dwell = 0; } break;
        case 'reset':
          // respawn the payload back on the pedestal with a little pop
          cube.position.copy(PICK);
          cube.scale.setScalar(Math.min(1, dwell * 4));
          if (reached && dwell > 0.35) { cube.scale.setScalar(1); phase = 'approach'; dwell = 0; }
          break;
      }

      // pad pulse
      const pulse = 1 + Math.sin(timer.getElapsed() * 3) * 0.06;
      pad.scale.set(pulse, 1, pulse);

      // gentle auto-orbit + slight pointer influence
      const t = timer.getElapsed();
      const camAngle = reduce ? 0.7 : t * 0.08;
      const camX = Math.cos(camAngle) * 7.2 + orbit.x * 1.5;
      const camZ = Math.sin(camAngle) * 7.2;
      camera.position.x += (camX - camera.position.x) * 0.03;
      camera.position.z += (camZ - camera.position.z) * 0.03;
      camera.position.y += (3.6 - orbit.y * 1.8 - camera.position.y) * 0.04;
      camera.lookAt(0, 1.3, 0);

      renderer.render(scene, camera);
      if (!reduce) raf = requestAnimationFrame(frame);
    };
    frame(performance.now());
    if (reduce) { held = true; renderer.render(scene, camera); }

    return () => {
      cancelAnimationFrame(raf);
      timer.dispose();
      ro.disconnect();
      mount.removeEventListener('mousemove', onMove);
      renderer.dispose();
      scene.traverse((o) => {
        const a = o as unknown as { geometry?: THREE.BufferGeometry; material?: THREE.Material };
        a.geometry?.dispose?.();
        a.material?.dispose?.();
      });
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} className={className} />;
}

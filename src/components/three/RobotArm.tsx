import { useEffect, useRef } from "react";
import * as THREE from "three";
import {
  ARM,
  ARM_PICK,
  ARM_DROP,
  advanceArmTarget,
  armCameraDistance,
  constrainArmDrop,
  solveArmPose,
  toArmTarget,
} from "./robotArmMotion";

/**
 * Interactive articulated robot arm running a real pick-and-place cycle.
 *
 * - Elbow-up inverse kinematics, a level wrist and cylindrical tool paths keep
 *   the links clear of the body/floor and the fingers aligned with the payload.
 * - Interactive: move the cursor over the scene to steer WHERE the arm drops the
 *   part — a glowing pad tracks the pointer on the floor and the arm carries the
 *   cube there, sets it down, and returns for the next one.
 */
export function RobotArm({ className = "" }: { className?: string }) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const C = {
      indigo: 0x360568,
      tekhelet: 0x5b2a86,
      glaucous: 0x7785ac,
      teal: 0x9ac6c5,
      celadon: 0xa5e6ba,
    };
    const { upper: L1, forearm: L2, tool: TOOL, shoulderHeight: SHY, halfPayload: HALF } = ARM;
    const CUBE = HALF * 2;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    const cameraFocus = new THREE.Vector3(0, ARM.frameHeight, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);
    Object.assign(renderer.domElement.style, {
      width: "100%",
      height: "100%",
      display: "block",
      cursor: "crosshair",
    });

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

    const mat = (color: number, rough = 0.42, metal = 0.55) =>
      new THREE.MeshStandardMaterial({ color, metalness: metal, roughness: rough });

    // Grid floor
    const grid = new THREE.GridHelper(16, 16, C.glaucous, C.glaucous);
    const gm = grid.material as THREE.Material;
    gm.opacity = 0.15;
    gm.transparent = true;
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
    const plinth = new THREE.Mesh(
      new THREE.CylinderGeometry(0.95, 1.18, 0.35, 40),
      mat(C.indigo, 0.5),
    );
    plinth.position.y = 0.175;
    base.add(plinth);
    for (let i = 0; i < 8; i++) {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.08, 6), mat(C.glaucous));
      b.position.set(
        Math.cos((i / 8) * Math.PI * 2) * 0.82,
        0.36,
        Math.sin((i / 8) * Math.PI * 2) * 0.82,
      );
      base.add(b);
    }

    const column = new THREE.Group();
    column.position.y = 0.35;
    base.add(column);
    const columnHeight = ARM.columnTop - 0.35;
    const columnMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.5, 0.62, columnHeight, 32),
      mat(C.tekhelet),
    );
    columnMesh.position.y = columnHeight / 2;
    column.add(columnMesh);

    const shoulder = new THREE.Group();
    shoulder.position.y = SHY - 0.35;
    column.add(shoulder);
    shoulder.add(new THREE.Mesh(new THREE.SphereGeometry(0.4, 28, 28), mat(C.tekhelet)));
    shoulder.add(
      new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.06, 10, 28), mat(C.celadon, 0.4, 0.4)),
    );
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
    const clawA = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, ARM.fingerHeight, ARM.fingerThickness),
      clawMat,
    );
    const clawB = clawA.clone();
    // Grip the side faces, not the underside resting on the pick pedestal.
    clawA.position.set(TOOL - 0.02, 0, 0.28);
    clawB.position.set(TOOL - 0.02, 0, -0.28);
    wrist.add(clawA, clawB);

    // Pick pedestal + payload cube
    const pedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(0.4, 0.46, 0.4, 24),
      mat(C.indigo, 0.55),
    );
    const PICK = new THREE.Vector3(ARM_PICK.x, ARM_PICK.y, ARM_PICK.z);
    pedestal.position.set(PICK.x, 0.2, PICK.z);
    scene.add(pedestal);

    const cube = new THREE.Mesh(new THREE.BoxGeometry(CUBE, CUBE, CUBE), mat(C.celadon, 0.35, 0.3));
    (cube.material as THREE.MeshStandardMaterial).emissive = new THREE.Color(C.celadon);
    (cube.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.22;
    cube.position.copy(PICK);
    const pickOrientation = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 1, 0),
      Math.atan2(-PICK.z, PICK.x),
    );
    cube.quaternion.copy(pickOrientation);
    scene.add(cube);
    const cubeEdges = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(CUBE, CUBE, CUBE)),
      new THREE.LineBasicMaterial({ color: C.indigo, transparent: true, opacity: 0.4 }),
    );
    cube.add(cubeEdges);

    // Drop pad follows the cursor on the floor
    const pad = new THREE.Group();
    const padRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.42, 0.02, 8, 40),
      new THREE.MeshBasicMaterial({ color: C.teal, transparent: true, opacity: 0.85 }),
    );
    padRing.rotation.x = Math.PI / 2;
    const padDisc = new THREE.Mesh(
      new THREE.CircleGeometry(0.4, 40),
      new THREE.MeshBasicMaterial({ color: C.teal, transparent: true, opacity: 0.1 }),
    );
    padDisc.rotation.x = -Math.PI / 2;
    pad.add(padRing, padDisc);
    const PLACE = new THREE.Vector3(ARM_DROP.x, ARM_DROP.y, ARM_DROP.z);
    const cyclePlace = PLACE.clone();
    pad.position.set(PLACE.x, 0.02, PLACE.z);
    scene.add(pad);

    const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

    // Pointer → floor raycast for the drop location
    const ndc = new THREE.Vector2();
    let pointerDirty = false;
    const raycaster = new THREE.Raycaster();
    const floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const hit = new THREE.Vector3();
    const orbit = { x: 0, y: 0 };
    const viewOrbit = { x: 0, y: 0 };
    const onMove = (e: MouseEvent) => {
      const r = mount.getBoundingClientRect();
      const mx = (e.clientX - r.left) / r.width;
      const my = (e.clientY - r.top) / r.height;
      ndc.set(mx * 2 - 1, -(my * 2 - 1));
      pointerDirty = true;
      orbit.x = mx - 0.5;
      orbit.y = my - 0.5;
    };
    mount.addEventListener("mousemove", onMove);

    const updatePlaceFromPointer = () => {
      // Camera auto-orbit must not move a stationary pointer's drop target.
      if (!pointerDirty) return;
      pointerDirty = false;
      raycaster.setFromCamera(ndc, camera);
      if (!raycaster.ray.intersectPlane(floor, hit)) return;
      const safe = constrainArmDrop(hit);
      PLACE.set(safe.x, safe.y, safe.z);
    };

    const resize = () => {
      const w = mount.clientWidth || 1,
        h = mount.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(mount);

    // --- Pick-and-place state machine ---
    type Phase = "approach" | "grasp" | "lift" | "carry" | "place" | "retreat" | "reset";
    let phase: Phase = "approach";
    let dwell = 0;
    let held = false;
    const gp = new THREE.Vector3();
    const sub = new THREE.Vector3();
    // Start in a solved, collision-free pose (also used for reduced motion).
    let currentTarget = toArmTarget({ ...ARM_PICK, y: ARM.travelHeight });
    // Finger half-thickness is 0.045: leave a small gap instead of embedding
    // the closed fingers in the payload's sides.
    const closedGrip = HALF + ARM.fingerThickness / 2 + 0.005;
    let grip = 0.28;

    const subTarget = (): THREE.Vector3 => {
      switch (phase) {
        case "approach":
          return sub.copy(PICK).setY(ARM.travelHeight);
        case "grasp":
          return sub.copy(PICK);
        case "lift":
          return sub.copy(PICK).setY(ARM.travelHeight);
        case "carry":
          return sub.copy(cyclePlace).setY(ARM.travelHeight);
        case "place":
          return sub.copy(cyclePlace);
        case "retreat":
          return sub.copy(cyclePlace).setY(ARM.travelHeight);
        case "reset":
          return sub.copy(PICK).setY(ARM.travelHeight);
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
      currentTarget = reduce
        ? toArmTarget(tgt)
        : advanceArmTarget(currentTarget, toArmTarget(tgt), dt);
      const pose = solveArmPose(currentTarget);
      column.rotation.y = pose.yaw;
      shoulder.rotation.z = pose.shoulder;
      elbow.rotation.z = pose.elbow;
      wrist.rotation.z = pose.wrist;

      // claw open/close by phase
      const wantClosed = held || phase === "grasp";
      grip = lerp(grip, wantClosed ? closedGrip : 0.28, reduce ? 1 : 1 - Math.exp(-9 * dt));
      clawA.position.z = grip;
      clawB.position.z = -grip;

      // resolve world grip point, carry the cube
      scene.updateMatrixWorld(true);
      gripAnchor.getWorldPosition(gp);
      // Keep the payload aligned with the level gripper throughout the turn.
      if (held) {
        cube.position.copy(gp);
        gripAnchor.getWorldQuaternion(cube.quaternion);
      }

      const reached = gp.distanceTo(tgt) < 0.025;
      dwell += dt;

      switch (phase) {
        case "approach":
          if (reached) {
            phase = "grasp";
            dwell = 0;
          }
          break;
        case "grasp":
          if (reached && grip < closedGrip + 0.01 && dwell > 0.35) {
            held = true;
            phase = "lift";
            dwell = 0;
          }
          break;
        case "lift":
          if (reached) {
            cyclePlace.copy(PLACE);
            phase = "carry";
            dwell = 0;
          }
          break;
        case "carry":
          if (reached) {
            phase = "place";
            dwell = 0;
          }
          break;
        case "place":
          if (reached && dwell > 0.25) {
            held = false;
            cube.position.copy(cyclePlace);
            phase = "retreat";
            dwell = 0;
          }
          break;
        case "retreat":
          if (reached && dwell > 0.3) {
            phase = "reset";
            dwell = 0;
          }
          break;
        case "reset":
          // respawn the payload back on the pedestal with a little pop
          cube.position.copy(PICK);
          cube.quaternion.copy(pickOrientation);
          cube.scale.setScalar(Math.min(1, dwell * 4));
          if (reached && dwell > 0.35) {
            cube.scale.setScalar(1);
            phase = "approach";
            dwell = 0;
          }
          break;
      }

      // pad pulse
      const delivering = phase === "carry" || phase === "place" || phase === "retreat";
      const drop = delivering ? cyclePlace : PLACE;
      pad.position.set(drop.x, 0.02, drop.z);
      const pulse = 1 + Math.sin(timer.getElapsed() * 3) * 0.06;
      pad.scale.set(pulse, 1, pulse);

      // Gentle camera sway + smoothed pointer influence.
      const t = timer.getElapsed();
      const cameraBlend = reduce ? 1 : 1 - Math.exp(-3 * dt);
      viewOrbit.x = lerp(viewOrbit.x, orbit.x, cameraBlend);
      viewOrbit.y = lerp(viewOrbit.y, orbit.y, cameraBlend);
      // Stay near a side-on view so the links remain readable, rather than
      // orbiting directly behind the column and hiding the elbow/gripper.
      const camAngle = -0.85 + (reduce ? 0 : Math.sin(t * 0.1) * 0.18) + viewOrbit.x * 0.2;
      const elevation = 0.42 - viewOrbit.y * 0.1;
      const distance = armCameraDistance(camera.aspect);
      camera.position.set(
        Math.cos(camAngle) * Math.cos(elevation) * distance,
        ARM.frameHeight + Math.sin(elevation) * distance,
        Math.sin(camAngle) * Math.cos(elevation) * distance,
      );
      camera.lookAt(cameraFocus);
      if (mount.dataset.armPhase !== phase) mount.dataset.armPhase = phase;

      renderer.render(scene, camera);
      if (!reduce) raf = requestAnimationFrame(frame);
    };
    frame(performance.now());

    return () => {
      cancelAnimationFrame(raf);
      timer.dispose();
      ro.disconnect();
      mount.removeEventListener("mousemove", onMove);
      renderer.dispose();
      scene.traverse((o) => {
        const a = o as unknown as { geometry?: THREE.BufferGeometry; material?: THREE.Material };
        a.geometry?.dispose?.();
        a.material?.dispose?.();
      });
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} data-testid="robot-arm" className={className} />;
}

import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  ARM,
  ARM_PICK,
  ARM_DROP,
  advanceArmTarget,
  angleDelta,
  armCameraDistance,
  constrainArmDrop,
  solveArmPose,
  toArmPoint,
  toArmTarget,
  type ArmTarget,
} from "../../src/components/three/robotArmMotion";

function joints(target: ArmTarget) {
  const pose = solveArmPose(target);
  const elbow = new THREE.Vector3(
    ARM.upper * Math.cos(pose.shoulder),
    ARM.shoulderHeight + ARM.upper * Math.sin(pose.shoulder),
    0,
  );
  const wrist = elbow
    .clone()
    .add(
      new THREE.Vector3(
        ARM.forearm * Math.cos(pose.shoulder + pose.elbow),
        ARM.forearm * Math.sin(pose.shoulder + pose.elbow),
        0,
      ),
    );
  const tool = wrist.clone().add(new THREE.Vector3(ARM.tool, 0, 0));
  const yaw = new THREE.Matrix4().makeRotationY(pose.yaw);
  return {
    pose,
    shoulder: new THREE.Vector3(0, ARM.shoulderHeight, 0),
    elbow: elbow.applyMatrix4(yaw),
    wrist: wrist.applyMatrix4(yaw),
    tool: tool.applyMatrix4(yaw),
  };
}

function checkClearance(target: ArmTarget) {
  const { pose, shoulder, elbow, wrist, tool } = joints(target);
  expect(pose.elbow).toBeLessThan(0);
  expect(pose.shoulder).toBeGreaterThan(0);
  expect(pose.shoulder).toBeLessThan(Math.PI / 2);
  expect(pose.shoulder + pose.elbow + pose.wrist).toBeCloseTo(0, 12);
  const point = toArmPoint(target);
  expect(tool.distanceTo(new THREE.Vector3(point.x, point.y, point.z))).toBeLessThan(1e-10);
  for (const [start, end, radius] of [
    [shoulder, elbow, 0.19],
    [elbow, wrist, 0.14],
  ] as const) {
    for (let i = 0; i <= 20; i++) {
      const point = start.clone().lerp(end, i / 20);
      expect(point.y - radius).toBeGreaterThan(0);
      // Conservative cylinder enclosing the column, plus the link thickness.
      if (point.y - radius < ARM.columnTop) {
        expect(Math.hypot(point.x, point.z) - radius).toBeGreaterThan(0.62);
      }
      if (point.y - radius < 0.35) {
        expect(Math.hypot(point.x, point.z) - radius).toBeGreaterThan(1.18);
      }
      expect(point.distanceTo(new THREE.Vector3(0, ARM.frameHeight, 0)) + radius).toBeLessThan(
        ARM.frameRadius,
      );
    }
  }
  expect(tool.y - ARM.halfPayload).toBeGreaterThanOrEqual(-1e-10);
}

describe("robot arm safe motion", () => {
  it("holds the side faces without embedding fingers in the cube, floor or pick pedestal", () => {
    const closedGrip = ARM.halfPayload + ARM.fingerThickness / 2 + 0.005;
    expect(closedGrip - ARM.fingerThickness / 2).toBeGreaterThan(ARM.halfPayload);
    expect(ARM.halfPayload - ARM.fingerHeight / 2).toBeGreaterThan(0);
    expect(ARM_PICK.y - ARM.fingerHeight / 2).toBeGreaterThan(0.4);
  });

  it("reaches pick and drop heights with the elbow above the body and a level wrist", () => {
    for (let r = ARM.minRadius; r <= ARM.maxRadius + 0.001; r += 0.075) {
      for (let y = ARM.halfPayload; y <= ARM.travelHeight + 0.001; y += 0.1) {
        checkClearance({ yaw: 0.7, radius: r, height: y });
      }
    }
    for (const point of [ARM_PICK, ARM_DROP, { ...ARM_PICK, y: ARM.travelHeight }]) {
      checkClearance(toArmTarget(point));
    }
    for (const radius of [ARM.minRadius, ARM.maxRadius]) {
      for (const height of [ARM.halfPayload, ARM.travelHeight]) {
        checkClearance({ yaw: -Math.PI, radius, height });
      }
    }
  });

  it("clamps pointer targets without overlapping the body or pick pedestal", () => {
    for (const distance of [0, 0.001, 0.8, 1.15, 2.1, 3.3, 100]) {
      for (let angle = -Math.PI; angle <= Math.PI; angle += Math.PI / 48) {
        const point = constrainArmDrop({
          x: Math.cos(angle) * distance,
          y: 0,
          z: Math.sin(angle) * distance,
        });
        const radius = Math.hypot(point.x, point.z);
        expect(radius).toBeGreaterThanOrEqual(ARM.minRadius - 1e-10);
        expect(radius).toBeLessThanOrEqual(ARM.maxRadius + 1e-10);
        expect(Math.hypot(point.x - ARM_PICK.x, point.z - ARM_PICK.z)).toBeGreaterThanOrEqual(
          0.95 - 1e-10,
        );
        expect(point.y).toBe(ARM.halfPayload);
      }
    }
    expect(constrainArmDrop({ x: NaN, y: 0, z: Infinity })).toEqual(ARM_DROP);
  });

  it("keeps the complete pick/lift/carry/place/retreat/reset path clear at different frame rates", () => {
    for (const dt of [1 / 30, 1 / 60, 1 / 144]) {
      let current = toArmTarget({ ...ARM_PICK, y: ARM.travelHeight });
      const drop = constrainArmDrop({ x: -20, y: 0, z: -1 });
      const waypoints = [
        ARM_PICK,
        { ...ARM_PICK, y: ARM.travelHeight },
        { ...drop, y: ARM.travelHeight },
        drop,
        { ...drop, y: ARM.travelHeight },
        { ...ARM_PICK, y: ARM.travelHeight },
      ];
      for (const point of waypoints) {
        const goal = toArmTarget(point);
        for (let time = 0; time < 2; time += dt) {
          current = advanceArmTarget(current, goal, dt);
          checkClearance(current);
        }
        expect(
          joints(current).tool.distanceTo(new THREE.Vector3(point.x, point.y, point.z)),
        ).toBeLessThan(0.025);
      }
    }
  });

  it("crosses the yaw seam by the short route and uses elapsed time, not frame count", () => {
    const start = { yaw: Math.PI - 0.01, radius: 2.1, height: 1.8 };
    const goal = { yaw: -Math.PI + 0.01, radius: 2.7, height: 0.17 };
    const next = advanceArmTarget(start, goal, 1 / 60);
    expect(Math.abs(next.yaw - start.yaw)).toBeLessThan(0.01);
    const simulate = (fps: number) => {
      let target = start;
      for (let i = 0; i < fps; i++) target = advanceArmTarget(target, goal, 1 / fps);
      return target;
    };
    expect(simulate(30).radius).toBeCloseTo(simulate(144).radius, 10);
    expect(simulate(30).height).toBeCloseTo(simulate(144).height, 10);
    expect(angleDelta(simulate(30).yaw, simulate(144).yaw)).toBeCloseTo(0, 10);
  });

  it("fits the entire moving assembly in desktop and portrait camera frames", () => {
    for (const aspect of [0.45, 0.8, 1, 1.8]) {
      const camera = new THREE.PerspectiveCamera(42, aspect, 0.1, 100);
      const distance = armCameraDistance(aspect);
      const focus = new THREE.Vector3(0, ARM.frameHeight, 0);
      for (let orbit = 0; orbit < Math.PI * 2; orbit += Math.PI / 4) {
        camera.position.set(
          Math.cos(orbit) * Math.cos(0.42) * distance,
          ARM.frameHeight + Math.sin(0.42) * distance,
          Math.sin(orbit) * Math.cos(0.42) * distance,
        );
        camera.lookAt(focus);
        camera.updateMatrixWorld();
        for (let yaw = -Math.PI; yaw < Math.PI; yaw += Math.PI / 4) {
          for (const height of [ARM.halfPayload, ARM.travelHeight]) {
            const { shoulder, elbow, wrist, tool } = joints({ yaw, radius: ARM.maxRadius, height });
            for (const joint of [shoulder, elbow, wrist, tool]) {
              for (const offset of [-0.3, 0.3]) {
                const projected = joint.clone().addScalar(offset).project(camera);
                expect(Math.abs(projected.x)).toBeLessThan(1);
                expect(Math.abs(projected.y)).toBeLessThan(1);
                expect(Math.abs(projected.z)).toBeLessThan(1);
              }
            }
          }
        }
      }
    }
  });
});

// Keep the render loop's movement math independent of WebGL so clearance and
// framing can be checked over the complete working envelope in unit tests.
export const ARM = {
  upper: 1.7,
  forearm: 1.4,
  tool: 0.6,
  shoulderHeight: 1.05,
  columnTop: 0.8,
  halfPayload: 0.17,
  fingerThickness: 0.09,
  fingerHeight: 0.12,
  minRadius: 2.05,
  maxRadius: 2.8,
  travelHeight: 1.8,
  frameHeight: 1.35,
  frameRadius: 3.4,
} as const;

export type ArmPoint = { x: number; y: number; z: number };
export type ArmTarget = { yaw: number; radius: number; height: number };
export const ARM_PICK: ArmPoint = { x: 1.75, y: 0.4 + ARM.halfPayload, z: 1.35 };
export const ARM_DROP: ArmPoint = { x: -1.9, y: ARM.halfPayload, z: -1.3 };

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
export const angleDelta = (from: number, to: number) =>
  Math.atan2(Math.sin(to - from), Math.cos(to - from));

export function toArmTarget(point: ArmPoint): ArmTarget {
  return {
    yaw: Math.atan2(-point.z, point.x),
    radius: clamp(Math.hypot(point.x, point.z), ARM.minRadius, ARM.maxRadius),
    height: clamp(point.y, ARM.halfPayload, ARM.travelHeight),
  };
}

export function toArmPoint(target: ArmTarget): ArmPoint {
  return {
    x: Math.cos(target.yaw) * target.radius,
    y: target.height,
    z: -Math.sin(target.yaw) * target.radius,
  };
}

export function constrainArmDrop(point: ArmPoint): ArmPoint {
  if (!Number.isFinite(point.x) || !Number.isFinite(point.z)) return { ...ARM_DROP };
  const target = toArmTarget({ ...point, y: ARM.halfPayload });
  const pickYaw = Math.atan2(-ARM_PICK.z, ARM_PICK.x);
  const pickRadius = Math.hypot(ARM_PICK.x, ARM_PICK.z);
  // Project away from the pick pedestal *angularly*, retaining the safe radius.
  // Shifting just X after clamping can put the target back inside the body.
  const minimumSeparation = 0.95;
  const minimumAngle = Math.acos(
    clamp(
      (target.radius ** 2 + pickRadius ** 2 - minimumSeparation ** 2) /
        (2 * target.radius * pickRadius),
      -1,
      1,
    ),
  );
  const delta = angleDelta(pickYaw, target.yaw);
  if (Math.abs(delta) < minimumAngle) {
    target.yaw = pickYaw + (delta < 0 ? -1 : 1) * minimumAngle;
  }
  return toArmPoint(target);
}

export function solveArmPose(target: ArmTarget) {
  const radius = clamp(target.radius, ARM.minRadius, ARM.maxRadius);
  const dy = clamp(target.height, ARM.halfPayload, ARM.travelHeight) - ARM.shoulderHeight;
  // Solve the wrist, then extend the level tool horizontally to the payload.
  // Treating the tool as another angled forearm segment tilts the payload into
  // the floor during placement and makes the fingers intersect its sides.
  const wristRadius = radius - ARM.tool;
  const length = ARM.forearm;
  const cosElbow = clamp(
    (wristRadius ** 2 + dy ** 2 - ARM.upper ** 2 - length ** 2) / (2 * ARM.upper * length),
    -1,
    1,
  );
  // The negative solution keeps the elbow ABOVE the pedestal, not below it.
  const elbow = -Math.acos(cosElbow);
  const shoulder =
    Math.atan2(dy, wristRadius) -
    Math.atan2(length * Math.sin(elbow), ARM.upper + length * Math.cos(elbow));
  return { yaw: target.yaw, shoulder, elbow, wrist: -(shoulder + elbow) };
}

export function advanceArmTarget(current: ArmTarget, goal: ArmTarget, dt: number): ArmTarget {
  const blend = 1 - Math.exp(-5 * Math.max(0, Math.min(dt, 0.05)));
  // Interpolate cylindrical tool coordinates, not individual joint angles or a
  // straight line through the pedestal. Every intermediate pose stays safe.
  return {
    yaw: current.yaw + angleDelta(current.yaw, goal.yaw) * blend,
    radius: clamp(
      current.radius + (goal.radius - current.radius) * blend,
      ARM.minRadius,
      ARM.maxRadius,
    ),
    height: clamp(
      current.height + (goal.height - current.height) * blend,
      ARM.halfPayload,
      ARM.travelHeight,
    ),
  };
}

export function armCameraDistance(aspect: number): number {
  const verticalHalfFov = (21 * Math.PI) / 180;
  const horizontalHalfFov = Math.atan(Math.tan(verticalHalfFov) * Math.max(0.1, aspect));
  return (ARM.frameRadius / Math.sin(Math.min(verticalHalfFov, horizontalHalfFov))) * 1.06;
}

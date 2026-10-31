// Deterministic control and animation math. World units are meters.
export const WALK_SPEED = 1.7;
export const RUN_SPEED = 4.15;
export const WALK_STRIDE = 1.55; // two footfalls per cycle, calibrated for 1s walk clip
export const RUN_STRIDE = 2.35;  // two footfalls per 0.625s run clip
export const DEADZONE = 0.12;
export function analogStrength(x, z) {
  const r = Math.min(1, Math.hypot(x,z));
  return r <= DEADZONE ? 0 : Math.pow((r-DEADZONE)/(1-DEADZONE), 0.92);
}
export function targetSpeed(x,z,running) {
  const strength = analogStrength(x,z);
  return strength*(running?RUN_SPEED:WALK_SPEED);
}
export function blendFactor(rate,dt) { return 1-Math.exp(-rate*Math.max(0,dt)); }
export function wrapAngle(angle) {return ((angle+Math.PI)%(Math.PI*2)+Math.PI*2)%(Math.PI*2)-Math.PI;}
export function cycleTime(distance,stride,duration) {
  const phase=((distance/stride)%1+1)%1;
  return phase*duration;
}


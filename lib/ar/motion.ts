type Point = { x: number; y: number };
/** Bounded prediction between detector measurements, with quick correction on reacquisition. */
export function createMarkerMotion() {
  let sample: (Point & { time: number }) | null = null;
  let velocity: Point = { x: 0, y: 0 };
  let displayed: Point | null = null;
  let frameTime = 0;
  return {
    update(x: number, y: number, time: number) {
      if (![x, y, time].every(Number.isFinite)) return;
      // Repeated poses during tracking loss are not fresh measurements.
      if (sample && Math.hypot(x - sample.x, y - sample.y) < .1) return;
      const dt = sample ? time - sample.time : 0;
      velocity = sample && dt >= 8 && dt < 200
        ? { x: Math.max(-3, Math.min(3, (x - sample.x) / dt)), y: Math.max(-3, Math.min(3, (y - sample.y) / dt)) }
        : { x: 0, y: 0 };
      sample = { x, y, time };
    },
    frame(time: number): Point | null {
      if (!sample) return null;
      const age = Math.max(0, time - sample.time);
      const lead = Math.min(age, 60) + (age > 60 ? 60 * (1 - Math.exp(-(Math.min(age, 180) - 60) / 60)) : 0);
      const target = { x: sample.x + velocity.x * lead, y: sample.y + velocity.y * lead };
      const alpha = 1 - Math.exp(-Math.min(34, Math.max(0, time - frameTime)) / 35);
      displayed = displayed ? {
        x: displayed.x + (target.x - displayed.x) * alpha,
        y: displayed.y + (target.y - displayed.y) * alpha,
      } : target;
      frameTime = time;
      return displayed;
    },
    reset() { sample = null; displayed = null; velocity = { x: 0, y: 0 }; frameTime = 0; },
  };
}

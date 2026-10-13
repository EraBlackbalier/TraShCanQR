import { expect, it } from 'vitest';
import { createMarkerMotion } from './motion';
it('continues movement between detections but bounds prediction during loss', () => {
  const motion = createMarkerMotion();
  motion.update(0, 0, 0); motion.frame(0);
  motion.update(30, 0, 30);
  const first = motion.frame(30)!;
  motion.update(30, 0, 46);
  const next = motion.frame(46)!;
  expect(next.x).toBeGreaterThan(first.x);
  for (let t = 62; t < 2000; t += 16) motion.frame(t);
  expect(motion.frame(2000)!.x).toBeLessThan(150);
});
it('corrects a reversal without teleporting and resets between viewports', () => {
  const motion = createMarkerMotion();
  motion.update(100, 0, 0); motion.frame(0);
  motion.update(-100, 0, 30);
  const point = motion.frame(30)!;
  expect(point.x).toBeLessThan(100);
  expect(point.x).toBeGreaterThan(-100);
  motion.reset();
  expect(motion.frame(60)).toBeNull();
});

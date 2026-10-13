import { afterEach, describe, expect, it, vi } from 'vitest';
import { createTrackingContinuity } from './tracking';
afterEach(() => vi.useRealTimers());
describe('tracking continuity', () => {
  it('keeps the card visible across brief repeated motion gaps', () => {
    vi.useFakeTimers();
    const emit = vi.fn();
    const tracking = createTrackingContinuity(emit);
    tracking.found('organicos');
    tracking.lost('organicos');
    vi.advanceTimersByTime(700);
    tracking.found('organicos');
    vi.advanceTimersByTime(1500);
    expect(emit.mock.calls.map(([action]) => action.type)).toEqual(['found', 'found']);
    tracking.dispose();
  });
  it('hides a removed marker after the grace period without extending duplicate losses', () => {
    vi.useFakeTimers();
    const emit = vi.fn();
    const tracking = createTrackingContinuity(emit);
    tracking.lost('organicos');
    vi.advanceTimersByTime(500);
    tracking.lost('organicos');
    vi.advanceTimersByTime(500);
    expect(emit).toHaveBeenCalledTimes(1);
    expect(emit).toHaveBeenCalledWith({ type: 'lost', slug: 'organicos' });
  });
  it('switches categories immediately and clears stale callbacks on disposal', () => {
    vi.useFakeTimers();
    const emit = vi.fn();
    const tracking = createTrackingContinuity(emit);
    tracking.lost('organicos');
    tracking.found('vidrio');
    expect(emit.mock.calls.map(([action]) => action)).toEqual([
      { type: 'lost', slug: 'organicos' }, { type: 'found', slug: 'vidrio' },
    ]);
    tracking.lost('vidrio');
    tracking.dispose();
    vi.runAllTimers();
    expect(emit).toHaveBeenCalledTimes(2);
  });
});


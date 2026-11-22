import { useEffect, useMemo, useRef, useState } from 'react';

export interface GameTimer {
  /** Whole seconds elapsed, updated about once a second for display. */
  elapsed: number;
  /** Exact elapsed seconds right now (not limited to the last tick). */
  getElapsed: () => number;
  /** Stops the clock and returns the final elapsed seconds. */
  stop: () => number;
  /** Starts counting again from `seconds`. */
  restart: (seconds: number) => number;
}

/**
 * A game clock that only runs while the page is visible, so time spent with
 * the app in the background (or the phone locked) is not counted.
 */
export function useGameTimer(initialSeconds: number, running: boolean): GameTimer {
  const accumulatedMs = useRef(initialSeconds * 1000);
  const runningSince = useRef<number | null>(null);
  const stopped = useRef(!running);
  const [elapsed, setElapsed] = useState(initialSeconds);

  const controls = useMemo(() => {
    const pause = () => {
      if (runningSince.current !== null) {
        accumulatedMs.current += Date.now() - runningSince.current;
        runningSince.current = null;
      }
    };
    const resume = () => {
      if (runningSince.current === null && !stopped.current && document.visibilityState !== 'hidden') {
        runningSince.current = Date.now();
      }
    };
    const getElapsed = () => {
      const live = runningSince.current !== null ? Date.now() - runningSince.current : 0;
      return Math.floor((accumulatedMs.current + live) / 1000);
    };
    return {
      pause,
      resume,
      getElapsed,
      stop: () => {
        pause();
        stopped.current = true;
        const final = getElapsed();
        setElapsed(final);
        return final;
      },
      restart: (seconds: number) => {
        accumulatedMs.current = seconds * 1000;
        runningSince.current = null;
        stopped.current = false;
        resume();
        setElapsed(seconds);
        return seconds;
      },
    };
  }, []);

  useEffect(() => {
    stopped.current = !running;
    if (!running) {
      controls.pause();
      return;
    }
    controls.resume();

    const tick = () => setElapsed(controls.getElapsed());
    const interval = window.setInterval(tick, 1000);
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') controls.pause();
      else controls.resume();
      tick();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
      controls.pause();
    };
  }, [running, controls]);

  const { getElapsed, stop, restart } = controls;
  return useMemo(() => ({ elapsed, getElapsed, stop, restart }), [elapsed, getElapsed, stop, restart]);
}

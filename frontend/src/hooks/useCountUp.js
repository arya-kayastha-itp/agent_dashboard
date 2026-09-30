import { useEffect, useRef, useState } from 'react';

const DURATION_MS = 1200;

function prefersReducedMotion() {
  return typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
}

// Animates a displayed integer toward `target` (ease-out), starting from 0 on
// mount and from the last shown value when `target` changes later (e.g. a
// refetch). Purely presentational — callers still own the real value. With
// reduced motion the real value is shown straight away.
export function useCountUp(target) {
  const reduced = prefersReducedMotion();
  const [shown, setShown] = useState(0);
  const lastShown = useRef(0);

  useEffect(() => {
    if (prefersReducedMotion()) return undefined;

    const from = lastShown.current;
    const start = performance.now();
    let frame;

    const tick = (now) => {
      const progress = Math.min(1, (now - start) / DURATION_MS);
      const eased = 1 - (1 - progress) ** 3;
      const next = Math.round(from + (target - from) * eased);
      lastShown.current = next;
      setShown(next);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target]);

  return reduced ? target : shown;
}

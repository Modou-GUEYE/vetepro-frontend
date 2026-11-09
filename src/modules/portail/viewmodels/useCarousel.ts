import { TouchEvent, useCallback, useEffect, useState } from 'react';
import { wrapIndex } from '../models/portail';

/** Carrousel : défilement automatique (8 s par défaut), pause au survol, navigation par points et balayage tactile. */
export function useCarousel(count: number, delay = 8000) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [touchX, setTouchX] = useState<number | null>(null);
  const go = useCallback((i: number) => setIndex(wrapIndex(i, count)), [count]);

  useEffect(() => { setIndex((i) => wrapIndex(i, count)); }, [count]);
  useEffect(() => {
    if (paused || count < 2) return;
    const t = setInterval(() => setIndex((i) => wrapIndex(i + 1, count)), delay);
    return () => clearInterval(t);
  }, [paused, count, delay, index]);

  return {
    index, go, next: () => go(index + 1), prev: () => go(index - 1),
    hover: { onMouseEnter: () => setPaused(true), onMouseLeave: () => setPaused(false) },
    swipe: {
      onTouchStart: (e: TouchEvent) => setTouchX(e.touches[0]!.clientX),
      onTouchEnd: (e: TouchEvent) => {
        if (touchX === null) return;
        const dx = e.changedTouches[0]!.clientX - touchX;
        if (Math.abs(dx) > 50) go(index + (dx < 0 ? 1 : -1));
        setTouchX(null);
      },
    },
  };
}

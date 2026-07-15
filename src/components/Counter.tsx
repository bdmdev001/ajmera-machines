'use client';

import { useEffect, useRef, useState } from 'react';

interface CounterProps {
  to: number;
  duration?: number;
  suffix?: string;
  prefix?: string;
  /** Locale-formatted thousands separators */
  format?: boolean;
}

/**
 * Number count-up that fires once when scrolled into view.
 * Uses requestAnimationFrame with an ease-out curve.
 */
export default function Counter({
  to,
  duration = 1600,
  suffix = '',
  prefix = '',
  format = false,
}: CounterProps) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [value, setValue] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const run = () => {
      if (started.current) return;
      started.current = true;
      const start = performance.now();

      const tick = (now: number) => {
        const p = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - p, 3); // ease-out cubic
        setValue(Math.round(eased * to));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };

    if (typeof IntersectionObserver === 'undefined') {
      run();
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => entry.isIntersecting && run(),
      { threshold: 0.4 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [to, duration]);

  const display = format ? value.toLocaleString() : String(value);

  return (
    <span ref={ref}>
      {prefix}
      {display}
      {suffix}
    </span>
  );
}

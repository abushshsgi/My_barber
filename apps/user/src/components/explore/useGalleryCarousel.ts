import { useEffect, useState } from "react";

const DEFAULT_INTERVAL_MS = 3500;

export function useGalleryCarousel(length: number, intervalMs = DEFAULT_INTERVAL_MS) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex(0);
  }, [length]);

  useEffect(() => {
    if (length <= 1) return;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % length);
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs, length]);

  return { activeIndex, setActiveIndex };
}

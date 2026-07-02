"use client";

import { useEffect } from "react";

const NAV_SCROLL_THRESHOLD = 8;
const PARALLAX_MAX_SCROLL = 700;
const PARALLAX_FACTOR = 0.05;
const DEFAULT_FRAME_WIDTH = 1280;
const COUNT_DURATION_MS = 1400;
const GALLERY_END_PADDING = 48;

/**
 * Progressive enhancement for the landing page. Everything is keyed off
 * `data-marketing-*` hooks so it survives CSS-module class hashing, and the
 * page is complete without JS (reveals are pure CSS). Frosts the nav on scroll,
 * scales the fixed-width screen mockups to their frames, parallaxes the hero
 * shot, counts up the stats when they enter view, and drives the pinned
 * horizontal gallery from scroll progress.
 */
export function MarketingEffects() {
  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const cleanups: Array<() => void> = [];
    const onScroll = (fn: () => void) => {
      window.addEventListener("scroll", fn, { passive: true });
      cleanups.push(() => window.removeEventListener("scroll", fn));
    };

    const nav = document.querySelector<HTMLElement>("[data-marketing-nav]");
    const onNavScroll = () =>
      nav?.setAttribute("data-scrolled", String(window.scrollY > NAV_SCROLL_THRESHOLD));
    onNavScroll();
    onScroll(onNavScroll);

    const shots = Array.from(document.querySelectorAll<HTMLElement>("[data-marketing-shot]"));
    const fitShots = () => {
      for (const shot of shots) {
        const frame = shot.querySelector("iframe");
        const native = Number(shot.dataset.marketingShot) || DEFAULT_FRAME_WIDTH;
        if (frame) frame.style.transform = `scale(${shot.clientWidth / native})`;
      }
    };
    fitShots();
    window.addEventListener("resize", fitShots, { passive: true });
    cleanups.push(() => window.removeEventListener("resize", fitShots));
    const resizeObserver = "ResizeObserver" in window ? new ResizeObserver(fitShots) : null;
    for (const shot of shots) resizeObserver?.observe(shot);
    if (resizeObserver) cleanups.push(() => resizeObserver.disconnect());

    const parallax = document.querySelector<HTMLElement>("[data-marketing-parallax]");
    if (parallax && !reduceMotion) {
      const onParallax = () => {
        const offset = -Math.min(window.scrollY, PARALLAX_MAX_SCROLL) * PARALLAX_FACTOR;
        parallax.style.transform = `translateY(${offset}px)`;
      };
      onParallax();
      onScroll(onParallax);
    }

    const counters = Array.from(document.querySelectorAll<HTMLElement>("[data-marketing-count]"));
    const countUp = (el: HTMLElement) => {
      const target = Number(el.dataset.marketingCount);
      const format = (v: number) => Math.round(v).toLocaleString("en-US");
      if (reduceMotion) {
        el.textContent = format(target);
        return;
      }
      let start: number | null = null;
      const step = (ts: number) => {
        if (start === null) start = ts;
        const p = Math.min(1, (ts - start) / COUNT_DURATION_MS);
        el.textContent = format(target * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    const countObserver =
      "IntersectionObserver" in window
        ? new IntersectionObserver(
            (entries, observer) => {
              for (const entry of entries) {
                if (!entry.isIntersecting) continue;
                countUp(entry.target as HTMLElement);
                observer.unobserve(entry.target);
              }
            },
            { threshold: 0.6 },
          )
        : null;
    if (countObserver) {
      for (const counter of counters) countObserver.observe(counter);
      cleanups.push(() => countObserver.disconnect());
    } else {
      for (const counter of counters) countUp(counter);
    }

    const track = document.querySelector<HTMLElement>("[data-marketing-gallery]");
    const pin = track?.closest("section");
    if (track && pin) {
      const onGalleryScroll = () => {
        const total = pin.offsetHeight - window.innerHeight;
        if (total <= 0) return;
        const progress = Math.min(1, Math.max(0, -pin.getBoundingClientRect().top / total));
        const distance = track.scrollWidth - window.innerWidth + GALLERY_END_PADDING;
        track.style.transform = `translateX(${-distance * progress}px)`;
      };
      onGalleryScroll();
      onScroll(onGalleryScroll);
      window.addEventListener("resize", onGalleryScroll, { passive: true });
      cleanups.push(() => window.removeEventListener("resize", onGalleryScroll));
    }

    return () => {
      for (const cleanup of cleanups) cleanup();
    };
  }, []);

  return null;
}

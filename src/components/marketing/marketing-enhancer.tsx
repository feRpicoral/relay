"use client";

import { useEffect } from "react";

/**
 * Progressive enhancement for the marketing page. All behaviours target the
 * server-rendered markup by class, so the page is complete and readable
 * without JS; this only layers on scroll reveals, the sticky-nav state, the
 * count-up stats, the pinned horizontal gallery, light parallax, and scaling
 * of the embedded screen iframes to their frames.
 */
export function MarketingEnhancer() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".mkt");
    if (!root) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const cleanups: Array<() => void> = [];
    const on = <K extends keyof WindowEventMap>(
      type: K,
      handler: (e: WindowEventMap[K]) => void,
      opts?: AddEventListenerOptions,
    ) => {
      window.addEventListener(type, handler, opts);
      cleanups.push(() => window.removeEventListener(type, handler, opts));
    };

    const countUp = (el: HTMLElement) => {
      const target = parseFloat(el.getAttribute("data-count") ?? "0");
      const dec = Number(el.getAttribute("data-dec")) || 0;
      const format = (v: number) => (dec ? v.toFixed(dec) : Math.round(v).toLocaleString("en-US"));
      if (reducedMotion) {
        el.textContent = format(target);
        return;
      }
      const duration = 1400;
      let start: number | null = null;
      const step = (ts: number) => {
        if (start === null) start = ts;
        const p = Math.min(1, (ts - start) / duration);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = format(target * eased);
        if (p < 1) requestAnimationFrame(step);
        else el.textContent = format(target);
      };
      requestAnimationFrame(step);
    };

    let reveals = Array.from(document.querySelectorAll<HTMLElement>(".reveal"));
    let counts = Array.from(document.querySelectorAll<HTMLElement>("[data-count]"));
    const checkReveal = () => {
      const h = window.innerHeight;
      reveals = reveals.filter((el) => {
        if (el.getBoundingClientRect().top < h * 0.9) {
          el.classList.add("in");
          return false;
        }
        return true;
      });
      counts = counts.filter((el) => {
        if (el.getBoundingClientRect().top < h * 0.85) {
          countUp(el);
          return false;
        }
        return true;
      });
    };

    const nav = document.querySelector<HTMLElement>(".nav");
    const onScrollNav = () => nav?.classList.toggle("scrolled", window.scrollY > 12);

    const fit = () => {
      document.querySelectorAll<HTMLElement>(".vp").forEach((vp) => {
        const frame = vp.querySelector("iframe");
        if (frame) frame.style.transform = `scale(${vp.clientWidth / 1280})`;
      });
      document.querySelectorAll<HTMLElement>(".phone-vp").forEach((vp) => {
        const frame = vp.querySelector("iframe");
        if (frame) frame.style.transform = `scale(${vp.clientWidth / 390})`;
      });
    };

    const pins = Array.from(document.querySelectorAll<HTMLElement>(".pin")).map((pin) => {
      const track = pin.querySelector<HTMLElement>(".track");
      const update = () => {
        if (!track) return;
        const total = pin.offsetHeight - window.innerHeight;
        if (total <= 0) return;
        const prog = Math.min(1, Math.max(0, -pin.getBoundingClientRect().top / total));
        const dist = track.scrollWidth - window.innerWidth + 48;
        track.style.transform = `translateX(${-dist * prog}px)`;
      };
      return update;
    });
    const runPins = () => pins.forEach((update) => update());

    const parallax = reducedMotion
      ? []
      : Array.from(document.querySelectorAll<HTMLElement>("[data-parallax]"));
    const runParallax = () => {
      const vh = window.innerHeight;
      parallax.forEach((el) => {
        const r = el.getBoundingClientRect();
        const c = (r.top + r.height / 2 - vh / 2) / vh;
        const amt = parseFloat(el.getAttribute("data-parallax") ?? "18") || 18;
        el.style.transform = `translateY(${-c * amt}px)`;
      });
    };

    const anchorHandler = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="#"]');
      if (!anchor) return;
      const id = anchor.getAttribute("href");
      if (!id || id.length < 2) return;
      const target = document.querySelector<HTMLElement>(id);
      if (!target) return;
      e.preventDefault();
      window.scrollTo({
        top: target.getBoundingClientRect().top + window.scrollY - 80,
        behavior: reducedMotion ? "auto" : "smooth",
      });
    };

    const onScroll = () => {
      checkReveal();
      onScrollNav();
      runPins();
      runParallax();
    };
    const onResize = () => {
      fit();
      runPins();
    };

    root.classList.add("reveal-ready");
    on("scroll", onScroll, { passive: true });
    on("resize", onResize);
    on("load", () => {
      checkReveal();
      fit();
    });
    document.addEventListener("click", anchorHandler);
    cleanups.push(() => document.removeEventListener("click", anchorHandler));

    onScrollNav();
    fit();
    runPins();
    const raf = requestAnimationFrame(() => {
      checkReveal();
      runParallax();
    });
    const t1 = window.setTimeout(fit, 300);
    const t2 = window.setTimeout(checkReveal, 700);

    return () => {
      cleanups.forEach((fn) => fn());
      cancelAnimationFrame(raf);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, []);

  return null;
}

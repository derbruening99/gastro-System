"use client";

import { useEffect } from "react";

/**
 * Landing-Page Scroll-Animationen, FAB-Sichtbarkeit und Emoji-Rotation.
 * Wirkt nur, wenn ein Vorfahren-Element die Klasse `.odis-landing` besitzt.
 *
 * 1:1 aus der neuen Odi's-Bowl-Codebase übernommen.
 */
export function LandingScrollEffects() {
  useEffect(() => {
    const root = document.querySelector(".odis-landing");
    if (!root) return;

    const reveals = root.querySelectorAll(".reveal");
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            obs.unobserve(e.target);
          }
        });
      },
      { threshold: 0.07 },
    );
    reveals.forEach((el) => obs.observe(el));

    const fabWrap = root.querySelector("#fabWrap");
    const hero = root.querySelector(".hero");
    const orderSec = root.querySelector(".order-section");

    const heroObs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!fabWrap) return;
          if (!e.isIntersecting) {
            fabWrap.classList.add("visible");
          } else {
            fabWrap.classList.remove("visible");
          }
        });
      },
      { threshold: 0.3 },
    );
    if (hero) heroObs.observe(hero);

    let hideObs: IntersectionObserver | null = null;
    if (orderSec && fabWrap) {
      hideObs = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (!fabWrap) return;
            if (e.isIntersecting) {
              fabWrap.classList.add("fab-dim");
            } else if (fabWrap.classList.contains("visible")) {
              fabWrap.classList.remove("fab-dim");
            }
          });
        },
        { threshold: 0.2 },
      );
      hideObs.observe(orderSec);
    }

    const fabEmoji = root.querySelector("#fabEmoji");
    let scrollTicking = false;
    const onScrollFab = () => {
      if (!fabEmoji) return;
      if (!scrollTicking) {
        requestAnimationFrame(() => {
          (fabEmoji as HTMLElement).style.transform = `rotate(${window.scrollY * 0.1}deg)`;
          scrollTicking = false;
        });
        scrollTicking = true;
      }
    };
    if (fabEmoji) {
      window.addEventListener("scroll", onScrollFab, { passive: true });
    }

    const onFabClick = () => {
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(12);
      }
    };
    fabWrap?.addEventListener("click", onFabClick);

    return () => {
      obs.disconnect();
      heroObs.disconnect();
      hideObs?.disconnect();
      window.removeEventListener("scroll", onScrollFab);
      fabWrap?.removeEventListener("click", onFabClick);
    };
  }, []);

  return null;
}

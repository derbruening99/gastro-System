"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const DEFAULT_HERO_IMAGES = [
  "/themes/odis-bowl/Titelbild01.JPG",
  "/themes/odis-bowl/Titelbild02.JPG",
  "/themes/odis-bowl/Titelbild03.JPG",
] as const;

const ROTATION_MS = 7800;

type Props = {
  /** Optional: Override images. Defaults to /themes/odis-bowl/Titelbild0{1,2,3}.JPG */
  images?: readonly string[];
};

/**
 * Drei rotierende Hero-Titelbilder mit Opacity-Crossfade.
 * Aus der neuen Odi's-Bowl-Codebase 1:1 übernommen — leicht generalisiert (Image-Pfade als Prop).
 */
export function LandingHeroBackdrop({ images = DEFAULT_HERO_IMAGES }: Props) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (images.length <= 1) return;
    const id = window.setInterval(
      () => setActive((n) => (n + 1) % images.length),
      ROTATION_MS,
    );
    return () => window.clearInterval(id);
  }, [images.length]);

  return (
    <div className="hero-backdrop" aria-hidden>
      {images.map((src, index) => (
        <div
          key={src}
          className={
            index === active
              ? "hero-backdrop-slide is-active"
              : "hero-backdrop-slide"
          }
        >
          <div className="hero-backdrop-zoom">
            <Image
              src={src}
              alt=""
              fill
              sizes="100vw"
              priority={index === 0}
              quality={88}
              className="hero-backdrop-img"
            />
          </div>
        </div>
      ))}
      <div className="hero-backdrop-scrim" />
    </div>
  );
}

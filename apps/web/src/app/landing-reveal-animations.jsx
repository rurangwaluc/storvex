"use client";

import { useEffect } from "react";

export default function LandingRevealAnimations() {
  useEffect(() => {
    const elements = Array.from(
      document.querySelectorAll(".svx-reveal"),
    );

    if (!elements.length) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }

          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      {
        threshold: 0.18,
      },
    );

    elements.forEach((element, index) => {
      element.style.setProperty(
        "--svx-reveal-delay",
        `${Math.min(index * 45, 240)}ms`,
      );

      observer.observe(element);
    });

    return () => observer.disconnect();
  }, []);

  return null;
}

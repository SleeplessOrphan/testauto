"use client";

import { useEffect, useRef } from "react";

// Moves keyboard focus to the heading when a screen opens, because the button that was
// clicked has just unmounted. Skipped on first load so Tab starts at the first button.
export function ScreenHeading({ level, children, focus = true }: { level: 1 | 2; children: string; focus?: boolean }) {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (focus) ref.current?.focus();
  }, [focus]);
  const Tag = level === 1 ? "h1" : "h2";
  return <Tag ref={ref} tabIndex={-1}>{children}</Tag>;
}

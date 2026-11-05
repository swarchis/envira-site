"use client";

import { useEffect } from "react";

// Boots the three.js chip scene once the page markup is in the DOM.
// The scene module finds its elements by id (#gl, #sky, #steps, ...) and runs once per page load.
export default function Scene() {
  useEffect(() => {
    import("@/lib/scene");
  }, []);
  return null;
}

// The reduced-motion hook every island that moves shares (Scene players, goal Scenes, the
// molecule switch): the OS setting or the site's switch (`<html data-motion="reduced">`).
import { useEffect, useState } from "react";

/** Reduced motion from the OS setting or the site's switch; undefined until mounted. */
export function useReducedMotion(): boolean | undefined {
  const [reduced, setReduced] = useState<boolean>();
  useEffect(() => {
    const query = matchMedia("(prefers-reduced-motion: reduce)");
    const read = () => setReduced(query.matches || document.documentElement.dataset.motion === "reduced");
    read();
    query.addEventListener("change", read);
    return () => query.removeEventListener("change", read);
  }, []);
  return reduced;
}

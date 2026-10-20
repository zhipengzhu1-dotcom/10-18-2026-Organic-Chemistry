// The design system's type rules (docs/dev/testing.md), shared by the built-site design gate
// (design.spec.ts) and the dev-only Tutor panel's check (tutor.spec.ts).
import type { Page } from "@playwright/test";

/** Text under `root` (default the whole page) that breaks a type rule, as readable strings. */
export const typeViolations = (page: Page, root = "body") =>
  page.evaluate((selector) => {
    const out: string[] = [];
    for (const top of document.querySelectorAll(selector)) {
      const walker = document.createTreeWalker(top, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        const text = n.textContent!.trim();
        // An <option> has no box of its own: the shown one is drawn in its <select>'s face and size.
        const option = n.parentElement!.closest("option");
        const select = option?.closest("select");
        if (option && (!select || select.selectedOptions[0] !== option)) continue;
        const el = select ?? n.parentElement!;
        if (!text || el.closest(".sr, script, style")) continue;
        const box = el.getBoundingClientRect();
        if (!box.width || !box.height) continue;
        const cs = getComputedStyle(el);
        const face = cs.fontFamily.split(",")[0].replace(/["']/g, "").trim();
        const size = parseFloat(cs.fontSize);
        const at = `<${el.tagName.toLowerCase()}> "${text.slice(0, 40)}" (${face} ${size}px)`;
        // SVG drawing labels (structure atoms, charges) are sized in drawing units relative to the bond
        // length by the renderer and scale with the drawing, so the CSS-px minimum doesn't apply to them.
        if (size < 16 && !el.closest("svg")) out.push(`${at}: text under 16px`);
        if (face.startsWith("Pixelify") && size < 32) out.push(`${at}: Pixelify under 32px`);
        if (face.startsWith("Silkscreen") && (size !== 16 || cs.textTransform !== "uppercase"))
          out.push(`${at}: Silkscreen must be 16px uppercase`);
        // "3D" is a word ("Molecules in 3D", "Explore in 3D"), not a number or a formula.
        if (/[0-9₀-₉⁺⁻]/.test(text.replace(/\b3D\b/g, "")) && !/^(JetBrains Mono|Pixelify)/.test(face))
          out.push(`${at}: number or formula outside the data face`);
      }
    }
    return out;
  }, root);

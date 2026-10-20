// Vite bundles CSS imported from components; TypeScript only needs to know the module exists.
declare module "*.css";

// Vite sets `import.meta.env.DEV` (true under `astro dev`, false in the build); the same shape as vite/client's.
interface ImportMetaEnv {
  readonly DEV: boolean;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/// <reference types="vite/client" />

/** Tipar la variable evita que `import.meta.env` entre al codigo como `any`. */
interface ImportMetaEnv {
  readonly VITE_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

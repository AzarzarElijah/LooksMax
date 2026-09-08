/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** OpenAI API key. When unset, the app runs in demo mode (mock provider). */
  readonly VITE_OPENAI_API_KEY?: string;
  /** OpenAI model id for analysis. Defaults to "gpt-4o-mini" if unset. */
  readonly VITE_OPENAI_MODEL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

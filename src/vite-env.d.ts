/// <reference types="vite/client" />

declare module 'katex/dist/contrib/auto-render' {
  export interface RenderMathOptions {
    delimiters?: Array<{ left: string; right: string; display?: boolean }>;
    ignoredTags?: string[];
    throwOnError?: boolean;
    errorColor?: string;
    macros?: Record<string, string>;
  }
  const renderMathInElement: (elem: HTMLElement, options?: RenderMathOptions) => void;
  export default renderMathInElement;
}

/**
 * Notion code block language support.
 * Maps common language aliases to the canonical names Notion accepts.
 */
export declare const SUPPORTED_CODE_BLOCK_LANGUAGES: readonly ["abap", "arduino", "bash", "basic", "c", "clojure", "coffeescript", "c++", "c#", "css", "dart", "diff", "docker", "elixir", "elm", "erlang", "flow", "fortran", "f#", "gherkin", "glsl", "go", "graphql", "groovy", "haskell", "html", "java", "javascript", "json", "julia", "kotlin", "latex", "less", "lisp", "livescript", "lua", "makefile", "markdown", "markup", "matlab", "mermaid", "nix", "objective-c", "ocaml", "pascal", "perl", "php", "plain text", "powershell", "prolog", "protobuf", "python", "r", "reason", "ruby", "rust", "sass", "scala", "scheme", "scss", "shell", "sql", "swift", "typescript", "vb.net", "verilog", "vhdl", "visual basic", "webassembly", "xml", "yaml", "java/c/c++/c#"];
export type SupportedCodeLang = (typeof SUPPORTED_CODE_BLOCK_LANGUAGES)[number];
export declare function isSupportedCodeLang(lang: string): lang is SupportedCodeLang;
/**
 * Resolve a language alias/name to the canonical Notion code language.
 * Returns undefined if the language is not recognized.
 */
export declare function parseCodeLanguage(lang?: string): SupportedCodeLang | undefined;
//# sourceMappingURL=languages.d.ts.map
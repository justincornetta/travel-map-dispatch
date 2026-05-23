import js from "@eslint/js";
import tsParser from "@typescript-eslint/parser";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  globalIgnores([".next/**", "node_modules/**", "out/**", "build/**", "next-env.d.ts"]),
  js.configs.recommended,
  {
    files: ["src/**/*.{ts,tsx}", "next.config.mjs"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        Buffer: "readonly",
        File: "readonly",
        FormData: "readonly",
        React: "readonly",
        Request: "readonly",
        console: "readonly",
        crypto: "readonly",
        fetch: "readonly",
        process: "readonly",
      },
    },
    rules: {
      "no-undef": "off",
      "no-unused-vars": "off",
    },
  },
]);

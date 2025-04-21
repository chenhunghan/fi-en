import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import reactQuery from "@tanstack/eslint-plugin-query";
export default tseslint.config(
  { ignores: ["dist/**"] },
  eslint.configs.recommended,
  tseslint.configs.recommended,
  react.configs.flat.recommended,
  reactHooks.configs["recommended-latest"],
  reactQuery.configs["flat/recommended"],
  {
    settings: {
      react: {
        version: "detect",
      },
    },
  },
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@tanstack/query/exhaustive-deps": "error",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "error",
    },
  },
);

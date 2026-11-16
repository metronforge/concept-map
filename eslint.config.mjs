import tseslint from "typescript-eslint";
export default [
  {
    files: ["src/**/*.ts"],
    languageOptions: { parser: tseslint.parser },
    plugins: { "@typescript-eslint": tseslint.plugin },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "no-restricted-syntax": [
        "error",
        { selector: "ExportDefaultDeclaration", message: "Use named exports" },
        { selector: "TSEnumDeclaration", message: "Use value unions" },
      ],
    },
  },
  {
    files: [
      "src/schema.ts",
      "src/schema/**/*.ts",
      "src/model/**/*.ts",
      "src/render/**/*.ts",
      "src/layout/**/*.ts",
    ],
    ignores: ["src/layout/errors.ts"],
    rules: {
      "no-restricted-syntax": [
        "error",
        { selector: "ClassDeclaration", message: "Core uses pure functions" },
        { selector: "ClassExpression", message: "Core uses pure functions" },
        { selector: "ExportDefaultDeclaration", message: "Use named exports" },
        { selector: "TSEnumDeclaration", message: "Use value unions" },
      ],
    },
  },
];

import { defineConfig } from "vite-plus";

export default defineConfig({
  test: { include: ["src/**/*.test.ts"] },
  pack: { entry: ["src/main.ts"], format: ["esm"], fixedExtension: false, dts: false },
  fmt: {},
  lint: {
    plugins: ["typescript", "unicorn", "oxc", "import"],
    jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
    rules: {
      "vite-plus/prefer-vite-plus-imports": "error",
      "typescript/unbound-method": "off",
      "typescript/restrict-template-expressions": "off",
    },
    ignorePatterns: ["tools/**", "dist/**"],
    options: { typeAware: true, typeCheck: true },
  },
});

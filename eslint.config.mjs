import { defineConfig, globalIgnores } from "eslint/config";

const eslintConfig = defineConfig([globalIgnores(["out/**"])]);

export default eslintConfig;

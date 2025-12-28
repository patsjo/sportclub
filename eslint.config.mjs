import { fixupConfigRules, fixupPluginRules } from "@eslint/compat";
import { FlatCompat } from "@eslint/eslintrc";
import js from "@eslint/js";
import typescriptEslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import i18next from 'eslint-plugin-i18next';
import _import from "eslint-plugin-import";
import jestDom from "eslint-plugin-jest-dom";
import jsxA11Y from "eslint-plugin-jsx-a11y";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import testingLibrary from "eslint-plugin-testing-library";
import globals from "globals";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

export default [{
    ignores: [
        "eslint.config.mjs",
        "**/node_modules/",
        "**/coverage/",
        "**/build/",
        "**/public/",
        "**/__mocks__/",
        "**/jest.config.js",
        "**/postcss.config.js",
        "**/*.d.ts",
    ],
}, ...fixupConfigRules(compat.extends(
    "eslint:recommended",
    "plugin:import/recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "plugin:jsx-a11y/recommended",
    "plugin:@typescript-eslint/recommended",
//    "plugin:storybook/recommended",
    "plugin:prettier/recommended",
    "plugin:i18next/recommended"
)), {
    plugins: {
        react: fixupPluginRules(react),
        "react-hooks": fixupPluginRules(reactHooks),
        "jsx-a11y": fixupPluginRules(jsxA11Y),
        "@typescript-eslint": fixupPluginRules(typescriptEslint),
        import: fixupPluginRules(_import),
        "react-refresh": reactRefresh,
        i18next: fixupPluginRules(i18next),
    },

    languageOptions: {
        globals: {
            ...globals.browser,
            ...globals.node,
        },

        parser: tsParser,
        ecmaVersion: 2021,
        sourceType: "module",

        parserOptions: {
            project: "./tsconfig.eslint.json",

            ecmaFeatures: {
                jsx: true,
            },
        },
    },

    settings: {
        react: {
            version: "detect",
        },

        "import/parsers": {
            "@typescript-eslint/parser": [".ts", ".tsx"],
        },

        "import/resolver": {
            typescript: {
                project: "./tsconfig.eslint.json",
                alwaysTryTypes: true,
            },
        },
    },

    rules: {
        "prettier/prettier": "warn",
        "jsx-quotes": "off",
        "import/first": "warn",
        "import/namespace": "off",
        "import/named": "off",
        "import/newline-after-import": "warn",
        "import/no-duplicates": "error",
        "import/no-named-as-default-member": "off",
        "react/prop-types": "off",
        "react/react-in-jsx-scope": "off",
        "react/jsx-sort-props": ["warn", {
            callbacksLast: true,
            shorthandFirst: true,
            ignoreCase: true,
            reservedFirst: true,
            noSortAlphabetically: true,
        }],
        "react-refresh/only-export-components": "off",
        "@typescript-eslint/no-unused-vars": "warn",
        "i18next/no-literal-string": "off"
    },
    }, ...compat.extends("plugin:jest-dom/recommended", "plugin:testing-library/react").map(config => ({
    ...config,
    files: ["./src/**/*.test.ts?(x)"],
})), {
    files: ["./src/**/*.test.ts?(x)"],

    plugins: {
        "jest-dom": jestDom,
        "testing-library": testingLibrary,
    },

    rules: {
        "jest-dom/prefer-checked": "error",
        "jest-dom/prefer-enabled-disabled": "error",
        "jest-dom/prefer-required": "error",
        "jest-dom/prefer-to-have-attribute": "error",
        "testing-library/await-async-utils": "error",
        "testing-library/no-debugging-utils": "warn",
        "testing-library/no-dom-import": "off",
    },
}];
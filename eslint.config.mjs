import { FlatCompat } from '@eslint/eslintrc';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const compat = new FlatCompat({ baseDirectory: path.dirname(fileURLToPath(import.meta.url)) });
const config = [
 { ignores: ['.next/**', 'node_modules/**', 'runtime-review/**', 'data/parsers/**', '.local/**', 'next-env.d.ts'] },
 ...compat.extends('next/core-web-vitals', 'next/typescript'),
 { files: ['**/*.cjs', 'tailwind.config.ts'], rules: { '@typescript-eslint/no-require-imports': 'off' } },
 { rules: { '@typescript-eslint/no-explicit-any': 'off', '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }], 'react-hooks/exhaustive-deps': 'warn', '@typescript-eslint/no-empty-object-type': 'off' } },
];

export default config;

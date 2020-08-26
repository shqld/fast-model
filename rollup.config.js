import * as path from 'path'

import babel from '@rollup/plugin-babel'
import nodeResolve from '@rollup/plugin-node-resolve'
import { terser } from 'rollup-plugin-terser'

/** @type {import('rollup').RollupOptions} */
const config = {
    input: path.resolve('src/index.ts'),
    output: [
        {
            name: 'fast-model',
            file: path.resolve('dist/index.js'),
            format: 'iife',
        },
        {
            file: path.resolve('dist/index.mjs'),
            format: 'esm',
        },
        {
            file: path.resolve('dist/index.cjs'),
            format: 'cjs',
        },
    ].filter(Boolean),
    plugins: [
        nodeResolve({ extensions: ['.ts'] }),
        babel({
            babelHelpers: 'bundled',
            extensions: ['.ts'],
            exclude: /node_modules/,
        }),
        terser({
            compress: {
                keep_infinity: true,
                pure_getters: true,
                hoist_funs: true,
                passes: 10,
                module: true,
                unsafe: true,
                booleans_as_integers: true,
            },
            output: { wrap_func_args: false },
            warnings: true,
            ecma: 2015,
            toplevel: true,
            mangle: {
                toplevel: true,
                properties: {
                    regex: '^__',
                },
            },
            nameCache: null,
        }),
    ],
}

export default config

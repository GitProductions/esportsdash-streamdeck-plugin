import commonjs from "@rollup/plugin-commonjs";
import nodeResolve from "@rollup/plugin-node-resolve";
import terser from "@rollup/plugin-terser";
import json from '@rollup/plugin-json';
import typescript from "@rollup/plugin-typescript";
import copy from 'rollup-plugin-copy';
import path from "node:path";
import url from "node:url";

const isWatching = !!process.env.ROLLUP_WATCH;
const sdPlugin = "com.esportsdash.esportsdash-controller.sdPlugin";

/**
 * @type {import('rollup').RollupOptions}
 */
const config = {
    input: "src/plugin.ts",
    output: {
        file: `${sdPlugin}/bin/plugin.js`,
        sourcemap: isWatching,
        sourcemapPathTransform: (relativeSourcePath, sourcemapPath) => {
            return url.pathToFileURL(path.resolve(path.dirname(sourcemapPath), relativeSourcePath)).href;
        }
    },
    external: [
        'canvas',
        'path',
        'fs',
    ],
    plugins: [
        {
            name: "watch-externals",
            buildStart: function () {
                this.addWatchFile(`${sdPlugin}/manifest.json`);
            },
        },
        typescript({
            mapRoot: isWatching ? "./" : undefined
        }),
        nodeResolve({
            browser: false,
            exportConditions: ["node"],
            preferBuiltins: true
        }),
        commonjs({
            ignore: ['canvas']
        }),
        json(),
        !isWatching && terser(),
        copy({
            copyOnce: true,
            errorOnExist: false,
            overwrite: true,
            targets: [
                {
                    src: [
                        'node_modules/canvas/**/*',
                        '!node_modules/canvas/src/**',
                        '!node_modules/canvas/lib/**',
                        '!node_modules/canvas/test/**',
                    ],
                    dest: `${sdPlugin}/bin/node_modules/canvas`
                }
            ]
        }),
        {
            name: "emit-module-package-file",
            generateBundle() {
                this.emitFile({ 
                    fileName: "package.json", 
                    source: `{ "type": "module" }`, 
                    type: "asset" 
                });
            }
        }
    ]
};

export default config;

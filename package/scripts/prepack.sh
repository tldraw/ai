#!/bin/bash
set -eux

if [ ! -f package.json.bak ]; then
    cp package.json package.json.bak
fi

node_modules/.bin/tsc -b tsconfig.json

mkdir -p dist

node_modules/.bin/esbuild 'src/**/*' \
    --outdir=dist/cjs \
    --platform=neutral \
    --format=cjs \
    --sourcemap

node_modules/.bin/esbuild 'src/**/*' \
    --outdir=dist/esm \
    --platform=neutral \
    --format=esm \
    --out-extension:.js=.mjs \
    --sourcemap

cp -r .tsbuild/src dist/types

jq '
    .main = "dist/cjs/index.js" |
    .module = "dist/esm/index.mjs" |
    .source = "src/index.ts" |
    .types = "dist/types/index.d.ts" |
    .exports = {
        ".": {
            "import": "./dist/esm/index.mjs",
            "require": "./dist/cjs/index.js",
            "types": "./dist/types/index.d.ts"
        }
    } |
    .files = ["dist", "src", "README.md"]
' package.json.bak > package.json

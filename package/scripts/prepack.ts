import { build as esbuild } from 'esbuild'
import { $ as _$ } from 'execa'
import { cpSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'fs'
import { globSync } from 'glob'
import path from 'path'
import { parse, print, visit } from 'recast'
import typescriptParser from 'recast/parsers/typescript'

const $ = _$({ verbose: 'short' })

async function main() {
	if (!existsSync('package.json.bak')) {
		cpSync('package.json', 'package.json.bak')
	}

	mkdirSync('dist', { recursive: true })

	console.log('Building types...')
	await $`node_modules/.bin/tsc -b tsconfig.json`
	cpSync('.tsbuild', 'dist/types', { recursive: true })

	console.log('Building cjs...')
	await buildLibrary('cjs')

	console.log('Building esm...')
	await buildLibrary('esm')

	console.log('Adding js extensions...')
	addJsExtensions('dist/esm')

	console.log('Updating package.json...')
	const packageJson = JSON.parse(readFileSync('package.json.bak', 'utf8'))

	packageJson.main = 'dist/cjs/index.js'
	packageJson.module = 'dist/esm/index.mjs'
	packageJson.source = 'src/index.ts'
	packageJson.types = 'dist/types/src/index.d.ts'
	packageJson.files = ['dist', 'src', 'README.md']
	packageJson.exports = {
		'.': {
			types: './dist/types/index.d.ts',
			import: './dist/esm/index.mjs',
			require: './dist/cjs/index.js',
		},
	}

	writeFileSync('package.json', JSON.stringify(packageJson, null, 2))
	console.log('Done!')
}

async function buildLibrary(modules: 'cjs' | 'esm') {
	const result = await esbuild({
		entryPoints: ['src/**/*'],
		outdir: `dist/${modules}`,
		platform: 'neutral',
		format: modules === 'cjs' ? 'cjs' : 'esm',
		outExtension: modules === 'cjs' ? {} : { '.js': '.mjs' },
		sourcemap: true,
		bundle: false,
	})

	if (result.errors.length) {
		console.log('Build failed with errors:')
		console.log(result.errors)
		throw new Error('esm build failed')
	}
}

const extensions = ['.js', '.mjs', '.cjs']
function resolveRelativePath(importingFile: string, relativePath: string) {
	if (!relativePath.startsWith('.')) {
		return relativePath
	}

	const containingDir = path.dirname(importingFile)

	if (
		existsSync(path.join(containingDir, relativePath)) &&
		!statSync(path.join(containingDir, relativePath)).isDirectory()
	) {
		// if the file already exists, e.g. .css files, just use it
		return relativePath
	}

	// strip the file extension if applicable
	relativePath.replace(/\.(m|c)?js$/, '')

	for (const extension of extensions) {
		if (relativePath.endsWith(extension)) {
			return relativePath
		} else {
			let candidate = `${relativePath}${extension}`
			if (existsSync(path.join(containingDir, candidate))) {
				return candidate
			}

			candidate = `${relativePath}/index${extension}`

			if (existsSync(path.join(containingDir, candidate))) {
				return candidate
			}
		}
	}

	throw new Error(`Could not resolve relative path ${relativePath} from ${importingFile}`)
}

function addJsExtensions(distDir: string) {
	for (const file of globSync(path.join(distDir, '**/*.{mjs,cjs,js}'))) {
		const code = parse(readFileSync(file, 'utf8'), { parser: typescriptParser })

		visit(code, {
			visitImportDeclaration(path) {
				path.value.source.value = resolveRelativePath(file, path.value.source.value)
				return false
			},
			visitExportAllDeclaration(path) {
				path.value.source.value = resolveRelativePath(file, path.value.source.value)
				return false
			},
			visitExportNamedDeclaration(path) {
				if (path.value.source) {
					path.value.source.value = resolveRelativePath(file, path.value.source.value)
				}
				return false
			},
		})

		writeFileSync(file, print(code).code)
	}
}

main()

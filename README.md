# tldraw's ai module

This repo is meant to help developers build integrations between tldraw's canvas and AI tools. It contains several resources that can be used to get information out of tldraw (in order to prompt a model) and to create changes in tldraw based on some generated instructions.

The module is distributed as an NPM package, [@tldraw/ai](https://www.npmjs.com/package/@tldraw/ai). It is meant to be used together with the [tldraw SDK](https://github.com/tldraw/tldraw).

The best way to get started is to clone this repository and experiment with its example project.

## Local development

This repository is a pnpm monorepo. It has three parts:

- `/package` contains the ai module package itself
- `/example/client` contains the example's frontend (a Vite app)
- `/example/worker` contains the example's backend (a Cloudflare Worker)

1. Install the latest version of corepack.

```bash
npm install -g corepack@latest
```

2. Install dependencies using [pnpm](https://pnpm.io/).

```bash
pnpm i
```

3. Create a `.dev.vars` file in the root directory. Add any environment variables required by the server to the `.dev.vars` file. By default, our example project requires an [OpenAI API Key](https://platform.openai.com/settings/organization/api-keys) so your `.dev.vars` file should look something like this:

```
OPENAI_API_KEY=sk-proj-rest-of-your-key
ANY_OTHER_KEY_YOU_ARE_USING=here
```

If you need public-friendly API keys on the frontend, create a `.env` file in the root directory and put them there. See [this guide](https://vite.dev/guide/env-and-mode) for more information about environment variables in Vite.

```
VITE_SOME_PUBLIC_KEY=sk-proj-rest-of-your-key
```

3. Start the development server.

```bash
pnpm run dev
```

4. Open [localhost:5173](http://localhost:5173) in your browser.

You can now make any changes you wish to the example project.

> Note: If you find yourself needing to make changes to the package code, please let us know on the [tldraw discord channel](https://discord.gg/9PSF2C5KgV). Your changes would be very useful information as we continue to develop the module!

## Production

For production, it's recommended to install the `@tldraw/ai` package. This ensures that your project will receive updates as we continue to improve the module.

### Installation

Install the `@tldraw/ai` package from NPM or your package manager of choice.

```bash
npm i @tldraw/ai
```

### Usage

Whether you use the `useTldrawAiExample` hook or a custom hook (see `useSomeOtherBackend.ts` as a starter), the hook must be called from inside of the tldraw editor context.

You can do that via a child component:

```tsx
function App() {
	return (
		<div style={{ position: 'fixed', inset: 0 }}>
			<Tldraw persistenceKey="example">
				<AiPrompt />
			</Tldraw>
		</div>
	)
}

function AIPrompt() {
	const ai = useTldrawAiExample()
	return (
		<div style={{ position: 'fixed', bottom: 100, left: 16 }}>
			<button onClick={() => ai.stream('draw a unicord')}>Unicorn</button>
		</div>
	)
}
```

Or via the `components` prop:

```tsx
const components: TLComponents = {
	InFrontOfTheCanvas: () => {
		const ai = useTldrawAiExample()
		return (
			<div>
				<button onClick={() => ai.stream('draw a unicord')}>Unicorn</button>
			</div>
		)
	},
}

function App() {
	return (
		<div style={{ position: 'fixed', inset: 0 }}>
			<Tldraw persistenceKey="example" components={components} />
		</div>
	)
}
```

## License

This project is provided under the MIT license found [here](https://github.com/tldraw/vite-template/blob/main/LICENSE.md). The tldraw SDK is provided under the [tldraw license](https://github.com/tldraw/tldraw/blob/main/LICENSE.md).

## Trademarks

Copyright (c) 2024-present tldraw Inc. The tldraw name and logo are trademarks of tldraw. Please see our [trademark guidelines](https://github.com/tldraw/tldraw/blob/main/TRADEMARKS.md) for info on acceptable usage.

## Distributions

You can find tldraw on npm [here](https://www.npmjs.com/package/@tldraw/tldraw?activeTab=versions).

## Contribution

Please see our [contributing guide](https://github.com/tldraw/tldraw/blob/main/CONTRIBUTING.md). Found a bug? Please [submit an issue](https://github.com/tldraw/tldraw/issues/new).

## Community

Have questions, comments or feedback? [Join our discord](https://discord.gg/rhsyWMUJxd) or [start a discussion](https://github.com/tldraw/tldraw/discussions/new). For the latest news and release notes, visit [tldraw.dev](https://tldraw.dev).

## Contact

Find us on Twitter/X at [@tldraw](https://twitter.com/tldraw).

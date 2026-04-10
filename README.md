# amazing.build

A weekly curated showcase of mind-blowing projects. Pre-launch waitlist site.

## Development

```sh
bun install
bun dev        # http://localhost:4321
bun run build  # static build -> ./dist
```

## Configuration

The waitlist form uses [Web3Forms](https://web3forms.com) — a free form backend with no account required.

1. Visit <https://web3forms.com/> and enter your email to get a free access key
2. Copy `.env.example` to `.env` and paste the key:

   ```
   PUBLIC_WEB3FORMS_KEY=your-key-here
   ```

3. When deploying to Vercel, add the same env var in the project settings (use the `PUBLIC_` prefix so Astro exposes it to the client)

## Deployment

Static site — deploy to Vercel, Netlify, or any static host. The root is this directory.

```sh
bun run build
# deploy ./dist
```

## Structure

```
src/
├── components/
│   └── SubscribeForm.astro
├── content/
│   ├── builds/       # markdown build entries (currently empty — pre-launch)
│   └── editions/     # markdown edition meta
├── layouts/
│   └── Base.astro
├── pages/
│   └── index.astro   # landing / waitlist
├── styles/
│   └── global.css
└── content.config.ts
```

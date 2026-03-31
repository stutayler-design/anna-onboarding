# ANNA Onboarding Chatbot

A SvelteKit chatbot that classifies businesses into categories during ANNA bank's onboarding flow. Uses Claude (Anthropic API) via a Netlify serverless function.

## Setup

```sh
git clone <your-repo-url>
cd anna-onboarding
npm install
cp .env.example .env
```

Add your Anthropic API key to `.env`:

```
ANTHROPIC_API_KEY=sk-ant-...
```

## Local Development

```sh
npx netlify dev
```

This starts both the SvelteKit dev server and the Netlify functions runtime with redirects applied. Do **not** use `npm run dev` — the API proxy won't work without Netlify's dev server.

## Deploy to Netlify

1. Push this repo to GitHub
2. Connect the repo in the [Netlify dashboard](https://app.netlify.com)
3. Set the `ANTHROPIC_API_KEY` environment variable in **Site settings > Environment variables**
4. Deploy — Netlify will run `npm run build` automatically

## Project Structure

```
anna-onboarding/
├── netlify/functions/categorise.js   # Serverless API proxy for Anthropic
├── src/
│   ├── lib/
│   │   ├── industries.js             # 24 business categories
│   │   └── systemPrompt.js           # Claude system prompt builder
│   └── routes/+page.svelte           # Chat UI
├── netlify.toml                      # Build config and redirects
└── .env.example                      # Environment variable template
```

## Stack

- **Frontend:** SvelteKit + Tailwind CSS v4
- **Backend:** Netlify Functions
- **AI:** Anthropic Claude (claude-sonnet-4-20250514)
- **Deployment:** Netlify

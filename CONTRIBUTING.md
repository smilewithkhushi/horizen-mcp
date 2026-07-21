# Contributing

## Updating chain facts

All chain data lives in [`data/chain-facts.json`](data/chain-facts.json). This is the single source of truth — do not hardcode values in tool handlers.

When updating an entry:

1. Edit `data/chain-facts.json`
2. Set the `verified` date to today (ISO format: `YYYY-MM-DD`)
3. Include a `source` — a URL or attribution string. If you can't source a value, leave it `null` rather than guessing.
4. Update `lastVerified` at the root of the file
5. Run `npm run build` and verify the build passes
6. Test the relevant tool via `npm run inspect`

## Adding a new contract

Add an entry under `contracts` with `mainnet`, `testnet`, `displayName`, `notes`, `source`, and `verified`. Set `null` for any network where the contract is not deployed — do not omit the field.

## Adding a new tool

1. Create `src/tools/<name>.ts` with an input schema (zod) and handler function
2. Register it in `src/index.ts`
3. Every response must include `source` and `verified` fields
4. Add an acceptance test to the table in `README.md`

## What not to add (v1 scope)

- Transaction construction, signing, or broadcasting
- Live on-chain RPC reads
- Vela tooling
- Anything that returns a value without a source

See the product spec in `memory/product-spec.md` for full non-goals.

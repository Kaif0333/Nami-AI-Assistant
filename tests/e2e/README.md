# End-to-End Tests

Run the browser acceptance suite from the repository root:

```powershell
corepack pnpm test:e2e
```

`research.spec.ts` stubs only browser requests under
`http://localhost:4000/api/research` with a fixed source-backed fixture. It
does not introduce a runtime provider, mock, or fabricated research response.

Run the live research smoke check against a running API:

```powershell
corepack pnpm smoke:research
```

Set `NAMI_API_URL` to use a different API base; it defaults to
`http://localhost:4000`. The smoke command sends one fast current-information
request to the configured real research provider and prints only run metadata.

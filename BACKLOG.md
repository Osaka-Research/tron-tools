# Tron Tools Backlog

Each item becomes one new tool/tab or a scoped enhancement. Keep each item small enough to ship in one iteration. Check off (`[x]`) when shipped, `[~]` if skipped with a reason.

## Ideas

- [ ] Address book — save/label/delete addresses in localStorage, use anywhere by picker
- [x] TRX ↔ USD converter using CoinGecko public API with manual refresh
- [x] Multi-address balance checker — paste N addresses, show TRX+USDT in a table
- [x] Generic TRC-20 balance — paste contract + address, show symbol, decimals, balance
- [ ] Vanity address generator — pick a prefix/suffix, mine client-side with progress
- [ ] Base58 ↔ Hex address converter standalone tab
- [ ] Sign message (TIP-191) with a pasted private key, output signature
- [ ] Verify message signature — address + message + signature → valid/invalid
- [x] Network stats tab — block height, witnesses count (TPS/totalTransactionCount skipped, not exposed by public API cheaply)
- [ ] Super Representative (witness) list with votes and productivity
- [ ] Last-N transactions for an address (TRX + TRC-20) via TronGrid v1
- [ ] Export last-N transactions to CSV
- [ ] Staking rewards estimator — input stake amount, show daily/weekly/monthly TRX
- [ ] Energy/bandwidth cost estimator for a TRC-20 transfer
- [x] QR code of a TRX address with optional amount (tron: URI)
- [ ] Watch-only wallet — add a label + address, show aggregate TRX+USDT
- [ ] Mnemonic → Tron address derivation (BIP39 + BIP44 path m/44'/195'/0'/0/0)
- [ ] Theme toggle (dark/light) persisted in localStorage
- [ ] Network switcher (mainnet / shasta / nile) with URL hash param
- [ ] TRC-10 token info — paste token ID, show owner, supply, precision
- [ ] Contract ABI viewer — paste contract address, show methods/events
- [ ] Delegation viewer — energy/bandwidth delegated to/from an address
- [ ] Freeze v2 countdown — show unfreezing entries with time-to-withdraw
- [ ] Share link for a lookup (hash in URL)
- [ ] Top accounts leaderboard (balance desc) — static list, refreshable
- [ ] Transaction decoder — paste raw tx hex, show parsed fields

# Tron Tools

A set of client-side utilities for the Tron mainnet. No server, no tracking — everything runs in your browser.

## Tools

- **Wallet** — generate a fresh TRX keypair (base58 + hex + private + public)
- **Validate** — verify a Tron address and show both base58 and hex forms
- **Balance** — live TRX and USDT (TRC-20) balance for any address
- **Tx Lookup** — view type, status, from/to, amount, fee, and block for a tx hash
- **Resources** — bandwidth, energy, frozen stake, and TRX balance for an account
- **TRX/USD** — live TRX price via CoinGecko, two-way converter
- **Multi-Balance** — paste N addresses, get TRX + USDT for each in a table
- **TRC-20 Info** — paste any TRC-20 contract, see name/symbol/decimals, optional owner balance
- **Network Stats** — current block height, block time, witness count
- **QR Address** — scannable QR for any address, optional `tron:` amount

## Run locally

```sh
python -m http.server 8765
# open http://localhost:8765
```

## Stack

- Plain HTML/CSS/JS, no build step
- [TronWeb](https://github.com/tronprotocol/tronweb) 5.3.2 via jsDelivr
- TronGrid mainnet public endpoint (`https://api.trongrid.io`)

## USDT contract

Mainnet TRC-20 USDT: `TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t`

## License

MIT

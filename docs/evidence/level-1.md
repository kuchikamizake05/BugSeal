# BugSeal Level 1 Evidence

## Summary

- **Contract Build Commit:** `d44ddde`
- **Compact Compiler:** `0.31.0`
- **Language Pragma:** `0.23`
- **Midnight.js Protocol:** `4.1.1`
- **Target Network:** Midnight Preprod (Standalone Local & Preprod verification)
- **Deployed Contract Address:** `44bfab12ad44b00294b0f87608dffe4b6c3a8969b440ab2acd9ebcea7bcaaadc`
- **Project Label:** `bugseal-training-project-v1`
- **Project ID:** `8286949eeb5fbcc89233c0e0d649b26ae2ed85a3f1f94b0b7d808650f665087b`
- **Report Commitment (Report ID):** `36eb1eb2db716ac92940fa49e4843256ce2893fcd1bd0f3b8eba1eda8025955a`

## Transaction Execution Evidence

| Operation | Transaction Hash | Block Height | Public Result / Ledger State |
|---|---|---|---|
| `registerProject` | `0dd14efb6186f0c6747bbf0bd71968ccd46e19336281210ab1c3b56be63ec51d` | 14 | Project `8286949e...` registered with domain-separated authority |
| `submitReport` | `92ac24346fe08bd9735d8675381055e355a2c4bb15b5531ae708246eb93306c4` | 18 | Report `36eb1eb2...` stored with status `SUBMITTED` |
| `proveReportOwnership` | `e1851e7cd98ddb95a5baf474c32a38d14e3f16d2758b98e5740832d9ecbc6394` | 22 | Circuit verified valid private digest and salt match commitment |
| `acknowledgeReport` | `285a1b6cdbef3810bbf6a3519edfd71ddbdb915c55a4d11eae4ec4021909c816` | 26 | Status transitioned to `ACKNOWLEDGED` by maintainer authority |

## Privacy Boundary Verification

### Confirmed Public Fields
- `projectId`: `8286949eeb5fbcc89233c0e0d649b26ae2ed85a3f1f94b0b7d808650f665087b`
- `reportId`: `36eb1eb2db716ac92940fa49e4843256ce2893fcd1bd0f3b8eba1eda8025955a`
- `status`: `ACKNOWLEDGED`

### Confirmed Absent Fields (ZK Private Boundary)
- No report plain text (`training-only: authorization bypass in demo route`)
- No SHA-256 report digest
- No report salt
- No maintainer secret
- No reporter address or wallet identifier

## Log Scan Verification

Command executed:
```bash
rg -n -i 'reportText|maintainerSecret|walletSeed|storagePassword|private exploit' docs/evidence README.md
```
Result: 0 secret leaks identified.

## Reproduction Commands

```bash
# 1. Compile Compact circuits
npm run compact

# 2. Run full CI test and typecheck suite
npm run ci

# 3. Launch interactive CLI
npm run standalone
# or
npm run preprod
```

# End to end

A record of one standing walked through the deployed Standing contract on GenLayer Studio Next (chain 61997). Every transaction below is a link to the explorer so each step can be reviewed.

## Deployment

| Item | Value |
|---|---|
| Network | GenLayer Studio Next, chain 61997 |
| Contract | [0xD136CF8A817eDdd486430F6C281188dE6E3735dD](https://explorer-studio-next.genlayer.com/address/0xD136CF8A817eDdd486430F6C281188dE6E3735dD) |
| Deploy transaction | [0x40c84427a52b6f92af5d36f32ffb97ae389f7852b915f3d4d22683a14eec4796](https://explorer-studio-next.genlayer.com/tx/0x40c84427a52b6f92af5d36f32ffb97ae389f7852b915f3d4d22683a14eec4796) |
| Deployer | [0x57C3AaB3c464CdFd96A1ff0c2b4275784C181C4c](https://explorer-studio-next.genlayer.com/address/0x57C3AaB3c464CdFd96A1ff0c2b4275784C181C4c) |
| Caller for every step below | [0x012cD2607Cc786C35B242Ac3a3DBE4760753AF89](https://explorer-studio-next.genlayer.com/address/0x012cD2607Cc786C35B242Ac3a3DBE4760753AF89) |
| Deployed | Oct 23, 2026, 4:25:36 AM |
| Console | [standing-delta.vercel.app](https://standing-delta.vercel.app/) |

One wallet acted as both buyer and supplier, which the contract allows so that a demo can run alone.

## Evidence pages

Three public pages were registered as evidence:

1. [certificate-register.md](https://github.com/Salolcano/Standing-demo/blob/main/certificate-register.md)
2. [audit-filing.md](https://github.com/Salolcano/Standing-demo/blob/main/audit-filing.md)
3. [privacy-policy.md](https://github.com/Salolcano/Standing-demo/blob/main/privacy-policy.md)

## Requirements

1. A current ISO 27001 certificate is published. (mandatory)
2. An audit report dated 2026 is filed. (mandatory)
3. The policy states a data retention limit. (optional)

## Transactions

All ten were sent from `0x012c…AF89` to the contract, listed oldest first. The order and the consensus column come from the explorer's transaction list for the contract. The explorer labels every call "(constructor)", so the function column follows the lifecycle order in the README and ARCHITECTURE.md.

| # | Step | Function | Evidence page | Consensus | Transaction |
|---|---|---|---|---|---|
| 1 | Write the standing | `create_standing` | none | Accepted | [0xf88da4dfc0d88472a7b85aed6990f38d6d61c0ee1a8dc7349740b3cf8d78d61a](https://explorer-studio-next.genlayer.com/tx/0xf88da4dfc0d88472a7b85aed6990f38d6d61c0ee1a8dc7349740b3cf8d78d61a) |
| 2 | Freeze the terms | `freeze_standing` | none | Accepted | [0x9574bc548083091a6a0b817ae1441ae0084804847a04e1eb74e7908d877c56ed](https://explorer-studio-next.genlayer.com/tx/0x9574bc548083091a6a0b817ae1441ae0084804847a04e1eb74e7908d877c56ed) |
| 3 | Post the bond | `post_bond` | none | Accepted | [0x63ea3abcd3d026dddb6734dcb69a6d34946ca7b0c042c9d5f87af0463fb01c14](https://explorer-studio-next.genlayer.com/tx/0x63ea3abcd3d026dddb6734dcb69a6d34946ca7b0c042c9d5f87af0463fb01c14) |
| 4 | Register evidence | `submit_evidence` | [certificate-register.md](https://github.com/Salolcano/Standing-demo/blob/main/certificate-register.md) | Accepted | [0x73af45a961d0eb4409cc1cda76e3c9455cd2709b5ff33191c0bb8db320ba6f6e](https://explorer-studio-next.genlayer.com/tx/0x73af45a961d0eb4409cc1cda76e3c9455cd2709b5ff33191c0bb8db320ba6f6e) |
| 5 | Register evidence | `submit_evidence` | [audit-filing.md](https://github.com/Salolcano/Standing-demo/blob/main/audit-filing.md) | Accepted | [0x8a92471140c14034e774989d8c13afbd71c3a41168d2612ee61466d4e77b4868](https://explorer-studio-next.genlayer.com/tx/0x8a92471140c14034e774989d8c13afbd71c3a41168d2612ee61466d4e77b4868) |
| 6 | Register evidence | `submit_evidence` | [privacy-policy.md](https://github.com/Salolcano/Standing-demo/blob/main/privacy-policy.md) | Accepted | [0xf3ca27d7d02bc7fb2da4cdc774bde4a255d7515f91743eb790ccbdf9a3d26637](https://explorer-studio-next.genlayer.com/tx/0xf3ca27d7d02bc7fb2da4cdc774bde4a255d7515f91743eb790ccbdf9a3d26637) |
| 7 | Request verification | `request_verification` | all three | Accepted | [0xe8510bd55fadb89498f54ce8bb278f9f31cab96eb5725c8e472debd6af430e74](https://explorer-studio-next.genlayer.com/tx/0xe8510bd55fadb89498f54ce8bb278f9f31cab96eb5725c8e472debd6af430e74) |
| 8 | Later call | see note below | n/a | Accepted | [0xca49d919afc9148d16c5c84dfbdb18b3e8d9c9968452de19012eb5f6edb64f17](https://explorer-studio-next.genlayer.com/tx/0xca49d919afc9148d16c5c84dfbdb18b3e8d9c9968452de19012eb5f6edb64f17) |
| 9 | Later call | see note below | n/a | Accepted | [0x02bec772eb9591cc91ed36abee3f2a06ac19040cc0f325f36420bbe28d312373](https://explorer-studio-next.genlayer.com/tx/0x02bec772eb9591cc91ed36abee3f2a06ac19040cc0f325f36420bbe28d312373) |
| 10 | Later call | see note below | n/a | Validators Timeout | [0x04392afbce0a9cc47bfb1f8a315adc7d118bc18ae6bfae38fe1b1837bec1ced9](https://explorer-studio-next.genlayer.com/tx/0x04392afbce0a9cc47bfb1f8a315adc7d118bc18ae6bfae38fe1b1837bec1ced9) |

All ten show status FINALIZED and GenVM result SUCCESS in the explorer.

### Timing

| Transactions | Explorer time (relative, when read) |
|---|---|
| Deploy | 43 minutes ago |
| 1 to 6 | 38 to 34 minutes ago |
| 7 to 10 | 23 to 21 minutes ago |

Calls 1 to 6 were sent within four minutes of each other. Calls 7 to 10 came after a gap of about eleven minutes.

### Note on calls 8 to 10

After evidence, the lifecycle has three more calls: `request_verification`, `accept_verification` and `settle_standing`. Four calls follow the evidence here, so one is an additional call such as a second verification round. The explorer does not decode method names, so calls 8 to 10 are not assigned a function in this record. Open each link and read the call data to confirm. Call 10 ended with consensus result Validators Timeout, which the explorer reports for the verification step.

## Also on the contract

One more transaction appears in the explorer's list for the contract. It is not one of the ten above.

| Step | GenVM result | Transaction |
|---|---|---|
| Call sent after call 10, about 16 minutes before the list was read | ERROR | [0x16d9fb004ce90ebc6af9feef67c17f598b31d1fa95bef184727d9d54c2138da3](https://explorer-studio-next.genlayer.com/tx/0x16d9fb004ce90ebc6af9feef67c17f598b31d1fa95bef184727d9d54c2138da3) |

## Contract balance

At the time of writing, the contract's [explorer page](https://explorer-studio-next.genlayer.com/address/0xD136CF8A817eDdd486430F6C281188dE6E3735dD) shows a balance of 0.01 GEN.

## Reproduce

The scripted version writes `docs/e2e-record.md` against any deployed contract:

```
CONTRACT=0xD136CF8A817eDdd486430F6C281188dE6E3735dD npm run smoke -- <url> <url>
```

Raw page addresses for the evidence, as the contract fetches them:

- https://raw.githubusercontent.com/Salolcano/Standing-demo/main/certificate-register.md
- https://raw.githubusercontent.com/Salolcano/Standing-demo/main/audit-filing.md
- https://raw.githubusercontent.com/Salolcano/Standing-demo/main/privacy-policy.md

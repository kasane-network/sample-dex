# Uniswap Labs: Front End Interfaces

This is the **public** repository for Uniswap Labs’ front-end interfaces, including the Web App and Wallet Extension. Uniswap is a protocol for decentralized exchange of Ethereum-based assets.

## Interfaces

- Web: [app.uniswap.org](https://app.uniswap.org)
- Wallet (extension): [wallet.uniswap.org](https://wallet.uniswap.org)

## Install & Apps

```bash
git clone git@github.com:Uniswap/interface.git
bun install
bun lfg
bun web start
```

For instructions per application or package, see the README published for each application:

- [Web](apps/web/README.md)
- [Extension](apps/extension/README.md)

## Contributing

For instructions on the best way to contribute, please review our [Contributing guide](CONTRIBUTING.md)!

## Socials / Contact

- X (Formerly Twitter): [@Uniswap](/__disabled_external_link__)
- Reddit: [/r/Uniswap](https://www.reddit.com/r/Uniswap/)
- Email: [contact@uniswap.org](mailto:contact@uniswap.org)
- Discord: [Uniswap](https://discord.com/invite/uniswap)
- LinkedIn: [Uniswap Labs](https://www.linkedin.com/company/uniswaporg)

## Uniswap Links

- Website: [uniswap.org](https://uniswap.org/)
- Docs: [uniswap.org/docs/](/__disabled_external_link__)

## Whitepapers

- [V4](https://uniswap.org/whitepaper-v4.pdf)
- [V3](https://uniswap.org/whitepaper-v3.pdf)
- [V2](https://uniswap.org/whitepaper.pdf)
- [V1](https://hackmd.io/C-DvwDSfSxuh-Gd4WKE_ig)

## Production & Release Process

Uniswap Labs develops all front-end interfaces in a private repository.
At the end of each development cycle:

1. We publish the latest production-ready code to this public repository.

2. Releases are automatically tagged — view them in the [Releases tab](https://github.com/Uniswap/interface/releases).

## 🗂 Directory Structure

| Folder      | Contents                                                                       |
| ----------- | ------------------------------------------------------------------------------ |
| `apps/`     | The home for each standalone application.                                      |
| `config/`   | Shared infrastructure packages and configurations.                             |
| `packages/` | Shared code packages covering UI, shared functionality, and shared utilities.  |

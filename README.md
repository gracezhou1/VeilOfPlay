# Veil of Play

Veil of Play is a privacy-first, on-chain hide-and-seek game. Each player receives an encrypted, random coordinate on a 10x10 grid, can decrypt only their own position, and may choose to reveal it publicly. The game uses Zama FHEVM to keep positions encrypted on-chain while still enabling fair randomness and optional disclosure.

## Project Summary

### What it is
- A map-based game where locations are stored as encrypted values on Ethereum.
- Players opt into disclosure; default state is private.
- All randomness and storage happen on-chain, with no plaintext positions ever written to the contract.

### What problem it solves
- Traditional on-chain games must store game state in plaintext, which leaks player positions and strategy.
- Off-chain servers can hide data, but introduce trust and manipulation risks.
- Veil of Play proves that location-based gameplay can be both verifiable and private using FHE.

### Why it is better
- Privacy by default: positions are encrypted and only the owner can decrypt them.
- Fair randomness: coordinates are derived from on-chain FHE random values.
- Optional transparency: a player can make their position publicly decryptable at any time.
- Trust minimization: no centralized server chooses positions or controls decryption.

## Core Gameplay Flow

1. Join the game
   - Call `joinGame()` to receive a random encrypted coordinate.
   - The contract generates random values with `FHE.randEuint8()` and bounds them to [1, 10].

2. Decrypt your own position
   - The frontend or CLI relayer decrypts the encrypted coordinate for the connected wallet.

3. Make your position public (optional)
   - Call `makePositionPublic()` to mark the encrypted position as publicly decryptable.
   - Anyone can then decrypt the values using the public decryption path.

4. Reroll
   - Call `rerollPosition()` to get new random coordinates.
   - Rerolls reset the public flag to private.

## Smart Contract Design

### Data model
- `PlayerPosition` holds encrypted `x` and `y`, plus `exists` and `isPublic` flags.
- `GRID_MIN` and `GRID_MAX` are fixed to 1 and 10.
- Player data is stored in a mapping, and joined players are tracked in an array.

### Randomness and bounds
- Random numbers are generated with `FHE.randEuint8()`.
- Values are bounded with `FHE.rem(value, GRID_MAX)` and shifted by `GRID_MIN`.

### Access control for encrypted data
- `FHE.allow()` grants the owner access to decrypt their coordinates.
- `FHE.allowThis()` allows the contract to manage encrypted data safely.
- `FHE.makePubliclyDecryptable()` flips a position to be publicly decryptable.

### Events
- `PlayerJoined`: emitted the first time a player joins.
- `PositionAssigned`: emitted whenever a position is assigned or updated.
- `PositionMadePublic`: emitted when a player opts into public decryption.

### View method behavior
- View methods do not depend on `msg.sender`; callers pass the target address explicitly.

## Frontend Architecture

- Built in `home/` with React + Vite.
- Read calls use `viem` for efficient RPC access.
- Write calls use `ethers` to sign transactions.
- Decryption uses the Zama relayer flow.
- The UI avoids local storage and does not rely on frontend environment variables.
- The frontend is designed to talk to Sepolia, not a localhost chain.

## Technology Stack

- Smart contracts: Solidity 0.8.27 + Zama FHEVM
- Framework: Hardhat + hardhat-deploy
- Tests: Hardhat + chai
- Frontend: React, Vite, TypeScript
- Web3: viem (reads), ethers (writes), rainbowkit
- Relayer: Zama relayer integration for decrypt operations

## Project Structure

```
.
├── contracts/           # Smart contracts
├── deploy/              # Deployment scripts
├── tasks/               # Hardhat tasks
├── test/                # Tests
├── deployments/         # Generated ABIs and deployment info
└── home/                # React + Vite frontend
```

## Getting Started

### Prerequisites
- Node.js 20+
- npm

### Install dependencies

```bash
npm install
```

### Compile and test

```bash
npm run compile
npm run test
```

Tests run against the local FHEVM mock and will skip on Sepolia.

### Hardhat tasks

```bash
npx hardhat task:address --network sepolia
npx hardhat task:join --network sepolia
npx hardhat task:decrypt-position --network sepolia
npx hardhat task:make-public --network sepolia
npx hardhat task:public-decrypt --network sepolia --player 0xYourPlayerAddress
```

## Deployment

### Environment variables (Hardhat only)

Create a `.env` file in the project root with:

```
PRIVATE_KEY=0x...     # funded Sepolia account, 0x-prefixed
INFURA_API_KEY=...   # Infura project key for Sepolia
ETHERSCAN_API_KEY=... # optional, used for verification
```

### Deploy to Sepolia

```bash
npm run deploy:sepolia
```

Deployment artifacts and ABI are written to `deployments/sepolia/`.

## Frontend Setup

```bash
cd home
npm install
npm run dev
```

### Contract address and ABI
- The ABI source of truth is `deployments/sepolia/VeilOfPlay.json`.
- Copy the ABI array into a frontend source file and keep it in sync after redeployments.
- Set the deployed contract address directly in the frontend code.

## Security and Privacy Notes

- Positions are never stored in plaintext on-chain.
- Only the player can decrypt their position until they make it public.
- Public positions are still stored as encrypted values, but can be decrypted by anyone.
- The contract does not prevent two players from sharing the same coordinates.
- Rerolls overwrite previous positions and reset privacy to private.

## Limitations

- The grid size is fixed at 10x10.
- There is no collision avoidance for positions.
- There is no win condition or scoring system yet.
- The game does not enforce per-player cooldowns or rate limits.

## Future Roadmap

- Expand to variable map sizes and multiple rounds.
- Add optional game modes (timed rounds, team play, scoring).
- Add cooldowns and anti-spam mechanics.
- Improve UX for public reveals and player discovery.
- Add off-chain analytics that respect encrypted state.
- Explore composable integrations with other privacy-preserving games.

## License

BSD-3-Clause-Clear. See `LICENSE` for details.

import { ConnectButton } from '@rainbow-me/rainbowkit';
import '../styles/Header.css';

export function Header() {
  return (
    <header className="hero">
      <div className="hero__content">
        <div>
          <p className="eyebrow">Encrypted coordinates on Sepolia</p>
          <h1>Veil of Play</h1>
          <p className="hero__description">
            Join a 10x10 map, generate Zama-randomized coordinates, decrypt your spot, and choose when to reveal it.
          </p>
        </div>
        <ConnectButton />
      </div>
    </header>
  );
}

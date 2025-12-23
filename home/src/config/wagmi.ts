import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { sepolia } from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'Veil of Play',
  projectId: 'b2271ab8c2584f9b8c1732e5436e1c87',
  chains: [sepolia],
  ssr: false,
});

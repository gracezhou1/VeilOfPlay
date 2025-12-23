import { useEffect, useMemo, useState } from 'react';
import { isAddress } from 'viem';
import { useAccount, usePublicClient, useReadContract } from 'wagmi';
import { Contract } from 'ethers';
import type { Address } from 'viem';

import { CONTRACT_ABI, CONTRACT_ADDRESS } from '../config/contracts';
import { useEthersSigner } from '../hooks/useEthersSigner';
import { useZamaInstance } from '../hooks/useZamaInstance';
import '../styles/GameApp.css';
import { Header } from './Header';

type Position = {
  x: number;
  y: number;
  address?: string;
};

type MapGridProps = {
  gridMin: number;
  gridMax: number;
  playerPosition: Position | null;
  publicPositions: Position[];
};

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const TARGET_CHAIN_ID = 11155111;

function MapGrid({ gridMin, gridMax, playerPosition, publicPositions }: MapGridProps) {
  const size = gridMax - gridMin + 1;
  const rows = Array.from({ length: size }, (_, index) => gridMax - index);
  const cols = Array.from({ length: size }, (_, index) => gridMin + index);

  return (
    <div className="map-card">
      <div className="map-card__header">
        <div>
          <p className="eyebrow">Encrypted 10x10 map</p>
          <h3>Coordinate board</h3>
          <p className="muted">Top row is y={gridMax}, bottom row is y={gridMin}</p>
        </div>
        <div className="legend">
          <span className="legend__item">
            <span className="legend__dot legend__dot--me" />
            You
          </span>
          <span className="legend__item">
            <span className="legend__dot legend__dot--public" />
            Public players
          </span>
        </div>
      </div>
      <div className="map-grid" style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}>
        {rows.map((row) =>
          cols.map((col) => {
            const isMine = playerPosition && playerPosition.x === col && playerPosition.y === row;
            const publicOwner = publicPositions.find((p) => p.x === col && p.y === row);
            const label = `${col},${row}`;

            return (
              <div
                key={`${col}-${row}`}
                className={`map-cell${isMine ? ' map-cell--me' : ''}${publicOwner ? ' map-cell--public' : ''}`}
                title={label}
              >
                <span className="map-cell__label">{label}</span>
                {isMine ? <span className="badge badge--me">You</span> : null}
                {!isMine && publicOwner ? (
                  <span className="badge badge--public">{shortAddress(publicOwner.address || '')}</span>
                ) : null}
              </div>
            );
          }),
        )}
      </div>
    </div>
  );
}

export function GameApp() {
  const { address, chainId, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const signer = useEthersSigner();
  const { instance, isLoading: zamaLoading, error: zamaError } = useZamaInstance();

  const [activeContract, setActiveContract] = useState(CONTRACT_ADDRESS);
  const [contractInput, setContractInput] = useState(CONTRACT_ADDRESS);
  const [myPosition, setMyPosition] = useState<Position | null>(null);
  const [publicPositions, setPublicPositions] = useState<Position[]>([]);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isRerolling, setIsRerolling] = useState(false);
  const [loadingPublic, setLoadingPublic] = useState(false);
  const [refreshPublicKey, setRefreshPublicKey] = useState(0);
  const [actionMessage, setActionMessage] = useState<string>('');

  const isContractReady = useMemo(
    () => isAddress(activeContract) && activeContract !== ZERO_ADDRESS,
    [activeContract],
  );

  const { data: boundsData } = useReadContract({
    address: isContractReady ? (activeContract as Address) : undefined,
    abi: CONTRACT_ABI,
    functionName: 'getGridBounds',
    query: {
      enabled: isContractReady,
    },
  });

  const bounds = boundsData as readonly [bigint, bigint] | undefined;
  const gridMin = bounds ? Number(bounds[0]) : 1;
  const gridMax = bounds ? Number(bounds[1]) : 10;

  const { data: statusData, refetch: refetchStatus } = useReadContract({
    address: isContractReady && address ? (activeContract as Address) : undefined,
    abi: CONTRACT_ABI,
    functionName: 'getPlayerStatus',
    args: address && isContractReady ? [address] : undefined,
    query: {
      enabled: Boolean(address && isContractReady),
    },
  });

  const { data: encryptedPosition, refetch: refetchPosition } = useReadContract({
    address: isContractReady && address ? (activeContract as Address) : undefined,
    abi: CONTRACT_ABI,
    functionName: 'getEncryptedPosition',
    args: address && isContractReady && statusData?.[0] ? [address] : undefined,
    query: {
      enabled: Boolean(address && isContractReady && statusData?.[0]),
    },
  });

  const { data: playersData, refetch: refetchPlayers } = useReadContract({
    address: isContractReady ? (activeContract as Address) : undefined,
    abi: CONTRACT_ABI,
    functionName: 'getAllPlayers',
    query: {
      enabled: isContractReady,
      refetchInterval: 15000,
    },
  });

  const joined = Boolean(statusData?.[0]);
  const isPublic = Boolean(statusData?.[1]);

  useEffect(() => {
    if (!isContractReady) {
      setPublicPositions([]);
    }
  }, [isContractReady]);

  useEffect(() => {
    const fetchPublicPlayers = async () => {
      if (!instance || !playersData || !isContractReady || !publicClient) {
        return;
      }

      setLoadingPublic(true);
      try {
        const addresses = playersData as Address[];
        const visible: Position[] = [];

        for (const player of addresses) {
          const [hasJoined, hasPublic] = (await publicClient.readContract({
            address: activeContract as Address,
            abi: CONTRACT_ABI,
            functionName: 'getPlayerStatus',
            args: [player],
          })) as [boolean, boolean];

          if (!hasJoined || !hasPublic) {
            continue;
          }

          const [encX, encY] = (await publicClient.readContract({
            address: activeContract as Address,
            abi: CONTRACT_ABI,
            functionName: 'getEncryptedPosition',
            args: [player],
          })) as [string, string];

          const results = await instance.publicDecrypt([encX, encY]);
          const clearX = Number(results.clearValues[encX] ?? 0);
          const clearY = Number(results.clearValues[encY] ?? 0);

          visible.push({ address: player, x: clearX, y: clearY });
        }

        setPublicPositions(visible);
      } catch (error) {
        console.error('Failed to load public positions', error);
      } finally {
        setLoadingPublic(false);
      }
    };

    fetchPublicPlayers();
  }, [playersData, instance, isContractReady, publicClient, activeContract, refreshPublicKey]);

  const handleContractUpdate = () => {
    if (isAddress(contractInput)) {
      setActiveContract(contractInput);
      setRefreshPublicKey((value) => value + 1);
      setMyPosition(null);
      refetchStatus();
      refetchPlayers();
      refetchPosition();
    } else {
      setActionMessage('Enter a valid contract address deployed on Sepolia.');
    }
  };

  const contractUnavailable = !isContractReady;
  const networkMismatch = isConnected && chainId !== TARGET_CHAIN_ID;

  const joinGame = async () => {
    if (contractUnavailable) {
      setActionMessage('Set the contract address before joining.');
      return;
    }
    const signerInstance = await signer;
    if (!signerInstance || !address) {
      setActionMessage('Connect a wallet first.');
      return;
    }

    setIsJoining(true);
    setActionMessage('');
    try {
      const contract = new Contract(activeContract, CONTRACT_ABI, signerInstance);
      const tx = await contract.joinGame();
      await tx.wait();
      setMyPosition(null);
      await Promise.all([refetchStatus(), refetchPosition(), refetchPlayers()]);
      setRefreshPublicKey((value) => value + 1);
    } catch (error) {
      console.error('Join failed', error);
      setActionMessage('Failed to join. Check your wallet confirmation.');
    } finally {
      setIsJoining(false);
    }
  };

  const rerollPosition = async () => {
    if (contractUnavailable) return;
    const signerInstance = await signer;
    if (!signerInstance || !address) return;

    setIsRerolling(true);
    setActionMessage('');
    try {
      const contract = new Contract(activeContract, CONTRACT_ABI, signerInstance);
      const tx = await contract.rerollPosition();
      await tx.wait();
      setMyPosition(null);
      await Promise.all([refetchPosition(), refetchStatus(), refetchPlayers()]);
      setRefreshPublicKey((value) => value + 1);
    } catch (error) {
      console.error('Reroll failed', error);
      setActionMessage('Failed to reroll. Try again.');
    } finally {
      setIsRerolling(false);
    }
  };

  const publishPosition = async () => {
    if (contractUnavailable) return;
    const signerInstance = await signer;
    if (!signerInstance) return;

    setIsPublishing(true);
    setActionMessage('');
    try {
      const contract = new Contract(activeContract, CONTRACT_ABI, signerInstance);
      const tx = await contract.makePositionPublic();
      await tx.wait();
      await Promise.all([refetchStatus(), refetchPlayers()]);
      setRefreshPublicKey((value) => value + 1);
    } catch (error) {
      console.error('Make public failed', error);
      setActionMessage('Failed to mark position as public.');
    } finally {
      setIsPublishing(false);
    }
  };

  const decryptMine = async () => {
    if (!instance || !address || !encryptedPosition || contractUnavailable) {
      setActionMessage('Missing contract, wallet, or ciphertext data.');
      return;
    }
    const signerInstance = await signer;
    if (!signerInstance) {
      setActionMessage('Connect your wallet to decrypt.');
      return;
    }

    setIsDecrypting(true);
    setActionMessage('');
    try {
      const keypair = instance.generateKeypair();
      const handles = [
        { handle: encryptedPosition[0], contractAddress: activeContract },
        { handle: encryptedPosition[1], contractAddress: activeContract },
      ];
      const startTimestamp = Math.floor(Date.now() / 1000).toString();
      const durationDays = '10';

      const eip712 = instance.createEIP712(keypair.publicKey, [activeContract], startTimestamp, durationDays);
      const signature = await signerInstance.signTypedData(
        eip712.domain,
        {
          UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification,
        },
        eip712.message,
      );

      const results = await instance.userDecrypt(
        handles,
        keypair.privateKey,
        keypair.publicKey,
        signature.replace('0x', ''),
        [activeContract],
        address,
        startTimestamp,
        durationDays,
      );

      const xRaw = results[encryptedPosition[0] as string];
      const yRaw = results[encryptedPosition[1] as string];
      const x = Number(typeof xRaw === 'bigint' ? xRaw : Number(xRaw || 0));
      const y = Number(typeof yRaw === 'bigint' ? yRaw : Number(yRaw || 0));

      setMyPosition({ x, y, address });
    } catch (error) {
      console.error('Decrypt failed', error);
      setActionMessage('Unable to decrypt right now. Try again shortly.');
    } finally {
      setIsDecrypting(false);
    }
  };

  const statusChips = [
    { label: 'Connected', active: isConnected },
    { label: 'Joined', active: joined },
    { label: 'Public', active: isPublic },
  ];

  const disabledActions = contractUnavailable || networkMismatch || !isConnected;

  return (
    <div className="page">
      <Header />

      <div className="content">
        <section className="notice">
          <div>
            <p className="eyebrow">Contract</p>
            <h3>Veil of Play on Sepolia</h3>
            <p className="muted">
              Coordinates live entirely on-chain. Set the deployed contract address to start interacting.
            </p>
            {networkMismatch ? (
              <p className="warning">Switch to the Sepolia network to interact with the game.</p>
            ) : null}
          </div>
          <div className="address-input">
            <label htmlFor="contractAddress">Contract address</label>
            <div className="address-row">
              <input
                id="contractAddress"
                value={contractInput}
                onChange={(e) => setContractInput(e.target.value)}
                placeholder="0x..."
              />
              <button className="btn btn--ghost" onClick={handleContractUpdate}>
                Set
              </button>
            </div>
            <p className="muted">
              Current: <span className="mono">{activeContract}</span>
            </p>
          </div>
        </section>

        <div className="grid">
          <div className="column column--narrow">
            <div className="card">
              <div className="card__header">
                <div>
                  <p className="eyebrow">Status</p>
                  <h3>Player state</h3>
                </div>
                <div className="chip-row">
                  {statusChips.map((chip) => (
                    <span
                      key={chip.label}
                      className={`chip${chip.active ? ' chip--active' : ''}`}
                    >
                      {chip.label}
                    </span>
                  ))}
                </div>
              </div>
              <div className="stack">
                <button className="btn" onClick={joinGame} disabled={disabledActions || isJoining}>
                  {isJoining ? 'Joining...' : joined ? 'Refresh position' : 'Join game'}
                </button>
                <button
                  className="btn btn--ghost"
                  onClick={rerollPosition}
                  disabled={disabledActions || !joined || isRerolling}
                >
                  {isRerolling ? 'Rolling...' : 'Reroll coordinates'}
                </button>
                <button
                  className="btn btn--outline"
                  onClick={publishPosition}
                  disabled={disabledActions || !joined || isPublishing}
                >
                  {isPublishing ? 'Publishing...' : 'Make position public'}
                </button>
              </div>
              <div className="info-block">
                <p className="muted">Encrypted handles</p>
                {encryptedPosition ? (
                  <div className="code-block">
                    <span>x: {truncateHandle(encryptedPosition[0] as string)}</span>
                    <span>y: {truncateHandle(encryptedPosition[1] as string)}</span>
                  </div>
                ) : (
                  <p className="muted">Join to generate coordinates.</p>
                )}
              </div>
            </div>

            <div className="card">
              <div className="card__header">
                <div>
                  <p className="eyebrow">Decrypt</p>
                  <h3>Reveal your spot</h3>
                </div>
                {zamaLoading ? <span className="chip">Loading Zama SDK...</span> : null}
              </div>
              <p className="muted">
                Decryption happens off-chain via the relayer. Only you can see your decrypted coordinates unless you
                opt to publish.
              </p>
              <button
                className="btn"
                onClick={decryptMine}
                disabled={disabledActions || !joined || zamaLoading || isDecrypting}
              >
                {isDecrypting ? 'Decrypting...' : 'Decrypt my position'}
              </button>
              {myPosition ? (
                <div className="position-card">
                  <p className="muted">Decrypted position</p>
                  <div className="position-values">
                    <div>
                      <span className="label">X</span>
                      <strong>{myPosition.x}</strong>
                    </div>
                    <div>
                      <span className="label">Y</span>
                      <strong>{myPosition.y}</strong>
                    </div>
                  </div>
                </div>
              ) : null}
              {zamaError ? <p className="warning">Relayer error: {zamaError}</p> : null}
            </div>
          </div>

          <div className="column column--wide">
            <MapGrid
              gridMin={gridMin}
              gridMax={gridMax}
              playerPosition={myPosition}
              publicPositions={publicPositions}
            />

            <div className="card">
              <div className="card__header">
                <div>
                  <p className="eyebrow">Visibility</p>
                  <h3>Public positions</h3>
                </div>
                <button
                  className="btn btn--ghost"
                  onClick={() => setRefreshPublicKey((value) => value + 1)}
                  disabled={loadingPublic || contractUnavailable}
                >
                  {loadingPublic ? 'Refreshing...' : 'Reload'}
                </button>
              </div>
              {publicPositions.length === 0 ? (
                <p className="muted">No one has published their coordinates yet.</p>
              ) : (
                <div className="list">
                  {publicPositions.map((pos) => (
                    <div key={`${pos.address}-${pos.x}-${pos.y}`} className="list__item">
                      <div>
                        <p className="muted">Player</p>
                        <strong>{shortAddress(pos.address || '')}</strong>
                      </div>
                      <div className="position-values">
                        <div>
                          <span className="label">X</span>
                          <strong>{pos.x}</strong>
                        </div>
                        <div>
                          <span className="label">Y</span>
                          <strong>{pos.y}</strong>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {actionMessage ? <div className="alert">{actionMessage}</div> : null}
      </div>
    </div>
  );
}

function shortAddress(value: string) {
  if (!value) return '';
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function truncateHandle(value: string) {
  if (!value) return '';
  return `${value.slice(0, 6)}...${value.slice(-6)}`;
}

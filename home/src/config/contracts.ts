export const CONTRACT_ADDRESS = "0x2a662f55bC7E25a491957a37968Cd300Cf9A886b";

export const CONTRACT_ABI = [
  {
    inputs: [],
    name: "PlayerNotRegistered",
    type: "error",
  },
  {
    inputs: [],
    name: "ZamaProtocolUnsupported",
    type: "error",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "player",
        type: "address",
      },
    ],
    name: "PlayerJoined",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "player",
        type: "address",
      },
    ],
    name: "PositionMadePublic",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "player",
        type: "address",
      },
      {
        indexed: false,
        internalType: "euint8",
        name: "x",
        type: "bytes32",
      },
      {
        indexed: false,
        internalType: "euint8",
        name: "y",
        type: "bytes32",
      },
      {
        indexed: false,
        internalType: "bool",
        name: "isPublic",
        type: "bool",
      },
    ],
    name: "PositionAssigned",
    type: "event",
  },
  {
    inputs: [],
    name: "GRID_MAX",
    outputs: [
      {
        internalType: "uint8",
        name: "",
        type: "uint8",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "GRID_MIN",
    outputs: [
      {
        internalType: "uint8",
        name: "",
        type: "uint8",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "confidentialProtocolId",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getAllPlayers",
    outputs: [
      {
        internalType: "address[]",
        name: "",
        type: "address[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "player",
        type: "address",
      },
    ],
    name: "getEncryptedPosition",
    outputs: [
      {
        internalType: "euint8",
        name: "x",
        type: "bytes32",
      },
      {
        internalType: "euint8",
        name: "y",
        type: "bytes32",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getGridBounds",
    outputs: [
      {
        internalType: "uint8",
        name: "minCoord",
        type: "uint8",
      },
      {
        internalType: "uint8",
        name: "maxCoord",
        type: "uint8",
      },
    ],
    stateMutability: "pure",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "player",
        type: "address",
      },
    ],
    name: "getPlayerStatus",
    outputs: [
      {
        internalType: "bool",
        name: "joined",
        type: "bool",
      },
      {
        internalType: "bool",
        name: "isPublic",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "joinGame",
    outputs: [
      {
        internalType: "euint8",
        name: "x",
        type: "bytes32",
      },
      {
        internalType: "euint8",
        name: "y",
        type: "bytes32",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "makePositionPublic",
    outputs: [
      {
        internalType: "euint8",
        name: "x",
        type: "bytes32",
      },
      {
        internalType: "euint8",
        name: "y",
        type: "bytes32",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "rerollPosition",
    outputs: [
      {
        internalType: "euint8",
        name: "x",
        type: "bytes32",
      },
      {
        internalType: "euint8",
        name: "y",
        type: "bytes32",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

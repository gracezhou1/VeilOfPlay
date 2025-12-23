// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {FHE, euint8} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title VeilOfPlay - Encrypted location game on a 10x10 map
/// @notice Players receive random encrypted coordinates and can choose to make them publicly decryptable.
contract VeilOfPlay is ZamaEthereumConfig {
    struct PlayerPosition {
        euint8 x;
        euint8 y;
        bool exists;
        bool isPublic;
    }

    uint8 public constant GRID_MIN = 1;
    uint8 public constant GRID_MAX = 10;

    mapping(address => PlayerPosition) private _positions;
    address[] private _players;

    event PlayerJoined(address indexed player);
    event PositionAssigned(address indexed player, euint8 x, euint8 y, bool isPublic);
    event PositionMadePublic(address indexed player);

    error PlayerNotRegistered();

    /// @notice Join the game and receive a new random encrypted position.
    /// @return x encrypted x coordinate
    /// @return y encrypted y coordinate
    function joinGame() external returns (euint8 x, euint8 y) {
        (x, y) = _assignRandomPosition(msg.sender, true);
    }

    /// @notice Reroll to a new random position after joining.
    /// @return x encrypted x coordinate
    /// @return y encrypted y coordinate
    function rerollPosition() external returns (euint8 x, euint8 y) {
        if (!_positions[msg.sender].exists) {
            revert PlayerNotRegistered();
        }
        (x, y) = _assignRandomPosition(msg.sender, false);
    }

    /// @notice Make the caller's position publicly decryptable.
    /// @return x encrypted x coordinate (now public)
    /// @return y encrypted y coordinate (now public)
    function makePositionPublic() external returns (euint8 x, euint8 y) {
        PlayerPosition storage position = _positions[msg.sender];
        if (!position.exists) {
            revert PlayerNotRegistered();
        }

        position.x = FHE.makePubliclyDecryptable(position.x);
        position.y = FHE.makePubliclyDecryptable(position.y);
        position.isPublic = true;

        emit PositionMadePublic(msg.sender);
        emit PositionAssigned(msg.sender, position.x, position.y, true);

        return (position.x, position.y);
    }

    /// @notice Get the encrypted position for any player.
    /// @param player address of the player
    /// @return x encrypted x coordinate
    /// @return y encrypted y coordinate
    function getEncryptedPosition(address player) external view returns (euint8 x, euint8 y) {
        PlayerPosition storage position = _positions[player];
        if (!position.exists) {
            revert PlayerNotRegistered();
        }
        return (position.x, position.y);
    }

    /// @notice Check if a player has joined and whether their position is public.
    /// @param player address of the player
    /// @return joined true if the player has a stored position
    /// @return isPublic true if their position is publicly decryptable
    function getPlayerStatus(address player) external view returns (bool joined, bool isPublic) {
        PlayerPosition storage position = _positions[player];
        return (position.exists, position.isPublic);
    }

    /// @notice Return all addresses that have joined the game.
    function getAllPlayers() external view returns (address[] memory) {
        return _players;
    }

    /// @notice Return map boundaries.
    function getGridBounds() external pure returns (uint8 minCoord, uint8 maxCoord) {
        return (GRID_MIN, GRID_MAX);
    }

    function _assignRandomPosition(address player, bool allowNew) internal returns (euint8, euint8) {
        PlayerPosition storage position = _positions[player];
        bool firstJoin = !position.exists;
        if (!allowNew && firstJoin) {
            revert PlayerNotRegistered();
        }

        position.x = _randomCoordinate();
        position.y = _randomCoordinate();
        position.exists = true;
        position.isPublic = false;

        _allowAccess(position, player);

        if (firstJoin) {
            _players.push(player);
            emit PlayerJoined(player);
        }

        emit PositionAssigned(player, position.x, position.y, false);
        return (position.x, position.y);
    }

    function _randomCoordinate() internal returns (euint8) {
        euint8 base = FHE.randEuint8();
        euint8 bounded = FHE.rem(base, GRID_MAX);
        return FHE.add(bounded, FHE.asEuint8(GRID_MIN));
    }

    function _allowAccess(PlayerPosition storage position, address player) internal {
        FHE.allow(position.x, player);
        FHE.allow(position.y, player);
        FHE.allowThis(position.x);
        FHE.allowThis(position.y);
    }
}

import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers, fhevm } from "hardhat";
import { FhevmType } from "@fhevm/hardhat-plugin";
import { VeilOfPlay, VeilOfPlay__factory } from "../types";

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("VeilOfPlay")) as VeilOfPlay__factory;
  const contract = (await factory.deploy()) as VeilOfPlay;
  const contractAddress = await contract.getAddress();

  return { contract, contractAddress };
}

describe("VeilOfPlay", function () {
  let signers: Signers;
  let contract: VeilOfPlay;
  let contractAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { deployer: ethSigners[0], alice: ethSigners[1], bob: ethSigners[2] };
  });

  beforeEach(async function () {
    if (!fhevm.isMock) {
      console.warn("This hardhat test suite cannot run on Sepolia Testnet");
      this.skip();
    }

    ({ contract, contractAddress } = await deployFixture());
  });

  it("assigns encrypted coordinates within map bounds when joining", async function () {
    const tx = await contract.connect(signers.alice).joinGame();
    await tx.wait();

    const status = await contract.getPlayerStatus(signers.alice.address);
    expect(status[0]).to.eq(true);
    expect(status[1]).to.eq(false);

    const [encryptedX, encryptedY] = await contract.getEncryptedPosition(signers.alice.address);
    const clearX = await fhevm.userDecryptEuint(FhevmType.euint8, encryptedX, contractAddress, signers.alice);
    const clearY = await fhevm.userDecryptEuint(FhevmType.euint8, encryptedY, contractAddress, signers.alice);

    expect(clearX).to.be.gte(1n).and.to.be.lte(10n);
    expect(clearY).to.be.gte(1n).and.to.be.lte(10n);
  });

  it("allows rerolling a position and keeps it private by default", async function () {
    await contract.connect(signers.alice).joinGame();
    await contract.connect(signers.alice).makePositionPublic();

    const firstStatus = await contract.getPlayerStatus(signers.alice.address);
    expect(firstStatus[1]).to.eq(true);

    const rerollTx = await contract.connect(signers.alice).rerollPosition();
    await rerollTx.wait();

    const status = await contract.getPlayerStatus(signers.alice.address);
    expect(status[1]).to.eq(false);

    const [encryptedX, encryptedY] = await contract.getEncryptedPosition(signers.alice.address);
    const clearX = await fhevm.userDecryptEuint(FhevmType.euint8, encryptedX, contractAddress, signers.alice);
    const clearY = await fhevm.userDecryptEuint(FhevmType.euint8, encryptedY, contractAddress, signers.alice);

    expect(clearX).to.be.gte(1n).and.to.be.lte(10n);
    expect(clearY).to.be.gte(1n).and.to.be.lte(10n);
  });

  it("makes positions publicly decryptable after opt-in", async function () {
    await contract.connect(signers.alice).joinGame();
    await contract.connect(signers.alice).makePositionPublic();

    const status = await contract.getPlayerStatus(signers.alice.address);
    expect(status[1]).to.eq(true);

    const [encryptedX, encryptedY] = await contract.getEncryptedPosition(signers.alice.address);
    const clearX = await fhevm.publicDecryptEuint(FhevmType.euint8, encryptedX);
    const clearY = await fhevm.publicDecryptEuint(FhevmType.euint8, encryptedY);

    expect(clearX).to.be.gte(1n).and.to.be.lte(10n);
    expect(clearY).to.be.gte(1n).and.to.be.lte(10n);
  });

  it("tracks all joined players", async function () {
    await contract.connect(signers.alice).joinGame();
    await contract.connect(signers.bob).joinGame();

    const players = await contract.getAllPlayers();
    expect(players).to.include.members([signers.alice.address, signers.bob.address]);
  });
});

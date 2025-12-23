import { FhevmType } from "@fhevm/hardhat-plugin";
import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

task("task:address", "Prints the VeilOfPlay address").setAction(async function (_taskArguments: TaskArguments, hre) {
  const { deployments } = hre;
  const contract = await deployments.get("VeilOfPlay");

  console.log("VeilOfPlay address is " + contract.address);
});

task("task:join", "Join the VeilOfPlay map and get encrypted coordinates")
  .addOptionalParam("address", "Optionally specify the VeilOfPlay contract address")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;
    await fhevm.initializeCLIApi();

    const deployment = taskArguments.address ? { address: taskArguments.address } : await deployments.get("VeilOfPlay");
    console.log(`VeilOfPlay: ${deployment.address}`);

    const [signer] = await ethers.getSigners();
    const contract = await ethers.getContractAt("VeilOfPlay", deployment.address);

    const tx = await contract.connect(signer).joinGame();
    console.log(`Wait for tx:${tx.hash}...`);
    await tx.wait();

    const [encryptedX, encryptedY] = await contract.getEncryptedPosition(signer.address);
    const clearX = await fhevm.userDecryptEuint(FhevmType.euint8, encryptedX, deployment.address, signer);
    const clearY = await fhevm.userDecryptEuint(FhevmType.euint8, encryptedY, deployment.address, signer);

    console.log(`Joined with coordinates: x=${clearX} y=${clearY}`);
  });

task("task:decrypt-position", "Decrypt your encrypted coordinates")
  .addOptionalParam("address", "Optionally specify the VeilOfPlay contract address")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;
    await fhevm.initializeCLIApi();

    const deployment = taskArguments.address ? { address: taskArguments.address } : await deployments.get("VeilOfPlay");
    const [signer] = await ethers.getSigners();
    const contract = await ethers.getContractAt("VeilOfPlay", deployment.address);

    const [encryptedX, encryptedY] = await contract.getEncryptedPosition(signer.address);
    const clearX = await fhevm.userDecryptEuint(FhevmType.euint8, encryptedX, deployment.address, signer);
    const clearY = await fhevm.userDecryptEuint(FhevmType.euint8, encryptedY, deployment.address, signer);

    console.log(`Encrypted X: ${encryptedX}`);
    console.log(`Encrypted Y: ${encryptedY}`);
    console.log(`Decrypted coordinates -> x=${clearX} y=${clearY}`);
  });

task("task:make-public", "Make your coordinates publicly decryptable")
  .addOptionalParam("address", "Optionally specify the VeilOfPlay contract address")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments } = hre;

    const deployment = taskArguments.address ? { address: taskArguments.address } : await deployments.get("VeilOfPlay");
    const [signer] = await ethers.getSigners();
    const contract = await ethers.getContractAt("VeilOfPlay", deployment.address);

    const tx = await contract.connect(signer).makePositionPublic();
    console.log(`Wait for tx:${tx.hash}...`);
    await tx.wait();
    console.log("Position marked as public");
  });

task("task:public-decrypt", "Publicly decrypt a player's coordinates")
  .addOptionalParam("address", "Optionally specify the VeilOfPlay contract address")
  .addParam("player", "Player address to decrypt")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;
    await fhevm.initializeCLIApi();

    const deployment = taskArguments.address ? { address: taskArguments.address } : await deployments.get("VeilOfPlay");
    const contract = await ethers.getContractAt("VeilOfPlay", deployment.address);

    const status = await contract.getPlayerStatus(taskArguments.player);
    if (!status[0]) {
      console.log("Player has not joined");
      return;
    }
    if (!status[1]) {
      console.log("Player position is not public yet");
      return;
    }

    const [encryptedX, encryptedY] = await contract.getEncryptedPosition(taskArguments.player);
    const clearX = await fhevm.publicDecryptEuint(FhevmType.euint8, encryptedX);
    const clearY = await fhevm.publicDecryptEuint(FhevmType.euint8, encryptedY);

    console.log(`Public coordinates for ${taskArguments.player} -> x=${clearX} y=${clearY}`);
  });

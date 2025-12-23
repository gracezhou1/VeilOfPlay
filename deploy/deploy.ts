import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedVeilOfPlay = await deploy("VeilOfPlay", {
    from: deployer,
    log: true,
  });

  console.log(`VeilOfPlay contract: `, deployedVeilOfPlay.address);
};
export default func;
func.id = "deploy_veil_of_play"; // id required to prevent reexecution
func.tags = ["VeilOfPlay"];

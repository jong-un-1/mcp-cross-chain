// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {GeniusMulticall} from "../src/GeniusMulticall.sol";

/**
 * @title DeployGeniusMulticall
 * @dev A contract for deploying the GeniusMulticall contract.
 *      Deployment commands:
 *      `source .env` // Load environment variables
 *      POLYGON: source .env; forge script script/DeployGeniusMulticall.s.sol:DeployGeniusMulticall --rpc-url $POLYGON_RPC_URL --broadcast -vvvv --via-ir
 */
contract DeployGeniusMulticall is Script {
    GeniusMulticall public geniusMulticall;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        geniusMulticall = new GeniusMulticall();

        console.log("GeniusMulticall deployed at: ", address(geniusMulticall));

        vm.stopBroadcast();
    }
}

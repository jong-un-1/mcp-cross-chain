// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {DeployGeniusEcosystemCore} from "./DeployGeniusEcosystemCore.s.sol";

// COMMAND: forge script script/deployment/DeployPolygonGeniusEcosystem.s.sol --rpc-url $POLYGON_RPC_URL --broadcast --via-ir
contract DeployPolygonGeniusEcosystem is DeployGeniusEcosystemCore {
    address public constant STABLE_ADDRESS =
        0x29219dd400f2Bf60E5a23d13Be72B486D4038894;
    address public constant PRICE_FEED =
        0x55bCa887199d5520B3Ce285D41e6dC10C08716C9;
    uint256 public constant PRICE_FEED_HEART_BEAT = 86400;
    address public constant PERMIT2_ADDRESS =
        0x000000000022D473030F116dDEE9F6B43aC78BA3;
    address public constant OWNER = 0x5CC11Ef1DE86c5E00259a463Ac3F3AE1A0fA2909;

    function run() external {
        address[] memory orchestrators = new address[](0);

        address[] memory feeTokens = new address[](8);
        feeTokens[0] = STABLE_ADDRESS; // USDC
        feeTokens[1] = STABLE_ADDRESS; // USDC
        feeTokens[2] = STABLE_ADDRESS; // USDC
        feeTokens[3] = STABLE_ADDRESS; // USDC
        feeTokens[4] = STABLE_ADDRESS; // USDC
        feeTokens[5] = STABLE_ADDRESS; // USDC
        feeTokens[6] = STABLE_ADDRESS; // USDC
        feeTokens[7] = STABLE_ADDRESS; // USDC

        uint256[] memory minFeeAmounts = new uint256[](8);
        minFeeAmounts[0] = 100000; // $0.1
        minFeeAmounts[1] = 1000000; // $1
        minFeeAmounts[2] = 100000; // $0.1
        minFeeAmounts[3] = 1000000; // $1
        minFeeAmounts[4] = 100000; // $0.1
        minFeeAmounts[5] = 100000; // $0.1
        minFeeAmounts[6] = 100000; // $0.1
        minFeeAmounts[7] = 100000; // $0.1

        uint256[] memory targetNetworks = new uint256[](8);
        targetNetworks[0] = 8453; // BASE
        targetNetworks[1] = 10; // OPTIMISM
        targetNetworks[2] = 42161; // ARBITRUM
        targetNetworks[3] = 1; // ETHEREUM
        targetNetworks[4] = 43114; // AVALANCHE
        targetNetworks[5] = 1399811149; // SOLANA
        targetNetworks[6] = 56; //BSC
        targetNetworks[7] = 137; //POLYGON

        // Fee tiers will be set in the _run function
        
        _run(
            PERMIT2_ADDRESS,
            STABLE_ADDRESS,
            PRICE_FEED,
            PRICE_FEED_HEART_BEAT,
            OWNER,
            orchestrators,
            targetNetworks,
            feeTokens,
            minFeeAmounts
        );
    }
}

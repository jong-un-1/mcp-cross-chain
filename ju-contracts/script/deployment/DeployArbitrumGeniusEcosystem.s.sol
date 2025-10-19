// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {DeployGeniusEcosystemCore} from "./DeployGeniusEcosystemCore.s.sol";

// COMMAND: forge script script/deployment/DeployArbitrumGeniusEcosystem.s.sol --rpc-url $ARBITRUM_RPC_URL --broadcast --via-ir
contract DeployArbitrumGeniusEcosystem is DeployGeniusEcosystemCore {
    address public constant stableAddress =
        0xaf88d065e77c8cC2239327C5EDb3A432268e5831;
    address public constant priceFeed =
        0x50834F3163758fcC1Df9973b6e91f0F0F0434aD3;
    uint256 public constant priceFeedHeartBeat = 86400;

    address public constant permit2Address =
        0x000000000022D473030F116dDEE9F6B43aC78BA3;
    address public constant owner = 0x5CC11Ef1DE86c5E00259a463Ac3F3AE1A0fA2909;

    function run() external {
        address[] memory orchestrators = new address[](0);

        address[] memory feeTokens = new address[](7);
        feeTokens[0] = stableAddress; // USDC
        feeTokens[1] = stableAddress; // USDC
        feeTokens[2] = stableAddress; // USDC
        feeTokens[3] = stableAddress; // USDC
        feeTokens[4] = stableAddress; // USDC
        feeTokens[5] = stableAddress; // USDC
        feeTokens[6] = stableAddress; // USDC

        uint256[] memory minFeeAmounts = new uint256[](7);
        minFeeAmounts[0] = 100000; // $0.1
        minFeeAmounts[1] = 1000000; // $1
        minFeeAmounts[2] = 100000; // $0.1
        minFeeAmounts[3] = 1000000; // $1
        minFeeAmounts[4] = 100000; // $0.1
        minFeeAmounts[5] = 100000; // $0.1
        minFeeAmounts[6] = 100000; // $0.1
        
        // Fee tiers will be set in the _run function

        uint256[] memory targetNetworks = new uint256[](7);
        targetNetworks[0] = 56; // BSC
        targetNetworks[1] = 8453; // BASE
        targetNetworks[2] = 10; // OPTIMISM
        targetNetworks[3] = 1; // ETHEREUM
        targetNetworks[4] = 43114; // AVALANCHE
        targetNetworks[5] = 1399811149; // SOLANA
        targetNetworks[6] = 137; //POLYGON

        _run(
            permit2Address,
            stableAddress,
            priceFeed,
            priceFeedHeartBeat,
            owner,
            orchestrators,
            targetNetworks,
            feeTokens,
            minFeeAmounts
        );
    }
}

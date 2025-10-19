// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IAllowanceTransfer, IEIP712} from "permit2/interfaces/IAllowanceTransfer.sol";
import {PermitSignature} from "./utils/SigUtils.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import {GeniusVault} from "../src/GeniusVault.sol";
import {GeniusProxyCall} from "../src/GeniusProxyCall.sol";
import {FeeCollector} from "../src/fees/FeeCollector.sol";
import {IFeeCollector} from "../src/interfaces/IFeeCollector.sol";

import {MockDEXRouter} from "./mocks/MockDEXRouter.sol";
import {MockV3Aggregator} from "./mocks/MockV3Aggregator.sol";

contract GeniusVaultAccounting is Test {
    int256 public constant INITIAL_STABLECOIN_PRICE = 100_000_000;
    MockV3Aggregator public MOCK_PRICE_FEED;

    // ============ Network ============
    uint256 avalanche;
    string private rpc = vm.envString("AVALANCHE_RPC_URL");

    uint32 destChainId = 42;
    uint256 depositAmount = 100 ether;

    // ============ External Contracts ============
    ERC20 public USDC = ERC20(0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E);
    ERC20 public TEST_TOKEN;

    // ============ Internal Contracts ============
    GeniusVault public VAULT;
    GeniusProxyCall public PROXYCALL;
    MockDEXRouter public DEX_ROUTER;
    FeeCollector public FEE_COLLECTOR;

    // ============ Constants ============
    address public PERMIT2 = 0x000000000022D473030F116dDEE9F6B43aC78BA3;
    address public feeCollecter = makeAddr("feeCollector");
    address public OWNER;
    address public TRADER;
    address public ORCHESTRATOR;
    bytes32 public RECEIVER = keccak256("receiver");

    // Add new variables for Permit2
    address public permit2Address = 0x000000000022D473030F116dDEE9F6B43aC78BA3;
    IEIP712 public permit2 = IEIP712(permit2Address);
    PermitSignature public sigUtils;
    uint256 private privateKey;
    uint48 public nonce;
    bytes32 public DOMAIN_SEPERATOR;

    // Add new function for generating Permit2 batch and signature
    function generatePermitBatchAndSignature(
        address spender,
        address[] memory tokens,
        uint160[] memory amounts
    ) internal returns (IAllowanceTransfer.PermitBatch memory, bytes memory) {
        require(
            tokens.length == amounts.length,
            "Tokens and amounts length mismatch"
        );
        require(tokens.length > 0, "At least one token must be provided");

        IAllowanceTransfer.PermitDetails[]
            memory permitDetails = new IAllowanceTransfer.PermitDetails[](
                tokens.length
            );

        for (uint i = 0; i < tokens.length; i++) {
            permitDetails[i] = IAllowanceTransfer.PermitDetails({
                token: tokens[i],
                amount: amounts[i],
                expiration: 1900000000,
                nonce: nonce
            });
            nonce++;
        }

        IAllowanceTransfer.PermitBatch memory permitBatch = IAllowanceTransfer
            .PermitBatch({
                details: permitDetails,
                spender: spender,
                sigDeadline: 1900000000
            });

        bytes memory signature = sigUtils.getPermitBatchSignature(
            permitBatch,
            privateKey,
            DOMAIN_SEPERATOR
        );

        return (permitBatch, signature);
    }

    // ============ Helper Functions ============
    function donateAndAssert(
        uint256 expectedTotalStaked,
        uint256 expectedTotal,
        uint256 expectedAvailable,
        uint256 expectedMin
    ) internal {
        USDC.transfer(address(VAULT), 10 ether);
        assertEq(
            VAULT.totalStakedAssets(),
            expectedTotalStaked,
            "Total staked assets mismatch after donation"
        );
        assertEq(
            VAULT.stablecoinBalance(),
            expectedTotal,
            "Total assets mismatch after donation"
        );
        assertEq(
            VAULT.availableAssets(),
            expectedAvailable,
            "Available assets mismatch after donation"
        );
        assertEq(
            VAULT.minLiquidity(),
            expectedMin,
            "Minimum asset balance mismatch after donation"
        );
    }

    // ============ Setup ============
    function setUp() public {
        avalanche = vm.createFork(rpc);
        vm.selectFork(avalanche);

        // Set up addresses
        OWNER = address(0x1);
        TRADER = address(0x2);
        ORCHESTRATOR = address(0x3);
        PROXYCALL = new GeniusProxyCall(OWNER, new address[](0));

        vm.startPrank(OWNER);

        // Deploy mock price feed
        MOCK_PRICE_FEED = new MockV3Aggregator(INITIAL_STABLECOIN_PRICE);

        // Deploy FeeCollector
        FeeCollector feeCollectorImplementation = new FeeCollector();

        bytes memory feeCollectorData = abi.encodeWithSelector(
            FeeCollector.initialize.selector,
            OWNER,
            address(USDC),
            2000, // 20% to protocol
            OWNER,
            OWNER,
            OWNER
        );

        ERC1967Proxy feeCollectorProxy = new ERC1967Proxy(
            address(feeCollectorImplementation),
            feeCollectorData
        );

        FEE_COLLECTOR = FeeCollector(address(feeCollectorProxy));

        // Deploy contracts
        GeniusVault implementation = new GeniusVault();

        bytes memory data = abi.encodeWithSelector(
            GeniusVault.initialize.selector,
            address(USDC),
            OWNER,
            address(PROXYCALL),
            7_500,
            address(MOCK_PRICE_FEED),
            86_000,
            99_000_000,
            101_000_000,
            1_000 ether
        );

        ERC1967Proxy proxy = new ERC1967Proxy(address(implementation), data);

        VAULT = GeniusVault(address(proxy));

        PROXYCALL.grantRole(PROXYCALL.CALLER_ROLE(), address(VAULT));

        // Set up FeeCollector and Vault connections
        VAULT.setFeeCollector(address(FEE_COLLECTOR));
        FEE_COLLECTOR.setVault(address(VAULT));

        // Set up fee tiers in FeeCollector
        uint256[] memory thresholdAmounts = new uint256[](3);
        thresholdAmounts[0] = 0;
        thresholdAmounts[1] = 100 ether;
        thresholdAmounts[2] = 500 ether;

        uint256[] memory bpsFees = new uint256[](3);
        bpsFees[0] = 30; // 0.3%
        bpsFees[1] = 20; // 0.2%
        bpsFees[2] = 10; // 0.1%

        FEE_COLLECTOR.setFeeTiers(thresholdAmounts, bpsFees);

        // Set min fee in FeeCollector
        FEE_COLLECTOR.setTargetChainMinFee(destChainId, 1 ether);

        DEX_ROUTER = new MockDEXRouter();

        permit2 = IEIP712(permit2Address);
        DOMAIN_SEPERATOR = permit2.DOMAIN_SEPARATOR();
        sigUtils = new PermitSignature();

        (address traderAddress, uint256 traderKey) = makeAddrAndKey("trader");
        TRADER = traderAddress;
        privateKey = traderKey;

        // Add Orchestrator
        VAULT.grantRole(VAULT.ORCHESTRATOR_ROLE(), ORCHESTRATOR);

        vm.stopPrank();

        // Provide USDC to TRADER and ORCHESTRATOR
        deal(address(USDC), TRADER, 1_000 ether);
        deal(address(USDC), ORCHESTRATOR, 1_000 ether);
        deal(address(USDC), address(this), 1_000 ether);
    }

    /**
     * @dev This function is a test function that checks the staked values in the GeniusVaultAccounting contract.
     * It performs the following steps:
     * 1. Starts a prank with the TRADER address.
     * 2. Approves USDC to be spent by the VAULT contract.
     * 3. Deposits 100 USDC into the VAULT contract.
     * 5. Calls the logValues function to log the staked values.
     * 6. Asserts the staked values to ensure they match the expected values.
     */
    function testStakedValues() public {
        vm.startPrank(TRADER);

        // Approve USDC to be spent by the vault
        USDC.approve(address(VAULT), 1_000 ether);

        // Deposit 100 USDC into the vault
        VAULT.stakeDeposit(100 ether, TRADER);

        // Check the staked value
        assertEq(
            VAULT.totalStakedAssets(),
            100 ether,
            "Total staked assets mismatch"
        );
        assertEq(VAULT.stablecoinBalance(), 100 ether, "Total assets mismatch");
        assertEq(
            VAULT.totalStakedAssets(),
            VAULT.stablecoinBalance(),
            "Total staked assets and total assets mismatch"
        );
        assertEq(
            VAULT.availableAssets(),
            75 ether,
            "Available assets mismatch"
        );
        assertEq(
            VAULT.minLiquidity(),
            25 ether,
            "Minimum asset balance mismatch"
        );

        vm.stopPrank(); // Stop acting as TRADER
    }

    /**
     * @dev This function tests the threshold change functionality of the GeniusVaultAccounting contract.
     * It performs the following steps:
     * 1. Starts acting as a TRADER.
     * 2. Approves USDC to be spent by the vault.
     * 3. Deposits 100 USDC into the vault.
     * 4. Checks the staked value and asserts the expected values.
     * 5. Stops acting as a TRADER.
     * 6. Starts acting as an OWNER.
     * 7. Changes the rebalance threshold to 10.
     * 8. Stops acting as an OWNER.
     * 9. Logs the post-change staked values.
     * 10. Checks the staked value again and asserts the expected values.
     */
    function testThresholdChange() public {
        vm.startPrank(TRADER);

        // Approve USDC to be spent by the vault
        USDC.approve(address(VAULT), 1_000 ether);

        // Deposit 100 USDC into the vault
        VAULT.stakeDeposit(100 ether, TRADER);

        // Check the staked value
        assertEq(
            VAULT.totalStakedAssets(),
            100 ether,
            "Total staked assets mismatch"
        );
        assertEq(VAULT.stablecoinBalance(), 100 ether, "Total assets mismatch");
        assertEq(
            VAULT.totalStakedAssets(),
            VAULT.stablecoinBalance(),
            "Total staked assets and total assets mismatch"
        );
        assertEq(
            VAULT.availableAssets(),
            75 ether,
            "Available assets mismatch"
        );
        assertEq(
            VAULT.minLiquidity(),
            25 ether,
            "Minimum asset balance mismatch"
        );

        vm.stopPrank(); // Stop acting as TRADER

        // Change the threshold
        vm.startPrank(OWNER);
        VAULT.setRebalanceThreshold(1_000);
        vm.stopPrank();

        // Check the staked value
        assertEq(
            VAULT.totalStakedAssets(),
            100 ether,
            "Total staked assets mismatch"
        );
        assertEq(VAULT.stablecoinBalance(), 100 ether, "Total assets mismatch");
        assertEq(
            VAULT.totalStakedAssets(),
            VAULT.stablecoinBalance(),
            "Total staked assets and total assets mismatch"
        );
        assertEq(
            VAULT.availableAssets(),
            10 ether,
            "Available assets mismatch"
        );
        assertEq(
            VAULT.minLiquidity(),
            90 ether,
            "Minimum asset balance mismatch"
        );
    }
}

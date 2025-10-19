use anchor_lang::prelude::*;

pub mod constant;
pub mod error;
pub mod instructions;
pub mod state;
pub mod util;
use constant::*;
use error::*;
use instructions::*;
use state::*;
use util::*;

declare_id!("5Yxrh62n36maX6u8nePs2ztWfKTWA9pJLXCNd1tzo1kP");

#[program]
pub mod ju {
    use super::*;

    //  called by contract deployer only 1 time to initialize global values
    //  send SOL to global_account, vault, ata_vault to initialize accounts
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        Initialize::process_instruction(ctx)
    }

    //  Admin can hand over admin role
    pub fn nominate_authority(ctx: Context<NominateAuthority>, new_admin: Pubkey) -> Result<()> {
        NominateAuthority::process_instruction(ctx, new_admin)
    }

    //  Pending admin should accept the admin role
    pub fn accept_authority(ctx: Context<AcceptAuthority>) -> Result<()> {
        AcceptAuthority::process_instruction(ctx)
    }

    //  Admin can add new freeze authority
    pub fn add_freeze_authority(
        ctx: Context<AddGlobalStateAuthority>,
        authority_address: Pubkey,
    ) -> Result<()> {
        AddGlobalStateAuthority::process_instruction(ctx, authority_address, true)
    }

    //  Admin can remove a freeze authority
    pub fn remove_freeze_authority(
        ctx: Context<RemoveGlobalStateAuthority>,
        authority_address: Pubkey,
    ) -> Result<()> {
        RemoveGlobalStateAuthority::process_instruction(ctx, authority_address, true)
    }

    //  Admin can add new thaw authority
    pub fn add_thaw_authority(
        ctx: Context<AddGlobalStateAuthority>,
        authority_address: Pubkey,
    ) -> Result<()> {
        AddGlobalStateAuthority::process_instruction(ctx, authority_address, false)
    }

    //  Admin can remove a freeze authority
    pub fn remove_thaw_authority(
        ctx: Context<RemoveGlobalStateAuthority>,
        authority_address: Pubkey,
    ) -> Result<()> {
        RemoveGlobalStateAuthority::process_instruction(ctx, authority_address, false)
    }

    // Freeze authority can freeze global state
    pub fn freeze_global_state(ctx: Context<FreezeThawGlobalState>) -> Result<()> {
        FreezeThawGlobalState::freeze_global_state(ctx)
    }

    // Thaw authority can thaw global state
    pub fn thaw_global_state(ctx: Context<FreezeThawGlobalState>) -> Result<()> {
        FreezeThawGlobalState::thaw_global_state(ctx)
    }

    //  Admin can add new orchestrators
    //  Made a pda for each orchestrator to remove the limit
    pub fn add_orchestrator(
        ctx: Context<AddOrchestrator>,
        fill_order_permission: bool,
        revert_order_permission: bool,
        remove_bridge_liquidity_permission: bool,
        claim_base_fee_permission: bool,
        claim_lp_fee_permission: bool,
        claim_protocol_fee_permission: bool,
    ) -> Result<()> {
        AddOrchestrator::process_instruction(
            ctx,
            fill_order_permission,
            revert_order_permission,
            remove_bridge_liquidity_permission,
            claim_base_fee_permission,
            claim_lp_fee_permission,
            claim_protocol_fee_permission,
        )
    }

    //  Admin can set target chain min fee
    pub fn set_fee_tiers(
        ctx: Context<SetFeeTiers>,
        threshold_amounts: Vec<u64>,
        bps_fees: Vec<u64>,
    ) -> Result<()> {
        SetFeeTiers::process_instruction(ctx, threshold_amounts.as_ref(), bps_fees.as_ref())
    }

    //  Admin can set target chain min fee
    pub fn set_target_chain_min_fee(
        ctx: Context<SetTargetChainMinFee>,
        dest_chain_id: u32,
        min_fee: u64,
    ) -> Result<()> {
        SetTargetChainMinFee::process_instruction(ctx, dest_chain_id, min_fee)
    }

    //  doesn't close account for now
    pub fn remove_orchestrator(ctx: Context<RemoveOrchestrator>) -> Result<()> {
        RemoveOrchestrator::process_instruction(ctx)
    }

    //  admin can update threshold amount
    pub fn update_global_state_params(
        ctx: Context<UpdateGlobalStateParams>,
        rebalance_threshold: Option<u16>,
        cross_chain_fee_bps: Option<u16>,
        max_order_amount: Option<u64>,
    ) -> Result<()> {
        UpdateGlobalStateParams::process_instruction(
            ctx,
            rebalance_threshold,
            cross_chain_fee_bps,
            max_order_amount,
        )
    }

    //  orchestrator can remove bridge liquidity
    pub fn remove_bridge_liquidity(ctx: Context<RemoveBridgeLiquidity>, amount: u64) -> Result<()> {
        RemoveBridgeLiquidity::process_instruction(ctx, amount)
    }

    // orchestrator can claim fee
    pub fn claim_fees(ctx: Context<ClaimFees>, amount: u64, fee_type: FeeType) -> Result<()> {
        ClaimFees::process_instruction(ctx, amount, fee_type)
    }

    //  user can deposit any token to the vault
    pub fn create_order(
        ctx: Context<CreateOrder>,
        amount: u64,
        seed: [u8; 32],
        order_hash: [u8; 32],
        receiver: [u8; 32],
        src_chain_id: u32,
        dest_chain_id: u32,
        token_in: [u8; 32],
        fee: u64,
        min_amount_out: String,
        token_out: [u8; 32],
    ) -> Result<()> {
        CreateOrder::process_instruction(
            ctx,
            amount,
            seed,
            order_hash,
            receiver,
            src_chain_id,
            dest_chain_id,
            token_in,
            fee,
            min_amount_out,
            token_out,
        )
    }

    //  user can withdraw any token to the vault
    //  orchestrator swap token and send it to user
    pub fn fill_order(
        ctx: Context<FillOrder>,
        amount: u64,
        seed: [u8; 32],
        order_hash: [u8; 32],
        trader: [u8; 32],
        src_chain_id: u32,
        dest_chain_id: u32,
        token_in: [u8; 32],
        fee: u64,
        min_amount_out: String,
    ) -> Result<()> {
        FillOrder::process_instruction(
            ctx,
            amount,
            seed,
            order_hash,
            trader,
            src_chain_id,
            dest_chain_id,
            token_in,
            fee,
            min_amount_out,
        )
    }

    // This instruction transfers the token from orchestrator to the receiver
    // It also takes care of the min_amount_out check
    pub fn fill_order_token_transfer(
        ctx: Context<FillOrderTokenTransfer>,
        min_amount_out: u64,
        orchestrator_prev_balance: u64,
    ) -> Result<()> {
        FillOrderTokenTransfer::process_instruction(ctx, min_amount_out, orchestrator_prev_balance)
    }

    // revert order
    pub fn revert_order(ctx: Context<RevertOrder>, order_hash: [u8; 32]) -> Result<()> {
        RevertOrder::process_instruction(ctx, order_hash)
    }

    // set protocol fee fraction
    pub fn set_protocol_fee_fraction(
        ctx: Context<SetProtocolFeeFraction>,
        protocol_fee_numerator: u64,
        protocol_fee_denominator: u64,
    ) -> Result<()> {
        SetProtocolFeeFraction::process_instruction(
            ctx,
            protocol_fee_numerator,
            protocol_fee_denominator,
        )
    }

    //  Admin can set insurance fee tiers
    pub fn set_insurance_fee_tiers(
        ctx: Context<SetInsuranceFeeTiers>,
        threshold_amounts: Vec<u64>,
        insurance_fees: Vec<u64>,
    ) -> Result<()> {
        SetInsuranceFeeTiers::process_instruction(
            ctx,
            threshold_amounts.as_ref(),
            insurance_fees.as_ref(),
        )
    }
}

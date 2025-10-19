#!/bin/bash

# Set environment variable to mute Foundry nightly warning
export FOUNDRY_DISABLE_NIGHTLY_WARNING=true

# Arrays for chain names and their corresponding chain identifiers for Foundry
chains=("BASE" "OPTIMISM" "AVAX" "ARBITRUM" "BSC" "ETHEREUM" "POLYGON" "SONIC")

# Map chain names to their Foundry chain identifiers
declare -A chain_ids=(
  ["BASE"]="base"
  ["OPTIMISM"]="optimism"
  ["AVAX"]="avalanche"
  ["ARBITRUM"]="arbitrum"
  ["BSC"]="bsc"
  ["ETHEREUM"]="mainnet"
  ["POLYGON"]="polygon"
  ["SONIC"]="sonic"
)

# Source .env file to load environment variables
if [ -f .env ]; then
  echo "Loading environment variables from .env file..."
  source .env
else
  echo "Error: .env file not found!"
  exit 1
fi

# Make logs directory if it doesn't exist
mkdir -p deployment_logs

# Debug: Show which RPC URLs are loaded
echo "Checking RPC URLs..."
for chain in "${chains[@]}"; do
  rpc_var="${chain}_RPC_URL"
  rpc_url=$(eval echo \$rpc_var)
  echo "$rpc_var = $rpc_url"
done
echo "--------------------------------------------------------------"

for chain in "${chains[@]}"; do
  echo "Starting deployment for $chain..."
  
  # Get the chain ID for Foundry
  chain_id=${chain_ids[$chain]}
  
  # Get the actual RPC URL value from environment
  rpc_var="${chain}_RPC_URL"
  rpc_url=$(eval echo \$$rpc_var)
  
  echo "Using chain ID: $chain_id"
  echo "Using RPC URL: $rpc_url"
  
  if [ -z "$rpc_url" ]; then
    echo "RPC URL not found for $chain (variable: $rpc_var). Skipping..."
    continue
  fi
  
  # Step 1: Deploy FeeCollector
  echo "Step 1: Deploying FeeCollector for $chain..."
  
  # Capture logs to temporary file
  DEPLOY_ENV=STAGING forge script script/fee-collector/DeployFeeCollector.s.sol --chain $chain_id --rpc-url "$rpc_url" --broadcast --via-ir --verify > temp_logs.txt 2>&1
  
  # Extract FeeCollector proxy address from logs
  fee_collector_address=$(grep -o "FeeCollector proxy deployed at: 0x[a-fA-F0-9]\+" temp_logs.txt | awk '{print $NF}')
  
  if [ -z "$fee_collector_address" ]; then
    echo "Failed to extract FeeCollector address for $chain. Check logs for errors."
    cat temp_logs.txt
    echo "Skipping remaining steps for $chain."
    
    # Add deployment logs to chain log file
    cat temp_logs.txt >> "deployment_logs/${chain}_deployment.log"
    continue
  fi
  
  echo "FeeCollector for $chain deployed at: $fee_collector_address"
  
  # Update .env file with the new FeeCollector address
  if grep -q "FEE_COLLECTOR_${chain}_STAGING=" .env; then
    # If entry exists, update it
    sed -i.bak "s|FEE_COLLECTOR_${chain}_STAGING=.*|FEE_COLLECTOR_${chain}_STAGING=$fee_collector_address|" .env
  else
    # If entry doesn't exist, add it
    echo "FEE_COLLECTOR_${chain}_STAGING=$fee_collector_address" >> .env
  fi
  echo "Updated .env with FEE_COLLECTOR_${chain}_STAGING=$fee_collector_address"
  
  # Add deployment logs to chain log file
  cat temp_logs.txt >> "deployment_logs/${chain}_deployment.log"
  
  # Step 2: Upgrade GeniusVault
  echo "Step 2: Upgrading GeniusVault for $chain..."
  DEPLOY_ENV=STAGING forge script script/UpgradeGeniusVault.s.sol --chain $chain_id --rpc-url "$rpc_url" --broadcast --via-ir --verify > temp_logs.txt 2>&1
  
  # Add upgrade logs to chain log file
  cat temp_logs.txt >> "deployment_logs/${chain}_deployment.log"
  
  # Step 3: Configure Fee System
  echo "Step 3: Configuring Fee System for $chain..."
  DEPLOY_ENV=STAGING forge script script/fee-collector/ConfigureFeeSystem.s.sol --chain $chain_id --rpc-url "$rpc_url" --broadcast --via-ir --verify > temp_logs.txt 2>&1
  
  # Add configuration logs to chain log file
  cat temp_logs.txt >> "deployment_logs/${chain}_deployment.log"
  
  echo "Deployment for $chain completed!"
  echo "--------------------------------------------------------------"
  
  # Extract and format the logs for summary
  grep -A 100 "== Logs ==" "deployment_logs/${chain}_deployment.log" | grep -B 100 "## Setting up 1 EVM" | grep -v "== Logs ==" | grep -v "## Setting up 1 EVM" > "deployment_logs/${chain}_summary.log"
  
  # Create summary file
  cat > "deployment_logs/${chain}_summary.txt" << EOF
$chain

\`\`\`jsx
$(cat "deployment_logs/${chain}_summary.log")
\`\`\`

EOF

  # Clean up temp file
  rm temp_logs.txt
done

# Combine all summaries into one file
echo "Creating combined summary..."
if ls deployment_logs/*_summary.txt 1> /dev/null 2>&1; then
  cat deployment_logs/*_summary.txt > deployment_summary.txt
else
  echo "No successful deployments found." > deployment_summary.txt
fi

echo "Deployment completed for all chains. See deployment_logs directory for detailed logs."
echo "Summary available in deployment_summary.txt"
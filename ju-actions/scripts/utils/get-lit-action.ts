import * as fs from 'fs';

export default function getLitAction(
  type:
    | 'CREATE_SOL_ORCHESTRATOR'
    | 'REBALANCING_EXECUTION_PROXY_DEV'
    | 'REBALANCING_EXECUTION_PROXY_STAGING'
    | 'REBALANCING_EXECUTION_PROXY_TEST'
    | 'REBALANCING_EXECUTION_IMPL'
    | 'REBALANCING_INSTRUCTIONS'
    | 'REVERT_DEV'
    | 'REVERT_STAGING'
    | 'REFUND_ORCHESTRATOR'
    | 'REFUND_ORCHESTRATOR_SVM'
    | 'SOLVER_DEV'
    | 'SOLVER_STAGING'
    | 'SOLVER_IMPLENTATION'
    | 'SOLVER_TEST',
): string {
  let actionPath: string;

  switch (type) {
    case 'CREATE_SOL_ORCHESTRATOR':
      actionPath = 'create-sol-orchestrator-lit.js';
      break;
    case 'REFUND_ORCHESTRATOR':
      actionPath = 'refund-orchestrator-lit.js';
      break;
    case 'REBALANCING_EXECUTION_PROXY_DEV':
      actionPath = 'rebalancing-execution-proxy-dev.js';
      break;
    case 'REBALANCING_EXECUTION_PROXY_STAGING':
      actionPath = 'rebalancing-execution-proxy-staging.js';
      break;
    case 'REBALANCING_EXECUTION_PROXY_TEST':
      actionPath = 'rebalancing-execution-proxy-test.js';
      break;
    case 'REBALANCING_EXECUTION_IMPL':
      actionPath = 'rebalancing-execution-impl-lit.js';
      break;
    case 'REBALANCING_INSTRUCTIONS':
      actionPath = 'rebalancing-instructions-lit.js';
      break;
    case 'REFUND_ORCHESTRATOR_SVM':
      actionPath = 'refund-orchestrator-svm-lit.js';
      break;
    case 'REVERT_DEV':
      actionPath = 'revert-order-sig-lit-dev.js';
      break;
    case 'SOLVER_IMPLENTATION':
      actionPath = 'solver-lit-impl.js';
      break;
    case 'REVERT_STAGING':
      actionPath = 'revert-order-sig-lit-staging.js';
      break;
    case 'SOLVER_DEV':
      actionPath = 'solver-proxy-dev.js';
      break;
    case 'SOLVER_STAGING':
      actionPath = 'solver-proxy-staging.js';
      break;
    case 'SOLVER_TEST':
      actionPath = 'solver-proxy-test.js';
      break;
    default:
      throw new Error(`Unknown action type: ${type}`);
  }

  try {
    return fs.readFileSync(`minified/${actionPath}`, 'utf8');
  } catch (error) {
    console.error(`Error reading file: minified/${actionPath}`, error);
    throw error;
  }
}

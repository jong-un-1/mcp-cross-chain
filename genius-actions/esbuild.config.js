const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

(async () => {
  // const quotingEntryPoints = ['./src/actions/quoting/single-chain-quote-action.ts'];
  const quotingEntryPoints = [];
  const otherEntryPoints = [
    './src/actions/auth/create-sol-orchestrator-lit.ts',
    './src/actions/solver/solver-lit-impl.ts',
    './src/actions/solver/proxies/solver-proxy-dev.ts',
    './src/actions/solver/proxies/solver-proxy-staging.ts',
    './src/actions/solver/proxies/solver-proxy-test.ts',
    './src/actions/rebalancing/execution/rebalancing-execution-impl-lit.ts',
    './src/actions/rebalancing/instructions/rebalancing-instructions-lit.ts',
    './src/actions/rebalancing/execution/proxies/rebalancing-execution-proxy-dev.ts',
    './src/actions/rebalancing/execution/proxies/rebalancing-execution-proxy-test.ts',
    './src/actions/rebalancing/execution/proxies/rebalancing-execution-proxy-staging.ts',
    './src/actions/revert-order-sig/revert-order-sig-lit-staging.ts',
    './src/actions/revert-order-sig/revert-order-sig-lit-dev.ts',
    './src/actions/refund-orchestrator/refund-orchestrator-lit.ts',
    './src/actions/refund-orchestrator/refund-orchestrator-svm-lit.ts',
  ];

  const otherResult = await esbuild.build({
    entryPoints: otherEntryPoints,
    bundle: true,
    minify: true,
    sourcemap: false,
    outdir: 'minified',
    entryNames: '[name]',
    inject: ['./src/utils/globals.js'],
    metafile: true,
    plugins: [
      {
        name: 'crypto-polyfill',
        setup(build) {
          build.onResolve({ filter: /^crypto$/ }, (args) => {
            return { path: require.resolve('crypto-browserify') };
          });
        },
      },
      {
        name: 'stream-polyfill',
        setup(build) {
          build.onResolve({ filter: /^stream$/ }, (args) => {
            return { path: require.resolve('stream-browserify') };
          });
        },
      },
    ]
  });

  console.log('creating meta.json');
  // Merge metafiles
  const mergedMetafile = {
    inputs: {
      ...otherResult.metafile.outputs,
    },
    outputs: {
      ...otherResult.metafile.outputs,
    },
  };

  // Write merged metafile to disk
  fs.writeFileSync('meta.json', JSON.stringify(mergedMetafile, null, 2));

  console.log(
    `[esbuild] built ${quotingEntryPoints.length + otherEntryPoints.length} actions in ./minified`
  );
  console.log('Metadata written to meta.json');
})();

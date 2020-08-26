module.exports = {
  presets: [
      [
          '@babel/env',
          {
              targets: { node: 'current' },
          },
      ],
      ['@babel/typescript'],
  ],
  plugins: [
      '@babel/plugin-proposal-export-namespace-from',
      // "@babel/plugin-proposal-class-properties",
      '@babel/plugin-proposal-nullish-coalescing-operator',
      '@babel/plugin-proposal-optional-chaining',
  ],
}

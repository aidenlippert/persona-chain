import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import dts from 'rollup-plugin-dts';

const external = [
  '@noble/curves/ed25519',
  '@noble/curves/secp256k1', 
  '@noble/hashes/sha256',
  '@noble/hashes/sha512',
  '@noble/hashes/utils',
  'jose',
  'uuid',
  'zod'
];

export default [
  // ES Module and CommonJS builds
  {
    input: 'src/index.ts',
    output: [
      {
        file: 'dist/index.js',
        format: 'cjs',
        sourcemap: true,
        exports: 'named',
        inlineDynamicImports: true
      },
      {
        file: 'dist/index.esm.js',
        format: 'es',
        sourcemap: true,
        inlineDynamicImports: true
      }
    ],
    external,
    plugins: [
      resolve({
        preferBuiltins: true,
        browser: false
      }),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.json',
        declaration: false,
        declarationMap: false
      })
    ]
  },
  // Type definitions
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.d.ts',
      format: 'es'
    },
    external,
    plugins: [
      dts()
    ]
  }
];
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

const DEFAULT_GAS_URL =
  'https://script.google.com/macros/s/AKfycbznLoq62orP53izSEA0wnA7VdQHiNWpP3upTo2nd1owcL3LDZp13gK8LxrAdsjxWwt7vw/exec';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, process.cwd(), '');
  const gasUrl = env.VITE_APPS_SCRIPT_URL || DEFAULT_GAS_URL;
  let gasPath = '/macros/s/AKfycbznLoq62orP53izSEA0wnA7VdQHiNWpP3upTo2nd1owcL3LDZp13gK8LxrAdsjxWwt7vw/exec';
  try {
    gasPath = new URL(gasUrl).pathname;
  } catch {
    // behold standardsti
  }

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      proxy: {
        '/gas-api': {
          target: 'https://script.google.com',
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/gas-api/, gasPath),
        },
      },
    },
  };
});

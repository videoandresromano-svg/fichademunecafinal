import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const googleClientId = env.GOOGLE_CLIENT_ID || '268400273541-vasieodhnl5p3c62pd7lka4em1st3e9a.apps.googleusercontent.com';
    return {
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GOOGLE_CLIENT_ID': JSON.stringify(googleClientId)
      },
      resolve: {
        alias: {
          '@': path.resolve('./'),
        }
      }
    };
});
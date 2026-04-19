import { contextBridge } from 'electron';

// Since your app only talks to Supabase via HTTP,
// you don't need IPC at all right now.
//
// We expose a minimal API just to identify the environment.
// You can expand this later if needed.

contextBridge.exposeInMainWorld('electronAPI', {
    isElectron: true,
    platform: process.platform,         // 'win32' | 'darwin' | 'linux'
});

// ── Type declaration (for use in Angular) ──────────────
// This tells TypeScript what's available on window.electronAPI
export { };   // keeps this a module

declare global {
    interface Window {
        electronAPI: {
            isElectron: boolean;
            platform: string;
        };
    }
}
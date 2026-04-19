"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
// Since your app only talks to Supabase via HTTP,
// you don't need IPC at all right now.
//
// We expose a minimal API just to identify the environment.
// You can expand this later if needed.
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    isElectron: true,
    platform: process.platform, // 'win32' | 'darwin' | 'linux'
});

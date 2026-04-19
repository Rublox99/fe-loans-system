"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path = __importStar(require("path"));
// Keep a global reference to prevent garbage collection
let mainWindow = null;
const isDev = !electron_1.app.isPackaged;
// -------------------------------------------------------
// Window Factory
// -------------------------------------------------------
function createWindow() {
    mainWindow = new electron_1.BrowserWindow({
        width: 1280,
        height: 800,
        minWidth: 800, // optional minimum size
        minHeight: 600,
        show: false, // hide until ready-to-show fires
        webPreferences: {
            preload: path.join(__dirname, 'preload.js' // compiled output will be .js
            ),
            contextIsolation: true, // Security
            nodeIntegration: false, // Security
            sandbox: true, // Extra security layer
        },
    });
    // ── Load Angular app ──────────────────────────────────
    if (isDev) {
        // In dev we load from Angular dev server
        mainWindow.loadURL('http://localhost:4200');
        mainWindow.webContents.openDevTools();
    }
    else {
        // In production we load from the built files
        mainWindow.loadFile(path.join(__dirname, '../dist/loans-system/browser/index.html'));
    }
    // ── Window Events ─────────────────────────────────────
    // Show window only when fully loaded (avoids white flash)
    mainWindow.once('ready-to-show', () => {
        mainWindow?.show();
    });
    // Open external links in the OS browser, not in Electron
    mainWindow.webContents.setWindowOpenHandler(({ url: linkUrl }) => {
        if (linkUrl.startsWith('https://')) {
            electron_1.shell.openExternal(linkUrl);
        }
        return { action: 'deny' };
    });
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}
// -------------------------------------------------------
// App Events
// -------------------------------------------------------
electron_1.app.whenReady().then(() => {
    createWindow();
    // macOS: re-create window when dock icon is clicked
    electron_1.app.on('activate', () => {
        if (electron_1.BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});
// Quit when all windows are closed (except macOS)
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});

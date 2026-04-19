import { app, BrowserWindow, shell } from 'electron';
import * as path from 'path';
import * as url from 'url';

// Keep a global reference to prevent garbage collection
let mainWindow: BrowserWindow | null = null;

const isDev: boolean = !app.isPackaged;

// -------------------------------------------------------
// Window Factory
// -------------------------------------------------------
function createWindow(): void {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        minWidth: 800,          // optional minimum size
        minHeight: 600,
        show: false,            // hide until ready-to-show fires
        webPreferences: {
            preload: path.join(
                __dirname,
                'preload.js'        // compiled output will be .js
            ),
            contextIsolation: true,   // Security
            nodeIntegration: false,   // Security
            sandbox: true,            // Extra security layer
        },
    });

    // ── Load Angular app ──────────────────────────────────
    if (isDev) {
        // In dev we load from Angular dev server
        mainWindow.loadURL('http://localhost:4200');
        mainWindow.webContents.openDevTools();
    } else {
        // In production we load from the built files
        mainWindow.loadFile(
            path.join(__dirname, '../dist/loans-system/browser/index.html')
        );
    }

    // ── Window Events ─────────────────────────────────────

    // Show window only when fully loaded (avoids white flash)
    mainWindow.once('ready-to-show', () => {
        mainWindow?.show();
    });

    // Open external links in the OS browser, not in Electron
    mainWindow.webContents.setWindowOpenHandler(({ url: linkUrl }) => {
        if (linkUrl.startsWith('https://')) {
            shell.openExternal(linkUrl);
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
app.whenReady().then(() => {
    createWindow();

    // macOS: re-create window when dock icon is clicked
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

// Quit when all windows are closed (except macOS)
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
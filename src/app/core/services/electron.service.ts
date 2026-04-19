import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root',
})
export class ElectronService {
    readonly isElectron: boolean = this.checkIfElectron();
    readonly platform: string = this.getPlatform();

    private checkIfElectron(): boolean {
        return typeof window !== 'undefined' &&
            typeof window.electronAPI !== 'undefined' &&
            window.electronAPI.isElectron === true;
    }

    private getPlatform(): string {
        return this.isElectron ? window.electronAPI.platform : 'browser';
    }
}
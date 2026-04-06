import { Component, signal } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  standalone: false
})
export class App {
  protected readonly title = signal('Sistema de Préstamos');
  protected currentTheme: string = 'theme-light'
}

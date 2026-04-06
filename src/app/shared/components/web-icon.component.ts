import { Component, CUSTOM_ELEMENTS_SCHEMA, Input } from '@angular/core';
import { ICONS_DICTIONARY } from '../constants';

@Component({
  selector: 'web-icon',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <iconify-icon 
      [icon]="iconsDictionary[name]" 
      [width]="size"
      style="display: flex;"
      [style.color]="color"
      [id]="id ? id : 'general-icon'"
      noobserver>
    </iconify-icon>
  `
})
export class WebIconComponent {
  @Input() name: keyof typeof ICONS_DICTIONARY = "UNDEFINED";
  @Input() size: string | number = '24';
  @Input() color?: string; // Optional, will be overridden if a custom color exists
  @Input() id: string = 'general-icon';

  iconsDictionary = ICONS_DICTIONARY;
}

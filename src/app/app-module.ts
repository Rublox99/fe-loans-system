import { LOCALE_ID, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule } from '@angular/common/http';
import { registerLocaleData } from '@angular/common';
import es from '@angular/common/locales/es';

import { NZ_I18N, es_ES } from 'ng-zorro-antd/i18n';
import { AppRoutingModule } from './app-routing-module';
import { NgZorroModule } from './shared/modules/ng-zorro.module';
import { App } from './app';

registerLocaleData(es);

@NgModule({
  declarations: [App],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    HttpClientModule,
    AppRoutingModule,
    NgZorroModule
  ],
  providers: [
    { provide: NZ_I18N, useValue: es_ES },
    { provide: LOCALE_ID, useValue: 'es' }
  ],
  bootstrap: [App]
})
export class AppModule { }
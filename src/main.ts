import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';
import { environment } from './environments/environment';
import 'hammerjs';
if (environment.production) {
  enableProdMode();
}
const isIEOrEdge = /msie\s|trident\/|edge\//i.test(window.navigator.userAgent);
if (isIEOrEdge||true)
  document.writeln(`<style>
.dataGridHeaderArea {
  position: inherit !important;
}
</style>`);

platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.error(err));
  document.writeln('<h1>This Is my test</h1>');
console.log('this is my test');
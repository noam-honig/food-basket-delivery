import { Component, transition, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth/auth-service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],

})
export class AppComponent {
  
    private mediaMatcher: MediaQueryList = matchMedia(`(max-width: 720px)`);
    constructor(zone: NgZone,
      public auth:AuthService,
      public router: Router) {
      this.mediaMatcher.addListener(mql => zone.run(() => this.mediaMatcher = mql));
    }
    isScreenSmall() {
      return this.mediaMatcher.matches;
    }
}

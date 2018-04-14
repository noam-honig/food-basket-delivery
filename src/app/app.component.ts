import { Component, transition, NgZone, Injector } from '@angular/core';
import { Router, Route, CanActivate, ActivatedRoute, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from './auth/auth-service';
import { LoggedInGuard } from './auth/auth-guard';


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],

})
export class AppComponent {

  private mediaMatcher: MediaQueryList = matchMedia(`(max-width: 720px)`);
  constructor(zone: NgZone,
    public auth: AuthService,
    public router: Router,
    private injector: Injector) {
    this.mediaMatcher.addListener(mql => zone.run(() => this.mediaMatcher = mql));
  }
  isScreenSmall() {
    return this.mediaMatcher.matches;
  }
  routeName(route: Route) {
    let name = route.path;
    if (route.data && route.data.name)
      name = route.data.name;
    return name;
  }
  signOut() {
    this.auth.auth.signout();
  }
  shouldDisplayRoute(route: Route) {
    if (!(route.path && route.path.indexOf(':') < 0))
      return false;
    if (!route.canActivate)
      return true;
    for (let guard of route.canActivate) {
      let g = this.injector.get(guard) as CanActivate;
      if (g && g.canActivate) {
        var r = new dummyRoute();
        r.routeConfig = route;
        let canActivate = g.canActivate(r, undefined);
        if (!canActivate)
          return false;
      }
    }
    return true;
  }
 
}

class dummyRoute extends ActivatedRouteSnapshot {
  constructor() {
    super();

  }
  routeConfig;
}
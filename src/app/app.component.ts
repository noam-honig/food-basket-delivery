import { Component, transition, NgZone, Injector, ViewChild } from '@angular/core';
import { Router, Route, CanActivate, ActivatedRoute, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from './auth/auth-service';
import { LoggedInGuard, dummyRoute } from './auth/auth-guard';
import { MatSidenav, MAT_AUTOCOMPLETE_VALUE_ACCESSOR } from '@angular/material';
import { SelectService } from './select-popup/select-service';
import { ApplicationSettings } from './models';


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],

})
export class AppComponent {


  constructor(
    public auth: AuthService,
    public router: Router,
    public activeRoute: ActivatedRoute,
    private injector: Injector,
    public dialog: SelectService) {

    if (!window.location.hostname.toLocaleLowerCase().startsWith('hmey')) {
      this.toolbarColor = 'accent';
      
    }
    
    auth.auth.tokenInfoChanged = ()=>dialog.refreshEventListener(this.auth.auth.info&&this.auth.auth.info.admin);
    auth.auth.tokenInfoChanged();

  }


  routeName(route: Route) {
    let name = route.path;
    if (route.data && route.data.name)
      name = route.data.name;
    return name;
  }
  currentTitle() {
    if (this.activeRoute && this.activeRoute.snapshot && this.activeRoute.firstChild && this.activeRoute.firstChild.data && this.activeRoute.snapshot.firstChild.data.name)
      return this.activeRoute.snapshot.firstChild.data.name;;
    return ApplicationSettings.get().organisationName.value;
  }
  toolbarColor = 'primary';
  
  signOut() {

    this.routeClicked();
    this.auth.signout();
  }
  shouldDisplayRoute(route: Route) {
    if (!(route.path && route.path.indexOf(':') < 0 && route.path.indexOf('**') < 0))
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
  @ViewChild('sidenav') sidenav: MatSidenav;
  routeClicked() {
    if (this.dialog.isScreenSmall())
      this.sidenav.close();

  }
  test() {
    console.log(this.activeRoute);
  }

}


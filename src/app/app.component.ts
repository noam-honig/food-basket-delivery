import { Component, NgZone, Injector, ViewChild } from '@angular/core';
import { Router, Route, CanActivate, ActivatedRoute, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from './auth/auth-service';
import { dummyRoute } from './auth/auth-guard';
import { MatSidenav, MAT_AUTOCOMPLETE_VALUE_ACCESSOR } from '@angular/material';
import { DialogService } from './select-popup/dialog';
import { ApplicationSettings } from './manage/ApplicationSettings';
import { FamiliesComponent } from './families/families.component';
import { Context } from './shared/context';



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
    public dialog: DialogService,
    private context: Context) {
    /*this.router.config.unshift({
      path: FamiliesComponent.route,
      component: FamiliesComponent,
      data: { name: FamiliesComponent.caption }, canActivate: [AdminGuard]
    });*/

    if (!window.location.hostname.toLocaleLowerCase().startsWith('hmey')) {
      this.toolbarColor = 'accent';

    }

    auth.auth.tokenInfoChanged = () => dialog.refreshEventListener(this.auth.auth.info && this.auth.auth.info.deliveryAdmin);
    auth.auth.tokenInfoChanged();

  }

  showSeperator(route: Route) {
    if (route.data && route.data.seperator)
      return true;
    return false;
  }
  routeName(route: Route) {
    let name = route.path;
    if (route.data && route.data.name)
      name = route.data.name;
    return name;
  }
  prevLogoUrl = '';
  getLogo() {
    let result =  ApplicationSettings.get(this.context).logoUrl.value;
    if (result){
      this.prevLogoUrl = result;
    }
    return this.prevLogoUrl;
  }
  currentTitle() {
    if (this.activeRoute && this.activeRoute.snapshot && this.activeRoute.firstChild && this.activeRoute.firstChild.data && this.activeRoute.snapshot.firstChild.data.name)
      return this.activeRoute.snapshot.firstChild.data.name;;
    return ApplicationSettings.get(this.context).organisationName.value;
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

  }

}

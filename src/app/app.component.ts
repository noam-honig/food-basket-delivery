import { Component, Injector, ViewChild } from '@angular/core';
import { Router, Route, CanActivate, ActivatedRoute, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from './auth/auth-service';

import { MatSidenav } from '@angular/material/sidenav';
import { DialogService } from './select-popup/dialog';
import { ApplicationSettings } from './manage/ApplicationSettings';
import { FamiliesComponent } from './families/families.component';
import { Context, RouteHelperService, JwtSessionManager } from 'radweb';
import { Roles } from './auth/roles';
import { translate, translationConfig } from './translate';
import { DeliveryStats } from './delivery-follow-up/delivery-stats';
import { SelfPickupComponent } from './self-pickup/self-pickup.component';
import { DeliveryStatus } from './families/DeliveryStatus';
import { Helpers } from './helpers/helpers';
import { BasketType } from './families/BasketType';




@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],

})
export class AppComponent {

  isEdge = /msie\s|trident\/|edge\//i.test(window.navigator.userAgent);
  constructor(
    public sessionManager: AuthService,
    public router: Router,
    public activeRoute: ActivatedRoute,
    public dialog: DialogService,
    private helper: RouteHelperService,
    public context: Context) {
    ApplicationSettings.getAsync(context).then(x => {
      translationConfig.activateTranslation = x.forSoldiers.value;
      DeliveryStatus.usingSelfPickupModule = x.usingSelfPickupModule.value;
      Helpers.usingCompanyModule = x.showCompanies.value;
      this.orgName = x.organisationName.value;
      BasketType.boxes1Name = x.boxes1Name.value;
      BasketType.boxes2Name = x.boxes2Name.value;
      if (x.redTitleBar.value)
        this.toolbarColor = 'accent';
    })

    if (!window.location.hostname.toLocaleLowerCase().startsWith('hmey')) {
      this.toolbarColor = 'primary';

    }


  }
  orgName = '';

  showSeperator(route: Route) {
    if (route.data && route.data.seperator)
      return true;
    return false;
  }
  routeName(route: Route) {
    let name = route.path;
    if (route.data && route.data.name)
      name = route.data.name;
    return translate(name);
  }
  prevLogoUrl = '';
  getLogo() {
    let result = ApplicationSettings.get(this.context).logoUrl.value;
    if (result) {
      this.prevLogoUrl = result;
    }
    return this.prevLogoUrl;
  }
  currentTitle() {
    if (this.activeRoute && this.activeRoute.snapshot && this.activeRoute.firstChild && this.activeRoute.firstChild.data && this.activeRoute.snapshot.firstChild.data.name)
      return translate(this.activeRoute.snapshot.firstChild.data.name);
    return ApplicationSettings.get(this.context).organisationName.value;
  }
  toolbarColor = 'primary';

  signOut() {

    this.routeClicked();
    this.sessionManager.signout();
  }
  shouldDisplayRoute(route: Route) {
    if (!(route.path && route.path.indexOf(':') < 0 && route.path.indexOf('**') < 0))
      return false;
    if (route.data && route.data.hide)
      return;
    if (!DeliveryStatus.usingSelfPickupModule && route.component == SelfPickupComponent)
      return false;
    return this.helper.canNavigateToRoute(route);
  }
  @ViewChild('sidenav', { static: true }) sidenav: MatSidenav;
  routeClicked() {
    if (this.dialog.isScreenSmall())
      this.sidenav.close();

  }
  test() {

  }

}

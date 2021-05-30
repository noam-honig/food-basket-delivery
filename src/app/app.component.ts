import { Component, Injector, ViewChild } from '@angular/core';
import { Router, Route, CanActivate, ActivatedRoute, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from './auth/auth-service';

import { MatSidenav } from '@angular/material/sidenav';
import { DialogService } from './select-popup/dialog';
import { ApplicationSettings, SettingsService } from './manage/ApplicationSettings';
import { FamiliesComponent } from './families/families.component';
import { Context } from '@remult/core';
import { RouteHelperService, BusyService } from '@remult/angular';
import { Roles } from './auth/roles';
import { translationConfig, Language } from './translate';

import { SelfPickupComponent } from './self-pickup/self-pickup.component';
import { DeliveryStatus } from './families/DeliveryStatus';
import { Helpers, HelperUserInfo } from './helpers/helpers';
import { BasketType } from './families/BasketType';
import { AssignEscortComponent } from './assign-escort/assign-escort.component';
import { DistributionCenters } from './manage/distribution-centers';
import { InputAreaComponent } from './select-popup/input-area/input-area.component';
import { CreateNewEvent } from './create-new-event/create-new-event';




@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],

})
export class AppComponent {
  isAdmin() {
    return this.context.isAllowed(Roles.admin);
  }
  lang: Language;
  isEdge = /msie\s|trident\/|edge\//i.test(window.navigator.userAgent);
  constructor(
    public sessionManager: AuthService,
    public router: Router,
    public activeRoute: ActivatedRoute,
    public dialog: DialogService,
    public helper: RouteHelperService,
    public context: Context,
    public settings: ApplicationSettings,
    private busy: BusyService
  ) {
    this.lang = settings.lang;
    this.toolbarColor = 'primary';

    if (settings.redTitleBar) {
      this.toolbarColor = 'accent';
    }



  }

  createNewEventAction = new CreateNewEvent(this.context);




  showSeperator(route: Route) {
    if (route.data && route.data.seperator)
      return true;
    return false;
  }
  routeName(route: Route) {
    let c = route.component;
    if (c) {
      let s = routeMap.get(c);
      if (s)
        return s;
    }
    let name = route.path;
    if (route.data && route.data.name)
      name = route.data.name;
    return name;
  }
  prevLogoUrl = '';
  getLogo() {
    let result = ApplicationSettings.get(this.context).logoUrl;
    if (result) {
      this.prevLogoUrl = result;
    }
    return this.prevLogoUrl;
  }
  currentTitle() {
    if (this.activeRoute && this.activeRoute.snapshot && this.activeRoute.firstChild) {
      let c = this.activeRoute.firstChild.component;
      if (c) {
        let s = routeMap.get(c);
        if (s)
          return s;
      }
      if (this.activeRoute.firstChild.data && this.activeRoute.snapshot.firstChild.data.name)
        return this.activeRoute.snapshot.firstChild.data.name;
    }
    return ApplicationSettings.get(this.context).organisationName;
  }
  toolbarColor = 'primary';
  showSideBar() {
    if (!this.context.isSignedIn())
      return false;
    if (this.activeRoute&&this.activeRoute.firstChild&&this.activeRoute.firstChild.snapshot&&this.activeRoute.firstChild.snapshot.routeConfig&&this.activeRoute.firstChild.snapshot.routeConfig.path=="playback") {
      return false;

    }
    if (this.settings.isSytemForMlt() && !this.context.isAllowed([Roles.admin, Roles.lab, Roles.distCenterAdmin]))
      return false;
    return true;
  }
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
    if (route.component == AssignEscortComponent && !this.settings.manageEscorts)
      return false;
    return this.helper.canNavigateToRoute(route);
  }
  @ViewChild('sidenav', { static: false }) sidenav: MatSidenav;
  routeClicked() {
    if (this.dialog.isScreenSmall())
      this.sidenav.close();

  }
  test() {

  }
  showEnglishUrl() {
    return this.settings.lang.languageCode != 'iw';
  }


}

export const routeMap = new Map<any, string>();
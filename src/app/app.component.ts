import { Component, Injector, ViewChild } from '@angular/core';
import { Router, Route, CanActivate, ActivatedRoute, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from './auth/auth-service';

import { MatSidenav } from '@angular/material/sidenav';
import { DialogService } from './select-popup/dialog';
import { ApplicationSettings, SettingsService } from './manage/ApplicationSettings';
import { FamiliesComponent } from './families/families.component';
import { Context, RouteHelperService, JwtSessionManager, DataAreaSettings } from '@remult/core';
import { Roles } from './auth/roles';
import { translate, translationConfig } from './translate';
import { DeliveryStats } from './delivery-follow-up/delivery-stats';
import { SelfPickupComponent } from './self-pickup/self-pickup.component';
import { DeliveryStatus } from './families/DeliveryStatus';
import { Helpers, HelperUserInfo } from './helpers/helpers';
import { BasketType } from './families/BasketType';
import { AssignEscortComponent } from './assign-escort/assign-escort.component';
import { DistributionCenters } from './manage/distribution-centers';
import { InputAreaComponent } from './select-popup/input-area/input-area.component';




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
    public context: Context,
    public settings: ApplicationSettings) {

    this.toolbarColor = 'primary';

    if (settings.redTitleBar.value) {
      this.toolbarColor = 'accent';
    }
    if (this.context.isAllowed(Roles.distCenterAdmin) && !this.context.isAllowed(Roles.admin))
      this.context.for(DistributionCenters).lookupAsync(x => x.id.isEqualTo((<HelperUserInfo>this.context.user).distributionCenter)).then(x => this.dc = x);

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
    if (route.component == AssignEscortComponent && !this.settings.manageEscorts.value)
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

  dc: DistributionCenters;
  async updateDistCenter() {



    await this.context.openDialog(InputAreaComponent, x => x.args = {
      title: 'עדכון פרטים נקודת חלוקה',
      settings: {
        columnSettings: () => [
          this.dc.name,
          this.dc.address,
          {
            caption: 'כתובת כפי שגוגל הבין',
            getValue: () => this.dc.getGeocodeInformation().getAddress()
          }
        ]
      },
      ok: async () => {
        await this.dc.save();
      },
      cancel: () => {
        this.dc.undoChanges()
      }
    });

  }

}

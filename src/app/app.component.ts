import { Component, ViewChild } from '@angular/core'
import { ActivatedRoute, Route, Router } from '@angular/router'
import { AuthService } from './auth/auth-service'

import { MatSidenav } from '@angular/material/sidenav'
import { remult } from 'remult'
import { Roles } from './auth/roles'
import { BusyService, RouteHelperService } from './common-ui-elements'
import { ApplicationSettings } from './manage/ApplicationSettings'
import { DialogService } from './select-popup/dialog'
import { Language } from './translate'

import { AssignEscortComponent } from './assign-escort/assign-escort.component'
import { CreateNewEvent } from './create-new-event/create-new-event'
import { DeliveryStatus } from './families/DeliveryStatus'
import { SelfPickupComponent } from './self-pickup/self-pickup.component'
import { EditCustomMessageComponent } from './edit-custom-message/edit-custom-message.component'
import { GridDialogComponent } from './grid-dialog/grid-dialog.component'
import { Dial } from 'twilio/lib/twiml/VoiceResponse'
import { SelectHelperComponent } from './select-helper/select-helper.component'
import { UpdateGroupDialogComponent } from './update-group-dialog/update-group-dialog.component'

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  isAdmin() {
    return remult.isAllowed(Roles.admin)
  }
  remult = remult
  lang: Language
  isEdge = /msie\s|trident\/|edge\//i.test(window.navigator.userAgent)
  constructor(
    public sessionManager: AuthService,
    public router: Router,
    public activeRoute: ActivatedRoute,
    public dialog: DialogService,
    public helper: RouteHelperService,

    public settings: ApplicationSettings,
    private busy: BusyService
  ) {
    this.lang = settings.lang
    this.toolbarColor = 'primary'

    if (settings.redTitleBar) {
      this.toolbarColor = 'accent'
    }
  }

  createNewEventAction = new CreateNewEvent()

  showSeperator(route: Route) {
    if (route.data && route.data.seperator) return true
    return false
  }
  routeName(route: Route) {
    let c = route.component
    if (c) {
      let s = routeMap.get(c)
      if (s) return s
    }
    let name = route.path
    if (route.data && route.data.name) name = route.data.name
    return name
  }
  prevLogoUrl = ''
  getLogo() {
    let result = ApplicationSettings.get().logoUrl
    if (result) {
      this.prevLogoUrl = result
    }
    return this.prevLogoUrl
  }
  currentTitle() {
    if (
      this.activeRoute &&
      this.activeRoute.snapshot &&
      this.activeRoute.firstChild
    ) {
      let c = this.activeRoute.firstChild.component
      if (c) {
        let s = routeMap.get(c)
        if (s) return s
      }
      if (
        this.activeRoute.firstChild.data &&
        this.activeRoute.snapshot.firstChild.data.name
      )
        return this.activeRoute.snapshot.firstChild.data.name
    }
    return ApplicationSettings.get().organisationName
  }
  toolbarColor = 'primary'
  showConfidentialityApproveInPrint() {
    if (this.noConfHeaderAndBorders()) return false
    return this.settings.requireConfidentialityApprove
  }
  noConfHeaderAndBorders() {
    return this.activeRoute?.firstChild?.snapshot?.routeConfig?.data
      ?.noConfHeaderAndBorders
  }
  showSideBar() {
    if (!remult.authenticated()) return false
    if (this.activeRoute?.firstChild?.snapshot?.routeConfig?.data?.noBar) {
      return false
    }
    if (
      this.settings.isSytemForMlt &&
      !remult.isAllowed([Roles.admin, Roles.lab, Roles.distCenterAdmin])
    )
      return false
    return true
  }
  signOut() {
    this.routeClicked()
    this.sessionManager.signout()
  }
  shouldDisplayRoute(route: Route) {
    if (
      !(
        route.path &&
        route.path.indexOf(':') < 0 &&
        route.path.indexOf('**') < 0
      )
    )
      return false
    if (route.data && route.data.hide) return
    if (
      !DeliveryStatus.usingSelfPickupModule &&
      route.component == SelfPickupComponent
    )
      return false
    if (
      route.component == AssignEscortComponent &&
      !this.settings.manageEscorts
    )
      return false
    return this.helper.canNavigateToRoute(route as any)
  }
  @ViewChild('sidenav', { static: false }) sidenav: MatSidenav
  routeClicked() {
    if (this.dialog.isScreenSmall()) this.sidenav.close()
  }
  test() {}
  showEnglishUrl() {
    return this.settings.lang.languageCode != 'iw'
  }
}

export const routeMap = new Map<any, string>()
DialogService.EditCustomMessageComponent = EditCustomMessageComponent
DialogService.GridDialogComponent = GridDialogComponent
DialogService.SelectHelperComponent = SelectHelperComponent
DialogService.UpdateGroupDialogComponent = UpdateGroupDialogComponent

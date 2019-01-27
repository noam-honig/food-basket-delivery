import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, Route, Router } from '@angular/router';

import { AuthService } from './auth-service';
import { evilStatics } from './evil-statics';

@Injectable()
export class LoggedInGuard implements CanActivate {
    constructor(private auth: AuthService,
        private router: Router) {
    }
    canActivate(route: ActivatedRouteSnapshot) {
        if (this.auth.auth.valid)
            return true;
        if (!(route instanceof dummyRoute))
            this.router.navigate([evilStatics.routes.login]);
        return false;
    }
}
@Injectable()
export class NotLoggedInGuard implements CanActivate {
    constructor(private auth: AuthService) {
    }
    canActivate(route: ActivatedRouteSnapshot) {
        return !this.auth.auth.valid;
    }
}




@Injectable()
export class HolidayDeliveryAdmin implements CanActivate {
    constructor(private auth: AuthService, private router: Router) {
    }
    canActivate(route: ActivatedRouteSnapshot) {
        if (this.auth.auth.valid && this.auth.auth.info.deliveryAdmin)
            return true;
        if (!(route instanceof dummyRoute))
            this.router.navigate([evilStatics.routes.updateInfo]);
        return false;
 
    }
}

@Injectable()
export class AnyAdmin implements CanActivate {
    constructor(private auth: AuthService, private router: Router) {
    }
    canActivate(route: ActivatedRouteSnapshot) {
        if (this.auth.auth.valid && (this.auth.auth.info.deliveryAdmin||this.auth.auth.info.weeklyFamilyAdmin))
            return true;
        if (!(route instanceof dummyRoute))
            this.router.navigate([evilStatics.routes.updateInfo]);
        return false;
 
    }
}
@Injectable()
export class WeeklyFamilyAdminGuard implements CanActivate {
    constructor(private auth: AuthService, private router: Router) {
    } 
    canActivate(route: ActivatedRouteSnapshot) {
        if (this.auth.auth.valid && this.auth.auth.info.weeklyFamilyAdmin)
            return true;
        if (!(route instanceof dummyRoute))
            this.router.navigate([evilStatics.routes.updateInfo]);
        return false;

    }
}

@Injectable()
export class WeeklyFamilyVoulenteerGuard implements CanActivate {
    constructor(private auth: AuthService, private router: Router) {
    }
    canActivate(route: ActivatedRouteSnapshot) {
        if (this.auth.auth.valid && this.auth.auth.info.weeklyFamilyVolunteer)
            return true;
        if (!(route instanceof dummyRoute))
            this.router.navigate([evilStatics.routes.updateInfo]);
        return false;

    }
}


@Injectable()
export class PackerGuard implements CanActivate {
    constructor(private auth: AuthService, private router: Router) {
    }
    canActivate(route: ActivatedRouteSnapshot) {
        if (this.auth.auth.valid && this.auth.auth.info.weeklyFamilyPacker)
            return true;
        if (!(route instanceof dummyRoute))
            this.router.navigate([evilStatics.routes.updateInfo]);
        return false;

    }
}

@Injectable()
export class HelperGuard implements CanActivate {
    constructor(private auth: AuthService, private router: Router) {
    }
    canActivate(route: ActivatedRouteSnapshot) {
        if (this.auth.auth.valid && this.auth.auth.info.deliveryVolunteer)
            return true;
        if (!(route instanceof dummyRoute))
            this.router.navigate([evilStatics.routes.updateInfo]);
        return false;

    }
}


export class dummyRoute extends ActivatedRouteSnapshot {
    constructor() {
        super();

    }
    routeConfig;
}
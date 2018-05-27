import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, Route, Router } from '@angular/router';

import { myAuthInfo } from './my-auth-info';
import { Authentication } from './authentication';
import { AuthService } from './auth-service';

@Injectable()
export class LoggedInGuard implements CanActivate {
    constructor(private auth: AuthService,
        private router: Router) {
    }
    canActivate(route: ActivatedRouteSnapshot) {
        if (this.auth.auth.valid)
            return true;
        if (!(route instanceof dummyRoute))
            this.router.navigate(['/login']);
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
export class AdminGuard implements CanActivate {
    constructor(private auth: AuthService, private router: Router) {
    }
    canActivate(route: ActivatedRouteSnapshot) {
        if (this.auth.auth.valid && this.auth.auth.info.admin)
            return true;
        if (!(route instanceof dummyRoute))
            this.router.navigate(['/my-families']);
        return false;

    }
}



export class dummyRoute extends ActivatedRouteSnapshot {
    constructor() {
        super();

    }
    routeConfig;
}
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
        if (this.auth.auth.info.valid)
            return true;
        this.router.navigate(['/login']);
return false;
    }
}
@Injectable()
export class NotLoggedInGuard implements CanActivate {
    constructor(private auth: AuthService) {
    }
    canActivate(route: ActivatedRouteSnapshot) {
        return !this.auth.auth.info.valid;
    }
}




@Injectable()
export class AdminGuard implements CanActivate {
    constructor(private auth: AuthService, private router: Router) {
    }
    canActivate(route: ActivatedRouteSnapshot) {
        if (this.auth.auth.info.valid && this.auth.auth.info.admin)
            return true;
        this.router.navigate(['/my-events']);

    }
}



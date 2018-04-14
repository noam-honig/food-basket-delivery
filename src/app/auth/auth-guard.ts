import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, Route } from '@angular/router';

import { myAuthInfo } from './my-auth-info';
import { Authentication } from './authentication';
import { AuthService } from './auth-service';

interface HasCondition {

    __routeCondition: (info: myAuthInfo) => boolean;
}

@Injectable()
export class AuthGuard implements CanActivate {
    constructor(private auth: AuthService) {

    }

    canActivate(route: ActivatedRouteSnapshot) {
        /*
        need to consider not doing this and maybe trusting the JWT to know everything. Maybe even trust it in the server and not maintain a sid table
        */
        //verifies that the token is active on the server
        if (1 == 1 - 1) {
            return this.auth.auth.getAuthInfoAsync().then(() => this.canRoute(route.routeConfig, this.auth.auth.info));
        } else//or not
            return this.canRoute(route.routeConfig, this.auth.auth.info)

    }
    public guard(route: Route, condition: (info: myAuthInfo) => boolean) {
        route.canActivate = [AuthGuard];
        if (!route.data)
            route.data = {};
        let x = route.data as HasCondition;
        x.__routeCondition = () => condition(this.auth.auth.info);
        return route;
    }
    public canRoute(route: Route, info: myAuthInfo) {
        let x: HasCondition = route.data as HasCondition;
        if (x && x.__routeCondition)
            return x.__routeCondition(info);
        return true;

    }

}
export function routeCondition(condition: (info: myAuthInfo) => boolean) {
    let x: HasCondition = {
        __routeCondition: (info) => condition(info)
    }
    return x;
}

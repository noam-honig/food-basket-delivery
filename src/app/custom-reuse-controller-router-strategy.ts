import { RouteReuseStrategy, DetachedRouteHandle, ActivatedRouteSnapshot } from "@angular/router";
import { remult } from 'remult';
import { Injectable } from "@angular/core";

@Injectable()
// This impl. bases upon one that can be found in the router's test cases.
export class CustomReuseStrategy implements RouteReuseStrategy {

    handlers: { [key: string]: DetachedRouteHandle } = {};
    shouldDetach(route: ActivatedRouteSnapshot): boolean {
        let x = (<any>route.component).prototype[reuseComponentOnNavigationAndCallMeWhenNavigatingToIt];
        //console.debug('CustomReuseStrategy:shouldDetach', this.getRouteInfo(route), this.handlers);
        return !!x;
    }
    reloadKey = '$reload';
    store(route: ActivatedRouteSnapshot, handle: DetachedRouteHandle): void {
        //  console.debug('CustomReuseStrategy:store', this.getRouteInfo(route), handle, this.handlers);
        this.handlers[route.routeConfig.path] = handle;
        let result: any;
        result = handle;
        if (result && result.componentRef && result.componentRef.instance) {
            let m = result.componentRef.instance[leaveComponent];
            if (m) {

                result.componentRef.instance[leaveComponent]();

            }
        }
        if (handle) {
            handle[this.reloadKey] = true;

        }
    }

    shouldAttach(route: ActivatedRouteSnapshot): boolean {
        remult.clearAllCache();
        if (!!route.routeConfig) {
            let h = this.handlers[route.routeConfig.path];
            if (h) {
                if (!h[recycleComponent])
                    return true;
            }
        }
        return false;
    }

    retrieve(route: ActivatedRouteSnapshot): DetachedRouteHandle {
        let result = null;
        if (!route.routeConfig)
            result = null;
        else {
            result = this.handlers[route.routeConfig.path];
            if (result && result.componentRef && result.componentRef.instance) {
                if (result[recycleComponent]) {
                    result = null;
                }
                else {
                    let m = result.componentRef.instance[reuseComponentOnNavigationAndCallMeWhenNavigatingToIt];
                    if (m) {
                        if (result[this.reloadKey]) {
                            result.componentRef.instance[reuseComponentOnNavigationAndCallMeWhenNavigatingToIt]();

                            result[this.reloadKey] = false;
                        }
                    }
                }
            }


        }
        //    console.debug('CustomReuseStrategy:retrieve', this.getRouteInfo(route), result, this.handlers);
        return result;
    }

    shouldReuseRoute(future: ActivatedRouteSnapshot, curr: ActivatedRouteSnapshot): boolean {
        let result = future.routeConfig === curr.routeConfig;
        //  console.debug('CustomReuseStrategy:shouldReuseRoute', this.getRouteInfo(future), this.getRouteInfo(curr), result, this.handlers);
        return result;
    }
    getRouteInfo(route: ActivatedRouteSnapshot) {
        if (!route)
            return undefined;
        if (route.routeConfig == null)
            return 'no route config';
        return route.routeConfig.path;
    }
    recycleAll() {
        for (const key in this.handlers) {
            if (this.handlers.hasOwnProperty(key)) {
                const element = this.handlers[key];
                if (element)
                    element[recycleComponent] = true;
            }
        }
    }
}
export const reuseComponentOnNavigationAndCallMeWhenNavigatingToIt = Symbol('reuseComponentOnNavigationAndCallMeWhenNavigatingToIt');
export const leaveComponent = Symbol('leaveComponent');
const recycleComponent = Symbol('recycleComponent');

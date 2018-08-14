import { RouteReuseStrategy, DetachedRouteHandle, ActivatedRouteSnapshot } from "@angular/router";

// This impl. bases upon one that can be found in the router's test cases.
export class CustomReuseStrategy implements RouteReuseStrategy {

    handlers: { [key: string]: DetachedRouteHandle } = {};

    shouldDetach(route: ActivatedRouteSnapshot): boolean {
        let x = (<any>route.component).prototype[reuseComponentOnNavigationAndCallMeWhenNavigatingToIt];
        console.debug('CustomReuseStrategy:shouldDetach', this.getRouteInfo(route), this.handlers);
        return !!x;
    }
    reloadKey = '$reload';
    store(route: ActivatedRouteSnapshot, handle: DetachedRouteHandle): void {
        console.debug('CustomReuseStrategy:store', this.getRouteInfo(route), handle, this.handlers);
        this.handlers[route.routeConfig.path] = handle;
        if (handle) {
            handle[this.reloadKey] = true;
            
        }
    }

    shouldAttach(route: ActivatedRouteSnapshot): boolean {
        let result = !!route.routeConfig && !!this.handlers[route.routeConfig.path];
        console.debug('CustomReuseStrategy:shouldAttach', this.getRouteInfo(route), result, this.handlers);
        return result;
    }

    retrieve(route: ActivatedRouteSnapshot): DetachedRouteHandle {
        let result = null;
        if (!route.routeConfig)
            result = null;
        else {
            result = this.handlers[route.routeConfig.path];
            if (result && result.componentRef && result.componentRef.instance) {
                let m = result.componentRef.instance[reuseComponentOnNavigationAndCallMeWhenNavigatingToIt];
                if (m) {
                    if (result[this.reloadKey]) {
                        result.componentRef.instance[reuseComponentOnNavigationAndCallMeWhenNavigatingToIt]();
                        
                        result[this.reloadKey] = false;
                    }
                }
            }


        }
        console.debug('CustomReuseStrategy:retrieve', this.getRouteInfo(route), result, this.handlers);
        return result;
    }

    shouldReuseRoute(future: ActivatedRouteSnapshot, curr: ActivatedRouteSnapshot): boolean {
        let result = future.routeConfig === curr.routeConfig;
        console.debug('CustomReuseStrategy:shouldReuseRoute', this.getRouteInfo(future), this.getRouteInfo(curr), result, this.handlers);
        return result;
    }
    getRouteInfo(route: ActivatedRouteSnapshot) {
        if (!route)
            return undefined;
        if (route.routeConfig == null)
            return 'no route config';
        return route.routeConfig.path;
    }
}
export const reuseComponentOnNavigationAndCallMeWhenNavigatingToIt = Symbol('reuseComponentOnNavigationAndCallMeWhenNavigatingToIt');
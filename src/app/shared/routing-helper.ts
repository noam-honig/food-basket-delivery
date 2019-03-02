import { Type } from "@angular/core";
import { Route } from "@angular/router";

export function Routable(options: RoutableOptions) {
    return (constructor: any) => {
        var route = {
            path: options.path,
            canActivate: options.canActivate,
            data: { name: options.caption },
            component: constructor
        } as Route;
        routingInfo.routes.push(route);
        constructor[componentRoutingInfo] = route;
        
    }
}

export interface RoutableOptions {
    path: string;
    canActivate?: any[];
    caption?: string;
}
export const routingInfo = {
    routes: []
}
export const componentRoutingInfo = Symbol('componentRoutingInfo');

import { Context } from "radweb";

export const Roles = {
    weeklyFamilyPacker: 'weeklyFamilyPacker',
    weeklyFamilyVolunteer: 'weeklyFamilyVolunteer',
    weeklyFamilyAdmin: 'weeklyFamilyAdmin',
    deliveryAdmin: 'deliveryAdmin',
    superAdmin: 'superAdmin'

}
export const RolesGroup = {
    anyAdmin: [Roles.deliveryAdmin, Roles.weeklyFamilyAdmin, Roles.superAdmin],
    anyWeekly: [Roles.weeklyFamilyAdmin, Roles.weeklyFamilyPacker, Roles.weeklyFamilyVolunteer]
}



function hasRole(...roles: string[]) {
    return true;
}

var allowUpdate: boolean;
var allowedRoles: string[];
var allowRunOnServer: (c: Context) => boolean;

allowUpdate = hasRole(Roles.weeklyFamilyAdmin);
allowUpdate = hasRole(Roles.weeklyFamilyAdmin, Roles.deliveryAdmin);
allowUpdate = hasRole(...RolesGroup.anyAdmin);

allowedRoles = [Roles.weeklyFamilyAdmin];
allowedRoles = [Roles.weeklyFamilyAdmin, Roles.deliveryAdmin];
allowedRoles = RolesGroup.anyAdmin;

allowRunOnServer = c => c.hasRole(Roles.weeklyFamilyAdmin);
allowRunOnServer = c => c.hasRole(Roles.weeklyFamilyAdmin, Roles.deliveryAdmin);
allowRunOnServer = c => c.hasRole(...RolesGroup.anyAdmin);



declare type allowed = string | string[] | Role | Role[] | ((c: Context) => boolean) | boolean;
declare type crazy = allowed | allowed[];




var newAllowUpdate: allowed;
newAllowUpdate = true;
newAllowUpdate = Roles.weeklyFamilyAdmin;

newAllowUpdate = RolesGroup.anyAdmin;


class Role {
    constructor(key: string) {

    }
    and() {

    }
    static not(role: allowed): allowed {
        return undefined;
    }
}
var test: crazy;
test = [Roles.deliveryAdmin, c => true, Role.not(Roles.weeklyFamilyAdmin)]
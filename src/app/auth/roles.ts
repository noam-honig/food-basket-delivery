import { SignedInGuard } from "radweb";
import { Injectable } from "@angular/core";


export class Roles {
    static weeklyFamilyPacker = 'weeklyFamilyPacker';
    static weeklyFamilyVolunteer = 'weeklyFamilyVolunteer';
    static weeklyFamilyAdmin = 'weeklyFamilyAdmin';
    static deliveryAdmin = 'deliveryAdmin';
    static superAdmin = 'superAdmin';
    static anyAdmin = [Roles.deliveryAdmin, Roles.weeklyFamilyAdmin, Roles.superAdmin];
    static anyWeekly = [Roles.weeklyFamilyAdmin, Roles.weeklyFamilyPacker, Roles.weeklyFamilyVolunteer];
}


@Injectable()
export class DeliveryAdminGuard extends SignedInGuard {

    isAllowed() {
        return Roles.deliveryAdmin;
    }
}


@Injectable()
export class AnyAdminGuard extends SignedInGuard {

    isAllowed() {
        return Roles.anyAdmin;
    }
}
@Injectable()
export class WeeklyFamilyPackerGuard extends SignedInGuard {

    isAllowed() {
        return Roles.weeklyFamilyPacker;
    }
}
@Injectable()
export class WeeklyFamilyVolunteerGuard extends SignedInGuard {

    isAllowed() {
        return Roles.weeklyFamilyVolunteer;
    }
}
@Injectable()
export class WeeklyFamilyAdminGuard extends SignedInGuard {

    isAllowed() {
        return Roles.weeklyFamilyVolunteer;
    }
}






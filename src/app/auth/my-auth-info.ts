import { LoginResponse } from "./auth-info";

export interface myAuthInfo  {
    loggedIn?:boolean;
    name?: string;
    helperId?: string;
    deliveryAdmin?: boolean;
    weeklyFamilyVolunteer?:boolean;
    weeklyFamilyAdmin?:boolean;
    weeklyFamilyPacker?:boolean;
    superAdmin?:boolean;
    deliveryVolunteer?:boolean;
}
/**/
/*
Delivry
    Admin
    Courier (aka!admin)
Weekly Delivery
    WeeklyAdmin - can see everything in this module only
        canUpdateFamilies
        canInsertFamilies
    WeeklyHelper - can see only her families
    
    Packer - can only see packing screen 


The api should also reflect this (don't expose info your shouldnt)

*/

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
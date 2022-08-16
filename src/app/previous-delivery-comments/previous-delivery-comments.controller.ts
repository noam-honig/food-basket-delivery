import { BackendMethod, Remult, ValueConverters } from 'remult';

import { Roles } from '../auth/roles';
import { FamilyDeliveries } from '../families/FamilyDeliveries';
import { getSettings } from '../manage/ApplicationSettings';


export class PreviousDeliveryController {
    @BackendMethod({ allowed: r => getSettings(r).allowVolunteerToSeePreviousActivities })
    static async getHistory(family: string, remult?: Remult) {
        return (await remult.repo(FamilyDeliveries).find({
            where: {
                family: [family],
                courier: remult.isAllowed(Roles.admin) ? undefined : await remult.state.getCurrentUser()
            },
            orderBy: {
                deliveryStatusDate: "desc"
            }
        })).map(({ deliveryStatusDate, courierComments }) => ({
            date: ValueConverters.Date.toJson(deliveryStatusDate),
            courierComments
        }))
    }
}
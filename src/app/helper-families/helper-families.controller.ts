import { BackendMethod, SqlDatabase, Allow, remult } from 'remult';

import { DeliveryStatus } from "../families/DeliveryStatus";
import { SendSmsAction, SendSmsUtils } from '../asign-family/send-sms-action';

import { ApplicationSettings, getSettings } from '../manage/ApplicationSettings';
import { Remult } from 'remult';

import { use } from '../translate';
import { HelpersBase } from '../helpers/helpers';

import { ActiveFamilyDeliveries, FamilyDeliveries } from '../families/FamilyDeliveries';
import { Location, GetDistanceBetween } from '../shared/googleApiHelpers';
import { Roles } from '../auth/roles';
import { pagedRowsIterator } from '../families/familyActionsWiring';

import { getDb, getValueFromResult, SqlBuilder, SqlFor } from "../model-shared/SqlBuilder";
import { Phone } from "../model-shared/phone";
import { Sites, getLang } from '../sites/sites';

import { BasketType } from '../families/BasketType';
import { DistributionCenters } from '../manage/distribution-centers';
import { FamilySources } from '../families/FamilySources';
import { selectListItem } from '../helpers/init-context';




export class HelperFamiliesController {
    @BackendMethod({ allowed: Roles.indie })
    static async getDeliveriesByLocation(pivotLocation: Location, selfAssign: boolean) {
        if (!getSettings().isSytemForMlt)
            throw "not allowed";
        let result: selectListItem<DeliveryInList>[] = [];

        let fd = SqlFor(remult.repo(ActiveFamilyDeliveries));

        let sql = new SqlBuilder();
        let settings = await ApplicationSettings.getAsync();
        let privateDonation = selfAssign ? (await remult.repo(FamilySources).findFirst({ name: 'תרומה פרטית' })) : null;

        for (const r of (await getDb().execute(await sql.query({
            select: () => [
                fd.addressLatitude,
                fd.addressLongitude,
                fd.quantity,
                fd.basketType,
                fd.id,
                fd.family,
                fd.floor,
                fd.city],
            from: fd,
            where: () => {
                return [fd.where({
                    deliverStatus: DeliveryStatus.ReadyForDelivery,
                    courier: null,
                    familySource: selfAssign ? [null, privateDonation] : undefined
                })];
            }
        }))).rows) {
            let existing = result.find(async x => x.item.familyId == await getValueFromResult(r, fd.family));
            let basketName = (await remult.repo(BasketType).findFirst({ id: await getValueFromResult(r, fd.basketType) })).name;
            if (existing) {
                existing.name += ", " + await getValueFromResult(r, fd.quantity) + " X " + basketName;
                existing.item.totalItems += await getValueFromResult(r, fd.quantity);
                existing.item.ids.push(await getValueFromResult(r, fd.id));

            }
            else {
                let loc: Location = {
                    lat: +await getValueFromResult(r, fd.addressLatitude),
                    lng: +await getValueFromResult(r, fd.addressLongitude)
                };
                let dist = GetDistanceBetween(pivotLocation, loc);
                let myItem: DeliveryInList = {

                    city: await getValueFromResult(r, fd.city),
                    floor: await getValueFromResult(r, fd.floor),

                    ids: [await getValueFromResult(r, fd.id)],
                    familyId: await getValueFromResult(r, fd.family),
                    location: loc,
                    distance: dist,
                    totalItems: await getValueFromResult(r, fd.quantity)
                };
                let itemString: string =
                    myItem.distance.toFixed(1) + use.language.km +
                    (myItem.city ? ' (' + myItem.city + ')' : '') +
                    (myItem.floor ? ' [' + use.language.floor + ' ' + myItem.floor + ']' : '') +
                    ' : ' +
                    await getValueFromResult(r, fd.quantity) + ' x ' + basketName;

                result.push({
                    selected: false,
                    item: myItem,
                    name: itemString
                });
            }
        }
        let calcAffectiveDistance = (await (import('../volunteer-cross-assign/volunteer-cross-assign.component'))).calcAffectiveDistance;
        result.sort((a, b) => {
            return calcAffectiveDistance(a.item.distance, a.item.totalItems) - calcAffectiveDistance(b.item.distance, b.item.totalItems);
        });
        if (selfAssign) {
            let removeFam = -1;

            do {
                removeFam = result.findIndex(f => f.item.totalItems > settings.MaxItemsQuantityInDeliveryThatAnIndependentVolunteerCanSee);
                if (removeFam >= 0) {
                    result.splice(removeFam, 1);
                }
            } while (removeFam >= 0)
        }
        result.splice(15);
        return result;
    };
    @BackendMethod({ allowed: Roles.distCenterAdmin })
    static async cancelAssignAllForHelperOnServer(helper: HelpersBase) {
        let dist: DistributionCenters = null;
        await pagedRowsIterator(remult.repo(ActiveFamilyDeliveries), {
            where: {
                courier: helper,
                $and: [FamilyDeliveries.onTheWayFilter()]
            },
            forEachRow: async fd => {
                fd.courier = null;
                fd._disableMessageToUsers = true;
                dist = fd.distributionCenter;
                await fd.save();
            }
        });
        await dist.SendMessageToBrowser(getLang().cancelAssignmentForHelperFamilies, remult);
    }
    @BackendMethod({ allowed: Roles.distCenterAdmin })
    static async okAllForHelperOnServer(helper: HelpersBase) {
        let dist: DistributionCenters = null;

        await pagedRowsIterator(remult.repo(ActiveFamilyDeliveries), {
            where: {
                courier: helper,
                $and: [FamilyDeliveries.onTheWayFilter()]
            },
            forEachRow: async fd => {
                dist = fd.distributionCenter;
                fd.deliverStatus = DeliveryStatus.Success;
                fd._disableMessageToUsers = true;
                await fd.save();
            }
        });
        if (dist)
            await dist.SendMessageToBrowser(use.language.markAllDeliveriesAsSuccesfull, remult);
    }
    @BackendMethod({ allowed: Allow.authenticated })
    static async sendSuccessMessageToFamily(deliveryId: string) {
        var settings = (await remult.context.getSettings());
        if (!settings.allowSendSuccessMessageOption)
            return;
        if (!settings.sendSuccessMessageToFamily)
            return;
        let fd = await remult.repo(ActiveFamilyDeliveries).findFirst({
            id: deliveryId,
            visibleToCourier: true,
            deliverStatus: [DeliveryStatus.Success, DeliveryStatus.SuccessLeftThere]
        });
        if (!fd)
            console.log("did not send sms to " + deliveryId + " failed to find delivery");
        if (!fd.phone1)
            return;
        if (!fd.phone1.canSendWhatsapp())
            return;
        let phone = Phone.fixPhoneInput(fd.phone1.thePhone);
        if (phone.length != 10) {
            console.log(phone + " doesn't match sms structure");
            return;
        }


        await new SendSmsUtils().sendSms(phone, SendSmsAction.getSuccessMessage(settings.successMessageText, settings.organisationName, fd.name),  undefined, { familyId: fd.family });
    }
}
export interface DeliveryInList {
    ids: string[],
    familyId: string,
    city: string,
    floor: string,
    location: Location,
    distance: number,
    totalItems: number
}
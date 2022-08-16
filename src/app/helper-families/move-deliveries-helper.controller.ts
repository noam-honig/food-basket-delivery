import { HelpersBase } from "../helpers/helpers";
import { ApplicationSettings, getSettings } from "../manage/ApplicationSettings";
import { DialogService } from "../select-popup/dialog";
import { Remult, BackendMethod, remult } from "remult";
import { ActiveFamilyDeliveries } from "../families/FamilyDeliveries";
import { DeliveryStatus } from "../families/DeliveryStatus";

import { Roles } from "../auth/roles";
import { PromiseThrottle } from "../shared/utils";
import { Families } from "../families/families";
import { openDialog } from "@remult/angular";
import { SelectFamilyComponent } from "../select-family/select-family.component";

export class moveDeliveriesHelperController {
    @BackendMethod({ allowed: Roles.admin })
    static async moveDeliveriesBetweenVolunteers(deliveries: string[], to: HelpersBase) {
        let t = new PromiseThrottle(10);
        let settings = (await remult.context.getSettings());
        let i = 0;
        let toHasDeliveries = (await remult.repo(ActiveFamilyDeliveries).count({ courier: to })) > 0;

        for await (const fd of remult.repo(ActiveFamilyDeliveries).query({ where: { id: deliveries, deliverStatus: DeliveryStatus.ReadyForDelivery } })) {
            fd.courier = to;
            fd.disableRouteReCalc = !toHasDeliveries;
            fd._disableMessageToUsers = true;
            await t.push(fd.save());
            i++;
        }
        await t.done();
        if (i) {
            let m = i + " " + settings.lang.deliveries + " " + settings.lang.to + " " + to.name
            Families.SendMessageToBrowsers(m, remult, '');
            return m;
        }
        return undefined;
    }
}
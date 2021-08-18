import { HelpersBase } from "../helpers/helpers";
import { ApplicationSettings, getSettings } from "../manage/ApplicationSettings";
import { DialogService } from "../select-popup/dialog";
import { Context, BackendMethod } from "remult";
import { ActiveFamilyDeliveries } from "../families/FamilyDeliveries";
import { DeliveryStatus } from "../families/DeliveryStatus";

import { Roles } from "../auth/roles";
import { PromiseThrottle } from "../shared/utils";
import { Families } from "../families/families";
import { openDialog } from "@remult/angular";

export class moveDeliveriesHelper {
    constructor(private context: Context, private settings: ApplicationSettings, private dialog: DialogService, private reload: () => Promise<void>) { }

    async move(from: HelpersBase, to: HelpersBase, showToHelperAssignmentWhenDone: boolean, extraMessage = '') {

        let deliveries = await this.context.repo(ActiveFamilyDeliveries).count(f => f.courier.isEqualTo(from).and(f.deliverStatus.isEqualTo(DeliveryStatus.ReadyForDelivery)));
        if (deliveries > 0)
            this.dialog.YesNoQuestion(extraMessage + " " + this.settings.lang.transfer + " " + deliveries + " " + this.settings.lang.deliveriesFrom + '"' + from.name + '"' + " " + this.settings.lang.toVolunteer + " " + '"' + to.name + '"', async () => {

                let message = await moveDeliveriesHelper.moveDeliveriesBetweenVolunteers(from, to);
                if (message) {
                    this.dialog.Info(message);
                    this.reload();
                    let h = to;
                    if (showToHelperAssignmentWhenDone)
                        await openDialog((await import("../helper-assignment/helper-assignment.component")).HelperAssignmentComponent, x => x.argsHelper = h);
                }

            });
    }
    @BackendMethod({ allowed: Roles.admin })
    static async moveDeliveriesBetweenVolunteers(helperFrom: HelpersBase, to: HelpersBase, context?: Context) {
        let t = new PromiseThrottle(10);
        let settings = getSettings(context);
        let i = 0;

        for await (const fd of context.repo(ActiveFamilyDeliveries).iterate({ where: f => f.courier.isEqualTo(helperFrom).and(f.deliverStatus.isEqualTo(DeliveryStatus.ReadyForDelivery)) })) {
            fd.courier = to;
            fd._disableMessageToUsers = true;
            await t.push(fd.save());
            i++;
        }
        await t.done();
        if (i) {
            let m = i + " " + settings.lang.deliveries + " " + settings.lang.movedFrom + " " +
                helperFrom.name + " " + settings.lang.to + " " +
                to.name
            Families.SendMessageToBrowsers(m, context, '');
            return m;
        }
        return undefined;
    }


}
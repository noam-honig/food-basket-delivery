import { HelpersBase, Helpers, HelperId } from "../helpers/helpers";
import { ApplicationSettings, getSettings } from "../manage/ApplicationSettings";
import { DialogService } from "../select-popup/dialog";
import { Context, ServerFunction } from "@remult/core";
import { ActiveFamilyDeliveries } from "../families/FamilyDeliveries";
import { DeliveryStatus } from "../families/DeliveryStatus";

import { Roles } from "../auth/roles";
import { PromiseThrottle } from "../shared/utils";
import { Families } from "../families/families";
import { openDialog } from "../../../../radweb/projects/angular";

export class moveDeliveriesHelper {
    constructor(private context: Context, private settings: ApplicationSettings, private dialog: DialogService, private reload: () => Promise<void>) { }

    async move(from: HelpersBase, to: HelpersBase, showToHelperAssignmentWhenDone: boolean, extraMessage = '') {

        let deliveries = await this.context.for(ActiveFamilyDeliveries).count(f => f.courier.isEqualTo(from.helperId()).and(f.deliverStatus.isEqualTo(DeliveryStatus.ReadyForDelivery)));
        if (deliveries > 0)
            this.dialog.YesNoQuestion(extraMessage + " " + this.settings.lang.transfer + " " + deliveries + " " + this.settings.lang.deliveriesFrom + '"' + from.name + '"' + " " + this.settings.lang.toVolunteer + " " + '"' + to.name + '"', async () => {

                let message = await moveDeliveriesHelper.moveDeliveriesBetweenVolunteers(from.id, to.id);
                if (message) {
                    this.dialog.Info(message);
                    this.reload();
                    let h = await to.helperId().waitLoad();
                    if (showToHelperAssignmentWhenDone)
                        await openDialog((await import("../helper-assignment/helper-assignment.component")).HelperAssignmentComponent, x => x.argsHelper = h);
                }

            });
    }
    @ServerFunction({ allowed: Roles.admin })
    static async moveDeliveriesBetweenVolunteers(from: string, to: string, context?: Context) {
        let t = new PromiseThrottle(10);
        let settings = getSettings(context);
        let i = 0;
        for await (const fd of context.for(ActiveFamilyDeliveries).iterate({ where: f => f.courier.isEqualTo(new HelperId(from, context)).and(f.deliverStatus.isEqualTo(DeliveryStatus.ReadyForDelivery)) })) {
            fd.courier = new HelperId(to, context);
            fd._disableMessageToUsers = true;
            await t.push(fd.save());
            i++;
        }
        await t.done();
        if (i) {
            let m = i + " " + settings.lang.deliveries + " " + settings.lang.movedFrom + " " +
                (await context.for(Helpers).lookupAsync(x => x.id.isEqualTo(from))).name + " " + settings.lang.to + " " +
                (await context.for(Helpers).lookupAsync(x => x.id.isEqualTo(to))).name
            Families.SendMessageToBrowsers(m, context, '');
            return m;
        }
        return undefined;
    }


}
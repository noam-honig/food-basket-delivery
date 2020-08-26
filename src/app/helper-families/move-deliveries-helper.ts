import { HelpersBase, Helpers } from "../helpers/helpers";
import { ApplicationSettings, getSettings } from "../manage/ApplicationSettings";
import { DialogService } from "../select-popup/dialog";
import { Context, ServerFunction } from "@remult/core";
import { ActiveFamilyDeliveries } from "../families/FamilyDeliveries";
import { DeliveryStatus } from "../families/DeliveryStatus";
import { HelperAssignmentComponent } from "../helper-assignment/helper-assignment.component";
import { Roles } from "../auth/roles";
import { PromiseThrottle } from "../shared/utils";
import { Families } from "../families/families";

export class moveDeliveriesHelper {
    constructor(private context: Context, private settings: ApplicationSettings, private dialog: DialogService, private reload: () => Promise<void>) { }

    async move(from: HelpersBase, to: HelpersBase, showToHelperAssignmentWhenDone: boolean, extraMessage = '') {

        let deliveries = await this.context.for(ActiveFamilyDeliveries).count(f => f.courier.isEqualTo(from.id).and(f.deliverStatus.isEqualTo(DeliveryStatus.ReadyForDelivery)));
        if (deliveries > 0)
            this.dialog.YesNoQuestion(extraMessage + " " + this.settings.lang.transfer + " " + deliveries + " " + this.settings.lang.deliveriesFrom + '"' + from.name.value + '"' + " " + this.settings.lang.toVolunteer + " " + '"' + to.name.value + '"', async () => {

                let message = await moveDeliveriesHelper.moveDeliveriesBetweenVolunteers(from.id.value, to.id.value);
                if (message) {
                    this.dialog.Info(message);
                    this.reload();
                    let h = await this.context.for(Helpers).lookupAsync(to.id);
                    if (showToHelperAssignmentWhenDone)
                        await this.context.openDialog(HelperAssignmentComponent, x => x.argsHelper = h);
                }

            });
    }
    @ServerFunction({ allowed: Roles.admin })
    static async moveDeliveriesBetweenVolunteers(from: string, to: string, context?: Context) {
        let t = new PromiseThrottle(10);
        let settings = getSettings(context);
        let i = 0;
        for await (const fd of context.for(ActiveFamilyDeliveries).iterate({ where: f => f.courier.isEqualTo(from).and(f.deliverStatus.isEqualTo(DeliveryStatus.ReadyForDelivery)) })) {
            fd.courier.value = to;
            fd._disableMessageToUsers = true;
            await t.push(fd.save());
            i++;
        }
        await t.done();
        if (i) {
            let m = i + " " + settings.lang.deliveries + " " + settings.lang.movedFrom + " " +
                (await context.for(Helpers).lookupAsync(x => x.id.isEqualTo(from))).name.value + " " + settings.lang.to + " " +
                (await context.for(Helpers).lookupAsync(x => x.id.isEqualTo(to))).name.value
            Families.SendMessageToBrowsers(m, context, '');
            return m;
        }
        return undefined;
    }


}
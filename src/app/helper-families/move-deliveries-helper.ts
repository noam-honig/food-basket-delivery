import { HelpersBase } from "../helpers/helpers";
import { ApplicationSettings, getSettings } from "../manage/ApplicationSettings";
import { DialogService } from "../select-popup/dialog";
import { Remult, BackendMethod } from "remult";
import { ActiveFamilyDeliveries } from "../families/FamilyDeliveries";
import { DeliveryStatus } from "../families/DeliveryStatus";

import { Roles } from "../auth/roles";
import { PromiseThrottle } from "../shared/utils";
import { Families } from "../families/families";
import { openDialog } from "@remult/angular";
import { SelectFamilyComponent } from "../select-family/select-family.component";

export class moveDeliveriesHelper {
    constructor(private remult: Remult, private settings: ApplicationSettings, private dialog: DialogService, private reload: () => Promise<void>) { }

    async move(from: HelpersBase, to: HelpersBase, showToHelperAssignmentWhenDone: boolean, extraMessage = '', allowSelect = false) {

        let deliveries = await this.remult.repo(ActiveFamilyDeliveries).find({
            where: f => f.courier.isEqualTo(from).and(f.deliverStatus.isEqualTo(DeliveryStatus.ReadyForDelivery)),
            limit: 1000
        });
        if (deliveries.length > 0) {
            let selectedDeliveries: ActiveFamilyDeliveries[] = [];
            if (!allowSelect) {
                if (await this.dialog.YesNoPromise(extraMessage + " " + this.settings.lang.transfer + " " + deliveries.length + " " + this.settings.lang.deliveriesFrom + '"' + from.name + '"' + " " + this.settings.lang.toVolunteer + " " + '"' + to.name + '"')) {
                    selectedDeliveries = deliveries;
                }
            }
            else {
                await openDialog(SelectFamilyComponent, x => x.args = {
                    distCenter: this.dialog.distCenter,
                    orderBy: f => f.routeOrder,
                    onSelect: selected => {
                        selectedDeliveries = selected;
                    },
                    selectStreet: false,
                    allowSelectAll: true,
                    where: f => f.courier.isEqualTo(from).and(f.deliverStatus.isEqualTo(DeliveryStatus.ReadyForDelivery))
                });
            }
            if (selectedDeliveries.length > 0) {
                let message = await moveDeliveriesHelper.moveDeliveriesBetweenVolunteers(selectedDeliveries.map(x => x.id), to);
                if (message) {
                    this.dialog.Info(message);
                    this.reload();
                    let h = to;
                    if (showToHelperAssignmentWhenDone)
                        await openDialog((await import("../helper-assignment/helper-assignment.component")).HelperAssignmentComponent, x => x.argsHelper = h);
                }
            }
        }
    }
    @BackendMethod({ allowed: Roles.admin })
    static async moveDeliveriesBetweenVolunteers(deliveries: string[], to: HelpersBase, remult?: Remult) {
        let t = new PromiseThrottle(10);
        let settings = getSettings(remult);
        let i = 0;

        for await (const fd of remult.repo(ActiveFamilyDeliveries).iterate({ where: f => f.id.isIn(deliveries).and(f.deliverStatus.isEqualTo(DeliveryStatus.ReadyForDelivery)) })) {
            fd.courier = to;
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
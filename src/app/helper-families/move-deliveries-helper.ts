import { HelpersBase } from "../helpers/helpers";
import { ApplicationSettings } from "../manage/ApplicationSettings";
import { DialogService } from "../select-popup/dialog";
import { Remult } from "remult";
import { ActiveFamilyDeliveries } from "../families/FamilyDeliveries";
import { DeliveryStatus } from "../families/DeliveryStatus";

import { openDialog } from "@remult/angular";
import { SelectFamilyComponent } from "../select-family/select-family.component";
import { moveDeliveriesHelperController } from "./move-deliveries-helper.controller";

export class moveDeliveriesHelper {
    constructor(private remult: Remult, private settings: ApplicationSettings, private dialog: DialogService, private reload: () => Promise<void>) { }

    async move(from: HelpersBase, to: HelpersBase, showToHelperAssignmentWhenDone: boolean, extraMessage = '', allowSelect = false) {

        let deliveries = await this.remult.repo(ActiveFamilyDeliveries).find({
            where: { courier: from, deliverStatus: DeliveryStatus.ReadyForDelivery },
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
                    orderBy: { routeOrder: "asc" },
                    onSelect: selected => {
                        selectedDeliveries = selected;
                    },
                    selectStreet: false,
                    allowSelectAll: true,
                    where: { courier: from, deliverStatus: DeliveryStatus.ReadyForDelivery }
                });
            }
            if (selectedDeliveries.length > 0) {
                let message = await moveDeliveriesHelperController.moveDeliveriesBetweenVolunteers(selectedDeliveries.map(x => x.id), to);
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



}
import { BackendMethod, Controller, EntityFilter, Remult, SqlDatabase } from "remult";
import { Roles } from "../auth/roles";
import { DeliveryStatus } from "../families/DeliveryStatus";
import { ActiveFamilyDeliveries, FamilyDeliveries } from "../families/FamilyDeliveries";

@Controller("caller")
export class CallerController {
    constructor(private remult: Remult) {

    }
    @BackendMethod({ allowed: Roles.callPerson })
    async releaseCurrentFamily() {
        const repo = this.remult.repo(ActiveFamilyDeliveries);
        for (const fd of await repo.find({ where: FamilyDeliveries.inProgressCallerDeliveries() })) {
            fd.caller = null;
            await fd.save();
        }
    }
    @BackendMethod({ allowed: Roles.callPerson })
    async nextCall() {
        const repo = this.remult.repo(ActiveFamilyDeliveries);
        let lastId = '';
        for (const fd of await repo.find({ where: FamilyDeliveries.inProgressCallerDeliveries() })) {
            fd.callCounter++;
            fd.lastCallDate = new Date();
            fd.caller = null;
            lastId = fd.id;
            await fd.save();
        }
        const where: EntityFilter<ActiveFamilyDeliveries> = {
            id: { $ne: lastId },
            deliverStatus: DeliveryStatus.enquireDetails,
            archive: false,
            caller: null,

        };
        const helper = await this.remult.getCurrentUser();
        async function findDelivery(where: EntityFilter<ActiveFamilyDeliveries>) {
            for await (const fd of repo.query({ where, orderBy: { lastCallDate: "asc" } })) {
                let match = true;
                if (helper.includeGroups?.hasAny()) {
                    match = false;
                    for (let g of helper.includeGroups.listGroups()) {
                        if (fd.groups.selected(g.trim())) {
                            match = true;
                        }

                    }
                }
                if (helper.excludeGroups?.hasAny()) {
                    for (let g of helper.excludeGroups.listGroups()) {
                        if (fd.groups.selected(g.trim())) {
                            match = false;
                        }

                    }
                }
                if (match)
                    return fd;
            }
        }
        let fd = await findDelivery(
            { $and: [where, { lastCallDate: null }] });
        if (!fd) {
            fd = await findDelivery(where)
        }
        if (!fd) {
            var d = new Date();
            d.setHours(d.getHours() - 1);
            fd = await findDelivery({
                deliverStatus: DeliveryStatus.enquireDetails,
                archive: false,
                callerAssignDate: { $lt: d }
            })
        }
        if (!fd)
            return false;
        fd.caller = await this.remult.getCurrentUser();
        fd.callerAssignDate = new Date();
        await fd.save();
        return true;
    }
}
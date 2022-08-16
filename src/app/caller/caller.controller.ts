import { BackendMethod, Controller, EntityFilter, Remult, SqlDatabase } from "remult";
import { Roles } from "../auth/roles";
import { DeliveryStatus } from "../families/DeliveryStatus";
import { ActiveFamilyDeliveries, FamilyDeliveries } from "../families/FamilyDeliveries";
import { Helpers } from "../helpers/helpers";
import { SqlBuilder, SqlFor } from "../model-shared/SqlBuilder";

@Controller("caller")
export class CallerController {
    @BackendMethod({ allowed: Roles.callPerson })
    async selectFamily(f: CallerFamilyInfo) {
        this.releaseCurrentFamily();
        const fd = await this.remult.repo(ActiveFamilyDeliveries).findId(f.deliveryId);
        if (fd && fd.deliverStatus == DeliveryStatus.enquireDetails) {
            fd.caller = await this.remult.state.getCurrentUser();
            fd.callerAssignDate = new Date();
            await fd.save();
        }

    }
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

        const tenMinutesAgo = new Date();
        tenMinutesAgo.setMinutes(tenMinutesAgo.getMinutes() - 45);
        for (const fd of await repo.find({
            where: {
                deliverStatus: DeliveryStatus.enquireDetails, archive: false,
                caller: { "!=": null },
                callerAssignDate: { "<": tenMinutesAgo }

            }
        })) {
            fd.caller = null;
            await fd.save();
        }

        const where: EntityFilter<ActiveFamilyDeliveries> = {
            id: { $ne: lastId },
            deliverStatus: DeliveryStatus.enquireDetails,
            archive: false,
            caller: null,

        };
        const helper = await this.remult.state.getCurrentUser();
        async function findDelivery(where: EntityFilter<ActiveFamilyDeliveries>) {
            for await (const fd of repo.query({ where, orderBy: { lastCallDate: "asc" } })) {
                if (groupMatches(helper, fd))
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
        fd.caller = await this.remult.state.getCurrentUser();
        fd.callerAssignDate = new Date();
        await fd.save();
        return true;
    }
    @BackendMethod({ allowed: Roles.callPerson, blockUser: false })
    async findFamily(search: string): Promise<CallerFamilyInfo[]> {
        if (search.trim().length < 2)
            return [];
        const helper = await this.remult.state.getCurrentUser();
        return (await this.remult.repo(ActiveFamilyDeliveries).find({
            where: {
                deliverStatus: DeliveryStatus.enquireDetails,
                $or: [ActiveFamilyDeliveries.filterPhone(search), {
                    name: { $contains: search }
                }]
            }
        })).filter((x) => groupMatches(helper, x)).filter((x, i) => i < 30)
            .map(fd => ({ deliveryId: fd.id, name: fd.name, phone: [fd.phone1, fd.phone2, fd.phone3, fd.phone4].filter(x => x).map(x => x.displayValue).join(', ') }));

    }
}
export interface CallerFamilyInfo {
    deliveryId: string;
    name: string;
    phone: string;
}

function groupMatches(helper: Helpers, fd: ActiveFamilyDeliveries) {
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
    return match;
}

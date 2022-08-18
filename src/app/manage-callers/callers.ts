import { DataControl } from "@remult/angular/interfaces";
import { BackendMethod, Entity, EntityMetadata, EntityRef, Fields, remult } from "remult";
import { Roles } from "../auth/roles";
import { volunteersInEvent } from "../events/events";
import { DeliveryStatus } from "../families/DeliveryStatus";
import { FamilyDeliveries } from "../families/FamilyDeliveries";
import { Helpers } from "../helpers/helpers";
import { SqlFor, SqlBuilder, SqlDefs } from "../model-shared/SqlBuilder";

@Entity<Callers>("callers", {
    allowApiCrud: Roles.admin,
    allowApiRead: Roles.callPerson,
    dbName: "Helpers",
    backendPrefilter: {
        caller: true
    },
    apiPrefilter: () => {
        if (!remult.isAllowed(Roles.admin))
            return {
                id: remult.user.id
            }
    }
}
)
export class Callers extends Helpers {
    @BackendMethod({ allowed: Roles.admin })
    static async updateEventVolunteerAsCallers(eventId: string): Promise<string> {
        let count = 0;
        for await (const v of remult.repo(volunteersInEvent).query({
            where: {
                eventId,
                canceled: false
            }
        })) {
            const h = await v.helper.getHelper();
            h.caller = true;
            await h.save();
            count++;
        }
        return "עודכנו " + count + " טלפנים";
    }
    @DataControl({ width: '90' })
    @Fields.integer<Callers>({
        caption: 'שיחות שהושלמו',
        sqlExpression: async (selfDefs) => {
            var { sql, self, innerSelectDefs } = callerCallsQuery(selfDefs);
            return sql.columnCount(self, innerSelectDefs);
        }
    })
    callsCompleted: number;
    @Fields.date<Callers>({
        caption: 'שיחה אחרונה',
        sqlExpression: async (selfDefs) => {
            var { sql, self, innerSelectDefs, fd } = callerCallsQuery(selfDefs);
            return sql.columnMaxWithAs(self, fd.lastCallDate, innerSelectDefs, self.lastCallDate.key);
        }
    })
    lastCallDate: Date;
}

function callerCallsQuery(selfDefs: EntityMetadata<Callers>) {
    let self = SqlFor(selfDefs);
    let fd: SqlDefs<FamilyDeliveries> = SqlFor(remult.repo(FamilyDeliveries));
    let sql = new SqlBuilder();
    const innerSelectDefs = {
        from: fd,
        where: () => [sql.eq(fd.caller, self.id),
        fd.where({ archive: false, deliverStatus: { "!=": DeliveryStatus.enquireDetails } })]
    };
    return { sql, self, innerSelectDefs, fd };
}

import { DataControl } from "@remult/angular/interfaces";
import { BackendMethod, Entity, EntityMetadata, EntityRef, Fields, Remult } from "remult";
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
    }
}, (options, remult) => {
    if (!remult.isAllowed(Roles.admin))
        options.apiPrefilter = {
            id: remult.user.id
        }
}
)
export class Callers extends Helpers {
    @BackendMethod({ allowed: Roles.admin })
    static async updateEventVolunteerAsCallers(eventId: string, remult?: Remult): Promise<string> {
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
        caption: 'שיחות שהושלמו'
    },
        (options, remult) =>
            options.sqlExpression = async (selfDefs) => {
                var { sql, self, innerSelectDefs } = callerCallsQuery(selfDefs, remult);
                return sql.columnCount(self, innerSelectDefs);
            }
    )
    callsCompleted: number;
    @Fields.date<Callers>({
        caption: 'שיחה אחרונה'
    },
        (options, remult) =>
            options.sqlExpression = async (selfDefs) => {
                var { sql, self, innerSelectDefs, fd } = callerCallsQuery(selfDefs, remult);
                return sql.columnMaxWithAs(self, fd.lastCallDate, innerSelectDefs, self.lastCallDate.key);
            }
    )
    lastCallDate: Date;
}

function callerCallsQuery(selfDefs: EntityMetadata<Callers>, remult: Remult) {
    let self = SqlFor(selfDefs);
    let fd: SqlDefs<FamilyDeliveries> = SqlFor(remult.repo(FamilyDeliveries));
    let sql = new SqlBuilder(remult);
    const innerSelectDefs = {
        from: fd,
        where: () => [sql.eq(fd.caller, self.id),
        fd.where({ archive: false, deliverStatus: { "!=": DeliveryStatus.enquireDetails } })]
    };
    return { sql, self, innerSelectDefs, fd };
}

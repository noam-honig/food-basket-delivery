import { IdEntity, StringColumn, Context, DateColumn, NumberColumn, IdColumn, ValueListColumn, EntityClass } from "@remult/core";
import { getLang, use } from "../translate";
import { Roles } from "../auth/roles";
import { HelperId } from "../helpers/helpers";
import { SqlBuilder } from "../model-shared/types";

@EntityClass
export class Event extends IdEntity {
    name = new StringColumn(getLang(this.context).eventName);
    eventStatus = new eventStatusColumn();
    description = new StringColumn(getLang(this.context).eventDescription);
    eventDate = new DateColumn(getLang(this.context).eventDate);
    startTime = new StringColumn({ dataControlSettings: () => ({ inputType: 'time', width: '110' }), caption: getLang(this.context).eventTime });
    endTime = new StringColumn({ dataControlSettings: () => ({ inputType: 'time', width: '110' }), caption: getLang(this.context).eventEndTime });
    requiredVolunteers = new NumberColumn(getLang(this.context).requiredVolunteers);
    registeredVolunteers = new NumberColumn({
        caption: getLang(this.context).attendingVolunteers,
        sqlExpression: () => {
            var vie = this.context.for(volunteersInEvent).create();
            var sql = new SqlBuilder();
            return sql.columnCount(this, {
                from: vie,
                where: () => [sql.eq(vie.eventId, this.id)]
            })
        }
    });

    constructor(private context: Context) {
        super({
            name: 'events',
            allowApiCRUD: Roles.admin,
            allowApiRead: c => c.isSignedIn(),
            
            apiDataFilter: () => {
                if (context.isAllowed(Roles.admin))
                    return undefined;
                return this.eventStatus.isEqualTo(eventStatus.active);
            }
        });
    }

}
@EntityClass
export class volunteersInEvent extends IdEntity {
    eventId = new IdColumn();
    helper = new HelperId(this.context);
    constructor(private context: Context) {
        super({
            name: 'volunteersInEvent',
            allowApiCRUD: c => c.isSignedIn(),
            apiDataFilter: () => {
                if (context.isAllowed(Roles.admin))
                    return undefined;
                return this.helper.isEqualTo(context.user.id);
            }
        });
    }
}




export class eventStatus {
    static active = new eventStatus(0, use.language.activeEventStatus);
    static preparation = new eventStatus(5, use.language.eventPreparation);
    static archive = new eventStatus(9, use.language.archiveEventStatus);

    constructor(public id: number, public caption: string) {

    }
}
export class eventStatusColumn extends ValueListColumn<eventStatus>{
    constructor() {
        super(eventStatus, {
            caption: use.language.eventStatus,
            defaultValue: eventStatus.active,
            dataControlSettings: () => ({
                valueList: this.getOptions()
            })
        });
    }
}
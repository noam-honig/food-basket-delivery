import { IdEntity, StringColumn, Context, DateColumn, NumberColumn, IdColumn, ValueListColumn, EntityClass } from "@remult/core";
import { use } from "../translate";
import { getLang } from '../sites/sites';
import { Roles } from "../auth/roles";
import { HelperId, Helpers } from "../helpers/helpers";
import { SqlBuilder, PhoneColumn } from "../model-shared/types";
import { ActiveFamilyDeliveries, FamilyDeliveries } from "../families/FamilyDeliveries";
import { GridDialogComponent } from "../grid-dialog/grid-dialog.component";
import { HelperAssignmentComponent } from "../helper-assignment/helper-assignment.component";
import { settings } from "cluster";
import { SelectHelperComponent } from "../select-helper/select-helper.component";

@EntityClass
export class Event extends IdEntity {
    showVolunteers(): void {
        this.context.openDialog(GridDialogComponent, x => x.args = {
            title: this.name.value,

            buttons: [{
                text: getLang(this.context).addVolunteer,
                click: () => this.context.openDialog(SelectHelperComponent, y => y.args = {
                    onSelect: async h => {
                        let eh = this.context.for(volunteersInEvent).create();
                        eh.helper.value = h.id.value;
                        eh.eventId.value = this.id.value;
                        await eh.save();
                        x.args.settings.getRecords()
                    }
                })

            }],
            settings: this.context.for(volunteersInEvent).gridSettings({
                get: {
                    limit: 50,
                    where: ve => ve.eventId.isEqualTo(this.id)
                },
                knowTotalRows: true,
                columnSettings: ev => [
                    ev.helperName,
                    {
                        caption: getLang(this.context).volunteerStatus,
                        getValue: v => {
                            if (v.assignedDeliveries.value > 0)
                                return getLang(this.context).assigned;
                            else if (v.succesfulDeliveries.value == 0)
                                return getLang(this.context).newVolunteer
                            else getLang(this.context).unAsigned
                        }
                    },
                    ev.helperPhone,
                    ev.assignedDeliveries,
                    ev.succesfulDeliveries
                ],
                rowCssClass: v => {
                    if (v.assignedDeliveries.value > 0)
                        return 'deliveredOk';
                    else if (v.succesfulDeliveries.value == 0)
                        return 'newVolunteer'
                    return '';
                },
                rowButtons: [
                    {
                        name: getLang(this.context).assignDeliveryMenu,
                        icon: 'list_alt',
                        click: async (ev) => {
                            let h = await this.context.for(Helpers).findId(ev.helper);
                            await this.context.openDialog(HelperAssignmentComponent, x => x.argsHelper = h);
                            ev.save();
                        }
                    },
                    {
                        name: getLang(this.context).volunteerInfo,
                        icon: 'edit',
                        click: async (ev) => {
                            let h = await this.context.for(Helpers).findId(ev.helper);
                            await h.displayEditDialog()
                        }
                    },
                    {
                        name: getLang(this.context).remove,
                        click: async eh => {
                            await eh.delete();
                            x.args.settings.items.splice(x.args.settings.items.indexOf(eh))
                        }
                    }
                ]
            })
        });
    }
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
    helperName = new StringColumn({
        caption: getLang(this.context).volunteerName, sqlExpression: () => {
            let sql = new SqlBuilder();
            let h = this.context.for(Helpers).create();
            return sql.columnInnerSelect(this, {
                from: h,
                select: () => [h.name],
                where: () => [sql.eq(h.id, this.helper)]
            });
        }
    })
    helperPhone = new PhoneColumn({
        caption: getLang(this.context).volunteerPhoneNumber, sqlExpression: () => {
            let sql = new SqlBuilder();
            let h = this.context.for(Helpers).create();
            return sql.columnInnerSelect(this, {
                from: h,
                select: () => [h.phone],
                where: () => [sql.eq(h.id, this.helper)]
            });
        }
    })
    assignedDeliveries = new NumberColumn({
        caption: getLang(this.context).deliveriesAssigned,
        sqlExpression: () => {
            let sql = new SqlBuilder();
            let d = this.context.for(ActiveFamilyDeliveries).create();
            return sql.columnCount(this, { from: d, where: () => [sql.eq(this.helper, d.courier)] })
        }
    })
    succesfulDeliveries = new NumberColumn({
        caption: getLang(this.context).delveriesSuccesfull,
        sqlExpression: () => {
            let sql = new SqlBuilder();
            let d = this.context.for(FamilyDeliveries).create();
            return sql.columnCountWithAs(this, { from: d, where: () => [sql.eq(this.helper, d.courier), d.deliverStatus.isSuccess()] }, 'succesfulDeliveries')
        }
    })
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
import { IdEntity, StringColumn, Context, DateColumn, NumberColumn, IdColumn, ValueListColumn, EntityClass, BusyService, BoolColumn } from "@remult/core";
import { use } from "../translate";
import { getLang } from '../sites/sites';
import { Roles } from "../auth/roles";
import { HelperId, HelperIdReadonly, Helpers } from "../helpers/helpers";
import { SqlBuilder, PhoneColumn, changeDate, DateTimeColumn } from "../model-shared/types";
import { ActiveFamilyDeliveries, FamilyDeliveries } from "../families/FamilyDeliveries";
import { GridDialogComponent } from "../grid-dialog/grid-dialog.component";
import { HelperAssignmentComponent } from "../helper-assignment/helper-assignment.component";
import { settings } from "cluster";
import { SelectHelperComponent } from "../select-helper/select-helper.component";
import { DialogService } from "../select-popup/dialog";
import { saveToExcel } from '../shared/saveToExcel';
import { getSettings } from "../manage/ApplicationSettings";
import { AddressColumn } from "../shared/googleApiHelpers";

@EntityClass
export class Event extends IdEntity {
    showVolunteers(dialog: DialogService, busy: BusyService): void {
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
                numOfColumnsInGrid: 10,
                columnSettings: ev => [
                    { width: '100', column: ev.helperName },
                    {
                        caption: getLang(this.context).volunteerStatus,
                        getValue: v => {
                            if (v.assignedDeliveries.value > 0)
                                if (v.lastAssignTime.value < v.lastSmsTime.value)
                                    return getLang(this.context).smsSent;
                                else
                                    return getLang(this.context).assigned;
                            else if (v.succesfulDeliveries.value == 0)
                                return getLang(this.context).newVolunteer
                            else getLang(this.context).unAsigned
                        },
                        width: '100'
                    },
                    { width: '100', column: ev.assignedDeliveries },
                    { width: '100', column: ev.succesfulDeliveries },
                    { width: '150', column: ev.helperPhone },
                    ev.helperEmail,
                    { width: '100', column: ev.duplicateToNextEvent },
                    ev.createDate,
                    ev.createUser
                ],
                rowCssClass: v => {
                    if (v.assignedDeliveries.value > 0)
                        if (v.lastAssignTime.value < v.lastSmsTime.value)
                            return 'deliveredOk';
                        else
                            return 'largeDelivery';
                    else if (v.succesfulDeliveries.value == 0)
                        return 'newVolunteer'
                    return '';
                },
                gridButtons: [
                    {
                        name: getLang(this.context).exportToExcel,
                        click: async () => {
                            saveToExcel(getSettings(this.context), this.context.for(volunteersInEvent), x.args.settings, "מתנדבים שנרשמו ל" + this.name.value, busy)
                        }
                    }
                ],
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
                            await h.displayEditDialog(dialog, busy)
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
    addressApiResult = new StringColumn();
    address = new AddressColumn(this.context, this.addressApiResult, getLang(this.context).address);

    phone1 = new PhoneColumn(getLang(this.context).phone1);
    phone1Description = new StringColumn(getLang(this.context).phone1Description);

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
            saving: async () => {
                if (context.onServer) {
                    await this.address.updateApiResultIfChanged();
                }
            },

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
    helperEmail = new StringColumn({
        caption: getLang(this.context).email, sqlExpression: () => {
            let sql = new SqlBuilder();
            let h = this.context.for(Helpers).create();
            return sql.columnInnerSelect(this, {
                from: h,
                select: () => [h.email],
                where: () => [sql.eq(h.id, this.helper)]
            });
        }
    })
    lastSmsTime = new DateTimeColumn({
        sqlExpression: () => {
            let sql = new SqlBuilder();
            let h = this.context.for(Helpers).create();
            return sql.columnInnerSelect(this, {
                from: h,
                select: () => [h.smsDate],
                where: () => [sql.eq(h.id, this.helper)]
            });
        }
    })
    lastAssignTime = new DateTimeColumn({

        sqlExpression: () => {
            let sql = new SqlBuilder();
            let d = this.context.for(FamilyDeliveries).create();
            return sql.columnMaxWithAs(this, d.courierAssingTime, { from: d, where: () => [sql.eq(this.helper, d.courier)] }, 'lastAssignTime')
        }
    })
    duplicateToNextEvent = new BoolColumn(getLang(this.context).duplicateForNextEvent);
    createDate = new changeDate({ caption: getLang(this.context).createDate });
    createUser = new HelperIdReadonly(this.context, { caption: getLang(this.context).createUser });

    constructor(private context: Context) {
        super({
            name: 'volunteersInEvent',
            allowApiCRUD: c => c.isSignedIn(),
            apiDataFilter: () => {
                if (context.isAllowed(Roles.admin))
                    return undefined;
                return this.helper.isEqualTo(context.user.id);
            }
            ,
            saving: () => {
                if (this.isNew() && context.onServer) {
                    this.createDate.value = new Date();
                    this.createUser.value = context.user.id;
                }
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
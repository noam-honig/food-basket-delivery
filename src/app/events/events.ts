import { IdEntity, Context, Entity, Column, Storable, DateOnlyValueConverter, InputTypes, ColumnDefinitionsOf } from "@remult/core";
import { BusyService, DataControl, GridSettings, openDialog } from '@remult/angular';
import { use } from "../translate";
import { getLang } from '../sites/sites';
import { Roles } from "../auth/roles";
import { currentUser, HelperId, Helpers, HelpersBase } from "../helpers/helpers";
import { SqlBuilder, DateTimeColumn, ChangeDateColumn, SqlFor } from "../model-shared/types";
import { Phone } from "../model-shared/Phone";
import { ActiveFamilyDeliveries, FamilyDeliveries } from "../families/FamilyDeliveries";
import { GridDialogComponent } from "../grid-dialog/grid-dialog.component";
import { HelperAssignmentComponent } from "../helper-assignment/helper-assignment.component";
import { settings } from "cluster";
import { SelectHelperComponent } from "../select-helper/select-helper.component";
import { DialogService } from "../select-popup/dialog";
import { saveToExcel } from '../shared/saveToExcel';
import { getSettings } from "../manage/ApplicationSettings";

import {  DistributionCenters } from "../manage/distribution-centers";
import { AddressHelper } from "../shared/googleApiHelpers";
import { ValueListValueConverter } from "../../../../radweb/projects/core/src/column";
import { DeliveryStatus } from "../families/DeliveryStatus";



@Storable({
    caption: use.language.eventStatus,
    defaultValue: () => eventStatus.active,
    valueConverter: () => new ValueListValueConverter(eventStatus)
})

export class eventStatus {
    static active = new eventStatus(0, use.language.activeEventStatus);
    static preparation = new eventStatus(5, use.language.eventPreparation);
    static archive = new eventStatus(9, use.language.archiveEventStatus);

    constructor(public id: number, public caption: string) {

    }
}

@Entity<Event>({
    key: 'events',
    allowApiCrud: Roles.admin,
    allowApiRead: c => c.isSignedIn(),
    saving: async (self) => {
        if (self.context.onServer) {
            await self.addressHelper.updateApiResultIfChanged();
            if (self.distributionCenter==null)
                self.distributionCenter =await DistributionCenters.getDefault(self.context);
        }
    },

    apiDataFilter: (self, context) => {
        if (context.isAllowed(Roles.admin))
            return undefined;
        return self.eventStatus.isEqualTo(eventStatus.active);
    }
})
export class Event extends IdEntity {
    showVolunteers(dialog: DialogService, busy: BusyService): void {
        openDialog(GridDialogComponent, x => x.args = {
            title: this.name,
            stateName: 'helpers-per-event',

            buttons: [{
                text: getLang(this.context).addVolunteer,
                click: () => openDialog(SelectHelperComponent, y => y.args = {
                    onSelect: async h => {
                        let eh = this.context.for(volunteersInEvent).create();
                        eh.helper = await h;
                        eh.eventId = this.id;
                        await eh.save();
                        x.args.settings.reloadData()
                    }
                })

            }],
            settings: new GridSettings(this.context.for(volunteersInEvent), {

                rowsInPage: 50,
                where: ve => ve.eventId.isEqualTo(this.id)
                ,
                knowTotalRows: true,
                numOfColumnsInGrid: 10,
                columnSettings: (ev: ColumnDefinitionsOf<volunteersInEvent>) => [
                    { width: '100', column: ev.helperName },
                    {
                        caption: getLang(this.context).volunteerStatus,
                        getValue: v => {
                            if (v.assignedDeliveries > 0)
                                if (v.lastAssignTime < v.lastSmsTime)
                                    return getLang(this.context).smsSent;
                                else
                                    return getLang(this.context).assigned;
                            else if (v.succesfulDeliveries == 0)
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
                    if (v.assignedDeliveries > 0)
                        if (v.lastAssignTime < v.lastSmsTime)
                            return 'deliveredOk';
                        else
                            return 'largeDelivery';
                    else if (v.succesfulDeliveries == 0)
                        return 'newVolunteer'
                    return '';
                },
                gridButtons: [
                    {
                        name: getLang(this.context).exportToExcel,
                        click: async () => {
                            saveToExcel(getSettings(this.context), this.context.for(volunteersInEvent), x.args.settings, "מתנדבים שנרשמו ל" + this.name, busy)
                        }
                    }
                ],
                rowButtons: [
                    {
                        name: getLang(this.context).assignDeliveryMenu,
                        icon: 'list_alt',
                        click: async (ev) => {
                            let h = await this.context.for(Helpers).findId(ev.helper);
                            await openDialog(HelperAssignmentComponent, x => x.argsHelper = h);
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
                        name: getLang(this.context).sendWhats,
                        click: h => h.helperPhone.sendWhatsapp(this.context),
                        icon: 'textsms'
                    },
                    {
                        name: getLang(this.context).remove,
                        click: async eh => {
                            await eh.delete();
                            x.args.settings.items.splice(x.args.settings.items.indexOf(eh), 1)
                        }
                    }
                ]
            })
        });
    }
    @Column({ caption: use.language.eventName })
    name: string;
    @Column()
    eventStatus: eventStatus;
    @Column({ caption: use.language.eventDescription })
    description: string;
    @Column({ caption: use.language.eventDate, valueConverter: () => DateOnlyValueConverter })
    eventDate: Date;
    @Column({ inputType: InputTypes.time, caption: use.language.eventTime })
    @DataControl({ width: '110' })
    startTime: string;
    @Column({ inputType: InputTypes.time, caption: use.language.eventEndTime })
    @DataControl({ width: '110' })
    endTime: string;
    @Column({ caption: use.language.requiredVolunteers })
    requiredVolunteers: number;
    @Column()
    addressApiResult: string;
    @Column({ caption: use.language.address })
    address: string;
    addressHelper = new AddressHelper(this.context, () => this.$.address, () => this.$.addressApiResult);
    @Column<Event>({
        allowApiUpdate: Roles.admin
    })
    distributionCenter: DistributionCenters;

    @Column({ caption: use.language.phone1 })
    phone1: Phone;
    @Column({ caption: use.language.phone1Description })
    phone1Description: string;
    @Column({
        caption: use.language.attendingVolunteers,
        sqlExpression: (selfDefs, context) => {
            var vie = SqlFor(context.for(volunteersInEvent));
            let self = SqlFor(selfDefs);
            var sql = new SqlBuilder();
            return sql.columnCount(self, {
                from: vie,
                where: () => [sql.eq(vie.eventId, self.id)]
            })
        }
    })
    registeredVolunteers: number;


    constructor(private context: Context) {
        super();
    }

}
@Entity<volunteersInEvent>({
    key: 'volunteersInEvent',
    allowApiCrud: c => c.isSignedIn(),
    apiDataFilter: (self, context) => {
        if (context.isAllowed([Roles.admin, Roles.distCenterAdmin]))
            return undefined;
        return self.helper.isEqualTo(context.get(currentUser));
    }
    ,
    saving: (self) => {
        if (self.isNew() && self.context.onServer) {
            self.createDate = new Date();
            self.createUser = self.context.get(currentUser);
        }
    }
})
export class volunteersInEvent extends IdEntity {
    @Column()
    eventId: string;
    @Column()
    helper: HelpersBase;

    @Column<volunteersInEvent>({
        caption: use.language.volunteerName, sqlExpression: (selfDefs, context) => {
            let sql = new SqlBuilder();
            let self = SqlFor(selfDefs);
            let h = SqlFor(context.for(Helpers));
            return sql.columnInnerSelect(self, {
                from: h,
                select: () => [h.name],
                where: () => [sql.eq(h.id, self.helper)]
            });
        }
    })
    helperName: string;
    @Column({
        caption: use.language.volunteerPhoneNumber, sqlExpression: (selfDefs, context) => {
            let sql = new SqlBuilder();
            let self = SqlFor(selfDefs);
            let h = SqlFor(context.for(Helpers));
            return sql.columnInnerSelect(self, {
                from: h,
                select: () => [h.phone],
                where: () => [sql.eq(h.id, self.helper)]
            });
        }
    })
    helperPhone: Phone;
    @Column({
        caption: use.language.deliveriesAssigned,
        sqlExpression: (selfDefs, context) => {
            let sql = new SqlBuilder();
            let self = SqlFor(selfDefs);
            let d = SqlFor(context.for(ActiveFamilyDeliveries));
            return sql.columnCount(self, { from: d, where: () => [sql.eq(self.helper, d.courier)] })
        }
    })
    assignedDeliveries: number;
    @Column({
        caption: use.language.delveriesSuccesfull,
        sqlExpression: (selfDefs, context) => {
            let sql = new SqlBuilder();
            let self = SqlFor(selfDefs);
            let d = SqlFor(context.for(FamilyDeliveries));
            return sql.columnCountWithAs(self, { from: d, where: () => [sql.eq(self.helper, d.courier), DeliveryStatus.isSuccess(d.deliverStatus)] }, 'succesfulDeliveries')
        }
    })
    succesfulDeliveries: number;
    @Column({
        caption: use.language.email, sqlExpression: (selfDefs, context) => {
            let sql = new SqlBuilder();
            let self = SqlFor(selfDefs);
            let h = SqlFor(context.for(Helpers));
            return sql.columnInnerSelect(self, {
                from: h,
                select: () => [h.email],
                where: () => [sql.eq(h.id, self.helper)]
            });
        }
    })
    helperEmail: string;
    @Column({
        sqlExpression: (selfDefs, context) => {
            let sql = new SqlBuilder();
            let self = SqlFor(selfDefs);
            let h = SqlFor(context.for(Helpers));
            return sql.columnInnerSelect(self, {
                from: h,
                select: () => [h.smsDate],
                where: () => [sql.eq(h.id, self.helper)]
            });
        }
    })
    lastSmsTime: Date;
    @Column({

        sqlExpression: (selfDefs, context) => {
            let sql = new SqlBuilder();
            let self = SqlFor(selfDefs);
            let d = SqlFor(context.for(FamilyDeliveries));
            return sql.columnMaxWithAs(self, d.courierAssingTime, { from: d, where: () => [sql.eq(self.helper, d.courier)] }, 'lastAssignTime')
        }
    })
    lastAssignTime: Date;
    @Column({ caption: use.language.duplicateForNextEvent })
    duplicateToNextEvent: boolean;
    @ChangeDateColumn({ caption: use.language.createDate })
    createDate: Date;
    @Column({ caption: use.language.createUser, allowApiUpdate: false })
    createUser: Helpers;



    constructor(private context: Context) {
        super();
    }
}



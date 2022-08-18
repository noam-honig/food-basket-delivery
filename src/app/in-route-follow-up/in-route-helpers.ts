import { IdEntity,  Entity, FieldMetadata, remult } from "remult";
import { Roles } from "../auth/roles";
import { DateTimeColumn, relativeDateName, ChangeDateColumn } from "../model-shared/types";
import { SqlBuilder, SqlFor } from "../model-shared/SqlBuilder";
import { getLang } from "../sites/sites";
import { Helpers, HelpersBase } from "../helpers/helpers";
import { ActiveFamilyDeliveries, MessageStatus, FamilyDeliveries } from "../families/FamilyDeliveries";
import { DeliveryStatus } from "../families/DeliveryStatus";

import { Field, Fields } from "../translate";

import { DataControl, GridSettings } from "@remult/angular/interfaces";


import { UITools } from "../helpers/init-context";

@Entity<InRouteHelpers>('in-route-helpers', {
    allowApiRead: Roles.admin,
    defaultOrderBy: { minAssignDate: "asc" },
    sqlExpression: async (self) => {
        let sql = new SqlBuilder();

        let f = SqlFor(remult.repo(ActiveFamilyDeliveries));
        let history = SqlFor(remult.repo(FamilyDeliveries));
        let com = SqlFor(remult.repo(HelperCommunicationHistory));
        let h = SqlFor(remult.repo(Helpers));
        let h2 = SqlFor(remult.repo(Helpers));
        let helperFamilies = (where: () => any[]) => {
            return {
                from: f,
                where: () => [f.where({ distributionCenter: remult.context.filterCenterAllowedForUser() }), sql.eq(f.courier, h.id), ...where()]
            }
        }
        let comInnerSelect = (col: FieldMetadata, toCol: FieldMetadata) => {
            return sql.innerSelect({
                select: () => [col],
                from: com,
                where: () => [sql.eq(com.volunteer, h.id), sql.build(com.message, ' not like \'%Link%\'')],
                orderBy: [{ field: com.createDate, isDescending: true }]
            }, toCol)
        }
        let comHelperInnerSelect = (toCol: FieldMetadata) => {
            return sql.innerSelect({
                select: () => [h2.name],
                from: com,
                innerJoin: () => [{ to: h2, on: () => [sql.eq(com.createUser, h2.id)] }],
                where: () => [sql.eq(com.volunteer, h.id), sql.build(com.message, ' not like \'%Link%\'')],
                orderBy: [{ field: com.createDate, isDescending: true }]
            }, toCol)
        }
        return sql.build('(select *,',
            sql.case([{ when: [sql.build(self.lastSignInDate, ' is null or ', self.lastSignInDate, '<', self.minAssignDate)], then: false }], true)
            , ' ', self.seenFirstAssign
            ,

            ' from (', sql.query({
                select: () => [h.id, h.name, h.lastSignInDate, h.smsDate, h.internalComment, h.company, h.frozenTill,
                sql.countDistinctInnerSelect(f.family, helperFamilies(() => [f.where({ deliverStatus: DeliveryStatus.ReadyForDelivery })]), self.deliveriesInProgress)
                    , sql.minInnerSelect(f.courierAssingTime, helperFamilies(() => [f.where({ deliverStatus: DeliveryStatus.ReadyForDelivery })]), self.minAssignDate)
                    , sql.maxInnerSelect(f.courierAssingTime, helperFamilies(() => [f.where({ deliverStatus: DeliveryStatus.ReadyForDelivery })]), self.maxAssignDate)
                    , sql.maxInnerSelect(f.deliveryStatusDate, helperFamilies(() => [f.where({ deliverStatus: DeliveryStatus.isSuccess() })]), self.lastCompletedDelivery)
                    , comInnerSelect(com.createDate, self.lastCommunicationDate)
                    , comInnerSelect(com.message, self.lastComment)
                    , sql.countDistinctInnerSelect(history.family, { from: history, where: () => [sql.eq(history.courier, h.id), f.where({ deliverStatus: DeliveryStatus.isSuccess() })] }, self.completedDeliveries)
                    , comHelperInnerSelect(self.lastCommunicationUser)
                ],

                from: h,
                where: () => [h.where({ archive: false }), sql.build(h.id, ' in (', sql.query({
                    select: () => [f.courier],
                    from: f,
                    where: () => [f.where({ deliverStatus: DeliveryStatus.ReadyForDelivery })]
                }), ')')]
            }), ') result ) result');
    }
})
export class InRouteHelpers extends IdEntity {
    async helper() {
        return remult.repo(Helpers).findId(this.id);
    }
    async showHistory(ui: UITools) {
        let h = await this.helper();
        const settings = new GridSettings(remult.repo(HelperCommunicationHistory), {
            numOfColumnsInGrid: 6,
            knowTotalRows: true,
            rowButtons: [
                {
                    name: getLang().editComment,
                    click: async (r) => {
                        ui.inputAreaDialog({
                            title: 'ערוך הערה',
                            fields: [r.$.message],
                            ok: async () => await r.save(),
                            cancel: () => r._.undoChanges()
                        });
                    },
                    visible: r => r.createUser.isCurrentUser()
                }
            ],

            columnSettings: hist => [hist.createDate, hist.message, hist.createUser],

            where: () => ({ volunteer: h }),
            orderBy: { createDate: "desc" },
            rowsInPage: 25

        })
        await ui.gridDialog({
            title: 'היסטוריה עבור ' + this.name,
            buttons: [{
                text: 'הוסף',
                click: async () => {

                    await this.addCommunication(ui, () => settings.reloadData());
                }
            }],
            settings
        });
        this._.reload();
    }
    async addCommunication(ui: UITools, reload: () => void) {
        (await this.helper()).addCommunicationHistoryDialog(ui, "", () => {
            this._.reload();
            reload();
        });
    }

    async showAssignment(ui: UITools) {
        let h = await remult.repo(Helpers).findId(this.id);
        await ui.helperAssignment(h);
        this._.reload();

    }
    @Field({ translation: l => l.volunteerName })
    name: string;
    relativeDate(val: Date) {
        return relativeDateName( { d: val });
    }
    @Field<InRouteHelpers, Date>({
        displayValue: (e, val) => e.relativeDate(val),
        caption: "שיוך ראשון"
    })
    minAssignDate: Date;
    @Field<InRouteHelpers, Date>({
        displayValue: (e, val) => e.relativeDate(val),
        caption: " תקשורת אחרונה"
    })
    lastCommunicationDate: Date;
    @Field({ caption: "תקשורת אחרונה" })
    lastComment: string;
    @Field({ caption: "תקשורת אחרונה על ידי" })
    lastCommunicationUser: string;
    @Field<InRouteHelpers, Date>({
        displayValue: (e, val) => e.relativeDate(val),
        caption: 'כניסה אחרונה למערכת'
    })
    lastSignInDate: Date;
    @Field({ translation: l => l.delveriesInProgress })
    @DataControl({ width: '100' })
    deliveriesInProgress: number;
    @Field<InRouteHelpers, Date>({
        displayValue: (e, val) => e.relativeDate(val),
        caption: " שיוך אחרון"
    })
    maxAssignDate: Date;
    @Field<InRouteHelpers, Date>({
        displayValue: (e, val) => e.relativeDate(val),
        caption: 'תאריך איסוף מוצלח אחרון'
    })
    lastCompletedDelivery: Date;
    @Field({ caption: "איסופים מוצלחים" })
    @DataControl({ width: '100' })
    completedDeliveries: number;
    @Field({ caption: 'ראה את השיוך הראשון' })
    seenFirstAssign: boolean;
    @Field({ caption: 'הערה פנימית' })
    internalComment: string;
    @Field({ caption: 'ארגון' })
    company: string;
    @Fields.dateOnly({
        caption: 'מוקפא עד לתאריך',
    })
    frozenTill: Date;

}


@Entity<HelperCommunicationHistory>('HelperCommunicationHistory', {
    allowApiInsert: Roles.distCenterAdmin,
    allowApiRead: Roles.distCenterAdmin,
    allowApiUpdate: Roles.distCenterAdmin,
    defaultOrderBy: { createDate: "desc" },

    saving: async (self) => {
        if (self.isNew()) {
            self.createDate = new Date();
            self.createUser = (await remult.context.getCurrentUser());
        }
    }
})
export class HelperCommunicationHistory extends IdEntity {
    @ChangeDateColumn({ translation: l => l.when })
    createDate: Date;
    @Field({ translation: l => l.createUser })
    @DataControl({ width: '150' })
    createUser: HelpersBase;
    @DataControl({ width: '100' })
    @Field({ translation: l => l.volunteer })
    volunteer: HelpersBase;
    @Field()
    family: string;
    @Field({ allowApiUpdate: false })
    eventId: string;
    @Field({
        translation: l => l.message,
        customInput: c => c.textArea(),
        width: '200'
    })
    message: string;
    @Field({ allowApiUpdate: false })
    apiResponse: any;

    @Field()
    @DataControl({ width: '100' })
    phone: string;
    @Field({ allowApiUpdate: false })
    @DataControl({
        width: '70px'
    })
    incoming: boolean = false;
    @Field({ allowApiUpdate: false })
    automaticAction: string;

    @Field({ translation: l => l.done })
    handled: boolean = false;

}
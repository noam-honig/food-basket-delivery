import { IdEntity, Remult, Entity, FieldMetadata } from "remult";
import { Roles } from "../auth/roles";
import { DateTimeColumn, relativeDateName, ChangeDateColumn } from "../model-shared/types";
import { SqlBuilder, SqlFor } from "../model-shared/SqlBuilder";
import { getLang } from "../sites/sites";
import { Helpers, HelpersBase } from "../helpers/helpers";
import { ActiveFamilyDeliveries, MessageStatus, FamilyDeliveries } from "../families/FamilyDeliveries";
import { DeliveryStatus } from "../families/DeliveryStatus";
import { HelperAssignmentComponent } from "../helper-assignment/helper-assignment.component";
import { GridDialogComponent } from "../grid-dialog/grid-dialog.component";
import { EditCommentDialogComponent } from "../edit-comment-dialog/edit-comment-dialog.component";
import { use, Field } from "../translate";

import { DataControl, GridSettings, openDialog } from "@remult/angular";
import { DateOnlyField } from "remult/src/remult3";

@Entity<InRouteHelpers>({
    key: 'in-route-helpers',
    allowApiRead: Roles.admin,
    defaultOrderBy: (self) => self.minAssignDate
},
    (options, remult) => options.dbName = async (self) => {
        let sql = new SqlBuilder(remult);

        let f = SqlFor( remult.repo(ActiveFamilyDeliveries));
        let history = SqlFor( remult.repo(FamilyDeliveries));
        let com = SqlFor( remult.repo(HelperCommunicationHistory));
        let h = SqlFor( remult.repo(Helpers));
        let h2 = SqlFor( remult.repo(Helpers));
        let helperFamilies = (where: () => any[]) => {
            return {
                from: f,
                where: () => [remult.filterCenterAllowedForUser(f.distributionCenter), sql.eq(f.courier, h.id), ...where()]
            }
        }
        let comInnerSelect = (col: FieldMetadata, toCol: FieldMetadata) => {
            return sql.innerSelect({
                select: () => [col],
                from: com,
                where: () => [sql.eq(com.volunteer, h.id), sql.build(com.comment, ' not like \'%Link%\'')],
                orderBy: [{ field: com.createDate, isDescending: true }]
            }, toCol)
        }
        let comHelperInnerSelect = (toCol: FieldMetadata) => {
            return sql.innerSelect({
                select: () => [h2.name],
                from: com,
                innerJoin: () => [{ to: h2, on: () => [sql.eq(com.createUser, h2.id)] }],
                where: () => [sql.eq(com.volunteer, h.id), sql.build(com.comment, ' not like \'%Link%\'')],
                orderBy: [{ field: com.createDate, isDescending: true }]
            }, toCol)
        }
        return sql.build('(select *,',
            sql.case([{ when: [sql.build(self.lastSignInDate, ' is null or ', self.lastSignInDate, '<', self.minAssignDate)], then: false }], true)
            , ' ', self.seenFirstAssign
            ,

            ' from (', sql.query({
                select: () => [h.id, h.name, h.lastSignInDate, h.smsDate, h.internalComment, h.company, h.frozenTill,
                sql.countDistinctInnerSelect(f.family, helperFamilies(() => [f.deliverStatus.isEqualTo(DeliveryStatus.ReadyForDelivery)]), self.deliveriesInProgress)
                    , sql.minInnerSelect(f.courierAssingTime, helperFamilies(() => [f.deliverStatus.isEqualTo(DeliveryStatus.ReadyForDelivery)]), self.minAssignDate)
                    , sql.maxInnerSelect(f.courierAssingTime, helperFamilies(() => [f.deliverStatus.isEqualTo(DeliveryStatus.ReadyForDelivery)]), self.maxAssignDate)
                    , sql.maxInnerSelect(f.deliveryStatusDate, helperFamilies(() => [DeliveryStatus.isSuccess(f.deliverStatus)]), self.lastCompletedDelivery)
                    , comInnerSelect(com.createDate, self.lastCommunicationDate)
                    , comInnerSelect(com.comment, self.lastComment)
                    , sql.countDistinctInnerSelect(history.family, { from: history, where: () => [sql.eq(history.courier, h.id), DeliveryStatus.isSuccess(history.deliverStatus)] }, self.completedDeliveries)
                    , comHelperInnerSelect(self.lastCommunicationUser)
                ],

                from: h,
                where: () => [h.archive.isEqualTo(false), sql.build(h.id, ' in (', sql.query({
                    select: () => [f.courier],
                    from: f,
                    where: () => [f.deliverStatus.isEqualTo(DeliveryStatus.ReadyForDelivery)]
                }), ')')]
            }), ') result ) result');
    }
)
export class InRouteHelpers extends IdEntity {
    async helper() {
        return this. remult.repo(Helpers).findId(this.id);
    }
    async showHistory() {
        let h = await this.helper();
        await openDialog(GridDialogComponent, gridDialog => gridDialog.args = {
            title: 'היסטוריה עבור ' + this.name,
            buttons: [{
                text: 'הוסף',
                click: async () => {

                    await this.addCommunication(() => gridDialog.args.settings.reloadData());
                }
            }],
            settings: new GridSettings(this. remult.repo(HelperCommunicationHistory), {
                numOfColumnsInGrid: 6,
                knowTotalRows: true,
                rowButtons: [
                    {
                        name: getLang(this.remult).editComment,
                        click: async (r) => {
                            await openDialog(EditCommentDialogComponent, inputArea => inputArea.args = {
                                title: 'הוסף הערה',

                                save: async (comment) => {
                                    r.comment = comment;
                                    await r.save();
                                },
                                comment: r.comment


                            });
                        },
                        visible: r => r.createUser.isCurrentUser()
                    }
                ],

                columnSettings: hist => [hist.createDate, hist.comment, hist.createUser],

                where: hist => hist.volunteer.isEqualTo(h),
                orderBy: fd => fd.createDate.descending(),
                rowsInPage: 25

            })
        });
        this._.reload();
    }
    async addCommunication(reload: () => void) {

        await openDialog(EditCommentDialogComponent, inputArea => inputArea.args = {
            title: 'הוסף תכתובת',

            save: async (comment) => {
                let hist = this. remult.repo(HelperCommunicationHistory).create();
                hist.volunteer = await this.helper();
                hist.comment = comment;
                await hist.save();
                this._.reload();
                reload();
            },
            comment: ''
        });
    }

    async showAssignment() {
        let h = await this. remult.repo(Helpers).findId(this.id);
        await openDialog(
            HelperAssignmentComponent, s => s.argsHelper = h);
        this._.reload();

    }
    @Field({ translation: l => l.volunteerName })
    name: string;
    relativeDate(val: Date) {
        return relativeDateName(this.remult, { d: val });
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
    @DateOnlyField({
        caption: 'מוקפא עד לתאריך',
    })
    frozenTill: Date;

    constructor(private remult: Remult) {
        super();
    }
}


@Entity<HelperCommunicationHistory>({
    key: 'HelperCommunicationHistory',
    allowApiInsert: Roles.distCenterAdmin,
    allowApiRead: Roles.distCenterAdmin,
    allowApiUpdate: Roles.distCenterAdmin,
    saving: (self) => {
        if (self.isNew()) {
            self.createDate = new Date();
            self.createUser = self.remult.currentUser;
        }
    }
})
export class HelperCommunicationHistory extends IdEntity {
    @ChangeDateColumn({ translation: l => l.createDate })
    createDate: Date;
    @Field({ translation: l => l.createUser })
    createUser: HelpersBase;
    @Field({ translation: l => l.volunteer })
    volunteer: HelpersBase;
    @Field({
        caption: "הערה",
    })
    @DataControl({ width: '400' })
    comment: string;

    constructor(private remult: Remult) {
        super()
    }

}
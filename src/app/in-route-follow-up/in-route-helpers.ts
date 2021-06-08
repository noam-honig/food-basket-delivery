import { IdEntity, Context, Entity, FieldDefinitions } from "@remult/core";
import { Roles } from "../auth/roles";
import { getSettings } from "../manage/ApplicationSettings";
import { SqlBuilder, DateTimeColumn, relativeDateName, ChangeDateColumn, SqlFor } from "../model-shared/types";
import { getLang } from "../sites/sites";
import { Helpers, HelperId, currentUser, HelpersBase } from "../helpers/helpers";
import { ActiveFamilyDeliveries, MessageStatus, FamilyDeliveries } from "../families/FamilyDeliveries";
import { DeliveryStatus } from "../families/DeliveryStatus";
import { HelperAssignmentComponent } from "../helper-assignment/helper-assignment.component";
import { GridDialogComponent } from "../grid-dialog/grid-dialog.component";
import { InputAreaComponent } from "../select-popup/input-area/input-area.component";
import { EditCommentDialogComponent } from "../edit-comment-dialog/edit-comment-dialog.component";
import { use, Field } from "../translate";
import { filterCenterAllowedForUser } from "../manage/distribution-centers";
import { DataControl, GridSettings, openDialog } from "@remult/angular";
import { DateOnlyField } from "@remult/core/src/remult3";

@Entity<InRouteHelpers>({
    key: 'in-route-helpers',
    allowApiRead: Roles.admin,
    defaultOrderBy: (self) => self.minAssignDate,
    dbName: (self, context) => {
        let sql = new SqlBuilder();

        let f = SqlFor(context.for(ActiveFamilyDeliveries));
        let history = SqlFor(context.for(FamilyDeliveries));
        let com = SqlFor(context.for(HelperCommunicationHistory));
        let h = SqlFor(context.for(Helpers));
        let h2 = SqlFor(context.for(Helpers));
        let helperFamilies = (where: () => any[]) => {
            return {
                from: f,
                where: () => [filterCenterAllowedForUser(f.distributionCenter, context), sql.eq(f.courier, h.id), ...where()]
            }
        }
        let comInnerSelect = (col: FieldDefinitions, toCol: FieldDefinitions) => {
            return sql.innerSelect({
                select: () => [col],
                from: com,
                where: () => [sql.eq(com.volunteer, h.id), sql.build(com.comment, ' not like \'%Link%\'')],
                orderBy: [{ field: com.createDate, isDescending: true }]
            }, toCol)
        }
        let comHelperInnerSelect = (toCol: FieldDefinitions) => {
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
})
export class InRouteHelpers extends IdEntity {
    async helper() {
        return this.context.for(Helpers).getCachedByIdAsync(this.id);
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
            settings: new GridSettings(this.context.for(HelperCommunicationHistory), {
                numOfColumnsInGrid: 6,
                knowTotalRows: true,
                rowButtons: [
                    {
                        name: getLang(this.context).editComment,
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
                let hist = this.context.for(HelperCommunicationHistory).create();
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
        let h = await this.context.for(Helpers).findId(this.id);
        await openDialog(
            HelperAssignmentComponent, s => s.argsHelper = h);
        this._.reload();

    }
    @Field({ translation: l => l.volunteerName })
    name: string;
    relativeDate(val: Date) {
        return relativeDateName(this.context, { d: val });
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

    constructor(private context: Context) {
        super();
    }
}


@Entity<HelperCommunicationHistory>({
    key: 'HelperCommunicationHistory',
    allowApiInsert: Roles.admin,
    allowApiRead: Roles.admin,
    allowApiUpdate: Roles.admin,
    saving: (self) => {
        if (self.isNew()) {
            self.createDate = new Date();
            self.createUser = self.context.get(currentUser);
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

    constructor(private context: Context) {
        super()
    }

}
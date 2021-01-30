import { IdEntity, StringColumn, Context, EntityClass, NumberColumn, Column, BoolColumn } from "@remult/core";
import { Roles } from "../auth/roles";
import { getSettings } from "../manage/ApplicationSettings";
import { SqlBuilder, DateTimeColumn, changeDate } from "../model-shared/types";
import { getLang } from "../sites/sites";
import { Helpers, HelperIdReadonly, HelperId } from "../helpers/helpers";
import { ActiveFamilyDeliveries, MessageStatus, MessageStatusColumn, FamilyDeliveries } from "../families/FamilyDeliveries";
import { DeliveryStatus } from "../families/DeliveryStatus";
import { HelperAssignmentComponent } from "../helper-assignment/helper-assignment.component";
import { GridDialogComponent } from "../grid-dialog/grid-dialog.component";
import { InputAreaComponent } from "../select-popup/input-area/input-area.component";
import { EditCommentDialogComponent } from "../edit-comment-dialog/edit-comment-dialog.component";

@EntityClass
export class InRouteHelpers extends IdEntity {
    async showHistory() {
        await this.context.openDialog(GridDialogComponent, gridDialog => gridDialog.args = {
            title: 'היסטוריה עבור ' + this.name.value,
            buttons: [{
                text: 'הוסף',
                click: async () => {

                    await this.addCommunication(() => gridDialog.args.settings.reloadData());
                }
            }],
            settings: this.context.for(HelperCommunicationHistory).gridSettings({
                numOfColumnsInGrid: 6,
                knowTotalRows: true,
                rowButtons: [
                    {
                        name: getLang(this.context).editComment,
                        click: async (r) => {
                            await this.context.openDialog(EditCommentDialogComponent, inputArea => inputArea.args = {
                                title: 'הוסף הערה',

                                save: async (comment) => {
                                    r.comment.value = comment;
                                    await r.save();
                                },
                                comment: r.comment.value


                            });
                        },
                        visible: r => r.createUser.value == this.context.user.id
                    }
                ],

                columnSettings: hist => [hist.createDate, hist.comment, hist.createUser],

                where: hist => hist.volunteer.isEqualTo(this.id),
                orderBy: fd => [{ column: fd.createDate, descending: true }],
                rowsInPage: 25

            })
        });
        this.reload();
    }
    async addCommunication(reload: () => void) {
        await this.context.openDialog(EditCommentDialogComponent, inputArea => inputArea.args = {
            title: 'הוסף תכתובת',

            save: async (comment) => {
                let hist = this.context.for(HelperCommunicationHistory).create();
                hist.volunteer.value = this.id.value;
                hist.comment.value = comment;
                await hist.save();
                this.reload();
                reload();
            },
            comment: ''
        });
    }

    async showAssignment() {
        let h = await this.context.for(Helpers).findId(this.id);
        await this.context.openDialog(
            HelperAssignmentComponent, s => s.argsHelper = h);
        this.reload();

    }
    name = new StringColumn(getLang(this.context).volunteerName);

    minAssignDate = new myDateTime(this.context, "שיוך ראשון");
    lastCommunicationDate = new myDateTime(this.context, " תקשורת אחרונה");
    lastComment = new StringColumn("תקשורת אחרונה");
    lastSignInDate = new myDateTime(this.context, 'כניסה אחרונה למערכת');
    deliveriesInProgress = new NumberColumn({ caption: getLang(this.context).delveriesInProgress, dataControlSettings: () => ({ width: '100' }) });
    maxAssignDate = new myDateTime(this.context, " שיוך אחרון");
    lastCompletedDelivery = new myDateTime(this.context, 'תאריך איסוף מוצלח אחרון');
    completedDeliveries = new NumberColumn({ caption: "איסופים מוצלחים", dataControlSettings: () => ({ width: '100' }) });
    seenFirstAssign = new BoolColumn('ראה את השיוך הראשון');
    constructor(private context: Context) {
        super({
            name: 'in-route-helpers',
            allowApiRead: Roles.admin,
            defaultOrderBy: () => [this.minAssignDate],
            dbName: () => {
                let sql = new SqlBuilder();
                let f = context.for(ActiveFamilyDeliveries).create();
                let history = context.for(FamilyDeliveries).create();
                let com = context.for(HelperCommunicationHistory).create();
                let h = context.for(Helpers).create();
                let helperFamilies = (where: () => any[]) => {
                    return {
                        from: f,
                        where: () => [f.distributionCenter.isAllowedForUser(), sql.eq(f.courier, h.id), ...where()]
                    }
                }
                let comInnerSelect = (col: Column, toCol: Column) => {
                    return sql.innerSelect({
                        select: () => [col],
                        from: com,
                        where: () => [sql.eq(com.volunteer, h.id), sql.build(com.comment, ' not like \'%Link%\'')],
                        orderBy: [{ column: com.createDate, descending: true }]
                    }, toCol)
                }
                return sql.build('(select *,',
                    sql.case([{ when: [sql.build(this.lastSignInDate, ' is null or ', this.lastSignInDate, '<', this.minAssignDate)], then: false }], true)
                    , ' ', this.seenFirstAssign
                    ,

                    ' from (', sql.query({
                        select: () => [h.id, h.name, h.lastSignInDate, h.smsDate,
                        sql.countDistinctInnerSelect(f.family, helperFamilies(() => [f.deliverStatus.isEqualTo(DeliveryStatus.ReadyForDelivery)]), this.deliveriesInProgress)
                            , sql.minInnerSelect(f.courierAssingTime, helperFamilies(() => [f.deliverStatus.isEqualTo(DeliveryStatus.ReadyForDelivery)]), this.minAssignDate)
                            , sql.maxInnerSelect(f.courierAssingTime, helperFamilies(() => [f.deliverStatus.isEqualTo(DeliveryStatus.ReadyForDelivery)]), this.maxAssignDate)
                            , sql.maxInnerSelect(f.deliveryStatusDate, helperFamilies(() => [f.deliverStatus.isSuccess()]), this.lastCompletedDelivery)
                            , comInnerSelect(com.createDate, this.lastCommunicationDate)
                            , comInnerSelect(com.comment, this.lastComment)
                            , sql.countDistinctInnerSelect(history.family, { from: history, where: () => [sql.eq(history.courier, h.id), history.deliverStatus.isSuccess()] }, this.completedDeliveries)
                        ],

                        from: h,
                        where: () => [h.archive.isEqualTo(false), sql.build(h.id, ' in (', sql.query({
                            select: () => [f.courier],
                            from: f,
                            where: () => [f.deliverStatus.isEqualTo(DeliveryStatus.ReadyForDelivery)]
                        }), ')')]
                    }), ') result ) result');
            }
        });
    }
}
class myDateTime extends DateTimeColumn {
    constructor(context: Context, caption: string) {
        super({ caption: caption, dataControlSettings: () => ({ width: '120', getValue: () => this.relativeDateName(context) }) });
    }

}

@EntityClass
export class HelperCommunicationHistory extends IdEntity {
    createDate = new changeDate({ caption: getLang(this.context).createDate });
    createUser = new HelperIdReadonly(this.context, { caption: getLang(this.context).createUser });
    volunteer = new HelperId(this.context, { caption: getLang(this.context).volunteer });
    comment = new StringColumn({
        caption: "הערה",
        dataControlSettings: () => ({
            width: '400'
        })
    });
    constructor(private context: Context) {
        super({
            name: 'HelperCommunicationHistory',
            allowApiInsert: Roles.admin,
            allowApiRead: Roles.admin,
            allowApiUpdate: Roles.admin,
            saving: () => {
                if (this.isNew()) {
                    this.createDate.value = new Date();
                    this.createUser.value = this.context.user.id;
                }
            }

        })
    }

}
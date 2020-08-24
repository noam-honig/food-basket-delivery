import { IdEntity, StringColumn, Context, EntityClass, NumberColumn } from "@remult/core";
import { Roles } from "../auth/roles";
import { getSettings } from "../manage/ApplicationSettings";
import { SqlBuilder, DateTimeColumn, changeDate } from "../model-shared/types";
import { getLang } from "../sites/sites";
import { Helpers, HelperIdReadonly, HelperId } from "../helpers/helpers";
import { ActiveFamilyDeliveries, MessageStatus, MessageStatusColumn } from "../families/FamilyDeliveries";
import { DeliveryStatus } from "../families/DeliveryStatus";
import { HelperAssignmentComponent } from "../helper-assignment/helper-assignment.component";
import { GridDialogComponent } from "../grid-dialog/grid-dialog.component";
import { InputAreaComponent } from "../select-popup/input-area/input-area.component";
import { EditCommentDialogComponent } from "../edit-comment-dialog/edit-comment-dialog.component";

@EntityClass
export class InRouteHelpers extends IdEntity {
    showHistory() {
        this.context.openDialog(GridDialogComponent, gridDialog => gridDialog.args = {
            title: 'היסטוריה עבור ' + this.name.value,
            buttons: [{
                text: 'הוסף',
                click: async () => {

                    await this.context.openDialog(EditCommentDialogComponent, inputArea => inputArea.args = {
                        title: 'הוסף הערה',

                        save: async (comment) => {
                            let hist = this.context.for(HelperCommunicationHistory).create();
                            hist.volunteer.value = this.id.value;
                            hist.comment.value = comment;
                            await hist.save();
                            gridDialog.args.settings.getRecords();
                        },
                        comment: ''


                    });
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
                get: {
                    where: hist => hist.volunteer.isEqualTo(this.id),
                    orderBy: fd => [{ column: fd.createDate, descending: true }],
                    limit: 25
                }
            })
        });
    }
    async showAssignment() {
        let h = await this.context.for(Helpers).findId(this.id);
        this.context.openDialog(
            HelperAssignmentComponent, s => s.argsHelper = h)
    }
    name = new StringColumn(getLang(this.context).volunteerName);
    messageStatus = new MessageStatusColumn();
    minDeliveryCreateDate = new DateTimeColumn("תאריך הקצאה");
    lastCommunicationDate = new DateTimeColumn("תאריך תקשורת אחרונה");
    deliveriesInProgress = new NumberColumn(getLang(this.context).delveriesInProgress);
    maxAssignDate = new DateTimeColumn("תאריך שיוך אחרון");
    constructor(private context: Context) {
        super({
            name: 'in-route-helpers',
            allowApiRead: Roles.admin,
            dbName: () => {
                let sql = new SqlBuilder();
                let f = context.for(ActiveFamilyDeliveries).create();
                let com = context.for(HelperCommunicationHistory).create();
                let h = context.for(Helpers).create();
                let helperFamilies = (where: () => any[]) => {
                    return {
                        from: f,
                        where: () => [f.distributionCenter.isAllowedForUser(), sql.eq(f.courier, h.id), ...where()]
                    }
                }
                return sql.build('(select *,',
                    sql.case([{
                        when: [sql.gt(h.lastSignInDate, this.maxAssignDate)],
                        then: MessageStatus.opened.id
                    }, {
                        when: [sql.gt(h.smsDate, this.maxAssignDate)],
                        then: MessageStatus.notOpened.id
                    }
                    ], MessageStatus.notSent.id), ' ', this.messageStatus
                    , ' from (', sql.query({
                        select: () => [h.id, h.name, h.lastSignInDate, h.smsDate,
                        sql.countDistinctInnerSelect(f.family, helperFamilies(() => [f.deliverStatus.isEqualTo(DeliveryStatus.ReadyForDelivery)]), this.deliveriesInProgress)
                            , sql.minInnerSelect(f.createDate, helperFamilies(() => [f.deliverStatus.isEqualTo(DeliveryStatus.ReadyForDelivery)]), this.minDeliveryCreateDate)
                            , sql.maxInnerSelect(f.courierAssingTime, helperFamilies(() => [f.deliverStatus.isEqualTo(DeliveryStatus.ReadyForDelivery)]), this.maxAssignDate)
                            , sql.maxInnerSelect(com.createDate, { from: com, where: () => [sql.eq(com.volunteer, h.id)] }, this.lastCommunicationDate)
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
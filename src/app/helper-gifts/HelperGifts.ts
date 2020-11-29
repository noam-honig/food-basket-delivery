import { BoolColumn, BusyService, Context, DateColumn, EntityClass, IdEntity, NumberColumn, ServerFunction, StringColumn } from "@remult/core";
import { Roles } from "../auth/roles";
import { changeDate, wasChanged } from "../model-shared/types";
import { getLang } from "../sites/sites";
import { HelperId, HelperIdReadonly, Helpers } from "../helpers/helpers";
import { DialogService } from "../select-popup/dialog";
import { GridDialogComponent } from "../grid-dialog/grid-dialog.component";
import { ApplicationSettings } from "../manage/ApplicationSettings";

@EntityClass
export class HelperGifts extends IdEntity {

    giftURL = new StringColumn(getLang(this.context).myGiftsURL,{allowApiUpdate:Roles.admin});
    dateCreated = new changeDate({ caption: getLang(this.context).createDate });
    userCreated = new HelperIdReadonly(this.context, { caption: getLang(this.context).createUser });
    assignedToHelper = new HelperId(this.context, { caption: getLang(this.context).volunteer, allowApiUpdate: Roles.admin });
    dateGranted = new changeDate({ caption: getLang(this.context).dateGranted });
    assignedByUser = new HelperIdReadonly(this.context, { caption: getLang(this.context).assignUser });
    wasConsumed = new BoolColumn('מתנה מומשה');

    constructor(private context: Context) {
        super({
            name: "HelperGifts",
            allowApiRead: context.isSignedIn(),
            allowApiUpdate: Roles.admin,
            allowApiInsert: Roles.admin,
            apiDataFilter:()=>{
                if (context.isAllowed(Roles.admin))
                    return undefined;
                return this.assignedToHelper.isEqualTo(context.user.id);
            },
            saving: () => {
                if (this.isNew()) {
                    this.dateCreated.value = new Date();
                    this.userCreated.value = this.context.user.id;                  
                }
                else {
                    if (wasChanged(this.giftURL)){
                        this.giftURL.validationError = 'ניתן לקלוט מתנות חדשות .לא ניתן לשנות לינק למתנה';
                        return;
                    }
                    if (wasChanged(this.assignedToHelper)&& this.wasConsumed.value != false) {
                        this.giftURL.validationError = 'אין לשייך מתנה שכבר מומשה למתנדב אחר';
                        return;
                    }
                    if (wasChanged(this.assignedToHelper)&& this.assignedToHelper.value != '') {
                        this.dateGranted.value = new Date();
                        this.assignedByUser.value = this.context.user.id;
                    }
                }
            }
        });
    }
    @ServerFunction({allowed:Roles.admin})
    static async  assignGift(helperId:string,context?:Context){
        let g = await context.for(HelperGifts).findFirst(g=>g.assignedToHelper.isEqualTo(''));
        g.assignedToHelper.value = helperId;
        await g.save();

    }
    @ServerFunction({allowed:Roles.admin})
    static async importUrls(urls:string[],context?:Context){
        for (const url of urls) {
            let g = await context.for(HelperGifts).findFirst(g=>g.giftURL.isContains(url.trim()));
            if (!g){
                g = context.for(HelperGifts).create();
                g.giftURL.value = url;
                await g.save();
            }
        }
    }
    @ServerFunction({allowed:true})
    static async getMyPendingGiftsCount(helperId:string,context?:Context){
        let gifts = await context.for(HelperGifts).find({ where: hg => hg.assignedToHelper.isEqualTo(helperId).and(hg.wasConsumed.isEqualTo(false))});
        return gifts.length;
    }

    @ServerFunction({allowed:true})
    static async getMyFirstGiftURL(helperId:string,context?:Context) {
        let gifts = await context.for(HelperGifts).find({ where: hg => hg.assignedToHelper.isEqualTo(helperId).and(hg.wasConsumed.isEqualTo(false)), 
            limit: 100 });
        if (gifts == null) 
            return null;
        return gifts[0].giftURL.value;
    }
};

export async function showHelperGifts(helperId: string, context: Context, settings: ApplicationSettings, dialog: DialogService, busy: BusyService): Promise<void> {
    let helperName = await (await context.for(Helpers).findFirst(h=>h.id.isEqualTo(helperId))).name.value;
    context.openDialog(GridDialogComponent, x => x.args = {
        title: 'משאלות למתנדב:' + helperName,

        buttons: [{
            text: 'הענק משאלה',
            click: async x => {
              if (context.isAllowed(Roles.admin))
                await HelperGifts.assignGift(helperId, context);
              //this.refresh();
            },
        }],
        settings: this.context.for(HelperGifts).gridSettings({
            allowUpdate: true, 
            get: {
                limit: 50,
                where: hg => hg.assignedToHelper.isEqualTo(helperId)
            },
            knowTotalRows: true,
            numOfColumnsInGrid: 10,
            columnSettings: hg => [
                { width: '300', column: hg.giftURL },
                { width: '50', column: hg.wasConsumed},
                hg.dateGranted,
                hg.assignedByUser
            ],
        })
    });
}




import { Column, Context, Entity, IdEntity, ServerFunction } from "@remult/core";
import { BusyService, DataControl, GridSettings, openDialog } from '@remult/angular';
import { Roles } from "../auth/roles";
import { ChangeDateColumn } from "../model-shared/types";
import { getLang } from "../sites/sites";
import { HelperId, HelperIdUtils, Helpers } from "../helpers/helpers";
import { DialogService } from "../select-popup/dialog";
import { GridDialogComponent } from "../grid-dialog/grid-dialog.component";
import { ApplicationSettings } from "../manage/ApplicationSettings";
import { MyGiftsDialogComponent } from "./my-gifts-dialog.component";
import { use } from "../translate";

@Entity<HelperGifts>({
    key: "HelperGifts",
    allowApiRead: context => context.isSignedIn(),
    allowApiUpdate: context => context.isSignedIn(),
    allowApiInsert: Roles.admin,
    apiDataFilter: (self, context) => {
        if (context.isAllowed(Roles.admin))
            return undefined;
        return self.assignedToHelper.isEqualTo(HelperId.currentUser(context));
    },
    saving: (self) => {
        if (self.isNew()) {
            self.dateCreated = new Date();
            self.userCreated = HelperId.currentUser(self.context);
        }
        else {
            if (self.$.giftURL.wasChanged()) {
                self.$.giftURL.error = 'ניתן לקלוט מתנות חדשות .לא ניתן לשנות לינק למתנה';
                return;
            }
            if (self.$.assignedToHelper.wasChanged() && self.wasConsumed != false) {
                self.$.giftURL.error = 'אין לשייך מתנה שכבר מומשה למתנדב אחר';
                return;
            }
            if (self.$.assignedToHelper.wasChanged() && self.assignedToHelper.isNotEmpty()) {
                self.dateGranted = new Date();
                self.assignedByUser = HelperId.currentUser(self.context);
                self.wasConsumed = false;
                self.wasClicked = false;
            }
            if (self.$.wasConsumed.wasChanged()) {
                self.wasClicked = self.wasConsumed;
            }
        }
    }
})
export class HelperGifts extends IdEntity {

    @Column({ caption: use.language.myGiftsURL, allowApiUpdate: Roles.admin })
    giftURL: string;
    @ChangeDateColumn({ caption: use.language.createDate })
    dateCreated: Date;
    @Column({ caption: use.language.createUser, allowApiUpdate: false })
    userCreated: HelperId;
    @Column({ caption: use.language.volunteer, allowApiUpdate: Roles.admin })
    @DataControl<HelperGifts, HelperId>({
        click: (x, col) => {
            HelperIdUtils.showSelectDialog(col, { includeFrozen: true });
        }
    })
    assignedToHelper: HelperId;
    @ChangeDateColumn({ caption: use.language.dateGranted })
    dateGranted: Date;
    @Column({ caption: use.language.assignUser, allowApiUpdate: false })
    assignedByUser: HelperId;
    @Column({ caption: 'מתנה מומשה' })
    wasConsumed: boolean;
    @Column()
    wasClicked: boolean;


    constructor(private context: Context) {
        super();
    }
    @ServerFunction({ allowed: Roles.admin })
    static async assignGift(helperId: string, context?: Context) {
        if (await context.for(HelperGifts).count(g => g.assignedToHelper.isEqualTo(HelperId.currentUser(context))) > 0) {
            let g = await context.for(HelperGifts).findFirst(g => g.assignedToHelper.isEqualTo(HelperId.currentUser(context)));
            if (g) {
                g.assignedToHelper = new HelperId(helperId, context);
                g.wasConsumed = false;
                g.wasClicked = false;
                await g.save();
                return;
            }
        }

        throw new Error('אין מתנות לחלוקה');
    }
    @ServerFunction({ allowed: Roles.admin })
    static async importUrls(urls: string[], context?: Context) {
        for (const url of urls) {
            let g = await context.for(HelperGifts).findFirst(g => g.giftURL.contains(url.trim()));
            if (!g) {
                g = context.for(HelperGifts).create();
                g.giftURL = url;
                await g.save();
            }
        }
    }
    @ServerFunction({ allowed: true })
    static async getMyPendingGiftsCount(helperId: string, context?: Context) {
        let gifts = await context.for(HelperGifts).find({ where: hg => hg.assignedToHelper.isEqualTo(new HelperId(helperId, context)).and(hg.wasConsumed.isEqualTo(false)) });
        return gifts.length;
    }

    @ServerFunction({ allowed: true })
    static async getMyFirstGiftURL(helperId: string, context?: Context) {
        let gifts = await context.for(HelperGifts).find({
            where: hg => hg.assignedToHelper.isEqualTo(new HelperId(helperId, context)).and(hg.wasConsumed.isEqualTo(false)),
            limit: 100
        });
        if (gifts == null)
            return null;
        return gifts[0].giftURL;
    }
};





export async function showUsersGifts(helperId: string, context: Context, settings: ApplicationSettings, dialog: DialogService, busy: BusyService): Promise<void> {
    openDialog(MyGiftsDialogComponent, x => x.args = {
        helperId: helperId
    });
}

export async function showHelperGifts(helperId: string, context: Context, settings: ApplicationSettings, dialog: DialogService, busy: BusyService): Promise<void> {
    let hid = new HelperId(helperId, context);
    await hid.waitLoad();
    let helperName = hid.item.name;
    openDialog(GridDialogComponent, x => x.args = {
        title: 'משאלות למתנדב:' + helperName,

        buttons: [{
            text: 'הענק משאלה',
            visible: () => context.isAllowed(Roles.admin),
            click: async x => {
                await HelperGifts.assignGift(helperId);
                //this.refresh();
            },
        }],
        settings: new GridSettings(context.for(HelperGifts), {
            allowUpdate: true,

            rowsInPage: 50,
            where: hg => hg.assignedToHelper.isEqualTo(hid)
            ,
            knowTotalRows: true,
            numOfColumnsInGrid: 10,
            columnSettings: hg => [
                { width: '300', column: hg.giftURL },
                { width: '50', column: hg.wasConsumed },
                hg.dateGranted,
                hg.assignedByUser
            ],
        })
    });
}




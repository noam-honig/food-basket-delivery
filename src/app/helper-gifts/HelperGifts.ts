import { Context, Entity, IdEntity, BackendMethod } from "@remult/core";
import { BusyService, DataControl, GridSettings, openDialog } from '@remult/angular';
import { Roles } from "../auth/roles";
import { ChangeDateColumn } from "../model-shared/types";
import { getLang } from "../sites/sites";
import { HelperId, Helpers, HelpersBase } from "../helpers/helpers";
import { DialogService } from "../select-popup/dialog";
import { GridDialogComponent } from "../grid-dialog/grid-dialog.component";
import { ApplicationSettings } from "../manage/ApplicationSettings";
import { MyGiftsDialogComponent } from "./my-gifts-dialog.component";
import { Field, use } from "../translate";
import { u } from "../model-shared/UberContext";

@Entity<HelperGifts>({
    key: "HelperGifts",
    allowApiRead: context => context.isSignedIn(),
    allowApiUpdate: context => context.isSignedIn(),
    allowApiInsert: Roles.admin,
    apiDataFilter: (self, context) => {
        if (context.isAllowed(Roles.admin))
            return undefined;
        return self.assignedToHelper.isEqualTo(u(context).currentUser);
    },
    saving: (self) => {
        if (self.isNew()) {
            self.dateCreated = new Date();
            self.userCreated = u(self.context).currentUser;
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
            if (self.$.assignedToHelper.wasChanged() && self.assignedToHelper) {
                self.dateGranted = new Date();
                self.assignedByUser = u(self.context).currentUser;
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

    @Field({ translation: l => l.myGiftsURL, allowApiUpdate: Roles.admin })
    giftURL: string;
    @ChangeDateColumn({ translation: l => l.createDate })
    dateCreated: Date;
    @Field({ translation: l => l.createUser, allowApiUpdate: false })
    userCreated: Helpers;
    @Field({ translation: l => l.volunteer, allowApiUpdate: Roles.admin })
    @DataControl<HelperGifts, Helpers>({
        click: (x, col) => {
            HelpersBase.showSelectDialog(col, { includeFrozen: true });
        }
    })
    assignedToHelper: HelpersBase;
    @ChangeDateColumn({ translation: l => l.dateGranted })
    dateGranted: Date;
    @Field({ translation: l => l.assignUser, allowApiUpdate: false })
    assignedByUser: Helpers;
    @Field({ caption: 'מתנה מומשה' })
    wasConsumed: boolean;
    @Field()
    wasClicked: boolean;


    constructor(private context: Context) {
        super();
    }
    @BackendMethod({ allowed: Roles.admin })
    static async assignGift(helperId: string, context?: Context) {
        let helper = await u(context).helperFromJson(helperId);
        if (await context.for(HelperGifts).count(g => g.assignedToHelper.isEqualTo(u(context).currentUser)) > 0) {
            let g = await context.for(HelperGifts).findFirst(g => g.assignedToHelper.isEqualTo(u(context).currentUser));
            if (g) {
                g.assignedToHelper = helper;
                g.wasConsumed = false;
                g.wasClicked = false;
                await g.save();
                return;
            }
        }

        throw new Error('אין מתנות לחלוקה');
    }
    @BackendMethod({ allowed: Roles.admin })
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
    @BackendMethod({ allowed: true })
    static async getMyPendingGiftsCount(h: Helpers, context?: Context) {
        let gifts = await context.for(HelperGifts).find({ where: hg => hg.assignedToHelper.isEqualTo(h).and(hg.wasConsumed.isEqualTo(false)) });
        return gifts.length;
    }

    @BackendMethod({ allowed: true })
    static async getMyFirstGiftURL(h: HelpersBase, context?: Context) {
        let gifts = await context.for(HelperGifts).find({
            where: hg => hg.assignedToHelper.isEqualTo(h).and(hg.wasConsumed.isEqualTo(false)),
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

export async function showHelperGifts(hid: Helpers, context: Context, settings: ApplicationSettings, dialog: DialogService, busy: BusyService): Promise<void> {


    let helperName = hid.name;
    openDialog(GridDialogComponent, x => x.args = {
        title: 'משאלות למתנדב:' + helperName,

        buttons: [{
            text: 'הענק משאלה',
            visible: () => context.isAllowed(Roles.admin),
            click: async x => {
                await HelperGifts.assignGift(hid.id);
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
                { width: '300', field: hg.giftURL },
                { width: '50', field: hg.wasConsumed },
                hg.dateGranted,
                hg.assignedByUser
            ],
        })
    });
}




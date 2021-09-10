import { Remult, Entity, IdEntity, BackendMethod, Allow } from "remult";
import { BusyService, DataControl, GridSettings, openDialog } from '@remult/angular';
import { Roles } from "../auth/roles";
import { ChangeDateColumn } from "../model-shared/types";
import { Helpers, HelpersBase } from "../helpers/helpers";
import { DialogService } from "../select-popup/dialog";
import { GridDialogComponent } from "../grid-dialog/grid-dialog.component";
import { ApplicationSettings } from "../manage/ApplicationSettings";
import { MyGiftsDialogComponent } from "./my-gifts-dialog.component";
import { Field, use } from "../translate";

@Entity<HelperGifts>("HelperGifts", {
    allowApiRead: Allow.authenticated,
    allowApiUpdate: Allow.authenticated,
    allowApiInsert: Roles.admin
}, (options, remult) => {
    options.apiPrefilter = (self) => {
        if (remult.isAllowed(Roles.admin))
            return undefined;
        return self.assignedToHelper.isEqualTo(remult.currentUser);
    };
    options.saving = (self) => {
        if (self.isNew()) {
            self.dateCreated = new Date();
            self.userCreated = remult.currentUser;
        }
        else {
            if (self.$.giftURL.valueChanged()) {
                self.$.giftURL.error = 'ניתן לקלוט מתנות חדשות .לא ניתן לשנות לינק למתנה';
                return;
            }
            if (self.$.assignedToHelper.valueChanged() && self.wasConsumed != false) {
                self.$.giftURL.error = 'אין לשייך מתנה שכבר מומשה למתנדב אחר';
                return;
            }
            if (self.$.assignedToHelper.valueChanged() && self.assignedToHelper) {
                self.dateGranted = new Date();
                self.assignedByUser = remult.currentUser;
                self.wasConsumed = false;
                self.wasClicked = false;
            }
            if (self.$.wasConsumed.valueChanged()) {
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



    @BackendMethod({ allowed: Roles.admin })
    static async assignGift(helperId: string, remult?: Remult) {
        let helper = await remult.repo(Helpers).findId(helperId);
        if (await remult.repo(HelperGifts).count(g => g.assignedToHelper.isEqualTo(remult.currentUser)) > 0) {
            let g = await remult.repo(HelperGifts).findFirst(g => g.assignedToHelper.isEqualTo(remult.currentUser));
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
    static async importUrls(urls: string[], remult?: Remult) {
        for (const url of urls) {
            let g = await remult.repo(HelperGifts).findFirst(g => g.giftURL.contains(url.trim()));
            if (!g) {
                g = remult.repo(HelperGifts).create();
                g.giftURL = url;
                await g.save();
            }
        }
    }
    @BackendMethod({ allowed: true })
    static async getMyPendingGiftsCount(h: Helpers, remult?: Remult) {
        let gifts = await remult.repo(HelperGifts).find({ where: hg => hg.assignedToHelper.isEqualTo(h).and(hg.wasConsumed.isEqualTo(false)) });
        return gifts.length;
    }

    @BackendMethod({ allowed: true })
    static async getMyFirstGiftURL(h: HelpersBase, remult?: Remult) {
        let gifts = await remult.repo(HelperGifts).find({
            where: hg => hg.assignedToHelper.isEqualTo(h).and(hg.wasConsumed.isEqualTo(false)),
            limit: 100
        });
        if (gifts == null)
            return null;
        return gifts[0].giftURL;
    }
};





export async function showUsersGifts(helperId: string, remult: Remult, settings: ApplicationSettings, dialog: DialogService, busy: BusyService): Promise<void> {
    openDialog(MyGiftsDialogComponent, x => x.args = {
        helperId: helperId
    });
}

export async function showHelperGifts(hid: Helpers, remult: Remult, settings: ApplicationSettings, dialog: DialogService, busy: BusyService): Promise<void> {


    let helperName = hid.name;
    openDialog(GridDialogComponent, x => x.args = {
        title: 'משאלות למתנדב:' + helperName,

        buttons: [{
            text: 'הענק משאלה',
            visible: () => remult.isAllowed(Roles.admin),
            click: async x => {
                await HelperGifts.assignGift(hid.id);
                //this.refresh();
            },
        }],
        settings: new GridSettings(remult.repo(HelperGifts), {
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




import { BoolColumn, Context, DateColumn, EntityClass, IdEntity, NumberColumn, StringColumn } from "@remult/core";
import { Roles } from "../auth/roles";
import { changeDate } from "../model-shared/types";
import { getLang } from "../sites/sites";
import { HelperId, HelperIdReadonly } from "./helpers";

@EntityClass
export class HelperGifts extends IdEntity {

    //giftURL = new StringColumn(getLang(this.context).myGiftsURL);
    assignedToHelper = new HelperId(this.context, { caption: getLang(this.context).volunteer, allowApiUpdate: Roles.admin });
    dateGranted = new changeDate({ caption: getLang(this.context).dateGranted });
    assignedByUser = new HelperIdReadonly(this.context, { caption: getLang(this.context).createUser });
    wasConsumed = new BoolColumn();

    constructor(private context: Context) {
        super({
            name: "HelperGifts",
            allowApiRead: context.isSignedIn(),
            allowApiCRUD: Roles.admin,
            saving: () => {
                if (this.wasChanged() && this.assignedToHelper.value != this.assignedToHelper.originalValue && this.assignedToHelper.value != null) {
                    this.dateGranted.value = new Date();
                    this.assignedByUser.value = this.context.user.id;
                }
            }
        });
    }
}
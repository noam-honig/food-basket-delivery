import { IdEntity, Id, StringColumn } from "../model-shared/types";
import { EntityClass, Context, ContextEntityOptions } from "../shared/context";
import { HelperId } from "../helpers/helpers";



@EntityClass
export class WeeklyFamilies extends IdEntity<WeeklyFamilyId>{

    constructor(protected context: Context, options?: ContextEntityOptions) {
        super(new WeeklyFamilyId(), options ? options : {
            name: 'weeklyFamilies',
            allowApiCRUD: false

        });
    }

    codeName = new StringColumn({ caption: 'שם קוד' });
    assignedHelper = new HelperId(this.context, { caption: 'אחראית' });
}


@EntityClass
export class WeeklyFullFamilyInfo extends WeeklyFamilies {
    name = new StringColumn({ caption: 'שם' });
    constructor(context: Context) {
        super(context, {
            name: 'weeklyFullFamilies',
            dbName: () => 'weeklyFamilies',
            allowApiRead:  context.info.weeklyFamilyVolunteer,
            allowApiUpdate: context.info.weeklyFamilyVolunteer,
            allowApiDelete: false,
            allowApiInsert: context.info.weeklyFamilyAdmin,
            apiDataFilter: () => {
                if (context.info.weeklyFamilyAdmin)
                    return undefined;
                return this.assignedHelper.isEqualTo(context.info.helperId)
            }
        });
    }

    
}


export class WeeklyFamilyId extends Id {

}
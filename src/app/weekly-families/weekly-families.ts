import { IdEntity, Id, StringColumn } from "../model-shared/types";
import { EntityClass, Context } from "../shared/context";
import { HelperId } from "../helpers/helpers";


@EntityClass
export class WeeklyFamilies extends IdEntity<WeeklyFamilyId>{
    
    constructor(private context:Context) {
        super(new WeeklyFamilyId(), {
            name: 'weeklyFamilies',
            allowApiCRUD: true
        });
    }
    name = new StringColumn({ caption: 'שם' });
    codeName = new StringColumn({ caption: 'שם קוד' });
    assignedHelper = new HelperId(this.context,{caption:'אחראית'});
}



export class WeeklyFamilyId extends Id {

}
import { IdEntity, Id, StringColumn, NumberColumn } from "../model-shared/types";
import { EntityClass } from "../shared/context";
import { BoolColumn } from "radweb";
@EntityClass
export class Products extends IdEntity<ProductId>{
    name = new StringColumn({ caption: 'שם' });
    order = new NumberColumn({ caption: 'סדר', value: 50, dbName: 'ord2' });
    missing = new BoolColumn({ caption: 'חסר' });
    constructor() {
        super(new ProductId(), {
            name: 'products',
            allowApiCRUD: true,
        });
    }
}


export class ProductId extends Id {

}
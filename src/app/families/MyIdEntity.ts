import { Fields, EntityBase } from 'remult';
import * as uuid from 'uuid';

export class MyIdEntity extends EntityBase {
  @Fields.string({
    defaultValue: ()=>uuid(),
    allowApiUpdate: false
  })
  id!: string;
}

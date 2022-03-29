
import { Entity, Remult, EntityBase } from 'remult';
import { Roles } from '../auth/roles';
import { Field, Fields } from '../translate';
@Entity('ApplicationImages', {
  allowApiRead: Roles.admin,
  allowApiUpdate: Roles.admin
})
export class ApplicationImages extends EntityBase {
  @Fields.integer()
  id: number;
  @Field({ caption: "איקון דף base64" })
  base64Icon: string;
  @Field({ caption: "איקון דף הבית בטלפון base64" })
  base64PhoneHomeImage: string;


  static async getAsync(remult: Remult): Promise<ApplicationImages> {
    return remult.repo(ApplicationImages).findFirst(undefined);
  }
}
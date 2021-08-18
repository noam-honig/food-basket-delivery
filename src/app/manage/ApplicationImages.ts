
import { Entity, Remult, EntityBase, Field, IntegerField } from 'remult';
import { Roles } from '../auth/roles';
@Entity({
  key: 'ApplicationImages',
  allowApiRead: Roles.admin,
  allowApiUpdate: Roles.admin
})
export class ApplicationImages extends EntityBase {
  @IntegerField()
  id: number;
  @Field({ caption: "איקון דף base64" })
  base64Icon: string;
  @Field({ caption: "איקון דף הבית בטלפון base64" })
  base64PhoneHomeImage: string;


  static async getAsync(context: Remult): Promise<ApplicationImages> {
    return context.repo(ApplicationImages).findFirst(undefined);
  }
}
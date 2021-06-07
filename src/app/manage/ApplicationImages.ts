
import { Entity, Context, EntityBase, Field } from '@remult/core';
import { Roles } from '../auth/roles';
@Entity({
  key: 'ApplicationImages',
  allowApiRead: Roles.admin,
  allowApiUpdate: Roles.admin
})
export class ApplicationImages extends EntityBase {
  @Field()
  id: number;
  @Field({ caption: "איקון דף base64" })
  base64Icon: string;
  @Field({ caption: "איקון דף הבית בטלפון base64" })
  base64PhoneHomeImage: string;


  static async getAsync(context: Context): Promise<ApplicationImages> {
    return context.for(ApplicationImages).findFirst(undefined);
  }
}
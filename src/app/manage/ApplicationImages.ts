
import { Entity, Context, EntityBase, Column } from '@remult/core';
import { Roles } from '../auth/roles';
@Entity({
  key: 'ApplicationImages',
  allowApiRead: Roles.admin,
  allowApiUpdate: Roles.admin
})
export class ApplicationImages extends EntityBase {
  @Column()
  id: number;
  @Column({ caption: "איקון דף base64" })
  base64Icon: string;
  @Column({ caption: "איקון דף הבית בטלפון base64" })
  base64PhoneHomeImage: string;


  static get(context: Context) {
    context.for(ApplicationImages).lookupId(1);
  }
  static async getAsync(context: Context): Promise<ApplicationImages> {
    return context.for(ApplicationImages).findFirst(undefined);
  }
}
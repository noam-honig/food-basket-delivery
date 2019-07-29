import { StringColumn, NumberColumn } from 'radweb';
import { ContextEntity, Context, EntityClass } from 'radweb';
import { Roles, RolesGroup } from '../auth/roles';
@EntityClass
export class ApplicationImages extends ContextEntity<number>  {
  id = new NumberColumn();
  base64Icon = new StringColumn("איקון דף base64");
  base64PhoneHomeImage = new StringColumn("איקון דף הבית בטלפון base64");
  constructor(context: Context) {
    super({
      name: 'ApplicationImages',
      allowApiRead: context.hasRole(...RolesGroup.anyAdmin),
      allowApiUpdate: context.hasRole(...RolesGroup.anyAdmin)
    });
  }

  static get(context: Context) {
    context.for(ApplicationImages).lookup(app => app.id.isEqualTo(1));
  }
  static async getAsync(context: Context): Promise<ApplicationImages> {
    return context.for(ApplicationImages).findFirst(undefined);
  }
}
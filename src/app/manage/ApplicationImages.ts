import { StringColumn, NumberColumn } from 'radweb';
import { ContextEntity, Context } from '../shared/context';
import { ApiAccess } from '../server/api-interfaces';

export class ApplicationImages extends ContextEntity<number>  {
  id = new NumberColumn();
  base64Icon = new StringColumn("איקון דף base64");
  base64PhoneHomeImage = new StringColumn("איקון דף הבית בטלפון base64");
  constructor() {
    super(ApplicationImages, {
      apiAccess: ApiAccess.AdminOnly,
      name: 'ApplicationImages',
      allowApiUpdate: true
    });
    this.initColumns(this.id);
  }

  static get(context: Context) {
    context.for(ApplicationImages).lookup(app => app.id.isEqualTo(1));
  }
  static async getAsync(context: Context): Promise<ApplicationImages> {
    return context.for(ApplicationImages).findFirst(undefined);
  }
}
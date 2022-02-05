import { Entity, Field, IdEntity } from 'remult';
import { Roles } from '../auth/roles';
import { ReportInfo } from './print-volunteer.component';



@Entity("stickerInfo", {
  allowApiCrud: Roles.admin
})
export class VolunteerReportInfo extends IdEntity {
  @Field()
  key: string;
  @Field({ allowNull: true })
  info: ReportInfo;

}

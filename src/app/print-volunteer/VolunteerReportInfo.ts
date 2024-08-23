import { Entity, IdEntity } from 'remult'
import { Roles } from '../auth/roles'
import { Fields } from '../translate'
import { ReportInfo } from './print-volunteer.component'

@Entity('stickerInfo', {
  allowApiCrud: Roles.admin
})
export class VolunteerReportInfo extends IdEntity {
  @Fields.string()
  key: string
  @Fields.object({ allowNull: true })
  info: ReportInfo
}

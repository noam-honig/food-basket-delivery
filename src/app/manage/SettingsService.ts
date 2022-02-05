import { Remult } from 'remult';
import { DeliveryStatus } from "../families/DeliveryStatus";
import { translationConfig } from "../translate";
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Sites } from '../sites/sites';
import { ApplicationSettings, setSettingsForSite, PhoneOption, RemovedFromListExcelImportStrategy } from './ApplicationSettings';



@Injectable()
export class SettingsService {
  constructor(private remult: Remult, private http: HttpClient) {
  }
  instance: ApplicationSettings;
  async init() {

    this.instance = await ApplicationSettings.getAsync(this.remult);
    setSettingsForSite(Sites.getValidSchemaFromContext(this.remult), this.instance);

    translationConfig.forWho = () => this.instance.forWho;
    DeliveryStatus.usingSelfPickupModule = this.instance.usingSelfPickupModule;
    (await import('../helpers/helpers')).Helpers.usingCompanyModule = this.instance.showCompanies;

    PhoneOption.assignerOrOrg.name = this.instance.lang.assignerOrOrg;
    PhoneOption.familyHelpPhone.name = this.instance.lang.familyHelpPhone;
    PhoneOption.familySource.name = this.instance.lang.familySourcePhone;
    PhoneOption.otherPhone.name = this.instance.lang.otherPhone;

    RemovedFromListExcelImportStrategy.displayAsError.caption = this.instance.lang.RemovedFromListExcelImportStrategy_displayAsError;
    RemovedFromListExcelImportStrategy.showInUpdate.caption = this.instance.lang.RemovedFromListExcelImportStrategy_showInUpdate;
    RemovedFromListExcelImportStrategy.ignore.caption = this.instance.lang.RemovedFromListExcelImportStrategy_ignore;

    this.instance.updateStaticTexts();



  }

}

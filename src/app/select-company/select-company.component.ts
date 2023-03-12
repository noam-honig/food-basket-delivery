import { Component, OnInit } from '@angular/core'
import { MatDialogRef } from '@angular/material/dialog'
import { ApplicationSettings } from '../manage/ApplicationSettings'
import { SelectCompanyController } from './select-company.controller'

@Component({
  selector: 'app-select-company',
  templateUrl: './select-company.component.html',
  styleUrls: ['./select-company.component.scss']
})
export class SelectCompanyComponent implements OnInit {
  searchString: string = ''
  cities: string[] = []
  public argOnSelect: (selectedValue: string) => void

  constructor(
    private dialogRef: MatDialogRef<any>,
    public settings: ApplicationSettings
  ) {}
  clearCity() {
    this.select('')
  }
  select(city: string) {
    this.argOnSelect(city)
    this.dialogRef.close()
  }

  async ngOnInit() {
    this.cities = await SelectCompanyController.getCompanies()
  }
  matches(s: string) {
    if (this.searchString == '') return true
    return s.indexOf(s) >= 0
  }

  selectFirst() {
    for (const c of this.cities) {
      if (this.matches(c)) {
        this.select(c)
        return
      }
    }
  }
}

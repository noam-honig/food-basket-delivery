import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core'
import { ElementProps } from '../print-stickers/VolunteerReportDefs'

@Component({
  selector: 'app-properties-editor',
  templateUrl: './properties-editor.component.html',
  styleUrls: ['./properties-editor.component.scss']
})
export class PropertiesEditorComponent implements OnInit {
  constructor() {}

  ngOnInit(): void {}
  toggleEditing() {
    this.editing = !this.editing
    this.editingChange.emit(this.editing)
  }
  print() {
    window.print()
  }

  @Input()
  editing: boolean
  @Output()
  editingChange = new EventEmitter<boolean>()

  @Input()
  props: ElementProps

  @Output()
  change = new EventEmitter()
  save() {
    this.change.emit()
  }
}

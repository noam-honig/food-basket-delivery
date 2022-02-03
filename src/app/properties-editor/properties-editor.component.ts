import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FieldMetadata, FieldsMetadata, IdEntity, Remult } from 'remult';
import { ClassType } from 'remult/classType';
import { InputTypes } from 'remult/inputTypes';
import { use } from '../translate';

@Component({
  selector: 'app-properties-editor',
  templateUrl: './properties-editor.component.html',
  styleUrls: ['./properties-editor.component.scss']
})
export class PropertiesEditorComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {

  }
  toggleEditing() {
    this.editing = !this.editing;
    this.editingChange.emit(this.editing);
  }
  print() {
    window.print();
  }

  @Input()
  editing: boolean;
  @Output()
  editingChange = new EventEmitter<boolean>();

  @Input()
  props: ElementProps;

  @Output()
  change = new EventEmitter();
  save() {
    this.change.emit();
  }



}

export interface ElementProps {
  caption: string,
  props: Property[],
  values?: {},
  control?: Control;
}
export class Property {
  constructor(public key: string, public caption: string, public inputType: string, public setStyle?: (value: string, style: any) => void) {
    if (!setStyle) {
      this.setStyle = (val, style) => style[key] = val;
    }
  }
}
export class SizeProperty extends Property {
  constructor(public key: string, public caption: string, uom = 'mm') {
    super(key, caption, InputTypes.number, (val, style) => style[key] = val + uom);
  }
}

export interface Control {
  fieldKey: string,
  propertyValues?: any
}

export function getMarginsH() {
  return [
    new SizeProperty('padding-left', use.language.leftPadding),
    new SizeProperty('padding-right', use.language.rightPadding)
  ]
}
export function getMarginsV() {
  return [
    new SizeProperty('padding-top', use.language.topPadding),
    new SizeProperty('padding-bottom', use.language.bottomPadding)
  ]
}

export class OptionalFieldsDefinition<dataArgs> {

  fields: {
    key: string,
    caption: string,
    build: (args: dataArgs) => string
  }[] = [];
  constructor(public remult: Remult) {

  }
  addFields<entityType extends IdEntity>(entity: ClassType<entityType>, extractFromArgs: (x: dataArgs) => entityType, getFields: (entity: FieldsMetadata<entityType>) => FieldMetadata[]) {
    let repo = this.remult.repo(entity);
    let meta = repo.metadata;
    for (const field of getFields(meta.fields)) {
      let key = meta.key + "_" + field.key;
      this.fields.push({
        key,
        caption: field.caption,
        build: (args) => extractFromArgs(args).$.find(field).displayValue
      })
    }
  }
  buildObject(id: string, args: dataArgs) {
    let r = { id };
    for (const field of this.fields) {
      r[field.key] = field.build(args);
    }
    return r;
  }
}
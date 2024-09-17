import {
  Component,
  ComponentFactoryResolver,
  Input,
  ViewChild,
  ViewContainerRef,
  OnChanges,
  ComponentRef
} from '@angular/core'
import { ErrorStateMatcher } from '@angular/material/core'
import { FloatLabelType } from '@angular/material/form-field'
import { Entity, ValueListItem, FieldMetadata, FieldRef } from 'remult'

import {
  CustomDataComponent,
  DataControlSettings,
  decorateDataSettings,
  FieldCollection,
  getFieldDefinition
} from '../../../interfaces'
import { CommonUIElementsPluginsService } from '../CommonUIElementsPluginsService'

@Component({
  selector: 'data-control',
  templateUrl: './data-control2.component.html',
  styleUrls: ['./data-control2.component.scss']
})
export class DataControl2Component implements OnChanges {
  @Input() map!: DataControlSettings
  @Input() set field(value: FieldMetadata | FieldRef) {
    this.map = {
      field: value
    }
    decorateDataSettings(this.map.field!, this.map)
    this.settings.augment(this.plugin.dataControlAugmenter, this.map)
    this.initCustomComponent()
  }
  constructor(
    private plugin: CommonUIElementsPluginsService,
    private componentFactoryResolver: ComponentFactoryResolver
  ) {}
  @ViewChild('theId', { read: ViewContainerRef, static: true })
  theId!: ViewContainerRef
  done = false
  componentRef: ComponentRef<CustomDataComponent<any>>
  initCustomComponent() {
    if (this.map?.customComponent?.component) {
      if (!this.done) {
        this.done = true
        const componentFactory =
          this.componentFactoryResolver.resolveComponentFactory<CustomDataComponent>(
            this.map.customComponent.component
          )

        const viewContainerRef = this.theId
        viewContainerRef.clear()

        this.componentRef =
          viewContainerRef.createComponent<CustomDataComponent>(
            componentFactory
          )
      }
      if (this.componentRef) {
        this.componentRef.instance.args = {
          fieldRef: this._getColumn() as FieldRef,
          settings: this.map,
          args: this.map.customComponent.args
        }
      }
    }
  }

  @Input() record: any
  @Input() notReadonly = false
  @Input() settings: FieldCollection = new FieldCollection(
    undefined!,
    () => true,
    undefined!,
    undefined!,
    () => undefined!
  )
  showDescription() {
    return (this.map.field && this.map.getValue) || !this._getEditable()
  }
  getDropDown(): ValueListItem[] {
    return this.map.valueList as ValueListItem[]
  }
  showClick() {
    if (!this.map.click) return false
    if (!this._getEditable()) return false
    if (this.map.allowClick === undefined) {
      return true
    }
    return this.settings.allowClick(this.map, this.record)
  }
  click() {
    if (this.showClick()) this.settings._click(this.map, this.record)
  }
  getClickIcon() {
    if (this.map.clickIcon) return this.map.clickIcon
    return 'keyboard_arrow_down'
  }
  dataControlStyle() {
    return this.settings.__dataControlStyle(this.map)
  }
  dummy = { inputValue: '' }
  _getColumn() {
    if (!this.map.field) return this.dummy
    return this.settings.__getColumn(this.map, this.record)
  }
  _getEditable() {
    if (this.notReadonly) return true
    return this.settings._getEditable(this.map, this.record)
  }
  ngOnChanges(): void {
    this.initCustomComponent()
  }
  isSelect(): boolean {
    if (this.map.valueList && this._getEditable()) return true
    return false
  }
  showTextBox() {
    return !this.isSelect() && !this.showCheckbox()
  }
  showCheckbox() {
    return this.settings._getColDataType(this.map) == 'checkbox'
  }
  getError() {
    return this.settings._getError(this.map, this.record)
  }
  getStyle() {
    if (this.showDescription()) {
      if (this.map.hideDataOnInput || !this._getEditable()) {
        return { display: 'none' }
      }
      return { width: '50px' }
    }
    return {}
  }
  getFloatLabel(): FloatLabelType {
    if (this.showDescription()) {
      if (this.settings._getColDisplayValue(this.map, this.record))
        return 'always'
    }
    return 'auto'
  }

  ngErrorStateMatches = new (class extends ErrorStateMatcher {
    constructor(public parent: DataControl2Component) {
      super()
    }
    override isErrorState() {
      return !!this.parent.getError()
    }
  })(this)
}

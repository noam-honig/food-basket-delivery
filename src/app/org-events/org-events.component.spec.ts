import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OrgEventsComponent } from './org-events.component';

describe('OrgEventsComponent', () => {
  let component: OrgEventsComponent;
  let fixture: ComponentFixture<OrgEventsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ OrgEventsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(OrgEventsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChangeUser } from './change-user';

describe('ChangeUser', () => {
  let component: ChangeUser;
  let fixture: ComponentFixture<ChangeUser>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChangeUser],
    }).compileComponents();

    fixture = TestBed.createComponent(ChangeUser);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

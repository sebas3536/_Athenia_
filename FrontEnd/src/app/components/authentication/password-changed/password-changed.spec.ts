import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PasswordChanged } from './password-changed';

describe('PasswordChanged', () => {
  let component: PasswordChanged;
  let fixture: ComponentFixture<PasswordChanged>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PasswordChanged]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PasswordChanged);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

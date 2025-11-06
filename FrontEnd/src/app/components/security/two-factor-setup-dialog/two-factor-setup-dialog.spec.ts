import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TwoFactorSetupDialog } from './two-factor-setup-dialog';

describe('TwoFactorSetupDialog', () => {
  let component: TwoFactorSetupDialog;
  let fixture: ComponentFixture<TwoFactorSetupDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TwoFactorSetupDialog]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TwoFactorSetupDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

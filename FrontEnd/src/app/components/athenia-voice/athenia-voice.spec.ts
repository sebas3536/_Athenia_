import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AtheniaVoice } from './athenia-voice';

describe('AtheniaVoice', () => {
  let component: AtheniaVoice;
  let fixture: ComponentFixture<AtheniaVoice>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AtheniaVoice]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AtheniaVoice);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

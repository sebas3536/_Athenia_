import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AtheniaChat } from './athenia-chat';

describe('AtheniaChat', () => {
  let component: AtheniaChat;
  let fixture: ComponentFixture<AtheniaChat>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AtheniaChat]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AtheniaChat);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { ProfileCardComponent } from './profile-card';

describe('ProfileCardComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ProfileCardComponent],
      providers: [provideRouter([])],
    });
  });

  function create(
    inputs: {
      name?: string;
      photoDataUrl?: string | null;
      percentage?: number;
    } = {},
  ) {
    const fixture = TestBed.createComponent(ProfileCardComponent);
    fixture.componentRef.setInput('name', inputs.name ?? 'Ada Lovelace');
    fixture.componentRef.setInput('photoDataUrl', inputs.photoDataUrl ?? null);
    fixture.componentRef.setInput('percentage', inputs.percentage ?? 50);
    fixture.componentRef.setInput('completedTopics', 4);
    fixture.componentRef.setInput('totalTopics', 8);
    fixture.componentRef.setInput('streak', 3);
    fixture.componentRef.setInput('unlockedAchievements', 2);
    fixture.componentRef.setInput('totalAchievements', 10);
    fixture.detectChanges();
    return fixture;
  }

  it('builds initials and clamps the completion ring', () => {
    const low = create({ name: '  ada   lovelace  ', percentage: -20 });
    expect(low.componentInstance.initials()).toBe('AL');
    expect(low.componentInstance.clampedPercentage()).toBe(0);
    expect(low.nativeElement.textContent).toContain('AL');

    const full = create({ name: 'Roshan', percentage: 149.4 });
    expect(full.componentInstance.initials()).toBe('R');
    expect(full.componentInstance.clampedPercentage()).toBe(100);
    expect(full.componentInstance.ringOffset()).toBe(0);

    const half = create({ percentage: 50 });
    expect(half.componentInstance.ringOffset()).toBeCloseTo(2 * Math.PI * 54 * 0.5);
    expect(half.nativeElement.textContent).toContain('4 / 8 topics');
    expect(half.nativeElement.textContent).toContain('3 day streak');
  });

  it('shows a photo when one is stored', () => {
    const fixture = create({ photoDataUrl: 'data:image/png;base64,abc' });
    const image = fixture.nativeElement.querySelector('img') as HTMLImageElement;
    expect(image.getAttribute('src')).toBe('data:image/png;base64,abc');
    expect(image.getAttribute('alt')).toBe('Ada Lovelace profile photo');
  });
});

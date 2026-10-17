import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { IconComponent } from './icon';

describe('IconComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [IconComponent] });
  });

  it('renders a known icon and an empty graphic for an unknown name', () => {
    const fixture = TestBed.createComponent(IconComponent);
    fixture.componentRef.setInput('name', 'target');
    fixture.componentRef.setInput('filled', true);
    fixture.detectChanges();
    const svg = fixture.nativeElement.querySelector('svg') as SVGElement;
    expect(svg.innerHTML).toContain('<circle');
    expect(svg.classList.contains('icon--filled')).toBe(true);
    expect(svg.getAttribute('aria-hidden')).toBe('true');

    fixture.componentRef.setInput('name', 'does-not-exist');
    fixture.componentRef.setInput('filled', false);
    fixture.detectChanges();
    expect(svg.innerHTML).toBe('');
    expect(svg.classList.contains('icon--filled')).toBe(false);
  });
});

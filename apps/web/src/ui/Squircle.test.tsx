import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Squircle } from './Squircle.js';

describe('Squircle', () => {
  it('renders children and applies a border-radius', () => {
    render(<Squircle radius={24} data-testid="sq"><span>hi</span></Squircle>);
    const el = screen.getByTestId('sq');
    expect(el).toHaveTextContent('hi');
    expect(el.style.borderRadius).toBe('24px');
  });
});

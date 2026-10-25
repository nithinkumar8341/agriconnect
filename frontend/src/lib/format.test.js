import { formatQuantity, formatRupees, formatTime, localName } from './format.js';

describe('format helpers', () => {
  it('shows paise as rupees, with paise only when there are any', () => {
    expect(formatRupees(2500, 'en')).toBe('₹25');
    expect(formatRupees(2550, 'en')).toBe('₹25.50');
    expect(formatRupees(1000000, 'en')).toBe('₹10,000');
  });

  it('keeps quantities short', () => {
    expect(formatQuantity(2.5, 'en')).toBe('2.5');
    expect(formatQuantity(1 / 3, 'en')).toBe('0.33');
  });

  it('formats a cutoff time for each language', () => {
    expect(formatTime('18:00', 'en')).toMatch(/6:00\s?pm/i);
    expect(formatTime('18:00', 'te')).toMatch(/6:00/);
  });

  it('picks the name in the current language, falling back to English', () => {
    const names = { en: 'Tomato', te: 'టమాటా', hi: 'टमाटर' };
    expect(localName(names, 'te')).toBe('టమాటా');
    expect(localName(names, 'fr')).toBe('Tomato');
    expect(localName(undefined, 'te')).toBe('');
  });
});

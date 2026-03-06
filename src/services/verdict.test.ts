import { describe, it, expect } from 'vitest';
import { generateVerdict, formatVerdict } from './verdict';

describe('generateVerdict', () => {
  it('returns Grass Toucher for $0-1', () => {
    const verdict = generateVerdict(0.5, 1);
    expect(verdict.emoji).toBe('🌱');
    expect(verdict.title).toBe('Grass Toucher');
  });

  it('returns Baby Degen for $1-10', () => {
    const verdict = generateVerdict(5, 3);
    expect(verdict.emoji).toBe('🐣');
    expect(verdict.title).toBe('Baby Degen');
  });

  it('returns Casual Burner for $10-50', () => {
    const verdict = generateVerdict(25, 10);
    expect(verdict.emoji).toBe('🔥');
    expect(verdict.title).toBe('Casual Burner');
  });

  it('returns Gas Guzzler for $50-100', () => {
    const verdict = generateVerdict(75, 20);
    expect(verdict.emoji).toBe('💸');
    expect(verdict.title).toBe('Gas Guzzler');
  });

  it('returns Road Trip Burner for $100-500', () => {
    const verdict = generateVerdict(300, 50);
    expect(verdict.emoji).toBe('🚗');
    expect(verdict.title).toBe('Road Trip Burner');
  });

  it('returns Frequent Flyer for $500-1000', () => {
    const verdict = generateVerdict(750, 100);
    expect(verdict.emoji).toBe('✈️');
    expect(verdict.title).toBe('Frequent Flyer');
  });

  it('returns Used Car Money for $1000-5000', () => {
    const verdict = generateVerdict(3000, 200);
    expect(verdict.emoji).toBe('🏍️');
    expect(verdict.title).toBe('Used Car Money');
  });

  it('returns Car Payment Champion for $5000-10000', () => {
    const verdict = generateVerdict(7500, 300);
    expect(verdict.emoji).toBe('🚙');
    expect(verdict.title).toBe('Car Payment Champion');
  });

  it('returns Gas Royalty for $500000+', () => {
    const verdict = generateVerdict(1000000, 5000);
    expect(verdict.emoji).toBe('👑');
    expect(verdict.title).toBe('Gas Royalty');
  });

  it('adds transaction context for high tx count', () => {
    const verdict = generateVerdict(100, 600);
    expect(verdict.message).toContain('addicted');
  });

  it('adds transaction context for medium tx count', () => {
    const verdict = generateVerdict(100, 150);
    expect(verdict.message).toContain('clicking');
  });
});

describe('formatVerdict', () => {
  it('formats verdict with all fields', () => {
    const verdict = {
      emoji: '🔥',
      title: 'Test Title',
      message: 'Test message',
      comparison: 'test comparison'
    };
    
    const formatted = formatVerdict(verdict, 123.45);
    
    expect(formatted).toContain('🔥');
    expect(formatted).toContain('Test Title');
    expect(formatted).toContain('Test message');
    expect(formatted).toContain('$123.45');
    expect(formatted).toContain('test comparison');
  });
});

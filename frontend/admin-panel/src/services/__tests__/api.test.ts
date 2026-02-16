import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';

// Mock axios
vi.mock('axios');
const mockedAxios = vi.mocked(axios);

describe('API Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(axios).toBeDefined();
  });

  it('should create axios instance', () => {
    expect(mockedAxios.create).toBeDefined();
  });
});

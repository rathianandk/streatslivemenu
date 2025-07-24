import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

// Mock Google Maps API
global.google = {
  maps: {
    Map: jest.fn(),
    Marker: jest.fn(),
    InfoWindow: jest.fn(),
    LatLng: jest.fn(),
    event: {
      addListener: jest.fn(),
    },
  },
} as any;

test('renders sTrEATs Live app', () => {
  render(<App />);
  
  // Test for real-time control element
  const controlElement = screen.getByText(/Real-time Control/i);
  expect(controlElement).toBeInTheDocument();
});

test('renders main navigation elements', () => {
  render(<App />);
  
  // Test for main navigation elements
  const liveTracking = screen.getByText(/Live Food Trucks/i);
  expect(liveTracking).toBeInTheDocument();
});

test('renders live demo functionality', () => {
  render(<App />);
  
  // Test for demo button
  const demoButton = screen.getByText(/Start Live Demo/i);
  expect(demoButton).toBeInTheDocument();
});

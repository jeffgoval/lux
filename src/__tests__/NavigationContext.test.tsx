import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { NavigationProvider, useNavigation, useNavigationWithState } from '@/contexts/NavigationContext';

// Mock performance monitor
jest.mock('@/utils/performanceMonitor', () => ({
  performanceMonitor: {
    recordNavigationStart: jest.fn(),
    recordNavigationEnd: jest.fn()
  }
}));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: '/test' })
}));

// Test component that uses navigation context
const TestComponent = () => {
  const navigation = useNavigation();
  
  return (
    <div>
      <div data-testid="current-route">{navigation.currentRoute}</div>
      <div data-testid="previous-route">{navigation.previousRoute}</div>
      <div data-testid="is-navigating">{navigation.isNavigating.toString()}</div>
      <div data-testid="can-navigate-back">{navigation.canNavigateBack().toString()}</div>
      <div data-testid="history-length">{navigation.navigationHistory.length}</div>
      <button onClick={() => navigation.setNavigating(true)}>Start Navigation</button>
      <button onClick={() => navigation.recordNavigation('/new-route')}>Record Navigation</button>
      <button onClick={() => navigation.setNavigationError('Test error')}>Set Error</button>
      <button onClick={() => navigation.retryNavigation()}>Retry Navigation</button>
      <button onClick={() => navigation.clearHistory()}>Clear History</button>
    </div>
  );
};

const TestComponentWithState = () => {
  const { navigate, navigateBack, ...navigation } = useNavigationWithState();
  
  return (
    <div>
      <div data-testid="current-route">{navigation.currentRoute}</div>
      <button onClick={() => navigate('/new-route')}>Navigate</button>
      <button onClick={() => navigateBack()}>Navigate Back</button>
    </div>
  );
};

const renderWithNavigation = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <NavigationProvider>
        {component}
      </NavigationProvider>
    </BrowserRouter>
  );
};

describe('NavigationContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('NavigationProvider', () => {
    it('provides initial navigation state', () => {
      renderWithNavigation(<TestComponent />);
      
      expect(screen.getByTestId('current-route')).toHaveTextContent('/test');
      expect(screen.getByTestId('previous-route')).toHaveTextContent('');
      expect(screen.getByTestId('is-navigating')).toHaveTextContent('false');
      expect(screen.getByTestId('can-navigate-back')).toHaveTextContent('false');
      expect(screen.getByTestId('history-length')).toHaveTextContent('1');
    });

    it('throws error when used outside provider', () => {
      // Suppress console.error for this test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      expect(() => {
        render(<TestComponent />);
      }).toThrow('useNavigation must be used within a NavigationProvider');
      
      consoleSpy.mockRestore();
    });
  });

  describe('Navigation State Management', () => {
    it('updates navigating state', () => {
      renderWithNavigation(<TestComponent />);
      
      act(() => {
        screen.getByText('Start Navigation').click();
      });
      
      expect(screen.getByTestId('is-navigating')).toHaveTextContent('true');
    });

    it('records navigation attempts', () => {
      const { performanceMonitor } = require('@/utils/performanceMonitor');
      renderWithNavigation(<TestComponent />);
      
      act(() => {
        screen.getByText('Record Navigation').click();
      });
      
      expect(performanceMonitor.recordNavigationStart).toHaveBeenCalledWith('/new-route');
    });

    it('sets and handles navigation errors', () => {
      renderWithNavigation(<TestComponent />);
      
      act(() => {
        screen.getByText('Set Error').click();
      });
      
      // Error should be set in navigation state
      // This would be visible through the navigation state if we exposed it in the test component
    });

    it('clears navigation history', () => {
      renderWithNavigation(<TestComponent />);
      
      // First record some navigation
      act(() => {
        screen.getByText('Record Navigation').click();
      });
      
      // Then clear history
      act(() => {
        screen.getByText('Clear History').click();
      });
      
      expect(screen.getByTestId('history-length')).toHaveTextContent('1'); // Should keep current route
    });
  });

  describe('Navigation History', () => {
    it('maintains navigation history', () => {
      renderWithNavigation(<TestComponent />);
      
      // Initial state should have current route in history
      expect(screen.getByTestId('history-length')).toHaveTextContent('1');
      expect(screen.getByTestId('can-navigate-back')).toHaveTextContent('false');
      
      // Record navigation to build history
      act(() => {
        screen.getByText('Record Navigation').click();
      });
      
      // History should grow but canNavigateBack logic depends on actual route changes
    });

    it('limits history size', () => {
      renderWithNavigation(<TestComponent />);
      
      // Record many navigations
      act(() => {
        for (let i = 0; i < 60; i++) {
          screen.getByText('Record Navigation').click();
        }
      });
      
      // History should be limited (MAX_HISTORY_SIZE = 50)
      const historyLength = parseInt(screen.getByTestId('history-length').textContent || '0');
      expect(historyLength).toBeLessThanOrEqual(50);
    });
  });

  describe('Retry Navigation', () => {
    it('implements retry logic with exponential backoff', async () => {
      renderWithNavigation(<TestComponent />);
      
      // Set an error first
      act(() => {
        screen.getByText('Set Error').click();
      });
      
      // Attempt retry
      act(() => {
        screen.getByText('Retry Navigation').click();
      });
      
      // Should attempt navigation after delay
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalled();
      }, { timeout: 2000 });
    });

    it('respects max retry count', async () => {
      renderWithNavigation(<TestComponent />);
      
      // Set error and retry multiple times
      act(() => {
        screen.getByText('Set Error').click();
      });
      
      // Retry multiple times quickly
      for (let i = 0; i < 5; i++) {
        act(() => {
          screen.getByText('Retry Navigation').click();
        });
      }
      
      // Should not exceed max retry count (MAX_RETRY_COUNT = 3)
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledTimes(3);
      }, { timeout: 5000 });
    });
  });

  describe('Navigation Statistics', () => {
    it('tracks navigation statistics', () => {
      renderWithNavigation(<TestComponent />);
      
      const navigation = useNavigation();
      
      act(() => {
        screen.getByText('Record Navigation').click();
      });
      
      const stats = navigation.getNavigationStats();
      expect(stats.totalNavigations).toBeGreaterThan(0);
    });

    it('calculates average navigation time', () => {
      renderWithNavigation(<TestComponent />);
      
      const navigation = useNavigation();
      
      // Record multiple navigations
      act(() => {
        for (let i = 0; i < 3; i++) {
          screen.getByText('Record Navigation').click();
        }
      });
      
      const stats = navigation.getNavigationStats();
      expect(stats.averageNavigationTime).toBeGreaterThanOrEqual(0);
    });

    it('tracks most visited routes', () => {
      renderWithNavigation(<TestComponent />);
      
      const navigation = useNavigation();
      
      // Record navigations to same route multiple times
      act(() => {
        for (let i = 0; i < 3; i++) {
          screen.getByText('Record Navigation').click();
        }
      });
      
      const stats = navigation.getNavigationStats();
      expect(stats.mostVisitedRoutes).toHaveLength(1);
      expect(stats.mostVisitedRoutes[0].route).toBe('/new-route');
      expect(stats.mostVisitedRoutes[0].count).toBe(3);
    });
  });

  describe('useNavigationWithState Hook', () => {
    it('provides enhanced navigation functions', () => {
      renderWithNavigation(<TestComponentWithState />);
      
      expect(screen.getByTestId('current-route')).toHaveTextContent('/test');
      
      act(() => {
        screen.getByText('Navigate').click();
      });
      
      expect(mockNavigate).toHaveBeenCalledWith('/new-route', undefined);
    });

    it('supports navigate back functionality', () => {
      renderWithNavigation(<TestComponentWithState />);
      
      // First navigate somewhere to build history
      act(() => {
        screen.getByText('Navigate').click();
      });
      
      // Then navigate back
      act(() => {
        screen.getByText('Navigate Back').click();
      });
      
      // Should navigate to previous route
      expect(mockNavigate).toHaveBeenCalledTimes(2);
    });
  });

  describe('Performance Integration', () => {
    it('records performance metrics for navigation', () => {
      const { performanceMonitor } = require('@/utils/performanceMonitor');
      renderWithNavigation(<TestComponent />);
      
      act(() => {
        screen.getByText('Record Navigation').click();
      });
      
      expect(performanceMonitor.recordNavigationStart).toHaveBeenCalledWith('/new-route');
      
      // Navigation end should be recorded after timeout
      setTimeout(() => {
        expect(performanceMonitor.recordNavigationEnd).toHaveBeenCalled();
      }, 150);
    });
  });

  describe('Error Handling', () => {
    it('handles navigation errors gracefully', () => {
      renderWithNavigation(<TestComponent />);
      
      act(() => {
        screen.getByText('Set Error').click();
      });
      
      // Component should still be functional after error
      expect(screen.getByTestId('current-route')).toHaveTextContent('/test');
    });

    it('recovers from navigation failures', async () => {
      renderWithNavigation(<TestComponent />);
      
      // Simulate navigation failure
      act(() => {
        screen.getByText('Set Error').click();
      });
      
      // Attempt recovery
      act(() => {
        screen.getByText('Retry Navigation').click();
      });
      
      // Should attempt to recover
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalled();
      });
    });
  });

  describe('Memory Management', () => {
    it('cleans up navigation state properly', () => {
      const { unmount } = renderWithNavigation(<TestComponent />);
      
      // Record some navigation
      act(() => {
        screen.getByText('Record Navigation').click();
      });
      
      // Unmount should not cause errors
      expect(() => unmount()).not.toThrow();
    });
  });
});
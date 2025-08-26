// Extend Window interface for DEFLAKE package
declare global {
  interface Window {
    testContextId?: string;
    currentTestId?: string;
    scrolling?: boolean;
  }
}

export {};

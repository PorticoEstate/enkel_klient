/**
 * Initialize the Two-Phase Testing Panel
 * This script should be included on pages where you want to test the two-phase submission
 */

$(document).ready(function() {
  // Wait for FormHandler to be fully initialized
  setTimeout(function() {
    // Check if we have both FormHandler and the two-phase extension loaded
    if (typeof FormHandler !== 'undefined' && typeof FormTwoPhaseSubmitExtension !== 'undefined') {
      
      // Get the form handler instance for the first form on the page (or use a specific ID as needed)
      const formHandler = FormHandler.getInstance();
      
      if (formHandler) {
        // Create and attach the test panel
        if (typeof TwoPhaseTestPanel !== 'undefined') {
          // Set up the test panel with the form handler
          TwoPhaseTestPanel.attachTo(formHandler, {
            position: 'bottom-right',
            theme: 'light',
            autoHide: true
          });
          
          console.log('🧪 Two-Phase Test Panel initialized');
          
          // Add a console message to help developers
          console.log('💡 To manually test phases:');
          console.log('   1. Phase 1: formHandler.getExtension("twoPhaseSubmit").manualRunPhase1()');
          console.log('   2. Phase 2: formHandler.getExtension("twoPhaseSubmit").manualRunPhase2(recordId)');
        } else {
          // If test panel component isn't loaded, load it dynamically
          const script = document.createElement('script');
          script.src = '/src/js/components/two-phase-test-panel.js';
          script.onload = function() {
            // Initialize after loading
            TwoPhaseTestPanel.attachTo(formHandler, {
              position: 'bottom-right',
              theme: 'light',
              autoHide: true
            });
            console.log('🧪 Two-Phase Test Panel initialized (delayed load)');
          };
          document.head.appendChild(script);
        }
      }
    }
  }, 1000); // Give time for all extensions to load
});

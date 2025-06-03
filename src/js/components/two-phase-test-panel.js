/**
 * Two-Phase Form Submission Test Panel
 * Provides a UI to manually test two-phase form submission
 */

class TwoPhaseTestPanel {
  constructor(formHandler, options = {}) {
    this.formHandler = formHandler;
    this.options = Object.assign({
      position: 'bottom-right',  // Options: top-left, top-right, bottom-left, bottom-right
      theme: 'light',           // Options: light, dark
      autoHide: true            // Whether to auto-hide after a period of inactivity
    }, options);
    
    this.recordId = null;
    this.$panel = null;
    this.isExpanded = false;
    this.autoHideTimer = null;
    
    this.init();
  }
  
  init() {
    this.createPanel();
    this.addEventListeners();
    this.positionPanel();
    
    if (this.options.autoHide) {
      setTimeout(() => this.collapse(), 5000);
    }
  }
  
  createPanel() {
    // Create the panel element
    this.$panel = $(`
      <div id="two-phase-test-panel" class="two-phase-test-panel theme-${this.options.theme}">
        <div class="panel-header">
          <span>Two-Phase Submission Tester</span>
          <div class="panel-controls">
            <button type="button" class="btn-toggle" aria-label="Toggle panel">⋮</button>
          </div>
        </div>
        <div class="panel-body">
          <div class="status-display">
            <div class="status-item">
              <span class="label">Record ID:</span>
              <span class="value" id="current-record-id">None</span>
            </div>
            <div class="status-item">
              <span class="label">Status:</span>
              <span class="value" id="current-status">Ready</span>
            </div>
          </div>
          <div class="action-buttons">
            <button type="button" class="btn-action btn-phase-1" id="run-phase-1">
              Run Phase 1
              <small>Submit form data only</small>
            </button>
            <button type="button" class="btn-action btn-phase-2" id="run-phase-2" disabled>
              Run Phase 2
              <small>Upload files using ID</small>
            </button>
          </div>
          <div class="manual-input">
            <label for="manual-record-id">Use specific record ID:</label>
            <div class="input-group">
              <input type="text" id="manual-record-id" placeholder="Enter record ID">
              <button type="button" class="btn-set-id">Set</button>
            </div>
          </div>
        </div>
      </div>
    `);
    
    // Add styles
    this.addStyles();
    
    // Append to body
    $('body').append(this.$panel);
  }
  
  addStyles() {
    if ($('#two-phase-test-panel-styles').length === 0) {
      $('head').append(`
        <style id="two-phase-test-panel-styles">
          .two-phase-test-panel {
            position: fixed;
            width: 300px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            z-index: 9999;
            transition: all 0.3s ease;
            overflow: hidden;
          }
          
          .two-phase-test-panel.theme-light {
            background: #ffffff;
            color: #333333;
            border: 1px solid #e1e4e8;
          }
          
          .two-phase-test-panel.theme-dark {
            background: #2d333b;
            color: #ffffff;
            border: 1px solid #444c56;
          }
          
          .two-phase-test-panel .panel-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 15px;
            border-bottom: 1px solid #e1e4e8;
            font-weight: 600;
            cursor: move;
          }
          
          .theme-dark .panel-header {
            border-color: #444c56;
          }
          
          .panel-controls .btn-toggle {
            background: none;
            border: none;
            font-size: 16px;
            cursor: pointer;
            padding: 0 5px;
            color: inherit;
          }
          
          .panel-body {
            padding: 15px;
            max-height: 0;
            overflow: hidden;
            transition: max-height 0.3s ease;
          }
          
          .two-phase-test-panel.expanded .panel-body {
            max-height: 300px;
          }
          
          .status-display {
            margin-bottom: 15px;
            padding: 10px;
            border-radius: 4px;
            background: #f6f8fa;
          }
          
          .theme-dark .status-display {
            background: #22272e;
          }
          
          .status-item {
            display: flex;
            justify-content: space-between;
            margin-bottom: 5px;
          }
          
          .status-item .label {
            font-weight: 600;
          }
          
          .action-buttons {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            margin-bottom: 15px;
          }
          
          .btn-action {
            padding: 10px;
            border-radius: 4px;
            border: none;
            font-weight: 500;
            cursor: pointer;
            display: flex;
            flex-direction: column;
            align-items: center;
            transition: background 0.2s ease;
          }
          
          .btn-action small {
            font-size: 10px;
            opacity: 0.8;
            margin-top: 3px;
          }
          
          .btn-phase-1 {
            background: #2ea44f;
            color: white;
          }
          
          .btn-phase-1:hover {
            background: #2c974b;
          }
          
          .btn-phase-2 {
            background: #0366d6;
            color: white;
          }
          
          .btn-phase-2:hover {
            background: #0255b3;
          }
          
          .btn-action:disabled {
            background: #e1e4e8;
            color: #666;
            cursor: not-allowed;
          }
          
          .theme-dark .btn-action:disabled {
            background: #444c56;
            color: #999;
          }
          
          .manual-input {
            margin-top: 10px;
          }
          
          .manual-input label {
            font-size: 12px;
            margin-bottom: 3px;
            display: block;
          }
          
          .input-group {
            display: flex;
          }
          
          .input-group input {
            flex: 1;
            padding: 5px 8px;
            border: 1px solid #e1e4e8;
            border-radius: 4px 0 0 4px;
            font-size: 12px;
          }
          
          .theme-dark .input-group input {
            background: #22272e;
            border-color: #444c56;
            color: white;
          }
          
          .input-group .btn-set-id {
            border-radius: 0 4px 4px 0;
            border: 1px solid #0366d6;
            background: #0366d6;
            color: white;
            padding: 0 10px;
            cursor: pointer;
          }
          
          .input-group .btn-set-id:hover {
            background: #0255b3;
          }
          
          /* Collapsed state */
          .two-phase-test-panel:not(.expanded) {
            width: auto;
          }
          
          .two-phase-test-panel:not(.expanded) .panel-header {
            border-bottom: none;
          }
          
          .panel-minimized {
            padding: 5px 10px;
          }
          
          /* Transition effect */
          .two-phase-test-panel {
            transform: translateY(0);
          }
          
          .two-phase-test-panel.hiding {
            transform: translateY(100%);
          }
        </style>
      `);
    }
  }
  
  positionPanel() {
    // Position based on options
    switch (this.options.position) {
      case 'top-left':
        this.$panel.css({ top: '20px', left: '20px' });
        break;
      case 'top-right':
        this.$panel.css({ top: '20px', right: '20px' });
        break;
      case 'bottom-left':
        this.$panel.css({ bottom: '20px', left: '20px' });
        break;
      case 'bottom-right':
      default:
        this.$panel.css({ bottom: '20px', right: '20px' });
        break;
    }
  }
  
  addEventListeners() {
    // Toggle panel expansion
    this.$panel.find('.btn-toggle').on('click', () => {
      this.isExpanded ? this.collapse() : this.expand();
    });
    
    // Run Phase 1
    this.$panel.find('#run-phase-1').on('click', () => {
      this.runPhase1();
    });
    
    // Run Phase 2
    this.$panel.find('#run-phase-2').on('click', () => {
      this.runPhase2();
    });
    
    // Set manual record ID
    this.$panel.find('.btn-set-id').on('click', () => {
      const manualId = this.$panel.find('#manual-record-id').val().trim();
      if (manualId) {
        this.setRecordId(manualId);
      }
    });
    
    // Reset auto-hide timer on interaction
    this.$panel.on('mouseenter', () => {
      this.resetAutoHideTimer();
    });
    
    // Make panel draggable
    this.makeDraggable();
  }
  
  makeDraggable() {
    let isDragging = false;
    let offsetX, offsetY;
    
    this.$panel.find('.panel-header').on('mousedown', (e) => {
      isDragging = true;
      
      // Get the initial mouse position
      const initialX = e.clientX;
      const initialY = e.clientY;
      
      // Get the panel's current position
      const panelRect = this.$panel[0].getBoundingClientRect();
      
      // Calculate the offset
      offsetX = initialX - panelRect.left;
      offsetY = initialY - panelRect.top;
      
      // Prevent text selection while dragging
      e.preventDefault();
    });
    
    $(document).on('mousemove', (e) => {
      if (!isDragging) return;
      
      // Calculate the new position
      const left = e.clientX - offsetX;
      const top = e.clientY - offsetY;
      
      // Update the panel position
      this.$panel.css({
        left: `${left}px`,
        top: `${top}px`,
        right: 'auto',
        bottom: 'auto'
      });
    });
    
    $(document).on('mouseup', () => {
      isDragging = false;
    });
  }
  
  expand() {
    this.$panel.addClass('expanded');
    this.isExpanded = true;
    this.resetAutoHideTimer();
  }
  
  collapse() {
    this.$panel.removeClass('expanded');
    this.isExpanded = false;
  }
  
  resetAutoHideTimer() {
    if (!this.options.autoHide) return;
    
    clearTimeout(this.autoHideTimer);
    this.autoHideTimer = setTimeout(() => {
      this.collapse();
    }, 15000); // 15 seconds of inactivity
  }
  
  setStatus(status) {
    this.$panel.find('#current-status').text(status);
  }
  
  setRecordId(id) {
    this.recordId = id;
    this.$panel.find('#current-record-id').text(id || 'None');
    
    // Enable/disable Phase 2 button based on ID presence
    const $phase2Button = this.$panel.find('#run-phase-2');
    if (id) {
      $phase2Button.prop('disabled', false);
    } else {
      $phase2Button.prop('disabled', true);
    }
  }
  
  runPhase1() {
    try {
      // Get the two-phase submission extension instance
      const twoPhaseExt = this.formHandler.getExtension('twoPhaseSubmit');
      if (!twoPhaseExt) {
        this.setStatus('Error: Extension not found');
        return;
      }
      
      this.setStatus('Running Phase 1...');
      
      // Run Phase 1 using the extension's method
      twoPhaseExt.manualRunPhase1();
      
      // Update the record ID when it becomes available
      const checkForId = setInterval(() => {
        if (twoPhaseExt.recordId) {
          this.setRecordId(twoPhaseExt.recordId);
          this.setStatus('Phase 1 Complete');
          clearInterval(checkForId);
        }
      }, 500);
      
      // Stop checking after 10 seconds to prevent infinite loop
      setTimeout(() => {
        clearInterval(checkForId);
        if (!twoPhaseExt.recordId) {
          this.setStatus('Phase 1 Timeout');
        }
      }, 10000);
      
    } catch (error) {
      Debug.error('Error running Phase 1:', error);
      this.setStatus('Error: ' + error.message);
    }
  }
  
  runPhase2() {
    if (!this.recordId) {
      this.setStatus('Error: No record ID');
      return;
    }
    
    try {
      // Get the two-phase submission extension instance
      const twoPhaseExt = this.formHandler.getExtension('twoPhaseSubmit');
      if (!twoPhaseExt) {
        this.setStatus('Error: Extension not found');
        return;
      }
      
      this.setStatus('Running Phase 2...');
      
      // Run Phase 2 using the extension's method
      twoPhaseExt.manualRunPhase2(this.recordId);
      
      // Update status after a short delay to let the process start
      setTimeout(() => {
        this.setStatus('Phase 2 Running');
      }, 500);
      
    } catch (error) {
      Debug.error('Error running Phase 2:', error);
      this.setStatus('Error: ' + error.message);
    }
  }
  
  // Static method to create and attach to a form
  static attachTo(formHandler, options = {}) {
    return new TwoPhaseTestPanel(formHandler, options);
  }
}

// Make it globally available
window.TwoPhaseTestPanel = TwoPhaseTestPanel;

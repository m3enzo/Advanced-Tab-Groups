/* ==== Tab groups ==== */
/* https://github.com/Anoms12/Advanced-Tab-Groups */
/* ====== v3.0.0b ====== */

class AdvancedTabGroupsCloseButton {
  constructor() {
    this.init();
  }

  init() {
    console.log('[AdvancedTabGroups] Initializing...');
    
    // Set up observer for all tab groups
    this.setupObserver();
    
    // Process existing groups
    this.processExistingGroups();
    
    // Also try again after a delay to catch any missed groups
    setTimeout(() => this.processExistingGroups(), 1000);
  }

  setupObserver() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              // Check if the added node is a tab-group
              if (node.tagName === 'tab-group') {
                this.processGroup(node);
              }
              // Check if any children are tab-groups
              const childGroups = node.querySelectorAll?.('tab-group') || [];
              childGroups.forEach(group => this.processGroup(group));
            }
          });
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    console.log('[AdvancedTabGroups] Observer set up');
  }

  processExistingGroups() {
    const groups = document.querySelectorAll('tab-group');
    console.log('[AdvancedTabGroups] Processing existing groups:', groups.length);
    
    groups.forEach(group => {
      this.processGroup(group);
    });
  }

  _renameGroup(group, labelElement) {
    const originalText = labelElement.textContent;
    const input = document.createElement('input');
    input.id = 'tab-group-rename-input';
    input.value = originalText;
    
    const labelEditing = (saveChanges) => {
      if (saveChanges) {
        const newValue = input.value.trim();
        if (newValue.length > 0 && newValue !== originalText) {
          group.label = newValue;
        } else {
          labelElement.textContent = originalText;
        }
      } else {
        labelElement.textContent = originalText;
      }
      input.remove();
    };
    
    input.addEventListener('keydown', (event) => {
      switch (event.key) {
        case 'Enter':
          labelEditing(true);
          break;
        case 'Escape':
          labelEditing(false);
          break;
      }
    });
    
    input.addEventListener('blur', () => {
      labelEditing(false);
    });
    
    labelElement.textContent = '';
    labelElement.appendChild(input);
    input.focus();
    input.select();
  }

  processGroup(group) {
    // Skip if already processed or if it's a folder
    if (group.hasAttribute('data-close-button-added') || 
        group.classList.contains('zen-folder') ||
        group.hasAttribute('zen-folder')) {
      return;
    }

    console.log('[AdvancedTabGroups] Processing group:', group.id);
    
    const labelContainer = group.querySelector('.tab-group-label-container');
    if (!labelContainer) {
      console.log('[AdvancedTabGroups] No label container found for group:', group.id);
      return;
    }

    // Check if close button already exists
    if (labelContainer.querySelector('.tab-close-button')) {
      console.log('[AdvancedTabGroups] Close button already exists for group:', group.id);
      return;
    }

    // Create close button
    const closeButtonFrag = window.MozXULElement.parseXULToFragment('<image class="tab-close-button close-icon" role="button" keyNav="false" tooltiptext="Close Group"/>');
    const closeButton = closeButtonFrag.firstElementChild;

    // Add click event listener
    closeButton.addEventListener('click', (event) => {
      event.stopPropagation();
      event.preventDefault();
      console.log('[AdvancedTabGroups] Close button clicked for group:', group.id);
      
      try {
        gBrowser.removeTabGroup(group);
        console.log('[AdvancedTabGroups] Successfully removed tab group:', group.id);
      } catch (error) {
        console.error('[AdvancedTabGroups] Error removing tab group:', error);
      }
    });

    // Add the close button to the label container
    labelContainer.appendChild(closeButton);
    
    // Add double-click functionality to rename the group
    const labelElement = labelContainer.querySelector('.tab-group-label');
    if (labelElement) {
      labelElement.addEventListener('dblclick', (event) => {
        event.stopPropagation();
        event.preventDefault();
        console.log('[AdvancedTabGroups] Double-clicked label for group:', group.id);
        
        // Use the same approach as the ZenGroups script
        this._renameGroup(group, labelElement);
      });
    }
    
    // Mark as processed
    group.setAttribute('data-close-button-added', 'true');
    
    console.log('[AdvancedTabGroups] Close button and rename functionality added to group:', group.id);
  }
}

// Initialize when the page loads
(function() {
  if (!globalThis.advancedTabGroupsCloseButton) {
    window.addEventListener('load', () => {
      console.log('[AdvancedTabGroups] Page loaded, initializing');
      globalThis.advancedTabGroupsCloseButton = new AdvancedTabGroupsCloseButton();
    }, { once: true });
  }
})();

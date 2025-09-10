/* ==== Tab groups ==== */
/* https://github.com/Anoms12/Advanced-Tab-Groups */
/* ====== v3.0.0b ====== */

class AdvancedTabGroupsCloseButton {
  constructor() {
    this.init();
  }

  init() {
    console.log("[AdvancedTabGroups] Initializing...");

    // Clear any stored color picker data to prevent persistence issues
    this.clearStoredColorData();

    // Load saved tab group colors
    this.loadSavedColors();

    this.setupStash();

    // Set up observer for all tab groups
    this.setupObserver();

    // Process existing groups
    this.processExistingGroups();

    // Also try again after a delay to catch any missed groups
    setTimeout(() => this.processExistingGroups(), 1000);

    // Set up periodic saving of colors (every 30 seconds)
    setInterval(() => {
      this.saveTabGroupColors();
    }, 30000);
  }

  setupObserver() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              // Check if the added node is a tab-group
              if (node.tagName === "tab-group") {
                this.processGroup(node);
              }
              // Check if any children are tab-groups
              const childGroups = node.querySelectorAll?.("tab-group") || [];
              childGroups.forEach((group) => this.processGroup(group));
            }
          });
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    console.log("[AdvancedTabGroups] Observer set up");
  }

  processExistingGroups() {
    const groups = document.querySelectorAll("tab-group");
    console.log(
      "[AdvancedTabGroups] Processing existing groups:",
      groups.length
    );

    groups.forEach((group) => {
      this.processGroup(group);
    });
  }

  // Track currently edited group for rename
  _editingGroup = null;

  _renameGroup(group, labelElement) {
    // Prevent multiple renames at once
    if (this._editingGroup) return;
    this._editingGroup = group;

    // Add editing class for styling and hide label
    labelElement.classList.add("tab-group-label-editing");
    labelElement.style.display = "none";

    // Create input and set value
    const input = document.createElement("input");
    input.id = "tab-group-label-input";
    input.value = group.label || labelElement.textContent || "";

    // Insert input after labelElement
    labelElement.after(input);
    input.focus();
    input.select();

    // Handle commit/cancel
    const finishEdit = (commit) => {
      if (commit) {
        const newValue = input.value.trim();
        if (newValue && newValue !== group.label) {
          group.label = newValue;
        }
      }
      input.remove();
      labelElement.classList.remove("tab-group-label-editing");
      labelElement.style.display = "";
      this._editingGroup = null;
    };

    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        finishEdit(true);
      } else if (event.key === "Escape") {
        finishEdit(false);
      }
    });
    input.addEventListener("blur", () => finishEdit(false));
  }

  processGroup(group) {
    // Skip if already processed or if it's a folder
    if (
      group.hasAttribute("data-close-button-added") ||
      group.classList.contains("zen-folder") ||
      group.hasAttribute("zen-folder")
    ) {
      return;
    }

    console.log("[AdvancedTabGroups] Processing group:", group.id);

    const labelContainer = group.querySelector(".tab-group-label-container");
    if (!labelContainer) {
      console.log(
        "[AdvancedTabGroups] No label container found for group:",
        group.id
      );
      return;
    }

    // Check if close button already exists
    if (labelContainer.querySelector(".tab-close-button")) {
      console.log(
        "[AdvancedTabGroups] Close button already exists for group:",
        group.id
      );
      return;
    }

    // Create and inject the icon container at the beginning of labelContainer
    const iconContainerFrag = window.MozXULElement.parseXULToFragment(
      '<div class="tab-group-icon-container"><div class="tab-group-icon"></div></div>'
    );
    const iconContainer = iconContainerFrag.firstElementChild;

    // Insert the icon container at the beginning of the label container
    labelContainer.insertBefore(iconContainer, labelContainer.firstChild);

    console.log(
      "[AdvancedTabGroups] Icon container injected for group:",
      group.id
    );

    // Create close button
    const closeButtonFrag = window.MozXULElement.parseXULToFragment(
      '<image class="tab-close-button close-icon" role="button" keyNav="false" tooltiptext="Close Group"/>'
    );
    const closeButton = closeButtonFrag.firstElementChild;

    // Add click event listener
    closeButton.addEventListener("click", (event) => {
      event.stopPropagation();
      event.preventDefault();
      console.log(
        "[AdvancedTabGroups] Close button clicked for group:",
        group.id
      );

      try {
        // Remove the group's saved color before removing the group
        this.removeSavedColor(group.id);

        gBrowser.removeTabGroup(group);
        console.log(
          "[AdvancedTabGroups] Successfully removed tab group:",
          group.id
        );
      } catch (error) {
        console.error("[AdvancedTabGroups] Error removing tab group:", error);
      }
    });

    // Add the close button to the label container
    labelContainer.appendChild(closeButton);

    // Add double-click functionality to rename the group
    const labelElement = labelContainer.querySelector(".tab-group-label");
    if (labelElement) {
      labelElement.addEventListener("dblclick", (event) => {
        event.stopPropagation();
        event.preventDefault();
        console.log(
          "[AdvancedTabGroups] Double-clicked label for group:",
          group.id
        );

        // Use the same approach as the ZenGroups script
        this._renameGroup(group, labelElement);
      });
    }

    // Mark as processed
    group.setAttribute("data-close-button-added", "true");

    // Add context menu to the group
    this.addContextMenu(group);

    console.log(
      "[AdvancedTabGroups] Close button, rename functionality, and context menu added to group:",
      group.id
    );
  }

  addContextMenu(group) {
    // Prevent duplicate context menus
    if (group._contextMenuAdded) return;
    group._contextMenuAdded = true;

    // Create context menu using XUL parsing
    const contextMenuFrag = window.MozXULElement.parseXULToFragment(`
      <menupopup class="tab-group-context-menu">
        <menu class="change-group-color" label="Change Group Color">
          <menupopup>
            <menuitem class="set-group-color" 
                      label="Set Group Color"/>
            <menuitem class="use-favicon-color" 
                      label="Use Average Favicon Color"/>
          </menupopup>
        </menu>
        <menuitem class="convert-group-to-folder" 
                  label="Convert Group to Folder"/>
      </menupopup>
    `);

    const contextMenu = contextMenuFrag.firstElementChild;
    document.body.appendChild(contextMenu);

    // Add event listeners to menu items
    const setGroupColorItem = contextMenu.querySelector(".set-group-color");
    const useFaviconColorItem = contextMenu.querySelector(".use-favicon-color");
    const convertToFolderItem = contextMenu.querySelector(
      ".convert-group-to-folder"
    );

    if (setGroupColorItem) {
      setGroupColorItem.addEventListener("command", () => {
        group._setGroupColor();
      });
    }

    if (useFaviconColorItem) {
      useFaviconColorItem.addEventListener("command", () => {
        group._useFaviconColor();
      });
    }

    if (convertToFolderItem) {
      convertToFolderItem.addEventListener("command", () => {
        this.convertGroupToFolder(group);
      });
    }

    // Attach context menu only to the label container
    const labelContainer = group.querySelector(".tab-group-label-container");
    if (labelContainer) {
      labelContainer.addEventListener("contextmenu", (event) => {
        event.preventDefault();
        event.stopPropagation();
        contextMenu.openPopupAtScreen(event.screenX, event.screenY, false);
      });
    }

    // Add methods to the group for context menu actions
    group._renameGroupFromContextMenu = () => {
      const labelElement = group.querySelector(".tab-group-label");
      if (labelElement) {
        this._renameGroup(group, labelElement);
      }
    };

    group._closeGroupFromContextMenu = () => {
      try {
        gBrowser.removeTabGroup(group);
        console.log(
          "[AdvancedTabGroups] Group closed via context menu:",
          group.id
        );
      } catch (error) {
        console.error(
          "[AdvancedTabGroups] Error closing group via context menu:",
          error
        );
      }
    };

    group._collapseGroupFromContextMenu = () => {
      if (group.hasAttribute("collapsed")) {
        group.removeAttribute("collapsed");
        console.log(
          "[AdvancedTabGroups] Group expanded via context menu:",
          group.id
        );
      } else {
        group.setAttribute("collapsed", "true");
        console.log(
          "[AdvancedTabGroups] Group collapsed via context menu:",
          group.id
        );
      }
    };

    group._expandGroupFromContextMenu = () => {
      group.removeAttribute("collapsed");
      console.log(
        "[AdvancedTabGroups] Group expanded via context menu:",
        group.id
      );
    };

    group._setGroupColor = () => {
      console.log(
        "[AdvancedTabGroups] Set Group Color clicked for group:",
        group.id
      );

      // Check if the gradient picker is available
      if (window.nsZenThemePicker && window.gZenThemePicker) {
        // Store reference to current group for color application
        window.gZenThemePicker._currentTabGroup = group;

        // Try to find and click an existing button that opens the gradient picker
        try {
          // Look for the existing button that opens the gradient picker
          const existingButton = document.getElementById(
            "zenToolbarThemePicker"
          );
          if (existingButton) {
            console.log(
              "[AdvancedTabGroups] Found existing gradient picker button, clicking it"
            );

            // Store the current group reference in multiple places to ensure persistence
            window.gZenThemePicker._currentTabGroup = group;
            window.gZenThemePicker._tabGroupForColorPicker = group; // Backup reference

            // Store original methods for restoration
            const originalUpdateMethod =
              window.gZenThemePicker.updateCurrentWorkspace;
            const originalOnWorkspaceChange =
              window.gZenThemePicker.onWorkspaceChange;
            const originalGetGradient = window.gZenThemePicker.getGradient;

            // Override the updateCurrentWorkspace method to prevent browser background changes
            window.gZenThemePicker.updateCurrentWorkspace = async function (
              skipSave = true
            ) {
              // Check both references to ensure we don't lose the tab group
              const currentTabGroup =
                this._currentTabGroup || this._tabGroupForColorPicker;
              console.log(
                "[AdvancedTabGroups] updateCurrentWorkspace called, currentTabGroup:",
                currentTabGroup
              );

              // Only block browser changes if we're setting tab group colors
              if (currentTabGroup) {
                console.log(
                  "[AdvancedTabGroups] Blocking browser background change, applying to tab group instead"
                );
                // Don't call the original method - this prevents browser background changes
                // Instead, just apply the color to our tab group
                try {
                  // Get the current dots and their colors
                  const dots = this.panel.querySelectorAll(
                    ".zen-theme-picker-dot"
                  );
                  const colors = Array.from(dots)
                    .map((dot) => {
                      if (!dot || !dot.style) {
                        return null;
                      }

                      const colorValue = dot.style.getPropertyValue(
                        "--zen-theme-picker-dot-color"
                      );
                      if (!colorValue || colorValue === "undefined") {
                        return null;
                      }

                      const isPrimary = dot.classList.contains("primary");
                      const type = dot.getAttribute("data-type");

                      // Handle both RGB and hex colors
                      let rgb;
                      if (colorValue.startsWith("rgb")) {
                        rgb = colorValue.match(/\d+/g)?.map(Number) || [
                          0, 0, 0,
                        ];
                      } else if (colorValue.startsWith("#")) {
                        // Convert hex to RGB
                        const hex = colorValue.replace("#", "");
                        rgb = [
                          parseInt(hex.substr(0, 2), 16),
                          parseInt(hex.substr(2, 2), 16),
                          parseInt(hex.substr(4, 2), 16),
                        ];
                      } else {
                        rgb = [0, 0, 0];
                      }

                      return {
                        c: rgb,
                        isPrimary: isPrimary,
                        type: type,
                      };
                    })
                    .filter(Boolean);

                  if (colors.length > 0) {
                    const gradient = this.getGradient(colors);
                    console.log(
                      "[AdvancedTabGroups] Generated gradient:",
                      gradient,
                      "from colors:",
                      colors
                    );

                    // Set the --tab-group-color CSS variable on the group
                    currentTabGroup.style.setProperty(
                      "--tab-group-color",
                      gradient
                    );

                    // For simplicity, set the inverted color to the same value
                    // This simplifies the UI while maintaining the variable structure
                    currentTabGroup.style.setProperty(
                      "--tab-group-color-invert",
                      gradient
                    );

                    console.log(
                      "[AdvancedTabGroups] Applied color to group:",
                      currentTabGroup.id,
                      "Color:",
                      gradient
                    );

                    // Save the color to persistent storage
                    this.saveTabGroupColors();
                  }
                } catch (error) {
                  console.error(
                    "[AdvancedTabGroups] Error applying color to group:",
                    error
                  );
                }

                // Don't call the original method - this prevents browser background changes
                return;
              } else {
                console.log(
                  "[AdvancedTabGroups] No tab group selected, allowing normal browser background changes"
                );
                // If no tab group is selected, allow normal browser background changes
                return await originalUpdateMethod.call(this, skipSave);
              }
            };

            // Also override the onWorkspaceChange method to prevent browser theme changes
            window.gZenThemePicker.onWorkspaceChange = async function (
              workspace,
              skipUpdate = false,
              theme = null
            ) {
              // Check both references to ensure we don't lose the tab group
              const currentTabGroup =
                this._currentTabGroup || this._tabGroupForColorPicker;
              console.log(
                "[AdvancedTabGroups] onWorkspaceChange called, currentTabGroup:",
                currentTabGroup
              );

              // Only block browser theme changes if we're setting tab group colors
              if (currentTabGroup) {
                console.log(
                  "[AdvancedTabGroups] Blocking browser theme change"
                );
                // Don't call the original method - this prevents browser theme changes
                return;
              } else {
                console.log(
                  "[AdvancedTabGroups] No tab group selected, allowing normal browser theme changes"
                );
                // If no tab group is selected, allow normal browser theme changes
                return await originalOnWorkspaceChange.call(
                  this,
                  workspace,
                  skipUpdate,
                  theme
                );
              }
            };

            // Now click the button to open the picker
            existingButton.click();

            // Set up a listener for when the panel closes to apply the final color and cleanup
            const panel = window.gZenThemePicker.panel;
            const handlePanelClose = () => {
              try {
                console.log(
                  "[AdvancedTabGroups] Panel closed, applying final color and cleaning up"
                );

                // Get the final color from the dots using the same logic
                const dots = window.gZenThemePicker.panel.querySelectorAll(
                  ".zen-theme-picker-dot"
                );
                const colors = Array.from(dots)
                  .map((dot) => {
                    if (!dot || !dot.style) {
                      return null;
                    }

                    const colorValue = dot.style.getPropertyValue(
                      "--zen-theme-picker-dot-color"
                    );
                    if (!colorValue || colorValue === "undefined") {
                      return null;
                    }

                    const isPrimary = dot.classList.contains("primary");
                    const type = dot.getAttribute("data-type");

                    // Handle both RGB and hex colors
                    let rgb;
                    if (colorValue.startsWith("rgb")) {
                      rgb = colorValue.match(/\d+/g)?.map(Number) || [0, 0, 0];
                    } else if (colorValue.startsWith("#")) {
                      // Convert hex to RGB
                      const hex = colorValue.replace("#", "");
                      rgb = [
                        parseInt(hex.substr(0, 2), 16),
                        parseInt(hex.substr(2, 2), 16),
                        parseInt(hex.substr(4, 2), 16),
                      ];
                    } else {
                      rgb = [0, 0, 0];
                    }

                    return {
                      c: rgb,
                      isPrimary: isPrimary,
                      type: type,
                    };
                  })
                  .filter(Boolean);

                if (colors.length > 0) {
                  // Check both references to ensure we don't lose the tab group
                  const currentTabGroup =
                    window.gZenThemePicker._currentTabGroup ||
                    window.gZenThemePicker._tabGroupForColorPicker;

                  if (currentTabGroup) {
                    const gradient = window.gZenThemePicker.getGradient(colors);
                    console.log(
                      "[AdvancedTabGroups] Final gradient generated:",
                      gradient,
                      "from colors:",
                      colors
                    );

                    // Set the --tab-group-color CSS variable on the group
                    currentTabGroup.style.setProperty(
                      "--tab-group-color",
                      gradient
                    );

                    // For simplicity, set the inverted color to the same value
                    currentTabGroup.style.setProperty(
                      "--tab-group-color-invert",
                      gradient
                    );

                    console.log(
                      "[AdvancedTabGroups] Final color applied to group:",
                      currentTabGroup.id,
                      "Color:",
                      gradient
                    );

                    // Save the color to persistent storage
                    this.saveTabGroupColors();
                  }
                }

                // CRITICAL: Clean up all references and restore original methods
                delete window.gZenThemePicker._currentTabGroup;
                delete window.gZenThemePicker._tabGroupForColorPicker;
                window.gZenThemePicker.updateCurrentWorkspace =
                  originalUpdateMethod;
                window.gZenThemePicker.onWorkspaceChange =
                  originalOnWorkspaceChange;

                // Remove the event listener
                panel.removeEventListener("popuphidden", handlePanelClose);

                // Clear any stored color data to prevent persistence
                if (window.gZenThemePicker.dots) {
                  window.gZenThemePicker.dots.forEach((dot) => {
                    if (dot.element && dot.element.style) {
                      dot.element.style.removeProperty(
                        "--zen-theme-picker-dot-color"
                      );
                    }
                  });
                }

                console.log(
                  "[AdvancedTabGroups] Cleanup completed, color picker restored to normal operation"
                );
              } catch (error) {
                console.error(
                  "[AdvancedTabGroups] Error during cleanup:",
                  error
                );
                // Ensure cleanup happens even if there's an error
                try {
                  delete window.gZenThemePicker._currentTabGroup;
                  delete window.gZenThemePicker._tabGroupForColorPicker;
                  window.gZenThemePicker.updateCurrentWorkspace =
                    originalUpdateMethod;
                  window.gZenThemePicker.onWorkspaceChange =
                    originalOnWorkspaceChange;
                  panel.removeEventListener("popuphidden", handlePanelClose);
                } catch (cleanupError) {
                  console.error(
                    "[AdvancedTabGroups] Error during error cleanup:",
                    cleanupError
                  );
                }
              }
            };

            panel.addEventListener("popuphidden", handlePanelClose);
          } else {
            // Fallback: try to open the panel directly with proper sizing
            if (window.gZenThemePicker && window.gZenThemePicker.panel) {
              const panel = window.gZenThemePicker.panel;

              // Force the panel to show its content
              panel.style.width = "400px";
              panel.style.height = "600px";
              panel.style.minWidth = "400px";
              panel.style.minHeight = "600px";

              // Trigger initialization events
              panel.dispatchEvent(new Event("popupshowing"));

              // Open at a reasonable position
              const rect = group.getBoundingClientRect();
              panel.openPopupAtScreen(rect.left, rect.bottom + 10, false);
            } else {
              console.error(
                "[AdvancedTabGroups] Gradient picker not available"
              );
            }
          }
        } catch (error) {
          console.error(
            "[AdvancedTabGroups] Error opening gradient picker:",
            error
          );
          // Last resort: try to open the panel directly
          try {
            if (window.gZenThemePicker && window.gZenThemePicker.panel) {
              const panel = window.gZenThemePicker.panel;
              panel.style.width = "400px";
              panel.style.height = "600px";
              panel.openPopupAtScreen(0, 0, false);
            }
          } catch (fallbackError) {
            console.error(
              "[AdvancedTabGroups] Fallback panel opening also failed:",
              fallbackError
            );
          }
        }
      } else {
        console.warn("[AdvancedTabGroups] Gradient picker not available");
      }
    };

    group._useFaviconColor = () => {
      console.log(
        "[AdvancedTabGroups] Use Average Favicon Color clicked for group:",
        group.id
      );

      try {
        // Get all favicon images directly from the group
        const favicons = group.querySelectorAll(".tab-icon-image");
        if (favicons.length === 0) {
          console.log("[AdvancedTabGroups] No favicons found in group");
          return;
        }

        console.log(
          "[AdvancedTabGroups] Found",
          favicons.length,
          "favicons in group"
        );

        // Extract colors from favicons
        const colors = [];
        let processedCount = 0;
        const totalFavicons = favicons.length;

        favicons.forEach((favicon, index) => {
          if (favicon && favicon.src) {
            console.log(
              "[AdvancedTabGroups] Processing favicon",
              index + 1,
              "of",
              totalFavicons,
              ":",
              favicon.src
            );

            // Create a canvas to analyze the favicon
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            const img = new Image();

            img.onload = () => {
              try {
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);

                const imageData = ctx.getImageData(
                  0,
                  0,
                  canvas.width,
                  canvas.height
                );
                const data = imageData.data;

                // Sample pixels and extract colors
                let r = 0,
                  g = 0,
                  b = 0,
                  count = 0;
                for (let i = 0; i < data.length; i += 4) {
                  // Skip transparent pixels and very dark pixels
                  if (
                    data[i + 3] > 128 &&
                    data[i] + data[i + 1] + data[i + 2] > 30
                  ) {
                    r += data[i];
                    g += data[i + 1];
                    b += data[i + 2];
                    count++;
                  }
                }

                if (count > 0) {
                  const avgColor = [
                    Math.round(r / count),
                    Math.round(g / count),
                    Math.round(b / count),
                  ];
                  colors.push(avgColor);
                  console.log(
                    "[AdvancedTabGroups] Extracted color from favicon",
                    index + 1,
                    ":",
                    avgColor
                  );
                } else {
                  console.log(
                    "[AdvancedTabGroups] No valid pixels found in favicon",
                    index + 1
                  );
                }

                processedCount++;

                // If this is the last favicon processed, calculate average and apply
                if (processedCount === totalFavicons) {
                  if (colors.length > 0) {
                    const finalColor = this._calculateAverageColor(colors);
                    const colorString = `rgb(${finalColor[0]}, ${finalColor[1]}, ${finalColor[2]})`;

                    // Set the --tab-group-color CSS variable
                    group.style.setProperty("--tab-group-color", colorString);
                    group.style.setProperty(
                      "--tab-group-color-invert",
                      colorString
                    );
                    console.log(
                      "[AdvancedTabGroups] Applied average favicon color to group:",
                      group.id,
                      "Color:",
                      colorString,
                      "from",
                      colors.length,
                      "favicons"
                    );

                    // Save the color to persistent storage
                    this.saveTabGroupColors();
                  } else {
                    console.log(
                      "[AdvancedTabGroups] No valid colors extracted from any favicons"
                    );
                  }
                }
              } catch (error) {
                console.error(
                  "[AdvancedTabGroups] Error processing favicon",
                  index + 1,
                  ":",
                  error
                );
                processedCount++;

                // Still check if we're done processing
                if (processedCount === totalFavicons && colors.length > 0) {
                  const finalColor = this._calculateAverageColor(colors);
                  const colorString = `rgb(${finalColor[0]}, ${finalColor[1]}, ${finalColor[2]})`;

                  group.style.setProperty("--tab-group-color", colorString);
                  group.style.setProperty(
                    "--tab-group-color-invert",
                    colorString
                  );
                  console.log(
                    "[AdvancedTabGroups] Applied average favicon color to group:",
                    group.id,
                    "Color:",
                    colorString,
                    "from",
                    colors.length,
                    "favicons (some failed)"
                  );

                  this.saveTabGroupColors();
                }
              }
            };

            img.onerror = () => {
              console.log(
                "[AdvancedTabGroups] Failed to load favicon",
                index + 1,
                ":",
                favicon.src
              );
              processedCount++;

              // Check if we're done processing
              if (processedCount === totalFavicons && colors.length > 0) {
                const finalColor = this._calculateAverageColor(colors);
                const colorString = `rgb(${finalColor[0]}, ${finalColor[1]}, ${finalColor[2]})`;

                group.style.setProperty("--tab-group-color", colorString);
                group.style.setProperty(
                  "--tab-group-color-invert",
                  colorString
                );
                console.log(
                  "[AdvancedTabGroups] Applied average favicon color to group:",
                  group.id,
                  "Color:",
                  colorString,
                  "from",
                  colors.length,
                  "favicons (some failed to load)"
                );

                this.saveTabGroupColors();
              }
            };

            img.src = favicon.src;
          } else {
            console.log("[AdvancedTabGroups] Favicon", index + 1, "has no src");
            processedCount++;

            // Check if we're done processing
            if (processedCount === totalFavicons && colors.length > 0) {
              const finalColor = this._calculateAverageColor(colors);
              const colorString = `rgb(${finalColor[0]}, ${finalColor[1]}, ${finalColor[2]})`;

              group.style.setProperty("--tab-group-color", colorString);
              group.style.setProperty("--tab-group-color-invert", colorString);
              console.log(
                "[AdvancedTabGroups] Applied average favicon color to group:",
                group.id,
                "Color:",
                colorString,
                "from",
                colors.length,
                "favicons (some had no src)"
              );

              this.saveTabGroupColors();
            }
          }
        });

        if (favicons.length === 0) {
          console.log("[AdvancedTabGroups] No favicons found in group");
        }
      } catch (error) {
        console.error(
          "[AdvancedTabGroups] Error extracting favicon colors:",
          error
        );
      }
    };
  }

  // New method to convert group to folder
  convertGroupToFolder(group) {
    console.log("[AdvancedTabGroups] Converting group to folder:", group.id);

    try {
      // Check if Zen folders functionality is available
      if (!window.gZenFolders) {
        console.error(
          "[AdvancedTabGroups] Zen folders functionality not available"
        );
        return;
      }

      // Get all tabs in the group
      const tabs = Array.from(group.tabs);
      if (tabs.length === 0) {
        console.log("[AdvancedTabGroups] No tabs found in group to convert");
        return;
      }

      console.log(
        "[AdvancedTabGroups] Found",
        tabs.length,
        "tabs to convert to folder"
      );

      // Get the group name for the new folder
      const groupName = group.label || "New Folder";

      // Create a new folder using Zen folders functionality
      const newFolder = window.gZenFolders.createFolder(tabs, {
        label: groupName,
        renameFolder: false, // Don't prompt for rename since we're using the group name
        workspaceId:
          group.getAttribute("zen-workspace-id") ||
          window.gZenWorkspaces?.activeWorkspace,
      });

      if (newFolder) {
        console.log(
          "[AdvancedTabGroups] Successfully created folder:",
          newFolder.id
        );

        // Remove the original group
        try {
          gBrowser.removeTabGroup(group);
          console.log(
            "[AdvancedTabGroups] Successfully removed original group:",
            group.id
          );
        } catch (error) {
          console.error(
            "[AdvancedTabGroups] Error removing original group:",
            error
          );
        }

        // Remove the saved color for the original group
        this.removeSavedColor(group.id);

        console.log(
          "[AdvancedTabGroups] Group successfully converted to folder"
        );
      } else {
        console.error("[AdvancedTabGroups] Failed to create folder");
      }
    } catch (error) {
      console.error(
        "[AdvancedTabGroups] Error converting group to folder:",
        error
      );
    }
  }

  // Helper method to calculate average color
  _calculateAverageColor(colors) {
    if (colors.length === 0) return [0, 0, 0];

    const total = colors.reduce(
      (acc, color) => {
        acc[0] += color[0];
        acc[1] += color[1];
        acc[2] += color[2];
        return acc;
      },
      [0, 0, 0]
    );

    return [
      Math.round(total[0] / colors.length),
      Math.round(total[1] / colors.length),
      Math.round(total[2] / colors.length),
    ];
  }

  // Helper method to determine contrast color (black or white) for a given background color
  _getContrastColor(backgroundColor) {
    try {
      // Parse the background color to get RGB values
      let r, g, b;

      if (backgroundColor.startsWith("rgb")) {
        // Handle rgb(r, g, b) format
        const match = backgroundColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
        if (match) {
          r = parseInt(match[1]);
          g = parseInt(match[2]);
          b = parseInt(match[3]);
        }
      } else if (backgroundColor.startsWith("#")) {
        // Handle hex format
        const hex = backgroundColor.replace("#", "");
        r = parseInt(hex.substr(0, 2), 16);
        g = parseInt(hex.substr(2, 2), 16);
        b = parseInt(hex.substr(4, 2), 16);
      } else if (backgroundColor.startsWith("linear-gradient")) {
        // For gradients, extract the first color
        const match = backgroundColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
        if (match) {
          r = parseInt(match[1]);
          g = parseInt(match[2]);
          b = parseInt(match[3]);
        }
      }

      if (r !== undefined && g !== undefined && b !== undefined) {
        // Calculate relative luminance using the sRGB formula
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

        // Return 'white' for dark backgrounds, 'black' for light backgrounds
        return luminance > 0.5 ? "black" : "white";
      }
    } catch (error) {
      console.error(
        "[AdvancedTabGroups] Error calculating contrast color:",
        error
      );
    }

    // Default to black if we can't parse the color
    return "black";
  }

  // Clear any stored color picker data to prevent persistence issues
  clearStoredColorData() {
    try {
      if (window.gZenThemePicker) {
        // Clear any stored tab group references
        delete window.gZenThemePicker._currentTabGroup;
        delete window.gZenThemePicker._tabGroupForColorPicker;

        // Clear any stored color data on dots
        if (window.gZenThemePicker.dots) {
          window.gZenThemePicker.dots.forEach((dot) => {
            if (dot.element && dot.element.style) {
              dot.element.style.removeProperty("--zen-theme-picker-dot-color");
            }
          });
        }

        // Clear any stored color data in the panel
        if (window.gZenThemePicker.panel) {
          const dots = window.gZenThemePicker.panel.querySelectorAll(
            ".zen-theme-picker-dot"
          );
          dots.forEach((dot) => {
            if (dot.style) {
              dot.style.removeProperty("--zen-theme-picker-dot-color");
            }
          });
        }

        // Reset the color picker to its default state
        this.resetColorPickerToDefault();

        console.log("[AdvancedTabGroups] Stored color data cleared");
      }
    } catch (error) {
      console.error(
        "[AdvancedTabGroups] Error clearing stored color data:",
        error
      );
    }
  }

  // Reset the color picker to its default state
  resetColorPickerToDefault() {
    try {
      if (window.gZenThemePicker) {
        // Reset any workspace or theme data that might be cached
        if (window.gZenThemePicker.currentWorkspace) {
          // Force a refresh of the current workspace
          window.gZenThemePicker.currentWorkspace = null;
        }

        // Clear any cached theme data
        if (window.gZenThemePicker.currentTheme) {
          window.gZenThemePicker.currentTheme = null;
        }

        // Reset the dots to their default state
        if (window.gZenThemePicker.dots) {
          window.gZenThemePicker.dots.forEach((dot) => {
            if (dot.element && dot.element.style) {
              // Remove any custom color properties
              dot.element.style.removeProperty("--zen-theme-picker-dot-color");
              dot.element.style.removeProperty("background-color");
              dot.element.style.removeProperty("border-color");
            }
          });
        }

        console.log("[AdvancedTabGroups] Color picker reset to default state");
      }
    } catch (error) {
      console.error("[AdvancedTabGroups] Error resetting color picker:", error);
    }
  }

  // Save tab group colors to persistent storage
  async saveTabGroupColors() {
    try {
      if (typeof UC_API !== "undefined" && UC_API.FileSystem) {
        const colors = {};

        // Get all tab groups and their colors
        const groups = document.querySelectorAll("tab-group");
        groups.forEach((group) => {
          if (group.id) {
            const color = group.style.getPropertyValue("--tab-group-color");
            if (color && color !== "") {
              colors[group.id] = color;
            }
          }
        });

        // Save to file
        const jsonData = JSON.stringify(colors, null, 2);
        await UC_API.FileSystem.writeFile("tab_group_colors.json", jsonData);
        console.log("[AdvancedTabGroups] Tab group colors saved:", colors);
      } else {
        console.warn(
          "[AdvancedTabGroups] UC_API.FileSystem not available, using localStorage fallback"
        );
        // Fallback to localStorage if UC_API is not available
        const colors = {};
        const groups = document.querySelectorAll("tab-group");
        groups.forEach((group) => {
          if (group.id) {
            const color = group.style.getPropertyValue("--tab-group-color");
            if (color && color !== "") {
              colors[group.id] = color;
            }
          }
        });
        localStorage.setItem(
          "advancedTabGroups_colors",
          JSON.stringify(colors)
        );
        console.log(
          "[AdvancedTabGroups] Tab group colors saved to localStorage:",
          colors
        );
      }
    } catch (error) {
      console.error(
        "[AdvancedTabGroups] Error saving tab group colors:",
        error
      );
    }
  }

  // Load saved tab group colors from persistent storage
  async loadSavedColors() {
    try {
      let colors = {};

      if (typeof UC_API !== "undefined" && UC_API.FileSystem) {
        try {
          // Try to read from file
          const fsResult = await UC_API.FileSystem.readFile(
            "tab_group_colors.json"
          );
          if (fsResult.isContent()) {
            colors = JSON.parse(fsResult.content());
            console.log("[AdvancedTabGroups] Loaded colors from file:", colors);
          }
        } catch (fileError) {
          console.log(
            "[AdvancedTabGroups] No saved color file found, starting fresh"
          );
        }
      } else {
        // Fallback to localStorage
        const savedColors = localStorage.getItem("advancedTabGroups_colors");
        if (savedColors) {
          colors = JSON.parse(savedColors);
          console.log(
            "[AdvancedTabGroups] Loaded colors from localStorage:",
            colors
          );
        }
      }

      // Apply colors to existing groups
      if (Object.keys(colors).length > 0) {
        setTimeout(() => {
          this.applySavedColors(colors);
        }, 500); // Small delay to ensure groups are fully loaded
      }
    } catch (error) {
      console.error("[AdvancedTabGroups] Error loading saved colors:", error);
    }
  }

  // Apply saved colors to tab groups
  applySavedColors(colors) {
    try {
      Object.entries(colors).forEach(([groupId, color]) => {
        const group = document.getElementById(groupId);
        if (group) {
          group.style.setProperty("--tab-group-color", color);
          group.style.setProperty("--tab-group-color-invert", color);
          console.log(
            "[AdvancedTabGroups] Applied saved color to group:",
            groupId,
            color
          );
        }
      });
    } catch (error) {
      console.error("[AdvancedTabGroups] Error applying saved colors:", error);
    }
  }

  // Remove saved color for a specific tab group
  async removeSavedColor(groupId) {
    try {
      if (typeof UC_API !== "undefined" && UC_API.FileSystem) {
        try {
          // Read current colors
          const fsResult = await UC_API.FileSystem.readFile(
            "tab_group_colors.json"
          );
          if (fsResult.isContent()) {
            const colors = JSON.parse(fsResult.content());
            delete colors[groupId];

            // Save updated colors
            const jsonData = JSON.stringify(colors, null, 2);
            await UC_API.FileSystem.writeFile(
              "tab_group_colors.json",
              jsonData
            );
            console.log(
              "[AdvancedTabGroups] Removed saved color for group:",
              groupId
            );
          }
        } catch (fileError) {
          console.log(
            "[AdvancedTabGroups] No saved color file found to remove from"
          );
        }
      } else {
        // Fallback to localStorage
        const savedColors = localStorage.getItem("advancedTabGroups_colors");
        if (savedColors) {
          const colors = JSON.parse(savedColors);
          delete colors[groupId];
          localStorage.setItem(
            "advancedTabGroups_colors",
            JSON.stringify(colors)
          );
          console.log(
            "[AdvancedTabGroups] Removed saved color for group:",
            groupId
          );
        }
      }
    } catch (error) {
      console.error("[AdvancedTabGroups] Error removing saved color:", error);
    }
  }
  setupStash() {
    const createMenu = document.getElementById("zenCreateNewPopup");

    const stashButton = window.MozXULElement.parseXULToFragment(`
          <menuseparator/>
          <menu id="open-group-stash" label="Open Group Stash">
            <!-- Things will go here like stashed groups -->
          </menu>
        `);
    createMenu.appendChild(stashButton);
    console.log(createMenu);

    stashButton.addEventListener("command", () => {

    })
  }

}

// Initialize when the page loads
(function () {
  if (!globalThis.advancedTabGroupsCloseButton) {
    window.addEventListener(
      "load",
      () => {
        console.log("[AdvancedTabGroups] Page loaded, initializing");
        globalThis.advancedTabGroupsCloseButton =
          new AdvancedTabGroupsCloseButton();
      },
      { once: true }
    );

    // Clean up when the page is about to unload
    window.addEventListener("beforeunload", () => {
      if (globalThis.advancedTabGroupsCloseButton) {
        globalThis.advancedTabGroupsCloseButton.clearStoredColorData();
        globalThis.advancedTabGroupsCloseButton.saveTabGroupColors();
        console.log(
          "[AdvancedTabGroups] Cleanup and save completed before page unload"
        );
      }
    });
  }
})();

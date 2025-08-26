// Simple Playwright Validate Selector Tool
// This can be integrated into your existing MCP server

class PlaywrightValidateSelectorTool {
  constructor() {
    this.name = 'playwright_validate_selector';
    this.description = 'Validates and improves CSS selectors for Playwright automation';
  }

  async validateSelector(selector, page) {
    try {
      // Try to find the element with the current selector
      const element = await page.locator(selector).first();
      const count = await element.count();
      
      if (count === 0) {
        // Element not found, try to suggest alternatives
        return await this.suggestAlternativeSelectors(selector, page);
      }

      // Element found, get additional info for improvement
      const elementInfo = await this.getElementInfo(element);
      
      // Check if we can suggest a better selector
      const improvedSelector = await this.suggestBetterSelector(selector, element, page);
      
      return {
        isValid: true,
        improvedSelector: improvedSelector || selector,
        elementInfo
      };

    } catch (error) {
      return {
        isValid: false,
        error: error.message || 'Unknown error during validation'
      };
    }
  }

  async suggestAlternativeSelectors(originalSelector, page) {
    try {
      // Try common alternative selectors
      const alternatives = [
        // Try by text content
        `text=${originalSelector.replace(/[#.]/g, '')}`,
        // Try by role and name
        `role=button[name="${originalSelector.replace(/[#.]/g, '')}"]`,
        // Try by data attributes
        `[data-testid="${originalSelector.replace(/[#.]/g, '')}"]`,
        // Try by aria-label
        `[aria-label*="${originalSelector.replace(/[#.]/g, '')}"]`
      ];

      for (const altSelector of alternatives) {
        try {
          const element = await page.locator(altSelector).first();
          const count = await element.count();
          
          if (count > 0) {
            return {
              isValid: true,
              improvedSelector: altSelector,
              elementInfo: await this.getElementInfo(element)
            };
          }
        } catch {
          // Continue to next alternative
        }
      }

      // If no alternatives work, return error
      return {
        isValid: false,
        error: `Element not found with selector: ${originalSelector}. No suitable alternatives found.`
      };

    } catch (error) {
      return {
        isValid: false,
        error: `Failed to suggest alternatives: ${error.message || 'Unknown error'}`
      };
    }
  }

  async suggestBetterSelector(originalSelector, element, page) {
    try {
      // Get element info to suggest better selectors
      const elementInfo = await this.getElementInfo(element);
      
      if (!elementInfo) {
        return undefined;
      }
      
      // If element has a data-testid, use that (most stable)
      if (elementInfo.attributes['data-testid']) {
        return `[data-testid="${elementInfo.attributes['data-testid']}"]`;
      }
      
      // If element has aria-label, use that
      if (elementInfo.attributes['aria-label']) {
        return `[aria-label="${elementInfo.attributes['aria-label']}"]`;
      }
      
      // If element has meaningful text content, use text selector
      if (elementInfo.textContent && elementInfo.textContent.trim().length > 0) {
        const text = elementInfo.textContent.trim();
        if (text.length < 50) { // Only use short text
          return `text=${text}`;
        }
      }
      
      // If element has a unique class, use that
      if (elementInfo.attributes.class) {
        const classes = elementInfo.attributes.class.split(' ').filter(c => c.trim());
        for (const cls of classes) {
          if (cls && !cls.includes('css-') && !cls.includes('Mui')) {
            const selector = `.${cls}`;
            try {
              const count = await page.locator(selector).count();
              if (count === 1) {
                return selector;
              }
            } catch {
              // Continue to next class
            }
          }
        }
      }
      
      // Return original if no better option found
      return undefined;

    } catch (error) {
      // Return original selector if improvement fails
      return undefined;
    }
  }

  async getElementInfo(element) {
    try {
      const tagName = await element.evaluate((el) => el.tagName.toLowerCase());
      const textContent = await element.evaluate((el) => el.textContent);
      const attributes = await element.evaluate((el) => {
        const attrs = {};
        for (const attr of el.attributes) {
          attrs[attr.name] = attr.value;
        }
        return attrs;
      });

      return {
        tagName,
        textContent: textContent || undefined,
        attributes
      };

    } catch (error) {
      return {
        tagName: 'unknown',
        attributes: {}
      };
    }
  }
}

// Export the tool
module.exports = PlaywrightValidateSelectorTool;

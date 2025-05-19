/**
 * Main JavaScript for EchoAssist website
 * Handles general website functionality and accessibility features
 */

document.addEventListener('DOMContentLoaded', () => {
    // Mobile Navigation Toggle
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');
    const body = document.body;

    if (hamburger) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            navLinks.classList.toggle('active');
        });
    }

    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                window.scrollTo({
                    top: target.offsetTop - 80,
                    behavior: 'smooth'
                });
            }
        });
    });

    // Accessibility Widget Toggle
    const accessibilityToggle = document.getElementById('accessibility-toggle');
    const accessibilityPanel = document.querySelector('.accessibility-panel');

    if (accessibilityToggle) {
        accessibilityToggle.addEventListener('click', () => {
            accessibilityPanel.classList.toggle('active');
        });
    }

    // Accessibility Options
    const highContrastToggle = document.getElementById('high-contrast');
    const largeTextToggle = document.getElementById('large-text');
    const reduceMotionToggle = document.getElementById('reduce-motion');
    const screenReaderToggle = document.getElementById('screen-reader');

    // Load saved preferences
    loadAccessibilityPreferences();

    // High Contrast Mode
    if (highContrastToggle) {
        highContrastToggle.addEventListener('change', () => {
            body.classList.toggle('high-contrast', highContrastToggle.checked);
            saveAccessibilityPreference('high-contrast', highContrastToggle.checked);
        });
    }

    // Large Text Mode
    if (largeTextToggle) {
        largeTextToggle.addEventListener('change', () => {
            body.classList.toggle('large-text', largeTextToggle.checked);
            saveAccessibilityPreference('large-text', largeTextToggle.checked);
        });
    }

    // Reduce Motion
    if (reduceMotionToggle) {
        reduceMotionToggle.addEventListener('change', () => {
            body.classList.toggle('reduce-motion', reduceMotionToggle.checked);
            saveAccessibilityPreference('reduce-motion', reduceMotionToggle.checked);
        });
    }

    // Screen Reader Friendly Mode
    if (screenReaderToggle) {
        screenReaderToggle.addEventListener('change', () => {
            // Add ARIA attributes and additional screen reader support
            document.querySelectorAll('button, a').forEach(element => {
                if (!element.getAttribute('aria-label') && element.textContent.trim()) {
                    element.setAttribute('aria-label', element.textContent.trim());
                }
            });
            saveAccessibilityPreference('screen-reader', screenReaderToggle.checked);
        });
    }

    // Form Submission (prevent actual submission in demo)
    const contactForm = document.querySelector('.contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            alert('This is a demo. In a real implementation, this form would submit your information.');
            contactForm.reset();
        });
    }

    // Add ARIA labels to all interactive elements for better accessibility
    enhanceAccessibility();
});

// Save accessibility preferences to localStorage
function saveAccessibilityPreference(key, value) {
    try {
        localStorage.setItem(`accessibility-${key}`, value);
    } catch (e) {
        console.error('Could not save accessibility preference:', e);
    }
}

// Load accessibility preferences from localStorage
function loadAccessibilityPreferences() {
    try {
        const body = document.body;
        const highContrastToggle = document.getElementById('high-contrast');
        const largeTextToggle = document.getElementById('large-text');
        const reduceMotionToggle = document.getElementById('reduce-motion');
        const screenReaderToggle = document.getElementById('screen-reader');

        // High Contrast
        const highContrast = localStorage.getItem('accessibility-high-contrast') === 'true';
        if (highContrastToggle) highContrastToggle.checked = highContrast;
        body.classList.toggle('high-contrast', highContrast);

        // Large Text
        const largeText = localStorage.getItem('accessibility-large-text') === 'true';
        if (largeTextToggle) largeTextToggle.checked = largeText;
        body.classList.toggle('large-text', largeText);

        // Reduce Motion
        const reduceMotion = localStorage.getItem('accessibility-reduce-motion') === 'true';
        if (reduceMotionToggle) reduceMotionToggle.checked = reduceMotion;
        body.classList.toggle('reduce-motion', reduceMotion);

        // Screen Reader
        const screenReader = localStorage.getItem('accessibility-screen-reader') !== 'false'; // Default to true
        if (screenReaderToggle) screenReaderToggle.checked = screenReader;
        
        // Apply screen reader enhancements if enabled
        if (screenReader) {
            enhanceAccessibility();
        }
    } catch (e) {
        console.error('Could not load accessibility preferences:', e);
    }
}

// Enhance accessibility by adding ARIA attributes and roles
function enhanceAccessibility() {
    // Add ARIA labels to buttons without text
    document.querySelectorAll('button').forEach(button => {
        if (!button.getAttribute('aria-label') && !button.textContent.trim()) {
            const icon = button.querySelector('i');
            if (icon) {
                const iconClass = Array.from(icon.classList).find(cls => cls.startsWith('fa-'));
                if (iconClass) {
                    const label = iconClass.replace('fa-', '').replace(/-/g, ' ');
                    button.setAttribute('aria-label', label);
                }
            }
        }
    });

    // Add roles to sections
    document.querySelectorAll('section').forEach(section => {
        if (!section.getAttribute('role')) {
            section.setAttribute('role', 'region');
        }
        if (section.id && !section.getAttribute('aria-labelledby')) {
            const heading = section.querySelector('h2, h3, h4');
            if (heading) {
                const headingId = `${section.id}-heading`;
                heading.id = headingId;
                section.setAttribute('aria-labelledby', headingId);
            }
        }
    });

    // Add navigation role to nav
    document.querySelectorAll('nav').forEach(nav => {
        if (!nav.getAttribute('role')) {
            nav.setAttribute('role', 'navigation');
        }
    });

    // Add list roles
    document.querySelectorAll('ul, ol').forEach(list => {
        if (!list.getAttribute('role')) {
            list.setAttribute('role', 'list');
        }
        list.querySelectorAll('li').forEach(item => {
            if (!item.getAttribute('role')) {
                item.setAttribute('role', 'listitem');
            }
        });
    });

    // Add form field descriptions
    document.querySelectorAll('input, textarea, select').forEach(field => {
        const label = document.querySelector(`label[for="${field.id}"]`);
        if (label && !field.getAttribute('aria-labelledby')) {
            const labelId = `${field.id}-label`;
            label.id = labelId;
            field.setAttribute('aria-labelledby', labelId);
        }
    });
}

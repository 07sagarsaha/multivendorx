<?php
/**
 * MultiVendorX Follow Store Frontend class
 *
 * @package MultiVendorX
 */

namespace MultiVendorX\FollowStore;

use MultiVendorX\FrontendScripts;

class Frontend {
    /**
     * Constructor.
     */
    public function __construct() {
        // Default button on vendor info section
        add_action('mvx_after_vendor_information', array($this, 'render_follow_button'), 10, 1);

        // Load scripts
        add_action('wp_enqueue_scripts', array($this, 'load_scripts'));

        //Register the reusable follow button filter
        $this->register_follow_button_filter();
    }

    /**
     * Load follow store JS scripts
     */
    public function load_scripts() {
        FrontendScripts::load_scripts();
        FrontendScripts::enqueue_script('multivendorx-follow-store-frontend-script');
        FrontendScripts::localize_scripts('multivendorx-follow-store-frontend-script');
    }

    /**
     * Render follow button (default hook)
     */
    public function render_follow_button($store_id = 0) {
        if (empty($store_id)) {
            return;
        }

        $current_user_id = get_current_user_id();

        // Generate HTML
        $html  = '<button class="mvx-follow-btn" 
                    data-store-id="' . esc_attr($store_id) . '" 
                    data-user-id="' . esc_attr($current_user_id) . '">
                    Loading...
                  </button>';
        $html .= ' <span class="mvx-follower-count" id="followers-count-' . esc_attr($store_id) . '">...</span>';

        // Apply filter so it can be reused elsewhere
        $html = apply_filters('mvx_follow_button_html', $html, $store_id, $current_user_id);

        echo $html;
    }

    /**
     * Register filter to allow using follow button HTML anywhere
     */
    public function register_follow_button_filter() {
        add_filter('mvx_follow_button_html', function($html, $store_id, $user_id) {
            if (empty($store_id)) {
                return $html;
            }

            // Reuse same HTML pattern
            $html  = '<button class="mvx-follow-btn" 
                        data-store-id="' . esc_attr($store_id) . '" 
                        data-user-id="' . esc_attr($user_id) . '">
                        Loading...
                      </button>';
            $html .= ' <span class="mvx-follower-count" id="followers-count-' . esc_attr($store_id) . '">...</span>';

            return $html;
        }, 10, 3);
    }
}

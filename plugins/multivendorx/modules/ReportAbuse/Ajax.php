<?php
namespace MultiVendorX\ReportAbuse;

use MultiVendorX\ReportAbuse\Util;

class Ajax {
    public function __construct() {
        add_action('wp_ajax_mvx_submit_report_abuse', [$this, 'handle_report_abuse']);
        add_action('wp_ajax_nopriv_mvx_submit_report_abuse', [$this, 'handle_report_abuse']);
        add_action('wp_ajax_get_report_reasons', [$this, 'get_report_reasons']);
        add_action('wp_ajax_nopriv_get_report_reasons', [$this, 'get_report_reasons']);
    }

    public function handle_report_abuse() {
        // Verify nonce
        check_ajax_referer('report_abuse_ajax_nonce', 'nonce');

        // Get and sanitize inputs
        $name       = filter_input(INPUT_POST, 'name', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        $email      = filter_input(INPUT_POST, 'email', FILTER_SANITIZE_EMAIL);
        $message    = filter_input(INPUT_POST, 'message', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        $product_id = filter_input(INPUT_POST, 'product_id', FILTER_VALIDATE_INT);

        if ( empty($name) || empty($email) || empty($message) || !$product_id ) {
            wp_send_json_error("All fields are required.");
        }

        // Get store_id from product meta
        $store_id = get_post_meta($product_id, 'multivendorx_store_id', true);
        if ( empty($store_id) ) {
            wp_send_json_error("Invalid product/store.");
        }

        // Save the report using Util function
        $report_id = Util::create_report_abuse([
            'store_id'   => $store_id,
            'product_id' => $product_id,
            'name'       => $name,
            'email'      => $email,
            'message'    => $message
        ]);

        if (!$report_id) {
            wp_send_json_error("Something went wrong, please try again.");
        }

        wp_send_json_success("Your report has been submitted. Thank you!");
    }

    public function get_report_reasons() {
        // Get the saved reasons from settings
        $reasons = MultiVendorX()->setting->get_setting('abuse_report_reasons', []);
    
        // Extract reason values
        $reason_list = [];
        foreach ( $reasons as $reason ) {
            $reason_list[] = $reason['value'];
        }
    
        // Add an "Other" option at the end
        $reason_list[] = 'Other';
    
        // Send the final list back as JSON
        wp_send_json_success( $reason_list );
    }
    
}

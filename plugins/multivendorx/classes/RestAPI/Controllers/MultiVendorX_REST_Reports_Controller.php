<?php

namespace MultiVendorX\RestAPI\Controllers;
use MultiVendorX\Commission\CommissionUtil;
use MultiVendorX\Transaction\Transaction; 
use MultiVendorX\Store\Store;

defined('ABSPATH') || exit;

class MultiVendorX_REST_Reports_Controller extends \WP_REST_Controller {

	/**
	 * Route base.
	 *
	 * @var string
	 */
	protected $rest_base = 'reports';

    public function register_routes() {
        register_rest_route( MultiVendorX()->rest_namespace, '/' . $this->rest_base, [
            [
                'methods'             => \WP_REST_Server::READABLE,
                'callback'            => [ $this, 'get_items' ],
                'permission_callback' => [ $this, 'get_items_permissions_check' ],
            ],
            [
                'methods'             => \WP_REST_Server::CREATABLE,
                'callback'            => [ $this, 'create_item' ],
                'permission_callback' => [ $this, 'create_item_permissions_check' ],
            ],
            [
                'methods'             => \WP_REST_Server::EDITABLE,
                'callback'            => [ $this, 'update_item' ],
                'permission_callback' => [ $this, 'update_item_permissions_check' ],
            ],
        ]);
       
        register_rest_route( MultiVendorX()->rest_namespace, '/' . $this->rest_base . '/(?P<id>[\d]+)', [
            [
                'methods'             => \WP_REST_Server::READABLE,
                'callback'            => [$this, 'get_item'],
                'permission_callback' => [$this, 'get_items_permissions_check'],
            ],
            [
                'methods'             => \WP_REST_Server::EDITABLE,
                'callback'            => [ $this, 'update_item' ],
                'permission_callback' => [ $this, 'update_item_permissions_check' ],
            ],
            [
                'methods'             => \WP_REST_Server::DELETABLE,
                'callback'            => [ $this, 'delete_item' ],
                'permission_callback' => [ $this, 'update_item_permissions_check' ], // only admins can delete
            ],
        ]);
        
    
    }    

    public function get_items_permissions_check($request) {
        return current_user_can( 'read' )||current_user_can('edit_stores');
    }

     // POST permission
    public function create_item_permissions_check($request) {
        return current_user_can( 'manage_options' )||current_user_can('edit_stores');
    }

    public function update_item_permissions_check($request) {
        return current_user_can('manage_options')||current_user_can('edit_stores');
    }

    public function get_items( $request ) {
        $nonce = $request->get_header( 'X-WP-Nonce' );
        if ( ! wp_verify_nonce( $nonce, 'wp_rest' ) ) {
            return new \WP_Error(
                'invalid_nonce',
                __( 'Invalid nonce', 'multivendorx' ),
                [ 'status' => 403 ]
            );
        }
    
        $limit        = max( intval( $request->get_param( 'row' ) ), 10 );
        $page         = max( intval( $request->get_param( 'page' ) ), 1 );
        $offset       = ( $page - 1 ) * $limit;
 
    
        return rest_ensure_response([
            'items'   => $items,
            'all'     => $all_count,
            'publish' => $publish_count,
            'pending' => $pending_count,
            'draft'   => $draft_count,
        ]);
    }
    
    public function create_item( $request ) {
        $nonce = $request->get_header( 'X-WP-Nonce' );
        if ( ! wp_verify_nonce( $nonce, 'wp_rest' ) ) {
            return new \WP_Error(
                'invalid_nonce',
                __( 'Invalid nonce', 'multivendorx' ),
                [ 'status' => 403 ]
            );
        }

 
    
        return rest_ensure_response([

        ]);
    }
        
    public function update_item( $request ) {
        $nonce = $request->get_header( 'X-WP-Nonce' );
        if ( ! wp_verify_nonce( $nonce, 'wp_rest' ) ) {
            return new \WP_Error( 'invalid_nonce', __( 'Invalid nonce', 'multivendorx' ), [ 'status' => 403 ] );
        }
    

    
        return rest_ensure_response([
            'success' => true,
            'id'      => $post_id,
            'title'   => $data['title'] ?? '',
            'content' => $data['content'] ?? '',
            'status'  => get_post_status($post_id),
            'stores'  => $stores,
        ]);
    }
    
        
    public function get_item( $request ) {

        // --- Verify Nonce ---
        $nonce = $request->get_header( 'X-WP-Nonce' );
        if ( ! wp_verify_nonce( $nonce, 'wp_rest' ) ) {
            return new \WP_Error(
                'invalid_nonce',
                __( 'Invalid nonce', 'multivendorx' ),
                array( 'status' => 403 )
            );
        }
    
        // --- Get Store ID ---
        $id = absint( $request->get_param( 'id' ) );
        if ( ! $id ) {
            return new \WP_Error(
                'invalid_store_id',
                __( 'Invalid store ID', 'multivendorx' ),
                array( 'status' => 400 )
            );
        }
    
        // --- Fetch Data ---
        $commission  = CommissionUtil::get_commission_summary_for_store( $id );
        $transaction = Transaction::get_balances_for_store( $id );
    
        // --- Fetch Pending Withdraw Amount ---
        $store_meta = Store::get_store_by_id( $id );
        $withdraw_amount = 0;
        if ( ! empty( $store_meta->meta_data['request_withdrawal_amount'] ) ) {
            $withdraw_amount = floatval( $store_meta->meta_data['request_withdrawal_amount'] );
        }
    
        // --- Merge Data ---
        $commission  = is_array( $commission ) ? $commission : array();
        $transaction = is_array( $transaction ) ? $transaction : array();
    
        $merged_data = array_merge( $commission, $transaction );
        $merged_data['threshold_amount'] = MultiVendorX()->setting->get_setting('payout_threshold_amount', 0);
        $merged_data['lock_period'] = MultiVendorX()->setting->get_setting('commission_lock_period', 0);
        // --- Include Store ID and Withdraw Amount ---
        $merged_data['store_id'] = $id;
        $merged_data['withdraw_amount'] = $withdraw_amount;
    
        return rest_ensure_response( $merged_data );
    }
    
    
    
    public function delete_item( $request ) {
        $nonce = $request->get_header( 'X-WP-Nonce' );
        if ( ! wp_verify_nonce( $nonce, 'wp_rest' ) ) {
            return new \WP_Error( 'invalid_nonce', __( 'Invalid nonce', 'multivendorx' ), [ 'status' => 403 ] );
        }
    

        return rest_ensure_response([
            'success' => true,
            'id'      => $post_id,
            'message' => __( 'Announcement deleted successfully', 'multivendorx' ),
        ]);
    }
    
    
}
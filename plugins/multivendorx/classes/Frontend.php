<?php

namespace MultiVendorX;

use MultiVendorX\Store\StoreUtil;

/**
 * MultiVendorX Frontend class
 *
 * @class 		Frontend class
 * @version		PRODUCT_VERSION
 * @author 		MultiVendorX
 */
class Frontend {
    /**
     * Frontend class construct function
     */
    public function __construct() {
        add_filter('template_include', array($this, 'vendor_dashboard_template'));

        if ( current_user_can( 'edit_products' ) ) {
            add_action( 'template_redirect', array( &$this, 'save_product' ), 90 );
        }

        add_action('woocommerce_after_shop_loop_item', array($this, 'add_text_in_shop_and_single_product_page'), 6);
        add_action('woocommerce_product_meta_start', array($this, 'add_text_in_shop_and_single_product_page'), 25);
        add_action('woocommerce_get_item_data', array($this, 'add_sold_by_text_cart'), 30, 2);
        add_filter('woocommerce_product_tabs', array($this, 'product_vendor_tab'));

        add_filter('woocommerce_related_products', array($this, 'show_related_products'), 99, 3);
        
        if ( !empty(MultiVendorX()->setting->get_setting( 'store_order_display') )) {

            add_action( 'woocommerce_before_calculate_totals', array( $this, 'cart_items_sort_by_store' ), 10 );
            add_action( 'woocommerce_before_cart', array( $this, 'message_multiple_vendors_cart' ), 10 );
            add_filter( 'render_block_woocommerce/cart-line-items-block', array( $this, 'message_multiple_vendors_cart_block' ), 10 );
        }
        // add_filter('woocommerce_login_redirect', array($this, 'multivendorx_store_login'), 10, 2);
    
    }
    public function show_store_info($product_id) {
        
        $store_details = MultiVendorX()->setting->get_setting( 'store_branding_details', [] );
        if (in_array( 'show_store_name', $store_details )) {
            $store = StoreUtil::get_products_vendor($product_id);
            if (!$store) return;
            $name = $store->get('name');

             $logo_html = '';
            if ( in_array( 'show_store_logo_next_to_products', $store_details ) ) {
                $logo_url  = $store->get( 'image' ) ?: MultiVendorX()->plugin_url . 'assets/images/default-store.jpg';
                $logo_html = '<img src="' . esc_url( $logo_url ) . '" alt="' . esc_attr( $name ) . '" />';
            }

            return [
                'id'  => $store->get_id(),
                'name'  => $name,
                'logo_html'  => $logo_html,
            ];
            
        }
    }

    public function add_text_in_shop_and_single_product_page() {
        global $post;

        if ( apply_filters('mvx_sold_by_text_after_products_shop_page', true, $post->ID)) {
            $details = $this->show_store_info(($post->ID));

            if (!empty($details)) {
                $sold_by_text = apply_filters('mvx_sold_by_text', __('Sold By', 'multivendorx'), $post->ID);
    
                echo '<a class="by-store-name-link" style="display:block;" target="_blank" href="' 
                    . esc_url( MultiVendorX()->store->storeutil->get_store_url( $details['id'] ) ) . '">'
                    . esc_html( $sold_by_text ) . ' ' . $details['logo_html'] . esc_html( $details['name'] ) 
                    . '</a>';
            }
        }
    }

    public function add_sold_by_text_cart( $array, $cart_item ) {
        if ( apply_filters( 'mvx_sold_by_text_in_cart_checkout', true, $cart_item['product_id'] ) ) {

            $product_id    = $cart_item['product_id'];
            $details = $this->show_store_info(($product_id));

            if (!empty($details)) {
                $sold_by_text = apply_filters('mvx_sold_by_text', __('Sold By', 'multivendorx'), $product_id);
                $array[] = array(
                    'name'  => esc_html( $sold_by_text ),
                    'value' => esc_html( $details['name'] ),
                    'display' => $details['logo_html'] . esc_html( $details['name'] ),
                );

            }

        }

        return $array;
    }

    public function product_vendor_tab($tabs) {
        global $product;
        if ($product) {
            $store = StoreUtil::get_products_vendor($product->get_id());
            if ($store) {
                $title = __('Store', 'multivendorx');
                $tabs['store'] = array(
                    'title' => $title,
                    'priority' => 20,
                    'callback' => array($this, 'woocommerce_product_store_tab')
                );
            }
        }
        return $tabs;
    }

    public function woocommerce_product_store_tab() {
        MultiVendorX()->util->get_template( 'store-single-product-tab.php' );
    }

    /**
     * Show related products or not
     *
     * @return array
     */
    public function show_related_products($query, $product_id, $args) {
        if ($product_id) {
            $store = StoreUtil::get_products_vendor($product_id) ?? '';
            $related = MultiVendorX()->setting->get_setting( 'recommendation_source', '');
            if (!empty($related) && 'none' == $related) {
                return array();
            } elseif (!empty($related) && 'all_stores' == $related) {
                return $query;
            } elseif (!empty($related) && 'same_store' == $related && $store && !empty($store->get_id())) {
                $query = get_posts( array(
                    'post_type' => 'product',
                    'post_status' => 'publish',
                    'fields' => 'ids',
                    'exclude'   => $product_id,
                    'meta_query'     => [
                        [
                            'key'     => 'multivendorx_store_id',
                            'value'   => $store->get_id(),
                            'compare' => '=',
                        ],
                    ],
                    'orderby' => 'rand'
                ));
                if ($query) {
                    return $query;
                }
            }
        }
        return $query;
    }

    public function message_multiple_vendors_cart() {
        $stores_in_cart = $this->get_stores_in_cart();
        if ( count($stores_in_cart) > 1 ) {
            wc_print_notice(esc_html__('The products in your cart are sold by multiple different vendor partners. The order will be placed simultaneously with all vendors and you will receive a package from each of them.', 'multivendorx'), 'notice' );
        }
    }

    public function message_multiple_vendors_cart_block( $block_content ) {
        $message = '';
        $stores_in_cart = $this->get_stores_in_cart();
        if ( count($stores_in_cart) > 1 ) {
            $message = __('The products in your cart are sold by multiple different vendor partners. The order will be placed simultaneously with all vendors and you will receive a package from each of them.', 'multivendorx');
        }
        return $message.$block_content;
    }
    
    public function get_stores_in_cart() {
        $cart = WC()->cart;
        $stores = array();
        if ( is_object($cart) ) {
            foreach ( $cart->get_cart() as $cart_item ) {
                $store = StoreUtil::get_products_vendor( $cart_item['product_id'] );
                if ( $store ) {
                    $store_id = $store->get_id();
                    if ( !empty($store_id) ) {
                        array_push($stores, $store_id);
                    }
                }
            }
        }
        return array_unique(array_filter($stores));
    }

    public function cart_items_sort_by_store( $cart ) {
        $store_groups   = [];
        $admin_products  = [];

        foreach ( $cart->get_cart() as $cart_item_key => $cart_item ) {
            $store = StoreUtil::get_products_vendor( $cart_item['product_id'] );

            if ( $store ) {
                $store_groups[ $store->get_id() ][ $cart_item_key ] = $cart_item;
            } else {
                $admin_products[ $cart_item_key ] = $cart_item;
            }
        }

        $new_cart = [];

        foreach ( $store_groups as $cart_item_key => $items ) {
            foreach ( $items as $key => $item ) {
                $new_cart[ $key ] = $item;
            }
        }

        foreach ( $admin_products as $key => $item ) {
            $new_cart[ $key ] = $item;
        }

        $cart->cart_contents = $new_cart;
    }

    public function vendor_dashboard_template($template) {
        //checking change later when all function ready
        if (  is_user_logged_in() && is_page() && has_shortcode(get_post()->post_content, 'multivendorx_store_dashboard') ) {
            return MultiVendorX()->plugin_path . 'templates/store-dashboard.php';
        }
        return $template;
    }

    public function multivendorx_store_login() {
        MultiVendorX()->plugin_path . 'templates/store-dashboard.php';
    }

    public function save_product() {
        global $wp;
        file_put_contents( plugin_dir_path(__FILE__) . "/error.log", date("d/m/Y H:i:s", time()) . ":request:  : " . var_export($_POST, true) . "\n", FILE_APPEND);

        if ( $_SERVER['REQUEST_METHOD'] === 'POST' ) { 

            if ( $wp->query_vars['subtab'] != 'edit-product' || ! isset( $_POST['mvx_product_nonce'] ) ) {
                return;
            }
            
            $vendor_id = get_current_user_id();

            if ( ! current_user_can( 'edit_products' ) || empty( $_POST['post_ID'] ) || ! wp_verify_nonce( $_POST['mvx_product_nonce'], 'mvx-product' ) ) {
                wp_die( -1 );
            }
            $errors = array();
            $product_id = isset($_POST['post_ID']) ? intval( $_POST['post_ID'] ) : 0;
            $post_object = get_post( $product_id );
            $product = wc_get_product( $product_id );

            if ( ! $product->get_id() || ! $post_object || 'product' !== $post_object->post_type ) {
                wp_die( __( 'Invalid product.', 'multivendorx' ) );
            }

            if ( ! $product->get_date_created( 'edit' ) ) {
                $product->set_date_created( current_time( 'timestamp', true ) );
            }

            $title = isset( $_POST['post_title'] ) ? wc_clean( $_POST['post_title'] ) : '';
            // $title = ( ( is_product_mvx_spmv($product_id) && isset( $_POST['original_post_title'] ) ) ? wc_clean( $_POST['original_post_title'] ) : isset( $_POST['post_title'] ) ) ? wc_clean( $_POST['post_title'] ) : '';
            // $needs_admin_approval_for_publish = get_mvx_vendor_settings('is_publish_needs_admin_approval', 'capabilities', 'product') && get_mvx_vendor_settings('is_publish_needs_admin_approval', 'capabilities', 'product') == 'Enable' ? true : false;
            if ( isset( $_POST['status'] ) && $_POST['status'] === 'draft' ) {
                $status = 'draft';
            } elseif ( isset( $_POST['status'] ) && $_POST['status'] === 'publish' ) {
                if ( ! current_user_can( 'publish_products' ) ) {
                    $status = 'pending';
                } else {
                    $status = 'publish';
                }
            } else {
                wp_die( __( 'Invalid product status.', 'multivendorx' ) );
            }

            if (isset($_POST['original_post_title']) && !empty($_POST['original_post_title']) ) {
                if ( $post_object->post_status == 'publish' ) {
                    $status = 'publish';
                } else {
                    $status = 'pending';
                }
            }

            $post_data = apply_filters( 'mvx_submitted_products', array(
                'ID'            => $product_id,
                'post_title'    => $title,
                'post_content'  => stripslashes( html_entity_decode( $_POST['product_description'], ENT_QUOTES, get_bloginfo( 'charset' ) ) ),
                'post_excerpt'  => stripslashes( html_entity_decode( $_POST['product_excerpt'], ENT_QUOTES, get_bloginfo( 'charset' ) ) ),
                'post_status'   => $status,
                'post_type'     => 'product',
                'post_date'     => gmdate( 'Y-m-d H:i:s', $product->get_date_created( 'edit' )->getOffsetTimestamp() ),
                'post_date_gmt' => gmdate( 'Y-m-d H:i:s', $product->get_date_created( 'edit' )->getTimestamp() ),
                ), $_POST );

            do_action( 'mvx_before_post_update' );

            $can_publish = true;
            $check_any_error_has = apply_filters('mvx_error_from_product_publish', $error_msg = '', $_POST);
            if ($check_any_error_has) {
                $can_publish = false;
                wc_add_notice( $check_any_error_has, 'error' );
            }

            if ($can_publish) :
            $post_id = wp_update_post( $post_data, true );

            if ( $post_id && ! is_wp_error( $post_id ) ) {

                $store_id = get_user_meta($vendor_id, 'multivendorx_active_store', true);
                update_post_meta($post_id, 'multivendorx_store_id', $store_id);
                // Set Product Featured Image
                $featured_img = ! empty( $_POST['featured_img'] ) ? wc_clean( absint( $_POST['featured_img'] ) ) : '';
                if ( $featured_img ) {
                    set_post_thumbnail( $post_id, $featured_img );
                } else {
                    delete_post_thumbnail( $post_id );
                }

                // Set Product Image Gallery
                $attachment_ids = isset( $_POST['product_image_gallery'] ) ? explode( ',', wc_clean( $_POST['product_image_gallery'] ) ) : array();

                $attachment_ids = array_filter( $attachment_ids, function( $attachment_id ) {
                    //image validity check
                    $attachment = wp_get_attachment_image( $attachment_id );
                    return ! empty( $attachment );
                } );

                update_post_meta( $post_id, '_product_image_gallery', implode( ',', $attachment_ids ) );

                //remove dismiss meta if exists
                if( get_post_meta($post_id, '_dismiss_to_do_list', true) ) 
                    delete_post_meta($post_id, '_dismiss_to_do_list');

                // Policy tab data save
                // if ( mvx_is_module_active('store-policy') && apply_filters( 'mvx_vendor_can_overwrite_policies', true ) ) {
                //     if ( apply_filters( 'can_vendor_edit_shipping_policy_field', true ) && isset( $_POST['_mvx_shipping_policy'] ) ) {
                //         update_post_meta( $post_id, '_mvx_shipping_policy', stripslashes( html_entity_decode( $_POST['_mvx_shipping_policy'], ENT_QUOTES, get_bloginfo( 'charset' ) ) ) );
                //     }
                //     if ( apply_filters( 'can_vendor_edit_refund_policy_field', true ) && isset( $_POST['_mvx_refund_policy'] ) ) {
                //         update_post_meta( $post_id, '_mvx_refund_policy', stripslashes( html_entity_decode( $_POST['_mvx_refund_policy'], ENT_QUOTES, get_bloginfo( 'charset' ) ) ) );
                //     }
                //     if ( apply_filters( 'can_vendor_edit_cancellation_policy_field', true ) && isset( $_POST['_mvx_cancallation_policy'] ) ) {
                //         update_post_meta( $post_id, '_mvx_cancallation_policy', stripslashes( html_entity_decode( $_POST['_mvx_cancallation_policy'], ENT_QUOTES, get_bloginfo( 'charset' ) ) ) );
                //     }
                // }
                
                // Process product type first so we have the correct class to run setters.
                $product_type = empty( $_POST['product-type'] ) ? \WC_Product_Factory::get_product_type( $post_id ) : sanitize_title( stripslashes( $_POST['product-type'] ) );

                wp_set_object_terms( $post_id, $product_type, 'product_type' );

                // Set Product Catagories
                $catagories = isset( $_POST['tax_input']['product_cat'] ) ? array_filter( array_map( 'intval', (array) $_POST['tax_input']['product_cat'] ) ) : array();
                wp_set_object_terms( $post_id, $catagories, 'product_cat' );
                // if product has different multi level categories hierarchy, save the default
                if( isset( $_POST['_default_cat_hierarchy_term_id'] ) && in_array( $_POST['_default_cat_hierarchy_term_id'], $catagories ) && MultiVendorX()->setting->get_setting('category_pyramid_guide') ){
                    update_post_meta( $post_id, '_default_cat_hierarchy_term_id', absint( $_POST['_default_cat_hierarchy_term_id'] ) );
                }else{
                    delete_post_meta( $post_id, '_default_cat_hierarchy_term_id' );
                }
                // Set Product Tags
                $tags = isset( $_POST['tax_input']['product_tag'] ) ? wp_parse_id_list( $_POST['tax_input']['product_tag'] ) : array();
                wp_set_object_terms( $post_id, $tags, 'product_tag' );

                $custom_terms = isset( $_POST['tax_input'] ) ? array_diff_key( $_POST['tax_input'], array_flip( array( 'product_cat', 'product_tag' ) ) ) : array();
                // Set Product Custom Terms
                if ( ! empty( $custom_terms ) ) {
                    foreach ( $custom_terms as $term => $value ) {
                        $custom_term = isset( $_POST['tax_input'][$term] ) ? array_filter( array_map( 'intval', (array) $_POST['tax_input'][$term] ) ) : array();
                        wp_set_object_terms( $post_id, $custom_term, $term );
                    }
                }
                
                // Set Product GTIN
                // if( isset( $_POST['_mvx_gtin_type'] ) && !empty( $_POST['_mvx_gtin_type'] ) ){
                //     $term = get_term( $_POST['_mvx_gtin_type'], $MVX->taxonomy->mvx_gtin_taxonomy );
                //     if ($term && !is_wp_error( $term )) {
                //         wp_delete_object_term_relationships( $post_id, $MVX->taxonomy->mvx_gtin_taxonomy );
                //         wp_set_object_terms( $post_id, $term->term_id, $MVX->taxonomy->mvx_gtin_taxonomy, true );
                //     }
                // }
                // if ( isset( $_POST['_mvx_gtin_code'] ) ) {
                //     update_post_meta( $post_id, '_mvx_gtin_code', wc_clean( wp_unslash( $_POST['_mvx_gtin_code'] ) ) );
                // }

                //get the correct class
                $classname = \WC_Product_Factory::get_product_classname( $post_id, $product_type ? $product_type : 'simple' );
                $product = new $classname( $post_id );
                $attributes = isset( $_POST['wc_attributes'] ) ? mvx_woo()->prepare_attributes( $_POST['wc_attributes'] ) : array();
                $stock = null;
                // Handle stock changes.
                if ( isset( $_POST['_stock'] ) ) {
                    if ( isset( $_POST['_original_stock'] ) && wc_stock_amount( $product->get_stock_quantity( 'edit' ) ) !== wc_stock_amount( $_POST['_original_stock'] ) ) {
                        $error_msg = sprintf( __( 'The stock has not been updated because the value has changed since editing. Product %1$d has %2$d units in stock.', 'multivendorx' ), $product->get_id(), $product->get_stock_quantity( 'edit' ) );
                        $errors[] = $error_msg;
                    } else {
                        $stock = wc_stock_amount( wc_clean($_POST['_stock']) );
                    }
                }
                // Group Products
                // $grouped_products = isset( $_POST['grouped_products'] ) ? array_filter( array_map( 'intval', (array) $_POST['grouped_products'] ) ) : array();

                // // file paths will be stored in an array keyed off md5(file path)
                // $downloads = array();
                // if ( isset( $_POST['_downloadable'] ) && isset( $_POST['_wc_file_urls'] ) ) {
                //     $file_urls = isset($_POST['_wc_file_urls']) ? wp_unslash($_POST['_wc_file_urls']) : '';
                //     $file_names = isset( $_POST['_wc_file_names'] ) ? wp_unslash($_POST['_wc_file_names']) : array();
                //     $file_hashes = isset( $_POST['_wc_file_hashes'] ) ? wp_unslash($_POST['_wc_file_hashes']) : array();

                //     $file_url_size = sizeof( $file_urls );
                //     for ( $i = 0; $i < $file_url_size; $i ++ ) {
                //         if ( ! empty( $file_urls[$i] ) ) {
                //             $downloads[] = array(
                //                 'name'        => wc_clean( $file_names[$i] ),
                //                 'file'        => wp_unslash( trim( $file_urls[$i] ) ),
                //                 'download_id' => wc_clean( $file_hashes[$i] ),
                //             );
                //         }
                //     }
                // }

                $error = $product->set_props(
                    array(
                        'virtual'            => isset( $_POST['_virtual'] ),
                        'downloadable'       => isset( $_POST['_downloadable'] ),
                        'featured'           => isset( $_POST['_featured'] ),
                        'catalog_visibility' => wc_clean( wp_unslash( $_POST['_visibility'] ) ),
                        'product_url'        => isset( $_POST['_product_url'] ) ? esc_url_raw( $_POST['_product_url'] ) : null,
                        'button_text'        => isset( $_POST['_button_text'] ) ? wc_clean( $_POST['_button_text'] ) : null,
                        'children'           => 'grouped' === $product_type ? $grouped_products : null,
                        'regular_price'      => isset( $_POST['_regular_price'] ) ? wc_clean( $_POST['_regular_price'] ) : null,
                        'sale_price'         => isset( $_POST['_sale_price'] ) ? wc_clean( $_POST['_sale_price'] ) : null,
                        'date_on_sale_from'  => isset( $_POST['_sale_price_dates_from'] ) ? wc_clean( $_POST['_sale_price_dates_from'] ) : null,
                        'date_on_sale_to'    => isset( $_POST['_sale_price_dates_to'] ) ? wc_clean( $_POST['_sale_price_dates_to'] ) : null,
                        'download_limit'     => empty( $_POST['_download_limit'] ) ? '' : absint( $_POST['_download_limit'] ),
                        'download_expiry'    => empty( $_POST['_download_expiry'] ) ? '' : absint( $_POST['_download_expiry'] ),
                        'downloads'          => $downloads,
                        'tax_status'         => isset( $_POST['_tax_status'] ) ? wc_clean( $_POST['_tax_status'] ) : null,
                        'tax_class'          => isset( $_POST['_tax_class'] ) ? wc_clean( $_POST['_tax_class'] ) : null,
                        'sku'                => isset( $_POST['_sku'] ) ? wc_clean( $_POST['_sku'] ) : null,
                        'manage_stock'       => ! empty( $_POST['_manage_stock'] ),
                        'stock_quantity'     => $stock,
                        'low_stock_amount'   => isset( $_POST['_low_stock_amount'] ) && '' !== $_POST['_low_stock_amount'] ? wc_stock_amount( wp_unslash( $_POST['_low_stock_amount'] ) ) : '',
                        'backorders'         => isset( $_POST['_backorders'] ) ? wc_clean( $_POST['_backorders'] ) : null,
                        'stock_status'       => isset( $_POST['_stock_status'] ) ? wc_clean( $_POST['_stock_status'] ) : null,
                        'sold_individually'  => ! empty( $_POST['_sold_individually'] ),
                        'weight'             => isset( $_POST['_weight'] ) ? wc_clean( $_POST['_weight'] ) : null,
                        'length'             => isset( $_POST['_length'] ) ? wc_clean( $_POST['_length'] ) : null,
                        'width'              => isset( $_POST['_width'] ) ? wc_clean( $_POST['_width'] ) : null,
                        'height'             => isset( $_POST['_height'] ) ? wc_clean( $_POST['_height'] ) : null,
                        'shipping_class_id'  => isset( $_POST['product_shipping_class'] ) ? absint( $_POST['product_shipping_class'] ) : null,
                        'upsell_ids'         => isset( $_POST['upsell_ids'] ) ? array_map( 'intval', (array) $_POST['upsell_ids'] ) : array(),
                        'cross_sell_ids'     => isset( $_POST['crosssell_ids'] ) ? array_map( 'intval', (array) $_POST['crosssell_ids'] ) : array(),
                        'purchase_note'      => isset( $_POST['_purchase_note'] ) ? wp_kses_post( wp_unslash( $_POST['_purchase_note'] ) ) : '',
                        'menu_order'         => isset( $_POST['menu_order'] ) ? wc_clean( $_POST['menu_order'] ) : null,
                        'reviews_allowed'    => ! empty( $_POST['comment_status'] ) && 'open' === $_POST['comment_status'],
                        'attributes'         => $attributes,
                        // 'default_attributes' => mvx_woo()->prepare_set_attributes( $attributes, 'default_attribute_', $_POST ),
                    )
                );

                if ( is_wp_error( $error ) ) {
                    $errors[] = $error->get_error_message();
                }

                do_action( 'mvx_process_product_object', $product, $_POST );

                $product->save();

                // if ( $product->is_type( 'variable' ) ) {
                //     $product->get_data_store()->sync_variation_names( $product, wc_clean( $_POST['original_post_title'] ), wc_clean( $_POST['post_title'] ) );
                //     $error = mvx_woo()->save_product_variations( $post_id, $_POST );
                //     $errors = array_merge( $errors, $error );
                // }


                do_action( 'mvx_process_product_meta_' . $product_type, $post_id, $_POST );

                foreach ( $errors as $error ) {
                    wc_add_notice( $error, 'error' );
                }
                $status_msg = '';
                switch ( $status ) {
                    case 'draft': $status_msg = __( 'Product is successfully drafted', 'multivendorx' );
                        break;
                    case 'pending': $status_msg = __( 'Product is successfully submitted for review', 'multivendorx' );
                        break;
                    case 'publish': $status_msg = sprintf( __( 'Product updated and live. <a href="%s" target="_blank">View Product</a>', 'multivendorx' ), esc_attr( get_permalink( $post_id ) ) );
                        break;
                }
                wc_add_notice( $status_msg, 'success' );
                wp_safe_redirect(StoreUtil::get_endpoint_url('products', 'edit-product', $post_id));
                exit;
            } else {
                $error_msg = ( $post_id->get_error_code() === 'empty_content' ) ? __( 'Content, title, and excerpt are empty.', 'multivendorx' ) : $post_id->get_error_message();
                wc_add_notice( $error_msg, 'error' );
            }
            endif;
        }
    }

}


<?php
/**
 * Store Shop Template
 *
 * @author 		MultiVendorX
 * @package     MultiVendorX/Templates
 * @version   	3.7
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly
}

$store_id = $args['store_id'];
if ( ! $store_id ) {
    wp_safe_redirect( wc_get_page_permalink( 'shop' ) );
    exit();
}

get_header( 'shop' );

do_action( 'woocommerce_before_main_content' );
?>
<div class="mvx-store-wrapper">

    <header class="woocommerce-products-header">
        <?php if ( apply_filters( 'mvx_show_page_title', false ) ) : ?>
            <h1 class="woocommerce-products-header__title page-title">
                <?php woocommerce_page_title(); ?>
            </h1>
        <?php endif; ?>

        <?php
        // Store banner & vendor info
        do_action( 'mvx_archive_description' );
        MultiVendorX()->util->get_template( 'store/store-banner-info.php', [ 'store_id' => $store_id ] );
        ?>
    </header>

    <?php
    // Tabs
    MultiVendorX()->util->get_template( 'store/store-tabs.php', [ 'store_id' => $store_id ] );
?>

</div>

<?php
do_action( 'woocommerce_after_main_content' );

get_footer( 'shop' );

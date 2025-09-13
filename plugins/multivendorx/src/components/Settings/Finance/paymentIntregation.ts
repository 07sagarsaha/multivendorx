import { __ } from '@wordpress/i18n';

const methods = appLocalizer?.all_payments
    ? Object.entries(appLocalizer.all_payments).map(([_, value]) => value)
    : [];

export default {
    id: 'payment-integration',
    priority: 3,
    name: __( 'Marketplace Payouts', 'multivendorx' ),
    desc: __("Choose which payment integrations to enable for store payouts.",'multivendorx'),
    icon: 'adminlib-rules',
    submitUrl: 'settings',
    wrapperClass: 'form-wrapper',
    modal: [
        {
            key: 'payment_methods',
            type: 'payment-tabs',
            buttonEnable:true,
            toggleType:'icon',
            modal: methods
        }
        
    ],
};

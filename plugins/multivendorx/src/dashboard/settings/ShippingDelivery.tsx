import axios from "axios";
import { useEffect, useState } from "react";
import { BasicInput, getApiLink, SuccessNotice, ToggleSetting } from "zyra";
import ShippingRatesByCountry from "./ShippingRatesByCountry";
import DistanceByZoneShipping from "./DistanceByZoneShipping";

const ShippingDelivery = () => {
    const [formData, setFormData] = useState<{ [key: string]: any }>({}); // Use 'any' for simplicity here
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    useEffect(() => {
        if (!appLocalizer.store_id) return;

        axios.get(getApiLink(appLocalizer, `store/${appLocalizer.store_id}`), {
            headers: { 'X-WP-Nonce': appLocalizer.nonce },
        }).then((res) => {
            const data = res.data || {};

            // Step 2a: parse distance_rules
            if (typeof data.distance_rules === 'string') {
                try {
                    data.distance_rules = JSON.parse(data.distance_rules);
                } catch (err) {
                    data.distance_rules = []; // fallback to empty array
                }
            }

            // Optional: parse multivendorx_shipping_rates if needed
            if (typeof data.multivendorx_shipping_rates === 'string') {
                try {
                    data.multivendorx_shipping_rates = JSON.parse(data.multivendorx_shipping_rates);
                } catch (err) {
                    data.multivendorx_shipping_rates = [];
                }
            }

            setFormData(prev => ({ ...prev, ...data }));
        });
    }, [appLocalizer.store_id]);


    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        const updated = { ...formData, [name]: value };
        setFormData(updated);
        autoSave(updated);
    };

    const handleToggleChange = (value: string, name?: string) => {
        setFormData((prev) => {
            const updated = {
                ...(prev || {}),
                [name || 'shipping_options']: value,
            };
            autoSave(updated);
            return updated;
        });
    };

    const autoSave = (updatedData: Record<string, unknown>) => {
        axios({
            method: 'PUT',
            url: getApiLink(appLocalizer, `store/${appLocalizer.store_id}`),
            headers: { 'X-WP-Nonce': appLocalizer.nonce },
            data: updatedData,
        }).then((res) => {
            if (res.data.success) {
                setSuccessMsg('Store saved successfully!');
            }
        });
    };

    return (
        <>
            <SuccessNotice message={successMsg} />
            <div className="card-wrapper">
                <div className="card-content">
                    <div className="card-title">Method Type</div>

                    {/* Only show ToggleSetting if shipping_methods has options */}
                    {appLocalizer.shipping_methods && appLocalizer.shipping_methods.length > 0 && (
                        <>
                            <ToggleSetting
                                wrapperClass="setting-form-input"
                                descClass="settings-metabox-description"
                                description="Choose your preferred payment method."
                                options={appLocalizer.shipping_methods}
                                value={formData.shipping_options || ""}
                                onChange={(value: any) => handleToggleChange(value, 'shipping_options')}
                            />
                            {/* //zone by shipping */}
                            {formData.shipping_options === 'distance_by_zone' && <DistanceByZoneShipping />}

                            {/* country wise shipping */}
                            {formData.shipping_options === 'shipping_by_country' && (
                                <>
                                    <div className="card-title">Country-wise Shipping Configuration</div>

                                    {/* Default Shipping Price */}
                                    <div className="form-group-wrapper">
                                        <div className="form-group">
                                            <label htmlFor="multivendorx_shipping_type_price">Default Shipping Price ($)</label>
                                            <BasicInput
                                                type="number"
                                                name="multivendorx_shipping_type_price"
                                                wrapperClass="setting-form-input"
                                                descClass="settings-metabox-description"
                                                placeholder="0.00"
                                                value={formData.multivendorx_shipping_type_price || ''}
                                                onChange={handleChange}
                                            />
                                            <div className="settings-metabox-description">
                                                This is the base price and will be the starting shipping price for each product
                                            </div>
                                        </div>
                                    </div>

                                    {/* Per Product Additional Price */}
                                    <div className="form-group-wrapper">
                                        <div className="form-group">
                                            <label htmlFor="multivendorx_additional_product">Per Product Additional Price ($)</label>
                                            <BasicInput
                                                type="number"
                                                name="multivendorx_additional_product"
                                                wrapperClass="setting-form-input"
                                                descClass="settings-metabox-description"
                                                placeholder="0.00"
                                                value={formData.multivendorx_additional_product || ''}
                                                onChange={handleChange}
                                            />
                                            <div className="settings-metabox-description">
                                                If a customer buys more than one type product from your store, first product of the every second type will be charged with this price
                                            </div>
                                        </div>
                                    </div>

                                    {/* Per Qty Additional Price */}
                                    <div className="form-group-wrapper">
                                        <div className="form-group">
                                            <label htmlFor="multivendorx_additional_qty">Per Qty Additional Price ($)</label>
                                            <BasicInput
                                                type="number"
                                                name="multivendorx_additional_qty"
                                                wrapperClass="setting-form-input"
                                                descClass="settings-metabox-description"
                                                placeholder="0.00"
                                                value={formData.multivendorx_additional_qty || ''}
                                                onChange={handleChange}
                                            />
                                            <div className="settings-metabox-description">
                                                Every second product of same type will be charged with this price
                                            </div>
                                        </div>
                                    </div>

                                    {/* Free Shipping Minimum Order Amount */}
                                    <div className="form-group-wrapper">
                                        <div className="form-group">
                                            <label htmlFor="_free_shipping_amount">Free Shipping Minimum Order Amount ($)</label>
                                            <BasicInput
                                                type="number"
                                                name="_free_shipping_amount"
                                                wrapperClass="setting-form-input"
                                                descClass="settings-metabox-description"
                                                placeholder="NO Free Shipping"
                                                value={formData._free_shipping_amount || ''}
                                                onChange={handleChange}
                                            />
                                            <div className="settings-metabox-description">
                                                Free shipping will be available if order amount more than this. Leave empty to disable Free Shipping.
                                            </div>
                                        </div>
                                    </div>

                                    {/* Local Pickup Cost */}
                                    <div className="form-group-wrapper">
                                        <div className="form-group">
                                            <label htmlFor="_local_pickup_cost">Local Pickup Cost ($)</label>
                                            <BasicInput
                                                type="number"
                                                name="_local_pickup_cost"
                                                wrapperClass="setting-form-input"
                                                descClass="settings-metabox-description"
                                                placeholder="0.00"
                                                value={formData._local_pickup_cost || ''}
                                                onChange={handleChange}
                                            />
                                        </div>
                                    </div>

                                    <div className="card-title">Country-wise Shipping Configuration</div>
                                    <ShippingRatesByCountry />
                                </>
                            )}


                            {formData.shipping_options === 'distance_by_shipping' && (
                                <>
                                    <div className="card-title">Distance-wise Shipping Configuration</div>

                                    {/* Default Cost */}
                                    <div className="form-group-wrapper">
                                        <div className="form-group">
                                            <label htmlFor="distance_default_cost">Default Cost ($) *</label>
                                            <BasicInput
                                                type="number"
                                                name="distance_default_cost"
                                                wrapperClass="setting-form-input"
                                                descClass="settings-metabox-description"
                                                placeholder="0.00"
                                                value={formData.distance_default_cost || ''}
                                                onChange={handleChange}
                                                min="0"
                                                step="0.01"
                                            />
                                        </div>
                                    </div>

                                    {/* Max Distance */}
                                    <div className="form-group-wrapper">
                                        <div className="form-group">
                                            <label htmlFor="distance_max_km">Max Distance (km)</label>
                                            <BasicInput
                                                type="number"
                                                name="distance_max_km"
                                                wrapperClass="setting-form-input"
                                                descClass="settings-metabox-description"
                                                placeholder="0"
                                                value={formData.distance_max_km || ''}
                                                onChange={handleChange}
                                                min="0"
                                                step="0.1"
                                            />
                                        </div>
                                    </div>

                                    {/* Local Pickup Cost */}
                                    <div className="form-group-wrapper">
                                        <div className="form-group">
                                            <label htmlFor="distance_local_pickup_cost">Local Pickup Cost ($) (Optional)</label>
                                            <BasicInput
                                                type="number"
                                                name="distance_local_pickup_cost"
                                                wrapperClass="setting-form-input"
                                                descClass="settings-metabox-description"
                                                placeholder="0.00"
                                                value={formData.distance_local_pickup_cost || ''}
                                                onChange={handleChange}
                                                min="0"
                                                step="0.01"
                                            />
                                        </div>
                                    </div>

                                    {/* Distance-Cost Rules */}
                                    <div className="form-group-wrapper">
                                        <div className="form-group">
                                            <label>Distance-Cost Rules</label>
                                            {(formData.distance_rules || []).map((rule: any, index: number) => (
                                                <div key={index} className="flex gap-2 items-center mb-2">
                                                    <BasicInput
                                                        type="number"
                                                        placeholder="Up to km"
                                                        value={rule.max_distance || ''}
                                                        onChange={(e) => {
                                                            const updatedRules = [...(formData.distance_rules || [])];
                                                            updatedRules[index] = { ...updatedRules[index], max_distance: e.target.value };
                                                            setFormData({ ...formData, distance_rules: updatedRules });
                                                            autoSave({ ...formData, distance_rules: updatedRules });
                                                        }}
                                                        min="0"
                                                        step="0.1"
                                                    />
                                                    <BasicInput
                                                        type="number"
                                                        placeholder="Cost $"
                                                        value={rule.cost || ''}
                                                        onChange={(e) => {
                                                            const updatedRules = [...(formData.distance_rules || [])];
                                                            updatedRules[index] = { ...updatedRules[index], cost: e.target.value };
                                                            setFormData({ ...formData, distance_rules: updatedRules });
                                                            autoSave({ ...formData, distance_rules: updatedRules });
                                                        }}
                                                        min="0"
                                                        step="0.01"
                                                    />
                                                    <button
                                                        type="button"
                                                        className="admin-btn btn-red"
                                                        onClick={() => {
                                                            const updatedRules = (formData.distance_rules || []).filter((_, i) => i !== index);
                                                            setFormData({ ...formData, distance_rules: updatedRules });
                                                            autoSave({ ...formData, distance_rules: updatedRules });
                                                        }}
                                                    >
                                                        Remove
                                                    </button>
                                                </div>
                                            ))}

                                            <button
                                                type="button"
                                                className="admin-btn btn-purple mt-2"
                                                onClick={() => {
                                                    const updatedRules = [...(formData.distance_rules || []), { max_distance: '', cost: '' }];
                                                    setFormData({ ...formData, distance_rules: updatedRules });
                                                    autoSave({ ...formData, distance_rules: updatedRules });
                                                }}
                                            >
                                                + Add Rule
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </>
                    )}
                </div>
            </div>
        </>
    );
};

export default ShippingDelivery;
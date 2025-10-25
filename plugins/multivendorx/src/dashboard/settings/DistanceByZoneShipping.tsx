/* global appLocalizer */
import React, { useState, useEffect } from "react";
import axios from "axios";
import {
    Table,
    TableCell,
    CommonPopup,
    ToggleSetting,
    BasicInput,
    getApiLink,
} from "zyra";
import type { ColumnDef, PaginationState } from "@tanstack/react-table";
import { __ } from "@wordpress/i18n";

type Zone = {
    id: number;
    zone_name: string;
    formatted_zone_location: string;
    shipping_methods: any[];
    zone_id: number;
};

const DistanceByZoneShipping: React.FC = () => {
    const [data, setData] = useState<Zone[]>([]);
    const [pagination, setPagination] = useState<PaginationState>({
        pageIndex: 0,
        pageSize: 10,
    });
    const [totalRows, setTotalRows] = useState<number>(0);
    const [pageCount, setPageCount] = useState<number>(0);
    const [error, setError] = useState<string>();
    const [addShipping, setAddShipping] = useState<boolean>(false);
    const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [editingMethod, setEditingMethod] = useState<any>(null);

    const [formData, setFormData] = useState<any>({
        shippingMethod: "",
        localPickupCost: "",
        freeShippingType: "",
        minOrderCost: "",
        flatRateCost: "",
        flatRateClassCost: "",
        flatRateCalculationType: "",
    });

    useEffect(() => {
        fetchZones();
    }, []);

    const fetchZones = async () => {
        try {
            const res = await axios({
                method: "GET",
                url: getApiLink(appLocalizer, "zone-shipping"),
                headers: { "X-WP-Nonce": appLocalizer.nonce },
                params: { store_id: appLocalizer.store_id },
            });

            const zonesObject: Record<string, Zone> = res?.data || {};
            const zonesArray = Object.values(zonesObject);

            setData(zonesArray);
            setTotalRows(zonesArray.length);
            setPageCount(Math.ceil(zonesArray.length / pagination.pageSize));
        } catch (err) {
            console.error("Error loading zones:", err);
            setError(__("Failed to load shipping zones", "multivendorx"));
        }
    };

    const handleAdd = (zone: Zone) => {
        setSelectedZone(zone);
        setAddShipping(true);
        setIsEditing(false);
        setEditingMethod(null);
        setFormData({
            shippingMethod: "",
            localPickupCost: "",
            freeShippingType: "",
            minOrderCost: "",
            flatRateCost: "",
            flatRateClassCost: "",
            flatRateCalculationType: "",
        });
    };

    const handleEdit = async (method: any) => {
        setIsEditing(true);
        setEditingMethod(method);

        const zoneWithMethod = data.find(zone => {
            const methods = Object.values(zone.shipping_methods || {});
            return methods.some((m: any) => m.id === method.id);
        });

        setSelectedZone(zoneWithMethod || null);
        setAddShipping(true);

        if (!zoneWithMethod) return;

        try {
            const response = await axios({
                method: "GET",
                url: getApiLink(appLocalizer, `zone-shipping/${zoneWithMethod.zone_id}`),
                headers: { "X-WP-Nonce": appLocalizer.nonce },
                params: {
                    store_id: appLocalizer.store_id,
                    method_id: method.id,
                    zone_id: zoneWithMethod.zone_id,
                },
            });

            if (response.data && response.data.settings) {
                const data = response.data;
                const methodConfig = data.settings;

                const form: any = {
                    shippingMethod: data.method_id,
                    localPickupCost: "",
                    freeShippingType: "",
                    minOrderCost: "",
                    flatRateCost: "",
                    flatRateClassCost: "",
                    flatRateCalculationType: "",
                };

                if (data.method_id === "local_pickup") {
                    form.localPickupCost = methodConfig.cost || "";
                } else if (data.method_id === "free_shipping") {
                    form.freeShippingType = methodConfig.requires === "min_amount" ? "min_order" : "coupon";
                    form.minOrderCost = methodConfig.min_amount || "";
                } else if (data.method_id === "flat_rate") {
                    form.flatRateCost = methodConfig.cost || "";
                    form.flatRateClassCost = methodConfig.class_cost || "";
                    form.flatRateCalculationType = methodConfig.calculation_type;
                }

                setFormData(form);
            }
        } catch (err) {
            console.error("Error loading shipping method:", err);
            alert("Error loading shipping method");
        }
    };

    const handleDelete = async (method: any, zone: Zone) => {
        if (!confirm(`Are you sure you want to delete "${method.title}"?`)) return;

        try {
            const response = await axios({
                method: "DELETE",
                url: getApiLink(appLocalizer, `zone-shipping/${zone.zone_id}`),
                headers: { "X-WP-Nonce": appLocalizer.nonce },
                data: {
                    store_id: appLocalizer.store_id,
                    zone_id: zone.zone_id,
                    method_id: method.id,
                },
            });

            if (response.data.success) {
                fetchZones();
            } else {
                alert(`Failed to delete "${method.title}".`);
            }
        } catch (err) {
            console.error("Error deleting shipping method:", err);
            alert(`Error deleting "${method.title}".`);
        }
    };

    const handleChange = (key: string, value: any) => {
        setFormData((prev: any) => ({ ...prev, [key]: value }));
    };

    const handleSave = async () => {
        if (!selectedZone) return;

        try {
            const shippingData: any = { settings: {} };

            if (formData.shippingMethod === "local_pickup") {
                shippingData.settings = {
                    title: "Local Pickup",
                    cost: formData.localPickupCost || '0',
                    description: "Local pickup shipping method"
                };
            } else if (formData.shippingMethod === "free_shipping") {
                shippingData.settings = {
                    title: "Free Shipping",
                    requires: formData.freeShippingType === "min_order" ? "min_amount" : "coupon",
                    min_amount: formData.minOrderCost || '0',
                    description: "Free shipping method"
                };
            } else if (formData.shippingMethod === "flat_rate") {
                shippingData.settings = {
                    title: "Flat Rate",
                    cost: formData.flatRateCost || '0',
                    class_cost: formData.flatRateClassCost || '',
                    calculation_type: formData.flatRateCalculationType,
                    description: "Flat rate shipping method"
                };
            }

            const isUpdate = isEditing && editingMethod;
            const method = isUpdate ? "PUT" : "POST";
            const url = isUpdate
                ? getApiLink(appLocalizer, `zone-shipping/${selectedZone.zone_id}`)
                : getApiLink(appLocalizer, "zone-shipping");

            const requestData: any = {
                store_id: appLocalizer.store_id,
                zone_id: selectedZone.zone_id,
                method_id: isUpdate ? editingMethod.id : formData.shippingMethod,
                settings: shippingData.settings
            };

            if (isUpdate) {
                requestData.instance_id = editingMethod.instance_id;
            }

            const response = await axios({
                method: method,
                url: url,
                headers: {
                    "X-WP-Nonce": appLocalizer.nonce,
                    "Content-Type": "application/json"
                },
                data: requestData
            });

            if (response.data.success) {
                await fetchZones();
                setAddShipping(false);
                setFormData({
                    shippingMethod: "",
                    localPickupCost: "",
                    freeShippingType: "",
                    minOrderCost: "",
                    flatRateCost: "",
                    flatRateClassCost: "",
                    flatRateCalculationType: "",
                });
                setEditingMethod(null);
                setIsEditing(false);
            } else {
                alert(__("Failed to " + (isUpdate ? "update" : "add") + " shipping method", "multivendorx"));
            }
        } catch (err) {
            console.error("Error " + (isEditing ? "updating" : "adding") + " shipping method:", err);
            alert(__("Error " + (isEditing ? "updating" : "adding") + " shipping method", "multivendorx"));
        }
    };

    const columns: ColumnDef<Zone>[] = [
        {
            header: __("Zone Name", "multivendorx"),
            cell: ({ row }) => <TableCell>{row.original.zone_name || "—"}</TableCell>,
        },
        {
            header: __("Region(s)", "multivendorx"),
            cell: ({ row }) => <TableCell>{row.original.formatted_zone_location || "—"}</TableCell>,
        },
        {
            header: __("Shipping Method(s)", "multivendorx"),
            cell: ({ row }) => {
                const methodsObj = row.original.shipping_methods || {};
                const methodsArray = Object.values(methodsObj);

                if (methodsArray.length === 0) {
                    return (
                        <TableCell>
                            <div>No shipping methods</div>
                            <button
                                className="btn btn-default btn-sm mt-2"
                                onClick={() => handleAdd(row.original)}
                            >
                                <i className="adminlib-plus"></i> {__("Add Shipping Method", "multivendorx")}
                            </button>
                        </TableCell>
                    );
                }

                return (
                    <TableCell>
                        <div className="space-y-2">
                            {methodsArray.map((method: any) => (
                                <div key={method.instance_id} className="flex items-center justify-between border-b pb-2">
                                    <div className="font-medium">{method.title}</div>
                                    <div className="flex gap-2">
                                        <button
                                            className="btn btn-default btn-sm"
                                            onClick={() => handleEdit(method)}
                                        >
                                            <i className="adminlib-edit"></i> {__("Edit", "multivendorx")}
                                        </button>
                                        <button
                                            className="btn btn-danger btn-sm"
                                            onClick={() => handleDelete(method, row.original)}
                                        >
                                            <i className="adminlib-trash"></i> {__("Delete", "multivendorx")}
                                        </button>
                                    </div>
                                </div>
                            ))}

                            <button
                                className="btn btn-default btn-sm mt-2"
                                onClick={() => handleAdd(row.original)}
                            >
                                <i className="adminlib-plus"></i> {__("Add New Method", "multivendorx")}
                            </button>
                        </div>
                    </TableCell>
                );
            },
        },
    ];

    return (
        <>
            <div className="card-title text-lg font-semibold mb-3">
                {__("Zone-wise Shipping Configuration", "multivendorx")}
            </div>

            <div className="admin-table-wrapper">
                <Table
                    data={data}
                    columns={columns as ColumnDef<Record<string, any>, any>[]}
                    rowSelection={{}}
                    onRowSelectionChange={() => { }}
                    defaultRowsPerPage={10}
                    pageCount={pageCount}
                    pagination={pagination}
                    onPaginationChange={setPagination}
                    perPageOption={[10, 25, 50]}
                    totalCounts={totalRows}
                />
            </div>

            {addShipping && selectedZone && (
                <CommonPopup
                    open={addShipping}
                    width="800px"
                    height="50%"
                    header={
                        <>
                            <div className="title flex items-center gap-2">
                                <i className="adminlib-cart"></i>
                                {isEditing ? __("Edit Shipping — ", "multivendorx") : __("Add Shipping — ", "multivendorx")}
                                {selectedZone.zone_name}
                            </div>
                            <i
                                className="icon adminlib-close cursor-pointer"
                                onClick={() => setAddShipping(false)}
                            ></i>
                        </>
                    }
                    footer={
                        <div className="flex justify-end gap-2 p-3">
                            <button
                                className="btn btn-default"
                                onClick={() => setAddShipping(false)}
                            >
                                {__("Cancel", "multivendorx")}
                            </button>
                            <button className="btn btn-primary" onClick={handleSave}>
                                {isEditing ? __("Update", "multivendorx") : __("Save", "multivendorx")}
                            </button>
                        </div>
                    }
                >
                    <div className="content p-3 space-y-4">
                        {/* Select Shipping Method */}
                        <label className="font-medium">{__("Shipping Method", "multivendorx")}</label>
                        <ToggleSetting
                            wrapperClass="setting-form-input"
                            value={formData.shippingMethod}
                            onChange={(val: string) => {
                                if (!isEditing) handleChange("shippingMethod", val);
                            }}
                            options={
                                isEditing
                                    ? [{ key: formData.shippingMethod, value: formData.shippingMethod, label: formData.shippingMethod.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()) }]
                                    : [
                                        { key: "local_pickup", value: "local_pickup", label: "Local pickup" },
                                        { key: "free_shipping", value: "free_shipping", label: "Free shipping" },
                                        { key: "flat_rate", value: "flat_rate", label: "Flat Rate" },
                                    ]
                            }
                            disabled={isEditing}
                        />

                        {/* Local Pickup */}
                        {formData.shippingMethod === "local_pickup" && (
                            <div className="form-group">
                                <label className="font-medium">{__("Cost", "multivendorx")}</label>
                                <BasicInput
                                    type="number"
                                    name="localPickupCost"
                                    placeholder="Enter cost"
                                    value={formData.localPickupCost}
                                    onChange={(e: any) => handleChange("localPickupCost", e.target.value)}
                                />
                            </div>
                        )}

                        {/* Free Shipping */}
                        {formData.shippingMethod === "free_shipping" && (
                            <>
                                <ToggleSetting
                                    wrapperClass="setting-form-input"
                                    value={formData.freeShippingType}
                                    onChange={(val: string) => handleChange("freeShippingType", val)}
                                    options={[
                                        { key: "min_order", value: "min_order", label: "Min Order" },
                                        { key: "coupon", value: "coupon", label: "Coupon" },
                                    ]}
                                />
                                {formData.freeShippingType === "min_order" && (
                                    <div className="form-group mt-2">
                                        <label className="font-medium">{__("Minimum Order Cost", "multivendorx")}</label>
                                        <BasicInput
                                            type="number"
                                            name="minOrderCost"
                                            placeholder="Enter minimum order cost"
                                            value={formData.minOrderCost}
                                            onChange={(e: any) => handleChange("minOrderCost", e.target.value)}
                                        />
                                    </div>
                                )}
                            </>
                        )}

                        {/* Flat Rate */}
                        {formData.shippingMethod === "flat_rate" && (
                            <>
                                <div className="form-group">
                                    <label className="font-medium">{__("Cost", "multivendorx")}</label>
                                    <BasicInput
                                        type="number"
                                        name="flatRateCost"
                                        placeholder="Enter cost"
                                        value={formData.flatRateCost}
                                        onChange={(e: any) => handleChange("flatRateCost", e.target.value)}
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="font-medium">{__("Cost of Shipping Class", "multivendorx")}</label>
                                    <BasicInput
                                        type="text"
                                        name="flatRateClassCost"
                                        placeholder="Enter class cost"
                                        value={formData.flatRateClassCost}
                                        onChange={(e: any) => handleChange("flatRateClassCost", e.target.value)}
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="font-medium">{__("Calculation Type", "multivendorx")}</label>
                                    <ToggleSetting
                                        wrapperClass="setting-form-input"
                                        value={formData.flatRateCalculationType}
                                        onChange={(val: string) => handleChange("flatRateCalculationType", val)}
                                        options={[
                                            { key: "per_class", value: "per_class", label: "Per Class" },
                                            { key: "per_order", value: "per_order", label: "Per Order" },
                                        ]}
                                    />
                                </div>
                            </>
                        )}
                    </div>
                </CommonPopup>
            )}
        </>
    );
};

export default DistanceByZoneShipping;

/* global appLocalizer */
import React, { useEffect, useState } from "react";
import { __ } from "@wordpress/i18n";
import { CommonPopup, getApiLink, Table, TableCell } from "zyra";
import { ColumnDef } from "@tanstack/react-table";
import axios from "axios";

// 👉 Type for an order line
interface OrderItem {
  id: number;
  name: string;
  sku: string;
  cost: string;
  discount?: string;
  qty: number;
  total: string;
}

interface ViewCommissionProps {
  open: boolean;
  onClose: () => void;
  commissionId?: number | null;
}

const ViewCommission: React.FC<ViewCommissionProps> = ({ open, onClose, commissionId }) => {
  const [commissionData, setCommissionData] = useState<any>(null);
  const [storeData, setStoreData] = useState<any>(null);
  const [orderData, setOrderData] = useState<any>(null);

  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 5,
  });
  // 👉 Demo data (replace later with API data if needed)
  const demoData: OrderItem[] = [
    {
      id: 1,
      name: "Charcoal Detox",
      sku: "8678",
      cost: "$95.00",
      discount: "-$5.00",
      qty: 1,
      total: "$95.00",
    },
    {
      id: 2,
      name: "Lavender Soap",
      sku: "9023",
      cost: "$12.00",
      qty: 2,
      total: "$24.00",
    },
  ];

  // Add new state
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);

  useEffect(() => {
    if (!commissionId) {
      setCommissionData(null);
      setStoreData(null);
      setOrderData(null);
      setOrderItems([]); // reset
      return;
    }

    axios({
      method: "GET",
      url: getApiLink(appLocalizer, `commission/${commissionId}`),
      headers: { "X-WP-Nonce": appLocalizer.nonce },
    })
      .then((res) => {
        const commission = res.data || {};
        setCommissionData(commission);

        if (commission.store_id) {
          axios({
            method: "GET",
            url: getApiLink(appLocalizer, `store/${commission.store_id}`),
            headers: { "X-WP-Nonce": appLocalizer.nonce },
          })
            .then((storeRes) => {
              setStoreData(storeRes.data || {});
            })
            .catch(() => setStoreData(null));
        }

        if (commission.order_id) {
          axios({
            method: "GET",
            url: `${appLocalizer.apiUrl}/wc/v3/orders/${commission.order_id}`,
            headers: { "X-WP-Nonce": appLocalizer.nonce },
          })
            .then((orderRes) => {
              const order = orderRes.data || {};
              setOrderData(order);

              // ✅ Convert WooCommerce line_items → OrderItem[]
              if (Array.isArray(order.line_items)) {
                const mapped: OrderItem[] = order.line_items.map((item: any) => {
                  const subtotal = parseFloat(item.subtotal || "0");
                  const total = parseFloat(item.total || "0");
                  const discount = subtotal > total
                    ? `-${appLocalizer.currency_symbol}${(subtotal - total).toFixed(2)}`
                    : undefined;

                  return {
                    id: item.id,
                    name: item.name,
                    sku: item.sku || "-",
                    cost: `${appLocalizer.currency_symbol}${item.price}`,
                    discount,
                    qty: item.quantity,
                    total: `${appLocalizer.currency_symbol}${item.total}`,
                  };
                });
                setOrderItems(mapped);
              } else {
                setOrderItems([]);
              }
            })
            .catch(() => {
              setOrderData(null);
              setOrderItems([]);
            });
        }
      })
      .catch(() => {
        setCommissionData(null);
        setStoreData(null);
        setOrderData(null);
        setOrderItems([]);
      });
  }, [commissionId]);


  console.log('Commission:', commissionData);
  console.log('Store:', storeData);
  console.log('Order:', orderData);
  console.log('orderitem', orderItems)
  const popupColumns: ColumnDef<OrderItem>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <input
          type="checkbox"
          checked={table.getIsAllRowsSelected()}
          onChange={table.getToggleAllRowsSelectedHandler()}
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={row.getIsSelected()}
          onChange={row.getToggleSelectedHandler()}
        />
      ),
    },
    {
      header: __("Product", "multivendorx"),
      cell: ({ row }) => (
        <TableCell title={row.original.name}>
          <div className="name">{row.original.name ?? "-"}</div>
          <div className="sub-text"> Sku: {row.original.sku ?? "-"} </div>
        </TableCell>
      ),
    },
    {
      header: __("Cost", "multivendorx"),
      cell: ({ row }) => (
        <TableCell title={row.original.cost}>{row.original.cost ?? "-"}</TableCell>
      ),
    },
    {
      header: __("Qty", "multivendorx"),
      cell: ({ row }) => (
        <TableCell title={row.original.qty.toString()}>{row.original.qty ?? "-"}</TableCell>
      ),
    },
    {
      header: __("Total", "multivendorx"),
      cell: ({ row }) => (
        <TableCell title={row.original.total}>{row.original.total ?? "-"}</TableCell>
      ),
    },
  ];

  return (
    <CommonPopup
      open={open}
      onClose={onClose}
      width="1200px"
      height="100%"
      header={
        <>
          <div className="title">
            <i className="adminlib-cart"></i>
            {__("View Commission", "multivendorx")}{" "}
            {commissionId ? `#${commissionId}` : ""}
          </div>
          <p>
            {__(
              "Details of this commission including vendor, order breakdown, and notes.",
              "multivendorx"
            )}
          </p>
          <i onClick={onClose} className="icon adminlib-close"></i>
        </>
      }
      footer={
        <>
          <div onClick={onClose} className="admin-btn btn-red">
            {__("Cancel", "multivendorx")}
          </div>
        </>
      }
    >
      <div className="content multi">
        {/* your existing code untouched */}
        <div className="section left">
          <div className="vendor-details">
            <div className="name">{storeData?.name}</div>
            <div className="details">
              <div className="email">
                <i className="adminlib-mail"></i>
                <b>Email:</b> test_vendor@test.com
              </div>
              <div className="method">
                <i className="adminlib-form-paypal-email"></i>
                <b>Payment Method:</b>{" "}
                <span className="admin-badge blue">{orderData?.payment_method}</span>
              </div>
            </div>
          </div>

          <div className="popup-divider"></div>

          <div className="heading">{__("Order Details", "multivendorx")}</div>
          <Table
            data={orderItems}
            columns={popupColumns as ColumnDef<Record<string, any>, any>[]}
            rowSelection={''}
            onRowSelectionChange={''}
            defaultRowsPerPage={10}
            pageCount={''}
            pagination={pagination}
            onPaginationChange={setPagination}
            handlePagination={''}
            perPageOption={[10, 25, 50]}
            typeCounts={[]}
            // totalCounts={totalRows}
          />

          <div className="heading">{__("Shipping", "multivendorx")}</div>
          {/* <Table
            data={demoData}
            columns={popupColumns as ColumnDef<Record<string, any>, any>[]}
            rowSelection={{}}
            onRowSelectionChange={() => {}}
            defaultRowsPerPage={5}
            pagination={pagination}
            onPaginationChange={setPagination}
          /> */}
        </div>

        <div className="section right">
          <div className="heading">{__("Commission Overview", "multivendorx")}</div>
          <div className="commission-details">
            <div className="items">
              <div className="text">Associated Order</div>
              <div className="value">#{commissionData?.order_id}</div>
            </div>
            <div className="items">
              <div className="text">Order Status</div>
              <div className="value">
                <span className="admin-badge yellow">{orderData?.status}</span>
              </div>
            </div>
            <div className="items">
              <div className="text">Commission Status</div>
              <div className="value">
                <span className="admin-badge red">{commissionData?.status}</span>
              </div>
            </div>
            <div className="items">
              <div className="text">Commission Amount</div>
              <div className="value">{appLocalizer.currency_symbol}{commissionData?.amount}</div>
            </div>
            <div className="items">
              <div className="text">Shipping</div>
              <div className="value">{appLocalizer.currency_symbol}{commissionData?.shipping}</div>
            </div>
            <div className="items">
              <div className="text">Tax</div>
              <div className="value">{appLocalizer.currency_symbol}{commissionData?.tax}</div>
            </div>
            <div className="items">
              <div className="text">Total</div>
              <div className="value">{appLocalizer.currency_symbol}{commissionData?.total}</div>
            </div>

          </div>

          <div className="popup-divider"></div>

          <div className="heading">{__("Commission Notes", "multivendorx")}</div>
          <div className="settings-metabox-note">
            <i className="adminlib-info"></i>
            <p>{commissionData?.note}</p>
          </div>
        </div>

      </div>
    </CommonPopup>
  );
};

export default ViewCommission;

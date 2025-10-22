/* global appLocalizer */
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { __ } from '@wordpress/i18n';
import { Table, getApiLink, TableCell } from 'zyra';
import { ColumnDef, RowSelectionState, PaginationState } from '@tanstack/react-table';

type ReportRow = {
    ID: number;
    store_id: number;
    store_name?: string;
    product_id: number;
    product_name?: string;
    product_link?: string;
    name: string;
    email: string;
    reason?: string;
    message?: string;
    created_at: string;
    updated_at: string;
};

const ReportAbuseTable: React.FC = () => {
    const [data, setData] = useState<ReportRow[] | null>(null);
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
    const [totalRows, setTotalRows] = useState<number>(0);

    const [pagination, setPagination] = useState<PaginationState>({
        pageIndex: 0,
        pageSize: 10,
    });
    const [pageCount, setPageCount] = useState(0);

    // Fetch total count on mount
    useEffect(() => {
        axios
            .get(getApiLink(appLocalizer, 'report-abuse'), {
                headers: { 'X-WP-Nonce': appLocalizer.nonce },
                params: { count: true },
            })
            .then((res) => {
                const total = res.data || 0;
                setTotalRows(total);
                setPageCount(Math.ceil(total / pagination.pageSize));
            })
            .catch(() => {
                console.error('Failed to load total rows');
            });
    }, []);

    // Fetch paginated data
    useEffect(() => {
        const currentPage = pagination.pageIndex + 1;
        const rowsPerPage = pagination.pageSize;
        fetchData(rowsPerPage, currentPage);
        setPageCount(Math.ceil(totalRows / rowsPerPage));
    }, [pagination]);

    const fetchData = (rowsPerPage = 10, currentPage = 1) => {
        setData(null);
        axios
            .get<ReportRow[]>(getApiLink(appLocalizer, 'report-abuse'), {
                headers: { 'X-WP-Nonce': appLocalizer.nonce },
                params: {
                    page: currentPage,
                    row: rowsPerPage,
                },
            })
            .then((res) => setData(res.data || []))
            .catch(() => {
                console.error('Failed to load report abuse data');
                setData([]);
            });
    };

    const columns: ColumnDef<ReportRow>[] = [
        {
            id: 'select',
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
            header: __('Store Name', 'multivendorx'),
            cell: ({ row }) => (
                <TableCell title={row.original.store_name || '-'}>
                    {row.original.store_name ? (
                        <a
                            href={`${window.location.origin}/wp-admin/admin.php?page=multivendorx#&tab=stores&edit/${row.original.store_id}`}
                            target="_blank"
                            rel="noreferrer"
                        >
                            {row.original.store_name}
                        </a>
                    ) : (
                        '-'
                    )}
                </TableCell>
            ),
        },        
        {
            header: __('Product Name', 'multivendorx'),
            cell: ({ row }) => (
                <TableCell title={row.original.product_name || '-'}>
                    {row.original.product_name ? (
                        <a href={row.original.product_link} target="_blank" rel="noreferrer">
                            {row.original.product_name}
                        </a>
                    ) : (
                        '-'
                    )}
                </TableCell>
            ),
        },
        {
            header: __('Reported By', 'multivendorx'),
            cell: ({ row }) => (
                <TableCell title={`Reported By: ${row.original.name} (${row.original.email})`}>
                    {row.original.name ? `${row.original.name} (${row.original.email})` : '-'}
                </TableCell>
            ),
        },
        {
            header: __('Reason', 'multivendorx'),
            cell: ({ row }) => (
                <TableCell title={row.original.reason || '-'}>
                    {row.original.reason ?? '-'}
                </TableCell>
            ),
        },
        {
            id:'action',
            header: __('Action', 'multivendorx'),
            cell: ({ row }) => (
                <TableCell
                    type="action-dropdown"
                    rowData={row.original}
                    header={{
                        actions: [
                            {
                                label: __('Delete', 'multivendorx'),
                                icon: 'adminlib-delete',
                                onClick: (rowData: ReportRow) => {
                                    if (
                                        confirm(__('Are you sure you want to delete this report?', 'multivendorx'))
                                    ) {
                                        axios
                                            .delete(getApiLink(appLocalizer, `report-abuse/${rowData.ID}`), {
                                                headers: { 'X-WP-Nonce': appLocalizer.nonce },
                                            })
                                            .then(() => {
                                                fetchData(pagination.pageSize, pagination.pageIndex + 1);
                                            })
                                            .catch(() => {
                                                alert(__('Failed to delete report', 'multivendorx'));
                                            });
                                    }
                                },
                                hover: true,
                            },
                        ],
                    }}
                />
            ),
        },
    ];

    return (
        <div className="admin-table-wrapper">
            <Table
                data={data}
                columns={columns as ColumnDef<Record<string, any>, any>[]}
                rowSelection={rowSelection}
                onRowSelectionChange={setRowSelection}
                defaultRowsPerPage={10}
                pageCount={pageCount}
                pagination={pagination}
                onPaginationChange={setPagination}
                handlePagination={fetchData}
                perPageOption={[10, 25, 50]}
                totalCounts={totalRows}
            />
        </div>
    );
};

export default ReportAbuseTable;

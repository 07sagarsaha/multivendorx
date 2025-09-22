/* global appLocalizer */
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { __ } from '@wordpress/i18n';
import ProPopup from '../Popup/Popup';
import { Table, getApiLink, TableCell, AdminBreadcrumbs } from 'zyra';
import Dialog from '@mui/material/Dialog';
import {
    ColumnDef,
    RowSelectionState,
    PaginationState,
} from '@tanstack/react-table';
import defaultImage from '../../assets/images/moowoodle-product-default.png';

// Define RealtimeFilter interface with explicit types
interface RealtimeFilter {
    name: string;
    render: (
        updateFilter: (key: string, value: string) => void,
        filterValue: string | undefined
    ) => React.ReactNode;
}

type FilterData = {
    searchField?: string;
    searchAction?: string;
    courseField?: string;
    productField?: string;
    catagoryField?: string;
    searchCourseField?: string;
};

type CourseRow = {
    id?: number;
    moodle_course_id?: number;
    course_name?: string;
    moodle_url?: string;
    course_short_name?: string;
    category_name?: string;
    category_url?: string;
    date?: string;
    products?: Record<string, string>;
    enroled_user?: number;
    view_users_url?: string;
    productimage?: string;
};

type Category = {
    [key: string]: string;
};

const Course: React.FC = () => {
    const [showDropdown, setShowDropdown] = useState(false);

    const toggleDropdown = (id: any) => {
        if (showDropdown === id) {
            setShowDropdown(false);
            return;
        }
        setShowDropdown(id);
    };
    const [data, setData] = useState<CourseRow[] | null>(null);
    const [category, setCategory] = useState<Category>({});
    const [rowSelection, setRowSelection] = useState<RowSelectionState>(
        {}
    );
    const [totalRows, setTotalRows] = useState<number>(0);
    const [pagination, setPagination] = useState<PaginationState>({
        pageIndex: 0,
        pageSize: 10,
    });
    const [pageCount, setPageCount] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const bulkSelectRef = useRef<HTMLSelectElement>(null);
    const [openDialog, setOpenDialog] = useState(false);
    const [openModal, setOpenModal] = useState(false);
    const [modalDetails, setModalDetails] = useState<string>('');

    // Fetch categories on mount
    useEffect(() => {
        axios({
            method: 'get',
            url: getApiLink(appLocalizer, 'filters'),
            headers: { 'X-WP-Nonce': appLocalizer.nonce },
        })
            .then((response) => {
                setCategory(response.data.category || {});
            })
            .catch(() => {
                setError(__('Failed to load categories', 'moowoodle'));
            });
    }, []);

    // add this inside your component
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            // if click is not on dropdown toggle or inside dropdown → close it
            if (
                !(e.target as HTMLElement).closest('.action-dropdown') &&
                !(e.target as HTMLElement).closest(
                    '.adminlib-more-vertical'
                )
            ) {
                setShowDropdown(false);
            }
        };

        document.addEventListener('click', handleClickOutside);
        return () =>
            document.removeEventListener('click', handleClickOutside);
    }, []);

    // Fetch total rows on mount
    useEffect(() => {
        axios({
            method: 'GET',
            url: getApiLink(appLocalizer, 'courses'),
            headers: { 'X-WP-Nonce': appLocalizer.nonce },
            params: { count: true },
        })
            .then((response) => {
                setTotalRows(response.data || 0);
                setPageCount(
                    Math.ceil(response.data / pagination.pageSize)
                );
            })
            .catch(() => {
                setError(__('Failed to load total rows', 'moowoodle'));
            });
    }, []);

    useEffect(() => {
        const currentPage = pagination.pageIndex + 1;
        const rowsPerPage = pagination.pageSize;
        requestData(rowsPerPage, currentPage);
        setPageCount(Math.ceil(totalRows / rowsPerPage));
    }, [pagination]);

    // Fetch data from backend.
    function requestData(
        rowsPerPage = 10,
        currentPage = 1,
        courseField = '',
        productField = '',
        catagoryField = '',
        searchAction = 'course',
        searchCourseField = ''
    ) {
        setData(null);
        axios({
            method: 'GET',
            url: getApiLink(appLocalizer, 'courses'),
            headers: { 'X-WP-Nonce': appLocalizer.nonce },
            params: {
                page: currentPage,
                row: rowsPerPage,
                course: courseField,
                product: productField,
                catagory: catagoryField,
                searchaction: searchAction,
                search: searchCourseField,
            },
        })
            .then((response) => {
                setData(response.data || []);
            })
            .catch(() => {
                setError(__('Failed to load courses', 'moowoodle'));
                setData([]);
            });
    }

    // Handle pagination and filter changes
    const requestApiForData = (rowsPerPage: number, currentPage: number, filterData: FilterData) => {
        requestData(
            rowsPerPage,
            currentPage,
            filterData.courseField,
            filterData.productField,
            filterData.catagoryField,
            filterData.searchAction,
            filterData.searchCourseField
        );
    };

    // Handle single row action
    const handleSingleAction = (
        actionName: string,
        courseId: number,
        moodleCourseId: number
    ) => {
        if (appLocalizer.khali_dabba) {
            setData(null);
            axios({
                method: 'post',
                url: getApiLink(appLocalizer, 'courses'),
                headers: { 'X-WP-Nonce': appLocalizer.nonce },
                data: {
                    selected_action: actionName,
                    course_ids: [
                        {
                            course_id: courseId,
                            moodle_course_id: moodleCourseId,
                        },
                    ],
                },
            })
                .then(() => {
                    requestData();
                })
                .catch(() => {
                    setError(__('Failed to perform action', 'moowoodle'));
                    setData([]);
                });
        } else {
            setOpenDialog(true);
        }
    };

    // Handle bulk action
    const handleBulkAction = () => {
        if (appLocalizer.khali_dabba) {
            if (!Object.keys(rowSelection).length) {
                setModalDetails('Select rows.');
                setOpenModal(true);
                return;
            }
            if (!bulkSelectRef.current?.value) {
                setModalDetails('Please select a action.');
                setOpenModal(true);
                return;
            }
            setData(null);
            axios({
                method: 'post',
                url: getApiLink(appLocalizer, 'courses'),
                headers: { 'X-WP-Nonce': appLocalizer.nonce },
                data: {
                    selected_action: bulkSelectRef.current?.value,
                    course_ids: Object.keys(rowSelection).map((index) => {
                        const row = data?.[parseInt(index)];
                        return {
                            course_id: row?.id,
                            moodle_course_id: row?.moodle_course_id,
                        };
                    }),
                },
            })
                .then(() => {
                    setModalDetails('');
                    setOpenModal(false);
                    requestData();
                    setRowSelection({});
                })
                .catch(() => {
                    setError(
                        __('Failed to perform bulk action', 'moowoodle')
                    );
                    setData([]);
                });
        } else {
            setOpenDialog(true);
        }
    };

    // Column definitions
    const columns: ColumnDef<CourseRow>[] = [
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
            header: __('Course', 'moowoodle'),
            cell: ({ row }) => (
                <TableCell title={row.original.course_name || ''}>
                    <img
                        src={row.original.productimage || defaultImage}
                        alt={row.original.course_name || 'Course Image'}
                    />
                    <div className="action-section">
                        <div>{row.original.course_name}</div>
                        <div className="action-btn">
                            <a
                                target="_blank"
                                rel="noreferrer"
                                href={row.original.moodle_url}
                                className=""
                            >
                                Edit course
                            </a>
                        </div>
                    </div>
                </TableCell>
            ),
        },
        {
            header: __('Short name', 'moowoodle'),
            cell: ({ row }) => (
                <TableCell title={row.original.course_short_name || ''}>
                    {row.original.course_short_name || '-'}
                </TableCell>
            ),
        },
        {
            header: __('Category', 'moowoodle'),
            cell: ({ row }) => (
                <TableCell title={__('Category Name')}>
                    {row.original.category_name || '-'}
                </TableCell>
            ),
        },
        {
            header: __('Course duration', 'moowoodle'),
            cell: ({ row }) => (
                <TableCell title={__('Date')}>
                    {row.original.date || '-'}
                </TableCell>
            ),
        },
        {
            header: __('Product', 'moowoodle'),
            cell: ({ row }) => (
                <TableCell title={__('Product Name')}>
                    {row.original.products &&
                        Object.keys(row.original.products).length
                        ? Object.entries(row.original.products).map(
                            ([name, url], index) => (
                                <div key={index} className="action-section">
                                    <div>{name}</div>
                                    <div className="action-btn">
                                        <a
                                            target="_blank"
                                            rel="noreferrer"
                                            href={url}
                                            className=""
                                        >
                                            {__(
                                                'Edit product',
                                                'moowoodle'
                                            )}
                                        </a>
                                    </div>
                                </div>
                            )
                        )
                        : '-'}
                </TableCell>
            ),
        },
        {
            header: __('Enrolled users', 'moowoodle'),
            cell: ({ row }) => (
                <TableCell title={__('Enrolled users')}>
                    <div className="action-section">
                        <div>{row.original.enroled_user || 0}</div>
                        <div className="action-btn">
                            <a
                                target="_blank"
                                rel="noreferrer"
                                href={row.original.view_users_url}
                                className=""
                            >
                                {__('View users', 'moowoodle')}
                            </a>
                        </div>
                    </div>
                </TableCell>
            ),
        },
        {
            id: 'actions',
            header: () => (
                <div className="table-action-column">
                    {__('Action', 'moowoodle')}
                    {!appLocalizer.khali_dabba && (
                        <span className="admin-pro-tag">
                            <i className="adminlib-pro-tag"></i> Pro
                        </span>
                    )}
                </div>
            ),
            // cell: ({ row }) => (
            //     <TableCell title={__('Action', 'moowoodle')}>
            //         <div className="action-section">
            //             <div className="action-icons">
            //                 <i
            //                     className="adminlib-more-vertical"
            //                     onClick={() =>
            //                         toggleDropdown(row.original.id)
            //                     }
            //                 ></i>

            //                 <div
            //                     className={`action-dropdown ${showDropdown === row.original.id
            //                         ? 'show'
            //                         : ''
            //                         }`}
            //                 >
            //                     <ul>
            //                         <li
            //                             onClick={() =>
            //                                 handleSingleAction(
            //                                     'sync_courses',
            //                                     row.original.id!,
            //                                     row.original.moodle_course_id!
            //                                 )
            //                             }
            //                         >
            //                             <i className="adminlib-refresh"></i>
            //                             {__(
            //                                 'Sync Course Data',
            //                                 'moowoodle'
            //                             )}
            //                         </li>

            //                         {row.original.products &&
            //                             Object.keys(row.original.products)
            //                                 .length ? (
            //                             <li
            //                                 onClick={() =>
            //                                     handleSingleAction(
            //                                         'update_product',
            //                                         row.original.id!,
            //                                         row.original
            //                                             .moodle_course_id!
            //                                     )
            //                                 }
            //                             >
            //                                 <i className="adminlib-update-product"></i>
            //                                 {__(
            //                                     'Sync Course Data & Update Product',
            //                                     'moowoodle'
            //                                 )}
            //                             </li>
            //                         ) : (
            //                             <li
            //                                 onClick={() =>
            //                                     handleSingleAction(
            //                                         'create_product',
            //                                         row.original.id!,
            //                                         row.original
            //                                             .moodle_course_id!
            //                                     )
            //                                 }
            //                             >
            //                                 <i className="adminlib-add-product"></i>
            //                                 {__(
            //                                     'Create Product',
            //                                     'moowoodle'
            //                                 )}
            //                             </li>
            //                         )}
            //                     </ul>
            //                 </div>
            //             </div>
            //         </div>
            //     </TableCell>
            // ),
            cell: ({ row }) => (
                <TableCell
                    type="action-dropdown"
                    rowData={row.original}
                    header={{
                        actions: [
                            {
                                label: __('Sync Course Data', 'moowoodle'),
                                icon: 'adminlib-refresh',
                                onClick: (rowData) => {
                                    handleSingleAction(
                                        'sync_courses',
                                        rowData.id!,
                                        rowData.moodle_course_id!
                                    );
                                },
                                hover: true,
                            },
                            {
                                label:
                                    row.original.products &&
                                        Object.keys(row.original.products).length
                                        ? __('Sync Course Data & Update Product', 'moowoodle')
                                        : __('Create Product', 'moowoodle'),
                                icon:
                                    row.original.products &&
                                        Object.keys(row.original.products).length
                                        ? 'adminlib-update-product'
                                        : 'adminlib-add-product',
                                onClick: (rowData) => {
                                    handleSingleAction(
                                        row.original.products &&
                                            Object.keys(row.original.products).length
                                            ? 'update_product'
                                            : 'create_product',
                                        rowData.id!,
                                        rowData.moodle_course_id!
                                    );
                                },
                            },
                        ],
                    }}
                />
            ),

        },
    ];

    const BulkAction: React.FC = () => (
        <div className=" bulk-action">
            <select
                name="action"
                className="basic-select"
                ref={bulkSelectRef}
            >
                <option value="">{__('Bulk actions', 'moowoodle')}</option>
                <option value="sync_courses">
                    {__('Sync course', 'moowoodle')}
                </option>
                <option value="create_product">
                    {__('Create product', 'moowoodle')}
                </option>
                <option value="update_product">
                    {__('Update product', 'moowoodle')}
                </option>
            </select>
            {!appLocalizer.khali_dabba && (
                <span className="admin-pro-tag">pro</span>
            )}
            <button
                name="bulk-action-apply"
                className="admin-btn btn-purple"
                onClick={handleBulkAction}
            >
                {__('Apply', 'moowoodle')}
            </button>
        </div>
    );

    const realtimeFilter: RealtimeFilter[] = [
        {
            name: 'catagoryField',
            render: (updateFilter, filterValue) => (
                <div className="catagory-field">
                    <select
                        className="basic-select"
                        value={filterValue || ''}
                        onChange={(e) => updateFilter('catagoryField', e.target.value)}
                    >
                        <option value="">{__('Category', 'moowoodle')}</option>
                        {Object.entries(category).map(([id, name]) => (
                            <option key={id} value={id}>{name}</option>
                        ))}
                    </select>
                </div>
            ),
        },
    ];

    const searchFilter: RealtimeFilter[] = [
        {
            name: 'searchAction',
            render: (updateFilter, filterValue) => (
                <div className="search-action">
                    <select
                        className="basic-select"
                        value={filterValue || ''}
                        onChange={(e) => {
                            updateFilter('searchAction', e.target.value)
                        }}
                    >
                        <option value="course">{__('Course', 'moowoodle')}</option>
                        <option value="shortname">{__('Short name', 'moowoodle')}</option>
                    </select>
                </div>
            ),
        },
        {
            name: 'searchCourseField',
            render: (updateFilter, filterValue) => (
                <div className="search-section">
                    <input
                        type="text"
                        className="basic-input"
                        value={filterValue || ''}
                        placeholder={__('Search…', 'moowoodle')}
                        onChange={(e) => {
                            updateFilter('searchCourseField', e.target.value)
                        }}
                    />
                    <i className="adminlib-search"></i>
                </div>
            ),
        },

    ];

    return (
        <>
            {openDialog && (
                <Dialog
                    className="admin-module-popup"
                    open={openDialog}
                    onClose={() => setOpenDialog(false)}
                    aria-labelledby="form-dialog-title"
                >
                    <span
                        className="admin-font adminlib-cross"
                        onClick={() => setOpenDialog(false)}
                    ></span>
                    <ProPopup />
                </Dialog>
            )}
            {openModal && modalDetails && (
                <div className="notice notice-error error-modal">
                    <div className="modal-wrapper">
                        <p>{modalDetails}</p>
                        <i
                            onClick={() => setOpenModal(false)}
                            className="admin-font adminLib-cross"
                        ></i>
                    </div>
                </div>
            )}
            <AdminBreadcrumbs
                activeTabIcon="adminlib-subscription-courses"
                description={__(
                    'Comprehensive course data is displayed here, including linked products, enrollment numbers, and related details.',
                    'moowoodle'
                )}
                tabTitle={__('Courses', 'moowoodle')}
            />
            {error && (
                <div className="admin-notice-display-title error">
                    <i className="admin-font adminlib-icon-no"></i>
                    {error}
                </div>
            )}
            <div className="admin-table-wrapper">
                <Table
                    data={data}
                    columns={
                        columns as ColumnDef<Record<string, any>, any>[]
                    }
                    rowSelection={rowSelection}
                    onRowSelectionChange={setRowSelection}
                    realtimeFilter={realtimeFilter}
                    searchFilter={searchFilter}
                    defaultRowsPerPage={10}
                    pageCount={pageCount}
                    pagination={pagination}
                    onPaginationChange={setPagination}
                    handlePagination={requestApiForData}
                    perPageOption={[10, 25, 50]}
                    typeCounts={[]}
                    bulkActionComp={() => <BulkAction />}
                    totalRows={totalRows}
                />
            </div>
        </>
    );
};

export default Course;

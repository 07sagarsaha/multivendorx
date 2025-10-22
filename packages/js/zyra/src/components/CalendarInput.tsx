/**
 * External dependencies
 */
import React, { useState, useRef, useEffect } from 'react';
import { DateRangePicker, Range, RangeKeyDict } from 'react-date-range';
import 'react-date-range/dist/styles.css'; // main style file
import 'react-date-range/dist/theme/default.css'; // theme css file

interface CalendarInputProps {
    wrapperClass?: string;
    inputClass?: string;
    format?: string;
    multiple?: boolean;
    range?: boolean;
    value?: { startDate: Date; endDate: Date }; // better type
    onChange?: (date: { startDate: Date; endDate: Date }) => void;
    proSetting?: boolean;
    showLabel?: boolean;
}

const CalendarInput: React.FC<CalendarInputProps> = (props) => {
    const [selectedRange, setSelectedRange] = useState<Range[]>([
        {
            startDate:
                props.value?.startDate ||
                new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000),
            endDate: props.value?.endDate || new Date(),
            key: 'selection',
        },
    ]);

    const [pickerPosition, setPickerPosition] = useState<'top' | 'bottom'>('bottom');
    const dateRef = useRef<HTMLDivElement | null>(null);
    const [openDatePicker, setOpenDatePicker] = useState(false);
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                openDatePicker &&
                dateRef.current &&
                !dateRef.current.contains(event.target as Node)
            ) {
                setOpenDatePicker(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [openDatePicker]);
    const handleDateOpen = () => {
        if (dateRef.current) {
            const rect = dateRef.current.getBoundingClientRect();
            const viewportHeight = window.innerHeight;
            setPickerPosition(viewportHeight - rect.bottom < 300 ? 'top' : 'bottom');
        }
        setOpenDatePicker((prev) => !prev);
    };

    const handleDateChange = (ranges: RangeKeyDict) => {
        const selection: Range = ranges.selection;

        if (selection?.endDate instanceof Date) {
            // ensure end of day for endDate
            selection.endDate.setHours(23, 59, 59, 999);
        }

        const newRange = [
            {
                startDate: selection.startDate || new Date(),
                endDate: selection.endDate || new Date(),
                key: selection.key || 'selection',
            },
        ];

        setSelectedRange(newRange);
        props.onChange?.({
            startDate: newRange[0].startDate!,
            endDate: newRange[0].endDate!,
        });
    };

    const getLabel = () => {
        const start = selectedRange[0].startDate!;
        const end = selectedRange[0].endDate!;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Today
        if (start.toDateString() === today.toDateString() && end.toDateString() === today.toDateString()) {
            return "Today";
        }

        // Yesterday
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        if (start.toDateString() === yesterday.toDateString() && end.toDateString() === yesterday.toDateString()) {
            return "Yesterday";
        }

        // This Week
        const dayOfWeek = today.getDay();
        const mondayThisWeek = new Date(today);
        mondayThisWeek.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
        const sundayThisWeek = new Date(mondayThisWeek);
        sundayThisWeek.setDate(mondayThisWeek.getDate() + 6);

        if (start.toDateString() === mondayThisWeek.toDateString() && end.toDateString() === sundayThisWeek.toDateString()) {
            return "This Week";
        }

        // Last Week
        const mondayLastWeek = new Date(mondayThisWeek);
        mondayLastWeek.setDate(mondayThisWeek.getDate() - 7);
        const sundayLastWeek = new Date(mondayLastWeek);
        sundayLastWeek.setDate(mondayLastWeek.getDate() + 6);

        if (start.toDateString() === mondayLastWeek.toDateString() && end.toDateString() === sundayLastWeek.toDateString()) {
            return "Last Week";
        }

        // This Month
        const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

        if (start.toDateString() === firstOfMonth.toDateString() && end.toDateString() === lastOfMonth.toDateString()) {
            return "This Month";
        }

        // Last Month
        const firstOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);

        if (start.toDateString() === firstOfLastMonth.toDateString() && end.toDateString() === lastOfLastMonth.toDateString()) {
            return "Last Month";
        }

        // If no match, show nothing
        return "";
    };



    return (
        <div className={props.wrapperClass}>
            <div className="date-picker-section-wrapper" ref={dateRef}>
                {props.showLabel && getLabel() && (
                    <div className="date-label">{getLabel()}</div>
                )}

                <input
                    value={`${selectedRange[0].startDate?.toLocaleDateString('en-US', {
                        month: 'short',
                        day: '2-digit',
                        year: 'numeric',
                    })} - ${selectedRange[0].endDate?.toLocaleDateString('en-US', {
                        month: 'short',
                        day: '2-digit',
                        year: 'numeric',
                    })}`}
                    onClick={handleDateOpen}
                    className={props.inputClass || 'basic-input date'}
                    type="text"
                    readOnly
                    placeholder="DD/MM/YYYY"
                />
                {openDatePicker && (
                    <div
                        className={`date-picker ${pickerPosition === 'top' ? 'open-top' : 'open-bottom'
                            }`}
                        id="date-picker-wrapper"
                    >
                        <DateRangePicker
                            ranges={selectedRange}
                            months={1}
                            direction="vertical"
                            scroll={{ enabled: true }}
                            maxDate={new Date()}
                            onChange={handleDateChange}
                        />
                    </div>
                )}
            </div>
            {props.proSetting && (
                <span className="admin-pro-tag">
                    <i className="adminlib-pro-tag"></i>Pro
                </span>
            )}
        </div>
    );
};

export default CalendarInput;

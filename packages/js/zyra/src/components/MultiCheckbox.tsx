import React, { useState, ChangeEvent, MouseEvent } from 'react';

// Types
interface Option {
    key?: string;
    value: string;
    label?: string;
    img1?: string;
    img2?: string;
    name?: string;
    proSetting?: boolean;
    hints?: string;
    desc?: string;
}

interface MultiCheckBoxProps {
    wrapperClass?: string;
    selectDeselect?: boolean;
    addNewBtn?: string;
    selectDeselectClass?: string;
    selectDeselectValue?: string;
    onMultiSelectDeselectChange?: (
        e: ChangeEvent<HTMLInputElement> | MouseEvent<HTMLButtonElement | HTMLInputElement>
    ) => void;
    options: Option[];
    value?: string[];
    inputWrapperClass?: string;
    rightContent?: boolean;
    rightContentClass?: string;
    inputInnerWrapperClass?: string;
    tour?: string;
    inputClass?: string;
    idPrefix?: string;
    type?: 'checkbox' | 'radio' | 'checkbox-custom-img';
    onChange?: (e: ChangeEvent<HTMLInputElement> | string[]) => void;
    proChanged?: () => void;
    proSetting?: boolean;
    hintOuterClass?: string;
    description?: string;
    descClass?: string;
    hintInnerClass?: string;
    khali_dabba: boolean;
}

const MultiCheckBox: React.FC<MultiCheckBoxProps> = (props) => {
    const [localOptions, setLocalOptions] = useState<Option[]>(props.options);
    const [showNewInput, setShowNewInput] = useState(false);
    const [newOptionValue, setNewOptionValue] = useState('');

    const allSelected = props.value?.length === localOptions.length;
    const selectedCount = props.value?.length ?? 0;

    const handleCheckboxChange = (directionValue: string, isChecked: boolean) => {
        let updatedValue = [...(props.value as string[])];
        updatedValue = updatedValue.filter((element) => element !== directionValue);

        if (isChecked) {
            updatedValue.push(directionValue);
        }

        if (props.onChange) {
            props.onChange(updatedValue);
        }
    };

    const handleAddNewClick = () => {
        setShowNewInput(true);
    };

    const handleSaveNewOption = () => {
        if (!newOptionValue.trim()) return;

        const newOption: Option = {
            key: `${Date.now()}`,
            value: newOptionValue.trim().toLowerCase().replace(/\s+/g, '-'),
            label: newOptionValue.trim(),
        };

        const updatedOptions = [...localOptions, newOption];
        setLocalOptions(updatedOptions);
        setNewOptionValue('');
        setShowNewInput(false);
    };

    return (
        <>
            <div className={props.wrapperClass}>
                {props.selectDeselect && (
                    <div className="checkbox-list-header">
                        <div className="checkbox">
                            <input
                                type="checkbox"
                                checked={allSelected}
                                onChange={(e) => props.onMultiSelectDeselectChange?.(e)}
                                className={!allSelected && selectedCount > 0 ? 'minus-icon' : ''}
                            />
                            <span>{selectedCount} items</span>
                        </div>
                    </div>
                )}

                {localOptions.map((option) => {
                    const checked = props.value?.includes(option.value) ?? false;

                    return (
                        <div
                            key={option.key}
                            className={props.inputWrapperClass}
                            onClick={(e) => {
                                const tag = (e.target as HTMLElement).tagName;
                                if (tag === 'INPUT' || tag === 'LABEL' || tag === 'BUTTON') return;

                                if (props.type === 'checkbox-custom-img') {
                                    handleCheckboxChange(option.value, !checked);
                                } else if (option.proSetting && !props.khali_dabba) {
                                    props.proChanged?.();
                                } else {
                                    const syntheticEvent = {
                                        target: { value: option.value, checked: !checked },
                                    } as unknown as ChangeEvent<HTMLInputElement>;
                                    props.onChange?.(syntheticEvent);
                                }
                            }}
                        >
                            {props.rightContent && (
                                <p
                                    className={props.rightContentClass}
                                    dangerouslySetInnerHTML={{
                                        __html: option.label ?? '',
                                    }}
                                ></p>
                            )}

                            <div className={props.inputInnerWrapperClass} data-tour={props.tour}>
                                <input
                                    className={props.inputClass}
                                    id={`${props.idPrefix}-${option.key}`}
                                    type={props.type?.split('-')[0] || 'checkbox'}
                                    name={option.name || 'basic-input'}
                                    value={option.value}
                                    checked={checked}
                                    onChange={(e) => {
                                        if (props.type === 'checkbox-custom-img') {
                                            handleCheckboxChange(option.value, e.target.checked);
                                        } else if (option.proSetting && !props.khali_dabba) {
                                            props.proChanged?.();
                                        } else {
                                            props.onChange?.(e);
                                        }
                                    }}
                                />
                                <label htmlFor={`${props.idPrefix}-${option.key}`}>
                                    {option.label}
                                </label>
                                {/* <div className="des">Lorem ipsum dolor sit amet.</div> */}
                            </div>
                        </div>
                    );
                })}

                {props.description && (
                    <p
                        className={props.descClass}
                        dangerouslySetInnerHTML={{ __html: props.description }}
                    ></p>
                )}
            </div>
            {/* Add New Section */}
            {props.addNewBtn && (
                showNewInput ? (
                    <div className="add-new-option">
                        <input
                            type="text"
                            value={newOptionValue}
                            onChange={(e) => setNewOptionValue(e.target.value)}
                            placeholder="Enter new option"
                            className="basic-input"
                        />
                        <button className="admin-btn btn-green" onClick={handleSaveNewOption}>
                            <i className="adminlib-plus-circle-o"></i> Save
                        </button>
                    </div>
                ) : (
                    <div className="add-new-option">
                    <div className="admin-btn btn-purple" onClick={handleAddNewClick}>
                        <i className="adminlib-plus-circle-o"></i> {props.addNewBtn}
                    </div>
                    </div>
                )
            )}

        </>
    );
};

export default MultiCheckBox;

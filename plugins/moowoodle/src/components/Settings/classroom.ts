import { __ } from "@wordpress/i18n";

export default {
    id: "classroom",
    priority: 40,
    name: __( "Classroom", "moowoodle" ),
    desc: __( "Manage group purchase", "moowoodle" ),
    icon: "adminlib-vpn-key",
    submitUrl: "settings",
    proDependent: true,
    modal: [
        {
            key: "group_purchase_enable",
            type: "checkbox",
            desc: __( "Enabling group purchase", "moowoodle" ),
            label: __( "Group Purchase", "moowoodle" ),
            options: [
                {
                    key: "group_purchase_enable",
                    value: "group_purchase_enable",
                },
            ],
            proSetting: true,
            look: "toggle",
        },
        {
            key: "course_rollback",
            type: "checkbox",
            desc: __( "Enabling course rollback", "moowoodle" ),
            label: __( "Course Rollback", "moowoodle" ),
            options: [
                {
                    key: "course_rollback",
                    value: "course_rollback",
                },
            ],
            proSetting: true,
            look: "toggle",
        },
        {
            key: "gift_someone",
            type: "checkbox",
            desc: __( "Enabling gift someone", "moowoodle" ),
            label: __( "Gift Someone", "moowoodle" ),
            options: [
                {
                    key: "gift_someone",
                    value: "gift_someone",
                },
            ],
            proSetting: true,
            look: "toggle",
        },
    ],
};

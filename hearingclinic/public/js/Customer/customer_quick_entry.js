console.log("=== FILE LOADED v16 - Prevent Edit Full Form redirect ===");

frappe.provide('frappe.ui.form');

const OriginalCustomerQuickEntry = frappe.ui.form.CustomerQuickEntryForm;

try {
    frappe.ui.form.CustomerQuickEntryForm = class CustomCustomerQuickEntryForm extends OriginalCustomerQuickEntry {
        constructor(doctype, after_insert, init_callback, doc, force) {
            super(doctype, after_insert, init_callback, doc, force);
            this.skip_redirect_on_error = true;
        }

        render_dialog() {
            super.render_dialog();

            // Remove the "Edit Full Form" button to prevent navigation to unsaved docs
            const editFullFormBtn = this.dialog.wrapper.find('.btn-modal-secondary:contains("Edit Full Form")');
            if (editFullFormBtn.length) {
                console.log("Removing Edit Full Form button to prevent navigation errors");
                editFullFormBtn.remove();
            }
        }

        get_variant_fields() {
            console.log("=== GET VARIANT FIELDS (CUSTOM) ===");
            
            var variant_fields = [

                {
                    label: __("NRIC/Passport Number"),
                    fieldname: "custom_nricpassport",
                    fieldtype: "Data"
                },
                {
                    label: __("Date of Birth"),
                    fieldname: "custom_date_of_birth",
                    fieldtype: "Date"
                },
                {
                    label: __("Ethnicity"),
                    fieldname: "custom_ethnicity",
                    fieldtype: "Select",
                    options: [
                        "Chinese",
                        "Malay",
                        "Indian",
                        "Other"
                    ].join("\n")
                },
                {
                    fieldtype: "Section Break",
                    label: __("Primary Contact Details"),
                    collapsible: 0
                },
                {
                    label: __("Email Id"),
                    fieldname: "email_address",
                    fieldtype: "Data",
                    options: "Email"
                },
                {
                    fieldtype: "Column Break"
                },
                {
                    label: __("Mobile Number"),
                    fieldname: "mobile_number",
                    fieldtype: "Data"
                },
                {
                    label: __("Contact Relatonship"),
                    fieldname: "custom_contact_relationship",
                    fieldtype: "Link",
                    options: "Relationship"
                },
                {
                    label: __("Contact Name (if different)"),
                    fieldname: "custom_contact_name",
                    fieldtype: "Data",
                },
                {
                    fieldtype: "Section Break",
                    label: __("Primary Address Details"),
                    collapsible: 0
                },
                {
                    label: __("Address Line 1 (Street)"),
                    fieldname: "address_line1",
                    fieldtype: "Data"
                },
                {
                    label: __("Address Line 2 (Condo, Apt No, Suite)"),
                    fieldname: "address_line2",
                    fieldtype: "Data"
                },
                {
                    label: __("ZIP Code"),
                    fieldname: "pincode",
                    fieldtype: "Data"
                },
                {
                    fieldtype: "Column Break"
                },
                {
                    label: __("City"),
                    fieldname: "city",
                    fieldtype: "Data"
                },
                {
                    label: __("State/Province"),
                    fieldname: "custom_stateprovince",  
                    fieldtype: "Link",                  
                    options: "State"                     
                },
                {
                    label: __("Country"),
                    fieldname: "country",
                    fieldtype: "Link",
                    options: "Country"
                },
                {
                    label: __("Customer POS Id"),
                    fieldname: "customer_pos_id",
                    fieldtype: "Data",
                    hidden: 1
                }
            ];
            
            console.log("Returning custom variant fields with custom_stateprovince");
            return variant_fields;
        }
    };
    console.log("=== OVERRIDE COMPLETE ===");
} catch(e) {
    console.error("=== ERROR ===", e);
}

frappe.ui.form.on('Customer', {
    refresh(frm) {
        // Run both refresh logics
        format_customer_id(frm);
        add_customer_since_badge(frm);
    },

    onload(frm) {
        format_customer_id(frm);
        add_customer_since_badge(frm);
    },

    custom_customer_id(frm) {
        format_customer_id(frm);
    },

    custom_customer_since(frm) {
        add_customer_since_badge(frm);
    }
});

function format_customer_id(frm) {
    setTimeout(() => {
        const customer_id = frm.doc.custom_customer_id;
        if (!customer_id) return;

        let color, bg_color;
        if (customer_id.startsWith('F-')) {
            color = '#C2185B';  // Pink for Female
            bg_color = '#FCE4EC';
        } else if (customer_id.startsWith('M-')) {
            color = '#1976D2';  // Blue for Male
            bg_color = '#E3F2FD';
        } else {
            color = '#757575';  // Gray for Unknown
            bg_color = '#F5F5F5';
        }

        const field = frm.fields_dict.custom_customer_id;
        if (!field) return;

        if (field.label_area) {
            field.label_area.style.display = 'none';
        }

        const wrapper = field.$wrapper;

        wrapper.find('.control-value').css({
            'font-size': '14px',
            'font-weight': '600',
            'color': color,
            'background-color': bg_color,
            'padding': '6px 12px',
            'border-radius': '4px',
            'border': '1px solid ' + color,
            'text-align': 'center',
            'letter-spacing': '0.5px',
            'font-family': 'monospace',
            'display': 'inline-block',
            'min-width': '100px'
        });

        wrapper.find('input').css({
            'font-size': '14px',
            'font-weight': '600',
            'color': color,
            'background-color': bg_color,
            'padding': '6px 12px',
            'border-radius': '4px',
            'border': '1px solid ' + color,
            'text-align': 'center',
            'letter-spacing': '0.5px',
            'font-family': 'monospace'
        });
    }, 100);
}
function add_customer_since_badge(frm) {
    if (!frm.doc.custom_customer_since || !frm.doc.name) return;
    
    // Remove existing badge if any
    frm.get_field('custom_customer_since').$wrapper.find('.customer-since-badge').remove();
    frm.get_field('custom_customer_since').$wrapper.find('.control-value').empty();
    
    // Define your cutoff date here (format: YYYY-MM-DD)
    const CUTOFF_DATE = '2025-11-27'; // Change this to your desired cutoff
    
    // Call server-side method to get badge info
    frappe.call({
        method: 'hearingclinic.hearingclinic.api.customer_badge.get_customer_badge_info',
        args: {
            customer: frm.doc.name
        },
        callback: function(r) {
            if (r.message && r.message.customer_since) {
                // Format date to MM/YYYY
                const date_parts = r.message.customer_since.split('-');
                const formatted_date = `${date_parts[1]}/${date_parts[0]}`;
                
                // Determine badge color based on cutoff date
                const cutoff = new Date(CUTOFF_DATE);
                const customer_date = new Date(r.message.customer_since);
                
                let text_color, bg_color, border_color;
                if (customer_date < cutoff) {
                    // Yellow/Gold for before cutoff
                    text_color = '#F57F17';
                    bg_color = '#FFF9C4';
                    border_color = '#F9A825';
                } else {
                    // Blue for after cutoff
                    text_color = '#1976D2';
                    bg_color = '#E3F2FD';
                    border_color = '#42A5F5';
                }
                
                // Determine P/NP - THIS IS THE KEY FIX
                const customer_type = r.message.has_hearing_aid ? 'Purchased' : 'Not Purchased';
                
                // Determine P/NP badge colors
                let type_color, type_bg, type_border;
                if (customer_type === 'Purchased') {
                    type_color = '#2E7D32';      // Dark green
                    type_bg = '#C8E6C9';         // Light green
                    type_border = '#4CAF50';     // Green
                } else {
                    type_color = '#C62828';      // Dark red
                    type_bg = '#FFCDD2';         // Light red
                    type_border = '#EF5350';     // Red
                }
                
                // Display the badge with the correct colors
                display_badge(frm, formatted_date, customer_type, text_color, bg_color, border_color, type_color, type_bg, type_border);
            }
        }
    });
}

function display_badge(frm, formatted_date, customer_type, text_color, bg_color, border_color, type_color, type_bg, type_border) {
    const field = frm.fields_dict.custom_customer_since;
    if (!field) return;
    
    // Only apply badge styling if field is read-only
    if (frm.get_field('custom_customer_since').df.read_only) {
        // Hide the label
        if (field.label_area) {
            field.label_area.style.display = 'none';
        }
        
        const wrapper = field.$wrapper;

        // Remove the like-disabled-input class that adds grey background
        wrapper.find('.control-value').removeClass('like-disabled-input');

        // Clear any existing styles from the wrapper
        wrapper.find('.control-value').removeAttr('style');
        wrapper.find('.static-area').removeAttr('style');
        wrapper.css({
            'background': 'transparent',
            'background-color': 'transparent'
        });
        
        // Create two separate badges with improved styling
        const badge_html = `
            <div style="display: flex; gap: 8px; align-items: center;">
                <div class="customer-since-badge" style="
                    font-size: 14px;
                    font-weight: 600;
                    color: ${text_color};
                    background: linear-gradient(135deg, ${bg_color} 0%, ${bg_color}ee 100%);
                    padding: 8px 16px;
                    border-radius: 6px;
                    border: 2px solid ${border_color};
                    text-align: center;
                    letter-spacing: 1px;
                    display: inline-block;
                    min-width: 100px;
                    font-family: monospace;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    transition: all 0.3s ease;
                ">
                    📅 ${formatted_date}
                </div>
                <div class="customer-type-badge" style="
                    font-size: 19px;
                    font-weight: 600;
                    color: ${type_color};
                    background: linear-gradient(135deg, ${type_bg} 0%, ${type_bg}ee 100%);
                    padding: 4px 8px;
                    border-radius: 6px;
                    border: 2px solid ${type_border};
                    text-align: center;
                    letter-spacing: 1px;
                    font-family: monospace;
                    display: inline-block;
                    min-width: 60px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    transition: all 0.3s ease;
                ">
                    ${customer_type === 'Purchased' ? '🦻🏻' : '🙉'} 
                </div>
            </div>
        `;
        
        // Add badges to the field wrapper
        wrapper.find('.control-value').html(badge_html);
    }
}
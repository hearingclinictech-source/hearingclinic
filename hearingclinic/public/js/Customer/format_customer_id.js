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
                    text_color = '#7B1FA2';
                    bg_color = '#E1BEE7';
                    border_color = '#AB47BC';
                } else {
                    // Blue for after cutoff
                    text_color = '#00897B';
                    bg_color = '#B2DFDB';
                    border_color = '#26A69A';
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
                    padding: 6px 12px;
                    border-radius: 4px;
                    border: 1px solid ${border_color};
                    text-align: center;
                    letter-spacing: 1px;
                    display: inline-block;
                    min-width: 100px;
                    font-family: monospace;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    transition: all 0.3s ease;
                ">
                
                <svg height="25px" width="25px" fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><title>account-plus-outline</title><path d="M15,4A4,4 0 0,0 11,8A4,4 0 0,0 15,12A4,4 0 0,0 19,8A4,4 0 0,0 15,4M15,5.9C16.16,5.9 17.1,6.84 17.1,8C17.1,9.16 16.16,10.1 15,10.1A2.1,2.1 0 0,1 12.9,8A2.1,2.1 0 0,1 15,5.9M4,7V10H1V12H4V15H6V12H9V10H6V7H4M15,13C12.33,13 7,14.33 7,17V20H23V17C23,14.33 17.67,13 15,13M15,14.9C17.97,14.9 21.1,16.36 21.1,17V18.1H8.9V17C8.9,16.36 12,14.9 15,14.9Z" /></svg>
                 ${formatted_date}
                </div>
                <div class="customer-type-badge" style="
                    font-size: 14px;
                    font-weight: 600;
                    color: ${type_color};
                    background: linear-gradient(135deg, ${type_bg} 0%, ${type_bg}ee 100%);
                    padding: 6px 6px;
                    border-radius: 4px;
                    border: 1px solid ${type_border};
                    text-align: center;
                    letter-spacing: 1px;
                    font-family: monospace;
                    display: inline-block;
                    min-width: 40px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    transition: all 0.3s ease;
                ">
                <svg width="25px" height="25px" fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    ${customer_type === 'Purchased' ? 
                        '<path d="M9 20C9 21.1 8.1 22 7 22S5 21.1 5 20 5.9 18 7 18 9 18.9 9 20M17 18C15.9 18 15 18.9 15 20S15.9 22 17 22 19 21.1 19 20 18.1 18 17 18M7.2 14.8V14.7L8.1 13H15.5C16.2 13 16.9 12.6 17.2 12L21.1 5L19.4 4L15.5 11H8.5L4.3 2H1V4H3L6.6 11.6L5.2 14C5.1 14.3 5 14.6 5 15C5 16.1 5.9 17 7 17H19V15H7.4C7.3 15 7.2 14.9 7.2 14.8M18 2.8L16.6 1.4L11.8 6.2L9.2 3.6L7.8 5L11.8 9L18 2.8Z" />'
                         : '<path d="M22.73,22.73L1.27,1.27L0,2.54L4.39,6.93L6.6,11.59L5.25,14.04C5.09,14.32 5,14.65 5,15A2,2 0 0,0 7,17H14.46L15.84,18.38C15.34,18.74 15,19.33 15,20A2,2 0 0,0 17,22C17.67,22 18.26,21.67 18.62,21.16L21.46,24L22.73,22.73M7.42,15A0.25,0.25 0 0,1 7.17,14.75L7.2,14.63L8.1,13H10.46L12.46,15H7.42M15.55,13C16.3,13 16.96,12.59 17.3,11.97L20.88,5.5C20.96,5.34 21,5.17 21,5A1,1 0 0,0 20,4H6.54L15.55,13M7,18A2,2 0 0,0 5,20A2,2 0 0,0 7,22A2,2 0 0,0 9,20A2,2 0 0,0 7,18Z" />'} 
                </svg>
                </div>
            </div>

        `;
        
        // Add badges to the field wrapper
        wrapper.find('.control-value').html(badge_html);
    }
}
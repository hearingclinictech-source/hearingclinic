/**
 * Jest Setup File
 *
 * This file runs before all tests and sets up the testing environment
 */

// Mock frappe global object
global.frappe = {
	ui: {
		form: {
			make_control: jest.fn()
		}
	},
	model: {
		get_value: jest.fn(),
		set_value: jest.fn(),
		get_doc: jest.fn()
	},
	call: jest.fn((opts) => {
		// Mock successful API call
		if (opts.callback) {
			opts.callback({ message: {} });
		}
		return Promise.resolve({ message: {} });
	}),
	msgprint: jest.fn(),
	throw: jest.fn((msg) => {
		throw new Error(msg);
	}),
	db: {
		get_value: jest.fn(),
		get_list: jest.fn()
	},
	datetime: {
		nowdate: jest.fn(() => '2024-01-15'),
		add_days: jest.fn(),
		add_months: jest.fn()
	},
	format: jest.fn((value) => value),
	format_value: jest.fn((value) => value),
	get_doc: jest.fn(),
	set_route: jest.fn(),
	show_alert: jest.fn(),
	validated: true,
	user: {
		name: 'Administrator',
		has_role: jest.fn(() => true)
	}
};

// Mock $ (jQuery)
global.$ = jest.fn(() => ({
	val: jest.fn(),
	text: jest.fn(),
	html: jest.fn(),
	hide: jest.fn(),
	show: jest.fn(),
	addClass: jest.fn(),
	removeClass: jest.fn(),
	on: jest.fn(),
	off: jest.fn(),
	trigger: jest.fn()
}));

// Mock cur_frm (current form)
global.cur_frm = {
	doc: {},
	fields_dict: {},
	set_value: jest.fn(),
	set_df_property: jest.fn(),
	refresh_field: jest.fn(),
	add_custom_button: jest.fn(),
	clear_table: jest.fn(),
	refresh: jest.fn(),
	save: jest.fn(),
	reload_doc: jest.fn()
};

// Mock __
global.__ = (text) => text;

// Console warnings for unmocked frappe calls
const handler = {
	get(target, prop) {
		if (prop in target) {
			return target[prop];
		}
		console.warn(`Accessing unmocked frappe.${prop}`);
		return undefined;
	}
};

global.frappe = new Proxy(global.frappe, handler);

// Suppress console errors in tests unless explicitly needed
global.console = {
	...console,
	error: jest.fn(),
	warn: jest.fn()
};

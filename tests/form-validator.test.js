/**
 * Form Validator Test Script
 * Run this script to test the form validation framework
 */

// Set up environment
const formValidator = require('../src/js/form-validator.js');
const assert = require('assert');

console.log('Running form validation tests...');

// Mock jQuery and DOM elements for testing
global.$ = function (selector)
{
	return {
		jquery: true,
		val: () => 'test@example.com',
		attr: (name) => name === 'id' ? 'email' : '',
		prop: (name) => name === 'required' ? true : false,
		hasClass: () => false,
		addClass: () => { },
		removeClass: () => { },
		after: () => { },
		show: () => { },
		hide: () => { },
		find: () => [],
		on: () => { },
		each: (callback) => callback(),
		length: 1,
		first: () => this
	};
};

// Mock DOM element
global.document = {
	getElementById: () => ({
		getAttribute: () => '',
		setAttribute: () => { },
		addEventListener: () => { },
		checkValidity: () => true
	}),
	createElement: () => ({
		id: '',
		className: '',
		setAttribute: () => { },
		appendChild: () => { },
		innerHTML: ''
	}),
	querySelector: () => { },
	querySelectorAll: () => []
};

// Simple tests
console.log('Testing email validation...');
assert(formValidator.validateEmail({ val: () => 'test@example.com' }) === true, 'Valid email should pass');
assert(formValidator.validateEmail({ val: () => 'invalid' }) === false, 'Invalid email should fail');

console.log('Testing phone validation...');
assert(formValidator.validatePhone({ val: () => '12345678' }) === true, 'Valid phone should pass');
assert(formValidator.validatePhone({ val: () => '123' }) === false, 'Invalid phone should fail');

console.log('Testing postal code validation...');
assert(formValidator.validatePostalCode({ val: () => '1234', attr: () => '' }) === true, 'Valid postal code should pass');
assert(formValidator.validatePostalCode({ val: () => '12', attr: () => '' }) === false, 'Invalid postal code should fail');

console.log('All tests passed!');

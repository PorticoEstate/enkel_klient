// The autoComplete.js Engine instance creator
const autoCompleteJS = new autoComplete({
	selector: "#location_name",
	data: {
		src: async (query) =>
		{
			if (query.length > 3)
			{
				try
				{
					// Loading placeholder text
					document
						.getElementById("location_name")
						.setAttribute("placeholder", "Loading...");
					Debug.debug("Fetching locations");

					// Use the schema variable to determine the right endpoint
					// schema is defined in each template (nokkelbestilling, helpdesk, etc.)
					const endpoint = schema ? `/${schema}/locations` : '/locations';
					Debug.debug(`${strBaseURL}${endpoint}?query=${encodeURIComponent(query)}`);

					// Fetch External Data Source using new controller endpoint
					const response = await fetch(`${strBaseURL}${endpoint}?query=${encodeURIComponent(query)}`, {
						method: 'GET',
						headers: {
							'Content-Type': 'application/json',
							'Accept': 'application/json'
						}
					});

					if (!response.ok)
					{
						throw new Error(`HTTP error! status: ${response.status}`);
					}

					const data = await response.json();

					// Reset placeholder
					document
						.getElementById("location_name")
						.setAttribute("placeholder", autoCompleteJS.placeHolder);

					return data;
				} catch (error)
				{
					Debug.error('Error fetching locations:', error);
					return [];
				}
			}
			return [];
		},
		keys: ["name"],
		cache: false,
		filter: (list) =>
		{
			// Filter duplicates
			return Array.from(
				new Set(list.map((value) => value.match))
			).map((name) =>
			{
				return list.find((value) => value.match === name);
			});
		}
	},
	placeHolder: "Søk etter adresse, minst 4 tegn",
	resultsList: {
		element: (list, data) =>
		{
			// Add ARIA attributes for accessibility
			list.setAttribute('role', 'listbox');
			list.setAttribute('aria-label', 'Address suggestions');
			
			const info = document.createElement("p");
			if (data.results.length > 0)
			{
				info.innerHTML = `Viser <strong>${data.results.length}</strong> av <strong>${data.matches.length}</strong> resultater`;
			} else
			{
				info.innerHTML = `Fant <strong>${data.matches.length}</strong> resultater for <strong>"${data.query}"</strong>`;
			}
			list.prepend(info);
			
			// Update ARIA attributes on input
			const input = document.querySelector('#location_name');
			if (input) {
				input.setAttribute('aria-expanded', 'true');
			}
		},
		noResults: true,
		maxResults: 150,
		tabSelect: true
	},
	resultItem: {
		element: (item, data) =>
		{
			// Add ARIA attributes for accessibility
			item.setAttribute('role', 'option');
			item.setAttribute('id', `autocomplete-result-${data.index}`);
			item.setAttribute('tabindex', '-1');
			
			item.style = "display: flex; justify-content: space-between;";
			item.innerHTML = `
				<span style="text-overflow: ellipsis; white-space: nowrap; overflow: hidden;">
					${data.match}
				</span>
				<span style="display: flex; align-items: center; font-size: 13px; font-weight: 100; text-transform: uppercase; color: rgba(0,0,0,.2);">
					${data.key}
				</span>`;
		},
		highlight: true
	},
	events: {
		input: {
			selection: (event) =>
			{
				const selection = event.detail.selection.value;
				autoCompleteJS.input.value = selection.name;
				document.getElementById("location_code").value = selection.id;
				document.getElementById('details').style.display = 'block';

				// Reset ARIA attributes when selection is made
				autoCompleteJS.input.setAttribute('aria-expanded', 'false');

				// Trigger validation on the location_name field
				const $locationField = $('#location_name');
				if ($locationField.length)
				{
					// Validate the field now that we have a location_code
					// Check if validateField function exists (legacy system)
					if (typeof validateField === 'function') {
						validateField($locationField);
					} else {
						// For clean architecture, trigger a change event to let extensions handle validation
						$locationField.trigger('change');
					}
				}
			},
			focus: () =>
			{
				if (autoCompleteJS.input.value.length)
				{
					autoCompleteJS.start();
				}
			},
			close: () => {
				// Reset ARIA attributes when dropdown is closed
				autoCompleteJS.input.setAttribute('aria-expanded', 'false');
			}
		}
	}
});

// Blur/unBlur page elements
const togglePageBlur = (action) =>
{
	const elements = {
		title: document.querySelector("h1"),
		selection: document.querySelector(".selection")
	};

	Object.values(elements).forEach(element =>
	{
		if (element)
		{
			element.style.opacity = action === "dim" ? 1 : 0.9;
		}
	});
};

// Add event listeners for focus/blur
["focus", "blur"].forEach((eventType) =>
{
	autoCompleteJS.input.addEventListener(eventType, () =>
	{
		togglePageBlur(eventType === "blur" ? "dim" : "light");
	});
});

// Add keyboard support for dismissing dropdown with ESC
autoCompleteJS.input.addEventListener('keydown', (e) => {
	// Handle Escape key
	if (e.key === 'Escape') {
		// Close the dropdown
		const wrapper = document.querySelector('.autoComplete_wrapper');
		if (wrapper && wrapper.classList.contains('active')) {
			wrapper.classList.remove('active');
			autoCompleteJS.input.setAttribute('aria-expanded', 'false');
			e.preventDefault();
		}
	}
});
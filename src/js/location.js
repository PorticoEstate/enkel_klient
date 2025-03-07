// The autoComplete.js Engine instance creator
const autoCompleteJS = new autoComplete({
	selector: "#location_name",
	data: {
		src: async (query) => {
			if (query.length > 3) {
				try {
					// Loading placeholder text
					document
						.getElementById("location_name")
						.setAttribute("placeholder", "Loading...");

					// Fetch External Data Source using new controller endpoint
					const response = await fetch(`${strBaseURL}/locations?query=${encodeURIComponent(query)}`, {
						method: 'GET',
						headers: {
							'Content-Type': 'application/json',
							'Accept': 'application/json'
						}
					});

					if (!response.ok) {
						throw new Error(`HTTP error! status: ${response.status}`);
					}

					const data = await response.json();

					// Reset placeholder
					document
						.getElementById("location_name")
						.setAttribute("placeholder", autoCompleteJS.placeHolder);

					return data;
				} catch (error) {
					console.error('Error fetching locations:', error);
					return [];
				}
			}
			return [];
		},
		keys: ["name"],
		cache: false,
		filter: (list) => {
			// Filter duplicates
			return Array.from(
				new Set(list.map((value) => value.match))
			).map((name) => {
				return list.find((value) => value.match === name);
			});
		}
	},
	placeHolder: "Søk etter adresse, minst 4 tegn",
	resultsList: {
		element: (list, data) => {
			const info = document.createElement("p");
			if (data.results.length > 0) {
				info.innerHTML = `Viser <strong>${data.results.length}</strong> av <strong>${data.matches.length}</strong> resultater`;
			} else {
				info.innerHTML = `Fant <strong>${data.matches.length}</strong> resultater for <strong>"${data.query}"</strong>`;
			}
			list.prepend(info);
		},
		noResults: true,
		maxResults: 150,
		tabSelect: true
	},
	resultItem: {
		element: (item, data) => {
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
			selection: (event) => {
				const selection = event.detail.selection.value;
				autoCompleteJS.input.value = selection.name;
				document.getElementById("location_code").value = selection.id;
				document.getElementById('details').style.display = 'block';
			},
			focus: () => {
				if (autoCompleteJS.input.value.length) {
					autoCompleteJS.start();
				}
			}
		}
	}
});

// Blur/unBlur page elements
const togglePageBlur = (action) => {
	const elements = {
		title: document.querySelector("h1"),
		selection: document.querySelector(".selection")
	};

	Object.values(elements).forEach(element => {
		if (element) {
			element.style.opacity = action === "dim" ? 1 : 0.3;
		}
	});
};

// Add event listeners for focus/blur
["focus", "blur"].forEach((eventType) => {
	autoCompleteJS.input.addEventListener(eventType, () => {
		togglePageBlur(eventType === "blur" ? "dim" : "light");
	});
});
function showDiv(divId, element)
{
    document.getElementById(divId).style.display = element.checked == true ? 'block' : 'none';
}

// The autoComplete.js Engine instance creator
const autoCompleteJS = new autoComplete({
    selector: "#location_name",
    data: {
        src: async (query) => {
            //          https://tarekraafat.github.io/autoComplete.js/#/configuration?id=src-required
            if (query.length > 3) {
                try {
                    // Loading placeholder text
                    document
                        .getElementById("location_name")
                        .setAttribute("placeholder", "Loading...");
                    // Fetch External Data Source
                    var oArgs = { menuaction: 'property.bolocation.get_locations', query: query };
                    var strURL = phpGWLink('', oArgs, true);
                    const source = await fetch(
                        strURL
                    );
                    const data = await source.json();
                    // Post Loading placeholder text
                    document
                        .getElementById("location_name")
                        .setAttribute("placeholder", autoCompleteJS.placeHolder);
                    // Returns Fetched data
                    return data;
                } catch (error) {
                    return error;
                }
            }
            else {
                return [];
            }
        },
        keys: ["name", "id"],
        cache: false,
        filter: (list) => {
            // Filter duplicates
            // incase of multiple data keys usage
            const filteredResults = Array.from(
                new Set(list.map((value) => value.match))
            ).map((name) => {
                return list.find((value) => value.match === name);
            });

            return filteredResults;
        }
    },
    placeHolder: "Søk etter lokasjon",
    resultsList: {
        element: (list, data) => {
            const info = document.createElement("p");
            if (data.results.length > 0) {
                info.innerHTML = `Viser <strong>${data.results.length}</strong> av <strong>${data.matches.length}</strong> results`;
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
            // Modify Results Item Style
            item.style = "display: flex; justify-content: space-between;";
            // Modify Results Item Content
            item.innerHTML = `
      <span style="text-overflow: ellipsis; white-space: nowrap; ">
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

//              console.log(selection);
            },
            focus: () => {
                if (autoCompleteJS.input.value.length) autoCompleteJS.start();
            }
        }
    }
});

// autoCompleteJS.input.addEventListener("init", function (event) {
//   console.log(event);
// });

// autoCompleteJS.input.addEventListener("response", function (event) {
//   console.log(event.detail);
// });

// autoCompleteJS.input.addEventListener("results", function (event) {
//   console.log(event.detail);
// });

// autoCompleteJS.input.addEventListener("open", function (event) {
//   console.log(event.detail);
// });

// autoCompleteJS.input.addEventListener("navigate", function (event) {
//   console.log(event.detail);
// });


// autoCompleteJS.input.addEventListener("close", function (event) {
//   console.log(event.detail);
// });


// Blur/unBlur page elements
const action = (action) => {
    const title = document.querySelector("h1");
    const selection = document.querySelector(".selection");
    const footer = document.querySelector(".footer");

    if (action === "dim") {
        title.style.opacity = 1;
        selection.style.opacity = 1;
    } else {
        title.style.opacity = 0.3;
        selection.style.opacity = 0.1;
    }
};

// Blur/unBlur page elements on input focus
["focus", "blur"].forEach((eventType) => {
    autoCompleteJS.input.addEventListener(eventType, () => {
        // Blur page elements
        if (eventType === "blur") {
            action("dim");
        } else if (eventType === "focus") {
            // unBlur page elements
            action("light");
        }
    });
});

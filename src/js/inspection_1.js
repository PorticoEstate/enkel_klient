function showDiv(divId, element)
{
	document.getElementById(divId).style.display = element.checked == true ? 'block' : 'none';
}


function handleChangeTilgang(src)
{
	console.log(src.checked);
	const type_br_slokking_1 = document.getElementById('type_br_slokking_1');
	const type_br_slokking_2 = document.getElementById('type_br_slokking_2');
	const type_br_slokking_3 = document.getElementById('type_br_slokking_3');
	const type_br_slokking_4 = document.getElementById('type_br_slokking_4');
	const rokvarsler_1 = document.getElementById('rokvarsler_1');
	const rokvarsler_2 = document.getElementById('rokvarsler_2');
	const rokvarsler_3 = document.getElementById('rokvarsler_3');
	const rokvarsler_4 = document.getElementById('rokvarsler_4');

	if (src.checked === true)
	{
		type_br_slokking_1.removeAttribute('required');
		type_br_slokking_2.removeAttribute('required');
		type_br_slokking_3.removeAttribute('required');
		type_br_slokking_4.removeAttribute('required');
		rokvarsler_1.removeAttribute('required');
		rokvarsler_2.removeAttribute('required');
		rokvarsler_3.removeAttribute('required');
		rokvarsler_4.removeAttribute('required');
		document.getElementById('inner_details').style.display = 'none';
	}
	else
	{
		type_br_slokking_1.setAttribute('required', '');
		type_br_slokking_2.setAttribute('required', '');
		type_br_slokking_3.setAttribute('required', '');
		type_br_slokking_4.setAttribute('required', '');
		rokvarsler_1.setAttribute('required', '');
		rokvarsler_2.setAttribute('required', '');
		rokvarsler_3.setAttribute('required', '');
		rokvarsler_4.setAttribute('required', '');
		document.getElementById('inner_details').style.display = 'block';
	}
}

function handleChangeSlukkeutstyr(src)
{
	//datestamp
	const input = document.getElementById('datestamp');

	if (src.value == 2)
	{
		input.removeAttribute('required');
		document.getElementById('dateblock').style.display = 'none';
	}
	else
	{
		input.setAttribute('required', '');
		document.getElementById('dateblock').style.display = 'block';
	}
}

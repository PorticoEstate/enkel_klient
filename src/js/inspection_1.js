function showDiv(divId, element)
{
	document.getElementById(divId).style.display = element.checked == true ? 'block' : 'none';
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

//  alert(src.value);
}

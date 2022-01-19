{extends file='layout.tpl'}

{block name=title}<title>{#site_title#}</title>{/block}
{block name=head}
	<meta charset="utf-8">
	<meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1" >
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<meta name="author" content="PorticoEstate https://github.com/PorticoEstate/PorticoEstate">
	<meta name="description" content="{#description#}">
	<meta name="keywords" content="{#keywords#}">
	<meta name="robots" content="none">

	<link href="vendor/twbs/bootstrap/dist/css/bootstrap.min.css?n={#cache_refresh_token#}" type="text/css" rel="StyleSheet">
	<link href="vendor/components/font-awesome/css/all.min.css?n={#cache_refresh_token#}" type="text/css" rel="StyleSheet">

	<script>
		var strBaseURL = '{$str_base_url}';
	</script>
			



	<script src="js/base.js?n={#cache_refresh_token#}"></script>
	<script src="vendor/components/jquery/jquery.min.js?n={#cache_refresh_token#}"></script>
	<script src="vendor/twbs/bootstrap/dist/js/bootstrap.min.js?n={#cache_refresh_token#}"></script>
{/block}


{extends file='head.tpl'}

{block name=body}
	<script src="vendor/components/jquery/jquery.min.js?n={#cache_refresh_token#}"></script>
	<!-- Main Quill library -->
	<script src="https://cdn.quilljs.com/1.3.7/quill.min.js"></script>
	<script src="js/quill-textarea.js"></script>


	<!-- Theme included stylesheets -->
	<link href="https://cdn.quilljs.com/1.3.7/quill.snow.css" rel="stylesheet">
	{*<link href="//cdn.quilljs.com/1.3.6/quill.bubble.css" rel="stylesheet">
	*}

	<style>
		.ql-container {
			height: 300px;
		}
	</style>

	<div class="container">
		<h1>{#form_header#}</h1>

		{if $saved == 1}

			<div class="alert alert-success">
				<p>Saken er registrert og har fått referanse #{$id}</p>
			</div>
			<button type="button" class="btn btn-primary mt-2" onclick="refresh_form();">Lag ny registrering</button>

		{else}

			{if $error|@count gt 0}
				<div class="alert alert-danger alert-dismissible">
					{foreach from=$error item=message}
						<p>{$message}</p>
					{/foreach}
				</div>
			{else}
				<p>{#form_info#}</p>
				{if $tenant_name}
				<p>Innmelder: {$tenant_name}</p>
				{/if}
			{/if}
			<form method="post" action="{$action_url}">
				<input type="hidden" value="{$rand}" name="randcheck" />
				<fieldset>
                    {if $location_code}
						<div class="form-group mt-2">
							<label for="location_name">
								Lokasjon
							</label>
							<span class="form-control">{$address}</span>
							<input type="hidden" id="location_code" name="location_code" value="{$location_code}">
							<input type="hidden" id="address" name="address" value="{$address}">
							<input type="hidden" id="tenant_name" name="tenant_name" value="{$tenant_name}">
						</div>
                    {else}
						<div class="form-group mt-2">
							<label for="location_name">
								<i class="fas fa-search"></i>
								Lokasjon
							</label>
							<input type="text" id="location_name" name="values[location_name]" tabindex="1" class="form-control"
								autocomplete="off" required="required" />
							<div class="selection"></div>
							<input type="hidden" id="location_code" name="location_code">
						</div>
					   {/if}
					<div id="details" {if !$location_code}style="display: none;"{/if}>

						<div class="form-group">
							<label for="subject">Overskrift</label>
							<small id="subjectHelp" class="form-text text-muted">Her legger du inn hva saken gjelder.</small>
							<input type="text" class="form-control" id="title" name="subject" value="{$subject}"
								aria-describedby="subjectHelp" required="required">
						</div>
						<div class="form-group mt-4">
							<label for="message">Melding</label>
							<textarea class="form-control" id="message" name="message" required="required">{$message}</textarea>
						</div>
						<button type="submit" class="btn btn-primary">Send</button>
					</div>
				</fieldset>
			</form>
		{/if}

	</div>
	<script>
		function refresh_form()
		{
			{literal}
				var strURL = phpGWLink('index.php', {menuaction:'enkel_klient.helpdesk.display_form'});
			{/literal}
			window.location.replace(strURL);
		}
	</script>
	{if $saved != 1}
		<script src="js/autocomplete/autoComplete.js?n={#cache_refresh_token#}"></script>
		<script src="js/location.js?n={#cache_refresh_token#}"></script>
	{/if}

{/block}
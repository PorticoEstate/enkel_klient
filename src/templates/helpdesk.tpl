{extends file='head.tpl'}

{block name=body}
	<script src="vendor/components/jquery/jquery.min.js?n={#cache_refresh_token#}"></script>
	<!-- Main Quill library -->
	<script src="https://cdn.quilljs.com/1.3.7/quill.min.js"></script>
	<script src="src/js/quill-textarea.js"></script>


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
			{/if}
			<form method="post" action="{$action_url}">
				<input type="hidden" value="{$rand}" name="randcheck" />
				<fieldset>
					{if $user_name}
					<p>Navn: {$user_name}</p>
					{/if}

                    {if $location_code}
						<div class="form-group mt-2">
							<label for="location_name">
								Adresse
							</label>
							<span class="form-control">{$address}</span>
							<input type="hidden" id="location_code" name="location_code" value="{$location_code}">
							<input type="hidden" id="address" name="address" value="{$address}">
							<input type="hidden" id="user_name" name="user_name" value="{$user_name}">
						</div>
                    {else}
						<div class="form-group mt-2">
							<label for="location_name">
								<i class="fas fa-search"></i>
								Adresse
							</label>
							<input type="text" id="location_name" name="location_name" tabindex="1" class="form-control"
								autocomplete="off" required="required" />
							<div class="selection"></div>
							<input type="hidden" id="location_code" name="location_code">
						</div>
					   {/if}

						<div class="form-group mt-2">
							<label for="phone">Telefon/Mobil</label>
							<small id="contact_infoHelpPhone" class="form-text text-muted">Her legger du inn telefonnummeret til den EBF skal ta kontakt med.</small>
						<input type="text" id="phone" name="phone" tabindex="2" class="form-control"
							autocomplete="off" required="required" />
						</div>
						<!--email-->
						<div class="form-group mt-2">
							<label for="email">E-post</label>
							<small id="contact_infoHelpEmail" class="form-text text-muted">Her legger du inn E-post til den EBF skal ta kontakt med.</small>
							<input type="email" id="email" name="email" tabindex="3" class="form-control"
								autocomplete="off" required="required" />
						</div>

				</fieldset>

				<div id="details" {if !$location_code}style="display: none;"{/if}>
					<fieldset>
							<div class="form-group mt-2">
								<label for="subject">Overskrift</label>
								<small id="subjectHelp" class="form-text text-muted">Her legger du inn hva saken gjelder.</small>
								<input type="text" class="form-control" id="title" name="subject" value="{$subject}"
									aria-describedby="subjectHelp" required="required">
							</div>
							<div class="form-group mt-4">
								<label for="message">Melding</label>
								<textarea class="form-control" id="message" name="message" required="required">{$message}</textarea>
							</div>
							<button type="submit" class="btn btn-primary mt-4">Send</button>
					</fieldset>
				</div>
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
		var schema = 'helpdesk';
	</script>
	{if $saved != 1 && !$location_code}
		<script src="src/js/autocomplete/autoComplete.js?n={#cache_refresh_token#}"></script>
		<script src="src/js/location.js?n={#cache_refresh_token#}"></script>
	{/if}

{/block}
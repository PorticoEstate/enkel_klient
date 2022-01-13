{extends file='head.tpl'}

{block name=body}
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
				<p>Saken er registrert og har fått referanse #{$ticket_id}</p>
			</div>
        {else}

			{if $error != '' }

				<div class="alert alert-danger alert-dismissible">
					<button type="button" class="close" data-dismiss="alert">&times;</button>
					<p>{$error}</p>
				</div>
			{else}
				<p>Saken vil bli registrert - behandlet - og videre tilgjengeliggjort som historikk på <a href="https://www.bergen.kommune.no/minside">Min side</a></p>
			{/if}
			<form method="post" action="{$action_url}">
				<input type="hidden" value="{$rand}" name="randcheck" />
				<fieldset>

					<div class="form-group">
						<label for="subject">Overskrift</label>
						<small id="subjectHelp" class="form-text text-muted">Her legger du inn hva saken gjelder.</small>
						<input type="text" class="form-control" id="title" name ="subject" value="{$subject}" aria-describedby="subjectHelp" required="required">
					</div>
					<div class="form-group mt-4">
						<label for="message">Melding</label>
						<textarea  class="form-control" id="message" name="message" required="required">{$message}</textarea>
					</div>
					<button type="submit" class="btn btn-primary">Send</button>
				</fieldset>
			</form>
        {/if}

	</div>
{/block}


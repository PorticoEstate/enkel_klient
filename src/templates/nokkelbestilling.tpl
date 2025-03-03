{extends file='head.tpl'}

{block name=body}
	<script src="vendor/components/jquery/jquery.min.js?n={#cache_refresh_token#}"></script>
	<!-- Main Quill library -->
	<script src="https://cdn.quilljs.com/1.3.7/quill.min.js"></script>
	<script src="js/quill-textarea.js"></script>


	<!-- Theme included stylesheets -->
	<link href="https://cdn.quilljs.com/1.3.7/quill.snow.css" rel="stylesheet">
	<link href="js/file-upload/css/jquery.fileupload.css?n={#cache_refresh_token#}" type="text/css" rel="stylesheet">
	<link href="js/file-upload/css/jquery.fileupload-ui.css?n={#cache_refresh_token#}" type="text/css" rel="stylesheet">
	<link href="js/file-upload/css/jquery.fileupload-custom.css?n={#cache_refresh_token#}" type="text/css" rel="stylesheet">
	<link href="js/file-upload/css/jquery.fileupload-ui.css?n={#cache_refresh_token#}" type="text/css" rel="stylesheet">

	<style>
		.ql-container {
			height: 300px;
		}

		.error {
			background-color: #fcc;
			border: 1px solid #f00;
			color: #c10000;
		}

		.file {
			position: relative;
			background: linear-gradient(to right, lightblue 50%, transparent 50%);
			background-size: 200% 100%;
			background-position: right bottom;
			transition: all 1s ease;
			/*	background: lightgrey;*/
		}

		.file.done {
			background: lightgreen;
		}

		.is-invalid {
			border-color: #dc3545;
			background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12' width='12' height='12' fill='none' stroke='%23dc3545'%3e%3ccircle cx='6' cy='6' r='4.5'/%3e%3cpath stroke-linejoin='round' d='M5.8 3.6h.4L6 6.5z'/%3e%3ccircle cx='6' cy='8.2' r='.6' fill='%23dc3545' stroke='none'/%3e%3c/svg%3e");
			background-repeat: no-repeat;
			background-position: right calc(0.375em + 0.1875rem) center;
			background-size: calc(0.75em + 0.375rem) calc(0.75em + 0.375rem);
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
			<form id="nokkelbestilling" name="nokkelbestilling" method="post" action="{$action_url}"
				enctype="multipart/form-data" novalidate>
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
						<!--paavegne av-->
						<div class="form-group mt-2">
							<label for="paavegne_av">
								På vegne av
							</label>
							<small id="contact_paavegne_av" class="form-text text-muted d-block mb-2">Vi fant ikke kontrakten din.
								Legg inn navnet på den du bestiller på vegne av. Du må også laste opp fullmakt eller
								vergefullmakt</small>
							<input type="text" id="paavegne_av" name="paavegne_av" tabindex="1" class="form-control"
								autocomplete="off" required="required" />
						</div>
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
						<small id="contact_infoHelpPhone" class="form-text text-muted d-block mb-2">Her legger du inn
							telefonnummeret til den
							EBF skal ta kontakt med.</small>
						<input type="text" id="phone" name="phone" tabindex="2" class="form-control" autocomplete="off"
							required="required" />
					</div>
					<!--email-->
					<div class="form-group mt-2">
						<label for="email">E-post</label>
						<small id="contact_infoHelpEmail" class="form-text text-muted d-block mb-2">
							Her legger du inn E-post til den EBF skal ta kontakt med.
						</small>
						<input type="email" id="email" name="email" tabindex="3" class="form-control" autocomplete="off"
							required="required" pattern="[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{ldelim}2,{rdelim}"
							oninvalid="this.setCustomValidity('Vennligst skriv inn en gyldig e-postadresse')"
							oninput="this.setCustomValidity('')" />
					</div>
					<!--Nøkkelnummer-->
					<div class="form-group mt-2">
						<label for="key_number">Nøkkelnummer</label>
						<small id="contact_Nøkkelnummer" class="form-text text-muted d-block mb-2">Nummeret står på nøkkel og
							inneholder
							bokstaver og tall.</small>
						<input type="text" id="key_number" name="key_number" tabindex="4" class="form-control"
							autocomplete="off" required="required" />
					</div>
					<!--Antall nøkler-->
					<div class="form-group mt-2">
						<label for="number_of_keys">Antall nøkler</label>
						<small id="contact_infoHelpNumberOfKeys" class="form-text text-muted d-block mb-2">Her legger du inn
							antall nøkler
							som skal bestilles. Kr 800,- for første nøkkel, deretter kr 500,- pr stk. utover dette</small>
						<input type="number" id="number_of_keys" name="number_of_keys" tabindex="5" class="form-control"
							autocomplete="off" required="required" min="1" />
					</div>
				</fieldset>

				<div id="details">
					<fieldset>
						<div class="form-group mt-2">
							<label for="subject">Overskrift</label>
							<small id="subjectHelp" class="form-text text-muted d-block mb-2">Sammendrag</small>
							<input type="text" class="form-control" id="title" name="subject" readonly value="{$subject}"
								style="background-color: #e9ecef; cursor: not-allowed;" aria-describedby="subjectHelp"
								required="required" />
						</div>

						<div class="form-group mt-4">
							<label for="message">Tillegssopplysninger</label>
							<textarea class="form-control" id="message" name="message" tabindex="6">{$message}</textarea>
						</div>
						{if $enable_fileupload == 1}
							<div class="form-group mt-2">
								<label>Last opp fil {if !$location_code}<span class="text-danger">*</span>{/if}</label>
								<div id="drop-area" class="">
									<div style="border: 2px dashed #ccc; padding: 20px;">
										<p>Last opp flere filer ved enten å dra-og-slipp i markert område, eller ved å velge filene
											direkte.
											{if !$location_code}
												<br><small class="text-danger">Last opp fullmakt eller vergefullmakt</small>
											{/if}
										</p>
										<div class="fileupload-buttonbar">
											<div class="fileupload-buttons">
												<span class="fileinput-button btn btn-success">
													<i class="fas fa-plus"></i>
													<span>Legg til filer...</span>
													<input id="fileupload" type="file" name="files[]" multiple="" data-url=""
														{if !$location_code}required{/if}>
												</span>
												<span class="fileupload-process"></span>
											</div>
											<div class="fileupload-count">
												Antall filer: <span id="files-count"></span>
											</div>
											<div class="fileupload-progress" style="display:none">
												<div id="progress" class="progress" role="progressbar" aria-valuemin="0"
													aria-valuemax="100"></div>
												<div class="progress-extended"></div>
											</div>
										</div>
										<div class="content_upload_download">
											<div class="presentation files" style="display: inline-table;"></div>
										</div>
									</div>

								</div>
							</div>
						{/if}
						<button id="submit" type="submit" class="btn btn-primary mt-4">
							<i class="far fa-paper-plane"></i>
							Send
						</button>
					</fieldset>
				</div>
			</form>
		{/if}

	</div>
	<script>
		function refresh_form() {
			{literal}
				var strURL = phpGWLink('index.php', {menuaction:'enkel_klient.nokkelbestilling.display_form'});
			{/literal}
			window.location.replace(strURL);
		}
		var schema = 'nokkelbestilling';

		// set field id="title" to text id="location_name" when location_code is set by autocomplete
		var summarytext = 'Nøkkelbestilling for ';
		$('#title').val(summarytext);

		{if !$location_code}
			// Listen for both change and input events
			$('#location_name').on('change input', function() {
				$('#title').val(summarytext + $(this).val());
			});

			// Listen for autoComplete.js selection event
			document.querySelector("#location_name").addEventListener("selection", function(event) {
				const selection = event.detail.selection.value;
				$('#title').val(summarytext + selection.name);
			});
		{/if}
		{if $location_code}
			$('#title').val(summarytext + $('#location_name').val());
		{/if}

		// Email validation
	</script>
	{literal}
		<script>
			document.getElementById('email').addEventListener('input', function(e) {
				const email = e.target.value;
				const emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

				if (!emailRegex.test(email)) {
					e.target.classList.add('is-invalid');
				} else {
					e.target.classList.remove('is-invalid');
				}
			});
		</script>
	{/literal}
	{if $saved != 1 && !$location_code}
		<script src="vendor/components/jquery/jquery.min.js?n={#cache_refresh_token#}"></script>
		<script src="js/jquery-ui-1.13.1.min.js?n={#cache_refresh_token#}"></script>
		<script src="js/file-upload/js/jquery.fileupload.js?n={#cache_refresh_token#}"></script>
		<script src="js/file-upload/js/jquery.fileupload-process.js?n={#cache_refresh_token#}"></script>
		<script src="js/file-upload/js/jquery.fileupload-validate.js?n={#cache_refresh_token#}"></script>
		<script src="js/autocomplete/autoComplete.js?n={#cache_refresh_token#}"></script>
		<script src="js/location.js?n={#cache_refresh_token#}"></script>
		<script src="js/nokkelbestilling.js?n={#cache_refresh_token#}"></script>
		<script>
			//set focus on first input field
			document.getElementById("location_name").focus();
		</script>
	{/if}

{/block}
{extends file='head.tpl'}

{block name=body}


	<link href="css/jquery-ui.min.css?n={#cache_refresh_token#}" type="text/css"  rel="stylesheet">
	<link href="js/file-upload/css/jquery.fileupload.css?n={#cache_refresh_token#}" type="text/css"  rel="stylesheet">
	<link href="js/file-upload/css/jquery.fileupload-ui.css?n={#cache_refresh_token#}" type="text/css"  rel="stylesheet">
	<link href="js/file-upload/css/jquery.fileupload-custom.css?n={#cache_refresh_token#}" type="text/css"  rel="stylesheet">
	<link href="js/file-upload/css/jquery.fileupload-ui.css?n={#cache_refresh_token#}" type="text/css"  rel="stylesheet">
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
			transition:all 1s ease;
			/*	background: lightgrey;*/
		}
		.file.done {
			background: lightgreen;
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
			{/if}

			<form id="inspection_1" name="inspection_1" method="post" action="{$action_url}" enctype="multipart/form-data">
				<input type="hidden" value="{$rand}" name="randcheck" />
				<fieldset>
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
					<div id="details" style="display: none;">
						<div class="form-check">
							<input class="form-check-input" type="checkbox" name="values_attribute[7][value]"
								   id="tilgang" value="1"  onchange="handleChangeTilgang(this);" />
							<label class="form-check-label" for="tilgang">
								Manglende tilgang
							</label>
						</div>
						<div id="inner_details">

							<div id="slukkeutstyr" class="form-group mt-2">
								<label for="location_name">Slukkeutstyr</label>
								<div class="form-check">
									<input class="form-check-input" type="radio" name="values_attribute[2][value][]"
										   id="type_br_slokking_2" value="2" required="required" onchange="handleChangeSlukkeutstyr(this);" />
									<label class="form-check-label" for="type_br_slokking_2">
										Husbrannslange
									</label>
								</div>
								<div class="form-check">
									<input class="form-check-input" type="radio" name="values_attribute[2][value][]"
										   id="type_br_slokking_3" value="3" required="required" onchange="handleChangeSlukkeutstyr(this);" />
									<label class="form-check-label" for="type_br_slokking_3">
										Pulver
									</label>
								</div>
								<div class="form-check">
									<input class="form-check-input" type="radio" name="values_attribute[2][value][]"
										   id="type_br_slokking_4" value="4" required="required" onchange="handleChangeSlukkeutstyr(this);" />
									<label class="form-check-label" for="type_br_slokking_4">
										Skum
									</label>
								</div>
								<div class="form-check">
									<input class="form-check-input" type="radio" name="values_attribute[2][value][]"
										   id="type_br_slokking_1" value="1" required="required" onchange="handleChangeSlukkeutstyr(this);" />
									<label class="form-check-label" for="type_br_slokking_1">
										Skiftet brannslokkingsapparat
									</label>
								</div>
							</div>

							<div id="dateblock" class="form-group mt-2" style="display: none;">
								<label for="subject">Datostempel for Brannslokkingsapparatet</label>
								<!--the parsed value is always formatted yyyy-mm-dd.-->
								<input id="datestamp" type="date" class="form-control" id="title" name="values_attribute[1][value]" />
							</div>

							<div class="form-group mt-2">
								<label>Røykvarsler</label>
								<div class="form-check">
									<input class="form-check-input" type="radio" name="values_attribute[3][value][]"
										   id="rokvarsler_1" value="1" required="required" />
									<label class="form-check-label" for="rokvarsler_1">
										Kontrollert - OK
									</label>
								</div>
								<div class="form-check">
									<input class="form-check-input" type="radio" name="values_attribute[3][value][]"
										   id="rokvarsler_2" value="2" required="required" />
									<label class="form-check-label" for="rokvarsler_2">
										Skiftet batteri
									</label>
								</div>
								<div class="form-check">
									<input class="form-check-input" type="radio" name="values_attribute[3][value][]"
										   id="rokvarsler_3" value="3" required="required" />
									<label class="form-check-label" for="rokvarsler_3">
										Skiftet røykvarsler
									</label>
								</div>
								<div class="form-check">
									<input class="form-check-input" type="radio" name="values_attribute[3][value][]"
										   id="rokvarsler_4" value="1" required="required" />
									<label class="form-check-label" for="rokvarsler_4">
										Inngår i brannvarslingsanlegg
									</label>
								</div>
							</div>
                        </div>

                        <div class="form-group mt-2">
                            <label>OBS!!</label>
                            <div class="form-check">
                                <input class="form-check-input" type="checkbox" name="values_attribute[4][value]"
									   id="id_behov_tilsyn" value="1" />
                                <label class="form-check-label" for="id_behov_tilsyn">
                                    Behov for utvidet tilsyn
                                </label>
                            </div>
                        </div>

                        <div id="hidden_div" class="form-group mt-2">
                            <label for="merknad">Merknad</label>
                            <small id="merknadHelp" class="form-text text-muted">Her legger du inn merknader dersom det er behov
                                for utvidet tilsyn, eller andre kommentarer.</small>
                            <textarea class="form-control" id="merknad" rows="8" aria-describedby="merknadHelp"
									  name="values_attribute[5][value]"></textarea>
                        </div>
						{if $enable_fileupload == 1}
							<div class="form-group mt-2">
								<label>Last opp fil</label>
								<div id="drop-area" class="">
									<div style="border: 2px dashed #ccc; padding: 20px;">
										<p>Last opp flere filer ved enten å dra-og-slipp i markert område, eller ved å velge filene direkte.</p>
										<div class="fileupload-buttonbar">
											<div class="fileupload-buttons">
												<span class="fileinput-button btn btn-success">
													<i class="fas fa-plus"></i>
													<span>Legg til filer...</span>
													<input id="fileupload" type="file" name="files[]" multiple="" data-url="" capture="camera"></span>
												<span class="fileupload-process"></span>
											</div>
											<div class="fileupload-count">
												Antall filer: <span id="files-count"></span>
											</div>
											<div class="fileupload-progress" style="display:none">
												<div id="progress" class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="100"></div>
												<div class="progress-extended"></div>
											</div>
										</div>
										<div class="content_upload_download"><div class="presentation files" style="display: inline-table;"></div></div>
									</div>

								</div>
							</div>
						{/if}
                        <button id="submit" type="submit" class="btn btn-primary mt-2">
							<i class="far fa-paper-plane"></i>


							Send
						</button>
                    </div>
                </fieldset>
            </form>
		{/if}

	</div>
	<script>
		function refresh_form()
		{
			var strURL = phpGWLink('index.php', {});
			window.location.replace(strURL);
		}
	</script>
	{if $saved != 1}
		<script src="js/autocomplete/autoComplete.js?n={#cache_refresh_token#}"></script>
		<script src="vendor/components/jquery/jquery.min.js?n={#cache_refresh_token#}"></script>
		<script src="js/jquery-ui-1.13.1.min.js?n={#cache_refresh_token#}"></script>
		<script src="js/file-upload/js/jquery.fileupload.js?n={#cache_refresh_token#}"></script>
		<script src="js/file-upload/js/jquery.fileupload-process.js?n={#cache_refresh_token#}"></script>
		<script src="js/file-upload/js/jquery.fileupload-validate.js?n={#cache_refresh_token#}"></script>
		<script src="js/inspection_1.js?n={#cache_refresh_token#}"></script>
		<script src="js/location.js?n={#cache_refresh_token#}"></script>
	{/if}

{/block}
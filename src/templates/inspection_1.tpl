{extends file='head.tpl'}

{block name=body}

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
			{/if}

			<form id="inspection_1" name="inspection_1" method="post" action="{$action_url}">
				<input type="hidden" value="{$rand}" name="randcheck" />
				<fieldset>
					<div class="form-group mt-2">
						<label for="location_name">Lokasjon</label>
						<input type="text" id="location_name" name="values[location_name]" tabindex="1" class="form-control"
							   autocomplete="off" required="required" />
						<div class="selection"></div>
						<input type="hidden" id="location_code" name="location_code">
					</div>
					<div id="details" style="display: none;">
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
									OK - med nytt batteri
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
									   id="type_br_slokking_1" value="1" required="required" />
                                <label class="form-check-label" for="rokvarsler_4">
                                    Inngår i brannvarslingsanlegg
                                </label>
                            </div>
                        </div>

                        <div class="form-group mt-2">
                            <label>OBS!!</label>
                            <div class="form-check">
                                <input class="form-check-input" type="checkbox" name="values_attribute[4][value]"
									   id="id_behov_tilsyn" value="1" onchange="showDiv('hidden_div', this);" />
                                <label class="form-check-label" for="id_behov_tilsyn">
                                    Behov for utvidet tilsyn
                                </label>
                            </div>
                        </div>

                        <div id="hidden_div" class="form-group mt-2" style="display: none;">
                            <label for="merknad">Merknad</label>
                            <small id="merknadHelp" class="form-text text-muted">Her legger du inn merknader dersom det er behov
                                for utvidet tilsyn.</small>
                            <textarea class="form-control" id="merknad" rows="8" aria-describedby="merknadHelp"
									  name="values_attribute[5][value]"></textarea>
                        </div>
                        <button type="submit" class="btn btn-primary mt-2">Send</button>
                    </div>
                </fieldset>
            </form>
		{/if}

	</div>
	<script>
		function refresh_form()
		{
			var strURL = phpGWLink('', {});
			window.location.replace(strURL);
		}
	</script>
	{if $saved != 1}
		<script src="js/autocomplete/autoComplete.js?n={#cache_refresh_token#}"></script>
		<script src="js/inspection_1.js?n={#cache_refresh_token#}"></script>
	{/if}

{/block}
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
            {/if}
            <form method="post" action="{$action_url}">
                <input type="hidden" value="{$rand}" name="randcheck" />
                <fieldset>

                    <div class="form-check mt-2">
                        <input class="form-check-input" type="radio" name="values_attribute[2][value][]" id="type_br_slokking_1"
                            value="1">
                        <label class="form-check-label" for="type_br_slokking_1">
                            Husbrannslange
                        </label>
                    </div>
                    <div class="form-check">
                        <input class="form-check-input" type="radio" name="values_attribute[2][value][]" id="type_br_slokking_2"
                            value="2">
                        <label class="form-check-label" for="type_br_slokking_2">
                            Pulver
                        </label>
                    </div>
                    <div class="form-check">
                        <input class="form-check-input" type="radio" name="values_attribute[2][value][]" id="type_br_slokking_3"
                            value="3">
                        <label class="form-check-label" for="type_br_slokking_3">
                            Skum
                        </label>
                    </div>


                    <div class="form-group mt-2">
                        <label for="subject">Datostempel for Brannslokkingsapparatet</label>
                        <!--the parsed value is always formatted yyyy-mm-dd.-->
                        <input type="date" class="form-control" id="title" name="values_attribute[3][value][]"
                            required="required">
                    </div>

					<div class="form-check mt-2">
					<input class="form-check-input" type="checkbox" name="values_attribute[4][value][]" id="id_behov_tilsyn"
						value="1">
					<label class="form-check-label" for="id_behov_tilsyn">
					Behov for utvidet tilsyn
					</label>
				</div>

                    <div class="form-group mt-2">
                        <label for="message">Merknad</label>
                        <textarea class="form-control" id="message" name="message">{$message}</textarea>
                    </div>
                    <button type="submit" class="btn btn-primary mt-2">Send</button>
                </fieldset>
            </form>
        {/if}

    </div>
{/block}
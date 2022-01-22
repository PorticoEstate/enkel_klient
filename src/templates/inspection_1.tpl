{extends file='head.tpl'}

{block name=body}
    <!-- Main Quill library -->
    <!--script src="https://cdn.quilljs.com/1.3.7/quill.min.js?n={#cache_refresh_token#}"></script>
    <script src="js/quill-textarea.js?n={#cache_refresh_token#}"></script-->

    <script src="js/autocomplete/autoComplete.js?n={#cache_refresh_token#}">

    </script>

    <!-- Theme included stylesheets -->
    <link href="https://cdn.quilljs.com/1.3.7/quill.snow.css?n={#cache_refresh_token#}" rel="stylesheet">
    <!--link href="js/autocomplete/css/autoComplete.css?n={#cache_refresh_token#}" type="text/css" rel="StyleSheet"-->

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
                    <div class="form-group mt-2">
                        <label for="location_name">Lokasjon</label>
                        <input type="text" id="location_name" name="values[location_name]" tabindex="1" class="form-control"
                            autocomplete="off" required="required">
                        <div class="selection"></div>
                        <input type="hidden" id="location_code" name="location_code">
                    </div>
                    <div id="details" style="display: none;">
                        <div class="form-group mt-2">
                            <label for="location_name">Brannslokkingsapparat</label>
                            <div class="form-check">
                                <input class="form-check-input" type="radio" name="values_attribute[2][value][]"
                                    id="type_br_slokking_1" value="1" required="required">
                                <label class="form-check-label" for="type_br_slokking_1">
                                    Inngår i brannvarslingsanlegg
                                </label>
                            </div>
                            <div class="form-check">
                                <input class="form-check-input" type="radio" name="values_attribute[2][value][]"
                                    id="type_br_slokking_2" value="2" required="required">
                                <label class="form-check-label" for="type_br_slokking_2">
                                    Husbrannslange
                                </label>
                            </div>
                            <div class="form-check">
                                <input class="form-check-input" type="radio" name="values_attribute[2][value][]"
                                    id="type_br_slokking_3" value="3" required="required">
                                <label class="form-check-label" for="type_br_slokking_3">
                                    Pulver
                                </label>
                            </div>
                            <div class="form-check">
                                <input class="form-check-input" type="radio" name="values_attribute[2][value][]"
                                    id="type_br_slokking_4" value="4" required="required">
                                <label class="form-check-label" for="type_br_slokking_4">
                                    Skum
                                </label>
                            </div>
                        </div>

                        <div class="form-group mt-2">
                            <label for="subject">Datostempel for Brannslokkingsapparatet</label>
                            <!--the parsed value is always formatted yyyy-mm-dd.-->
                            <input type="date" class="form-control" id="title" name="values_attribute[1][value]"
                                required="required">
                        </div>

                        <div class="form-group mt-2">
                            <label>Røykvarsler</label>
                            <div class="form-check">
                                <input class="form-check-input" type="radio" name="values_attribute[3][value][]"
                                    id="rokvarsler_1" value="1" required="required">
                                <label class="form-check-label" for="rokvarsler_1">
                                    OK - med nytt batteri
                                </label>
                            </div>
                            <div class="form-check">
                                <input class="form-check-input" type="radio" name="values_attribute[3][value][]"
                                    id="rokvarsler_2" value="2" required="required">
                                <label class="form-check-label" for="rokvarsler_2">
                                    Skiftet batteri
                                </label>
                            </div>
                            <div class="form-check">
                                <input class="form-check-input" type="radio" name="values_attribute[3][value][]"
                                    id="rokvarsler_3" value="3" required="required">
                                <label class="form-check-label" for="rokvarsler_3">
                                    Skiftet røykvarsler
                                </label>
                            </div>
                        </div>

                        <div class="form-group mt-2">
                            <label>OBS!!</label>
                            <div class="form-check">
                                <input class="form-check-input" type="checkbox" name="values_attribute[4][value]"
                                    id="id_behov_tilsyn" value="1" onchange="showDiv('hidden_div', this)">
                                <label class="form-check-label" for="id_behov_tilsyn">
                                    Behov for utvidet tilsyn
                                </label>
                            </div>
                        </div>

                        <div id="hidden_div" class="form-group mt-2" style="display: none;">
                            <label for="merknad">Merknad</label>
                            <small id="merknadHelp" class="form-text text-muted">Her legger du inn merknader dersom det er behov
                                for
                                utvidet tilsyn.</small>
                            <textarea class="form-control" id="merknad" rows="8" aria-describedby="merknadHelp"
                                name="values_attribute[5][value]">{$message}</textarea>
                        </div>
                        <button type="submit" class="btn btn-primary mt-2">Send</button>
                    </div>
                </fieldset>
            </form>
        {/if}

    </div>
    <script src="js/inspection_1.js?n={#cache_refresh_token#}"></script>

{/block}
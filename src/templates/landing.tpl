{extends file="layout.tpl"}

{block name=title}
    <title>{$landing.title}</title>
{/block}

{block name=body}
    <div class="container mt-5">
        <div class="row justify-content-center">
            <div class="col-md-8 text-center">
                <h1 class="mb-4">{$landing.title}</h1>
                <h2 class="h4 mb-3">{$landing.subtitle}</h2>
                <p class="lead mb-5">
                    {$landing.description}
                </p>
                <div class="row mt-4">
                    {if isset($services.helpdesk)}
                        <div class="col-md-4 mb-4">
                            <div class="card h-100">
                                <div class="card-body">
                                    <i class="fas fa-ticket-alt fa-2x mb-3 text-primary"></i>
                                    <h3 class="h5 card-title">BrukerØnske</h3>
                                    <p class="card-text">{$services.helpdesk}</p>
                                </div>
                            </div>
                        </div>
                    {/if}
                    {if isset($services.nokkelbestilling)}
                        <div class="col-md-4 mb-4">
                            <div class="card h-100">
                                <div class="card-body">
                                    <i class="fas fa-key fa-2x mb-3 text-primary"></i>
                                    <h3 class="h5 card-title">Nøkkelbestilling</h3>
                                    <p class="card-text">{$services.nokkelbestilling}</p>
                                </div>
                            </div>
                        </div>
                    {/if}
                    {if isset($services.inspection_1)}
                        <div class="col-md-4 mb-4">
                            <div class="card h-100">
                                <div class="card-body">
                                    <i class="fas fa-clipboard-check fa-2x mb-3 text-primary"></i>
                                    <h3 class="h5 card-title">VekterInspeksjon</h3>
                                    <p class="card-text">{$services.inspection_1}</p>
                                </div>
                            </div>
                        </div>
                    {/if}
                </div>
            </div>
        </div>
    </div>
{/block}
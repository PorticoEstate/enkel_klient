<!DOCTYPE html>
<html lang="no">
	<head>
		{block name=title}{/block}
		{block name=head}{/block}
	</head>
<body>
{if !isset($location_code) || !$location_code}
    <nav class="navbar navbar-expand-lg navbar-light bg-light">
        <div class="container-fluid">
            <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
                <span class="navbar-toggler-icon"></span>
            </button>
            <div class="collapse navbar-collapse" id="navbarNav">
                <ul class="navbar-nav">
                    <li class="nav-item">
                        <a class="nav-link" href="index.php?menuaction=enkel_klient.helpdesk.display_form">BrukerØnske</a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" href="index.php?menuaction=enkel_klient.inspection_1.display_form">VekterInspeksjon</a>
                    </li>
                </ul>
            </div>
        </div>
    </nav>
{/if}
{block name=body}{/block}
</body>
</html>

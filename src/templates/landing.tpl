{extends file='head.tpl'}

{block name=body}
	<div class="container mt-5">
		<div class="row justify-content-center">
			<div class="col-md-12 text-center">
				<h1 class="mb-4">{#title#}</h1>
				<h2 class="h4 mb-3">{#subtitle#}</h2>
				<p class="lead mb-5">{#description#}</p>
				<div class="row mt-4">
					{config_load file="site.conf" section="services"}
					{if #helpdesk#}
						<div class="col-md-4 mb-4">
							<a href="/helpdesk" class="text-decoration-none">
								<div class="card h-100 hover-shadow">
									<div class="card-body">
										<i class="fas fa-ticket-alt fa-2x mb-3 text-primary"></i>
										<h3 class="h5 card-title text-nowrap">{#helpdesk#}</h3>
										<p class="card-text text-dark">{#helpdesk_description#}</p>
									</div>
								</div>
							</a>
						</div>
					{/if}
					{if #nokkelbestilling#}
						<div class="col-md-4 mb-4">
							<a href="/nokkelbestilling"
								class="text-decoration-none">
								<div class="card h-100 hover-shadow">
									<div class="card-body">
										<i class="fas fa-key fa-2x mb-3 text-primary"></i>
										<h3 class="h5 card-title text-nowrap">{#nokkelbestilling#}</h3>
										<p class="card-text text-dark">{#nokkelbestilling_description#}</p>
									</div>
								</div>
							</a>
						</div>
					{/if}
					{if #inspection_1#}
						<div class="col-md-4 mb-4">
							<a href="/inspection_1" class="text-decoration-none">
								<div class="card h-100 hover-shadow">
									<div class="card-body">
										<i class="fas fa-clipboard-check fa-2x mb-3 text-primary"></i>
										<h3 class="h5 card-title text-nowrap">{#inspection_1#}</h3>
										<p class="card-text text-dark">{#inspection_1_description#}</p>
									</div>
								</div>
							</a>
						</div>
					{/if}
				</div>
			</div>
		</div>
	</div>

	<style>
		.hover-shadow:hover {
			box-shadow: 0 .5rem 1rem rgba(0, 0, 0, .15);
			transform: translateY(-3px);
			transition: all .2s ease-in-out;
		}
	</style>
{/block}
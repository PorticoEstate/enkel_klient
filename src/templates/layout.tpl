<!DOCTYPE html>
<html lang="no">

<head>
	{block name=title}{/block}
	{block name=head}{/block}
	<style>
		/* Sidebar styles */
		.sidebar {
			height: 100vh;
			width: 250px;
			position: fixed;
			left: 0;
			top: 0;
			background-color: #f8f9fa;
			padding-top: 60px;
			/* Increased to accommodate hamburger */
			transition: 0.3s;
			z-index: 900;
			/* Lower than hamburger */
		}

		.sidebar .navbar-nav {
			width: 100%;
		}

		.sidebar .nav-item {
			width: 100%;
			padding: 8px 16px;
		}

		.sidebar .nav-link {
			color: #333;
			width: 100%;
			padding: 10px;
			transition: all 0.3s;
			border-radius: 4px;
		}

		.sidebar .nav-link:hover {
			background-color: #e9ecef;
			transform: translateX(5px);
			color: #0d6efd;
		}

		.sidebar .nav-link.active {
			background-color: #0d6efd;
			color: white;
			border-radius: 4px;
		}

		.sidebar .nav-link.active:hover {
			background-color: #0b5ed7;
			color: white;
			transform: translateX(5px);
		}

		.content {
			margin-left: 250px;
			padding: 20px;
			transition: 0.3s;
		}

		.navbar-toggler {
			background-color: #f8f9fa;
			border: 1px solid #dee2e6;
			padding: 0.5rem;
			border-radius: 0.25rem;
			box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
			/* Added shadow for better visibility */
		}

		.navbar-toggler-icon {
			display: inline-block;
			width: 1.5em;
			height: 1.5em;
			background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 30 30'%3e%3cpath stroke='rgba%280, 0, 0, 0.55%29' stroke-linecap='round' stroke-miterlimit='10' stroke-width='2' d='M4 7h22M4 15h22M4 23h22'/%3e%3c/svg%3e");
			background-repeat: no-repeat;
			background-position: center;
			background-size: 100%;
		}

		/* Mobile view */
		@media (max-width: 768px) {
			.sidebar {
				margin-left: -250px;
				padding-top: 60px;
				/* Maintain spacing on mobile */
			}

			.sidebar.active {
				margin-left: 0;
			}

			.content {
				margin-left: 50px;
				/* Space for hamburger */
				padding-left: 20px;
			}

			.content.active {
				margin-left: 250px;
			}

			.navbar-toggler {
				display: block;
				position: fixed;
				left: 10px;
				top: 10px;
				z-index: 1000;
				width: 40px;
				/* Fixed width */
			}
		}
	</style>
</head>

<body>
	<button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#sidebar"
		aria-controls="sidebar" aria-expanded="false" aria-label="Toggle navigation">
		<span class="navbar-toggler-icon"></span>
	</button>

	<nav id="sidebar" class="sidebar">
		<ul class="navbar-nav">
			{assign var="currentRoute" value=$smarty.server.REQUEST_URI|regex_replace:'/^.*\//':''|default:''}
			<li class="nav-item">
				<a class="nav-link {if $currentRoute == ''}active{/if}" href="{$str_base_url}">
					<i class="fas fa-home me-2"></i>Hjem
				</a>
			</li>
			{if #helpdesk#}
				<li class="nav-item">
					<a class="nav-link {if $currentRoute == 'helpdesk'}active{/if}" href="{$str_base_url}/helpdesk">
						<i class="fas fa-ticket-alt me-2"></i>{#helpdesk#}
					</a>
				</li>
			{/if}
			{if #nokkelbestilling#}
				<li class="nav-item">
					<a class="nav-link {if $currentRoute == 'nokkelbestilling'}active{/if}"
						href="{$str_base_url}/nokkelbestilling">
						<i class="fas fa-key me-2"></i>{#nokkelbestilling#}
					</a>
				</li>
			{/if}
			{if #inspection_1#}
				<li class="nav-item">
					<a class="nav-link {if $currentRoute == 'inspection_1'}active{/if}" href="{$str_base_url}/inspection_1">
						<i class="fas fa-clipboard-check me-2"></i>{#inspection_1#}
					</a>
				</li>
			{/if}
		</ul>
	</nav>
	<div class="content">
		{block name=body}{/block}
	</div>

	<script>
		document.querySelector('.navbar-toggler').addEventListener('click', function() {
			document.querySelector('.sidebar').classList.toggle('active');
			document.querySelector('.content').classList.toggle('active');
		});
	</script>

</body>

</html>
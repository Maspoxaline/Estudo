<?php

// Esconde o dropdown de idioma na tela de login
add_filter('login_display_language_dropdown', '__return_false');

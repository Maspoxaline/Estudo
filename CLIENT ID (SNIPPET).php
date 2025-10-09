<?php

add_shortcode('cliente_id_div', function(){
    if ( ! is_user_logged_in() ) { return '<!-- not logged in -->'; }
    $u = wp_get_current_user();

    $client_id = sanitize_title( $u->user_login ); // para nome do arquivo json
    $nice_name = trim( ($u->first_name ?? '') . ' ' . ($u->last_name ?? '') );
    if(!$nice_name) $nice_name = $u->display_name ?: $u->user_login;

    return '<div id="client-id" data-client="'. esc_attr($client_id) .'" data-name="'.
            esc_attr($nice_name) .'" style="display:none"></div>';
});

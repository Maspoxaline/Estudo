<?php

// [af_admin_ctx] -> expõe se o usuário é admin e lista clientes (assinantes + admins)
add_shortcode('af_admin_ctx', function () {
  if (!is_user_logged_in()) return '';

  $u = wp_get_current_user();
  $is_admin = user_can($u, 'manage_options') ? '1' : '0';

  // 👉 Agora buscamos assinantes e administradores
  $users = get_users([
    'role__in' => ['subscriber', 'administrator'],   // <— aqui está a mudança
    'fields'   => ['user_login','display_name','first_name','last_name']
  ]);

  $clients = [];
  foreach ($users as $usr) {
    $id   = sanitize_title($usr->user_login); // vira nome do arquivo JSON
    $name = trim(($usr->first_name ?? '') . ' ' . ($usr->last_name ?? ''));
    if (!$name) $name = $usr->display_name ?: $usr->user_login;
    $clients[] = ['id' => $id, 'name' => $name];
  }

  // Saída para o front
  return '<div id="af-admin" data-admin="'. esc_attr($is_admin) .'" '.
         'data-clients=\''. esc_attr(wp_json_encode($clients, JSON_UNESCAPED_UNICODE)) .'\''.
         '></div>';
});
